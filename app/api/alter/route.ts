import { NextRequest, NextResponse } from "next/server";
import { getContentById, patchContent, addContent, getContent } from "@/lib/store";
import { generateContent, clampDuration, DEFAULT_REEL_SEC } from "@/lib/ai";
import { generateStories } from "@/lib/agents";
import { callAI, withSteer, getProvider } from "@/lib/ai-provider";
import { cleanCopy, extractJson, normalizeHashtags, COPY_RULES } from "@/lib/content-parse";
import { flushHistory } from "@/lib/history";
import { checkDuplicate } from "@/lib/dedup";
import { ContentItem, stripArt } from "@/lib/design-system";
import { generateFreeArt } from "@/lib/freedom-ai";
import { autoRenderContent } from "@/lib/render";

export const maxDuration = 300;

/** Frames and slides the renderer will actually draw. */
const MAX_FRAMES = 5;
const MAX_SLIDES = 10;

function cleanList(raw: unknown, max: number): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((entry) => {
      // A model may answer with plain strings or with {headline, line} objects.
      if (entry && typeof entry === "object") {
        const o = entry as { headline?: string; line?: string; text?: string };
        return [cleanCopy(o.headline || o.text || ""), cleanCopy(o.line || "")]
          .filter(Boolean)
          .join("\n");
      }
      return cleanCopy(String(entry ?? ""));
    })
    .filter(Boolean)
    .slice(0, max);
  return items.length ? items : undefined;
}

/**
 * Turns the model's edit into a patch of fields we trust.
 *
 * Only fields that make sense for this content type are accepted, and every
 * value goes through the same sanitiser as freshly generated copy so an edit
 * cannot reintroduce markdown, hashtags or em dashes onto the artwork.
 */
function buildPatch(original: ContentItem, raw: string): Partial<ContentItem> {
  const parsed = extractJson<Record<string, unknown>>(raw);
  const patch: Partial<ContentItem> = {};

  if (!parsed) {
    // The model answered with prose. Treat it as a rewrite of the main body,
    // which is what the previous version of this endpoint always did.
    const cleaned = cleanCopy(raw);
    if (!cleaned) return patch;
    if (original.type === "reel") patch.reelScript = cleaned;
    else if (original.type === "story") patch.storyFrames = [cleaned];
    else patch.caption = cleaned;
    return patch;
  }

  const title = typeof parsed.title === "string" ? cleanCopy(parsed.title).split("\n")[0] : "";
  if (title) patch.title = title;

  const caption = typeof parsed.caption === "string" ? cleanCopy(parsed.caption) : "";
  if (caption) patch.caption = caption;

  const hashtags = normalizeHashtags(parsed.hashtags);
  if (hashtags) patch.hashtags = hashtags;

  if (original.type === "story") {
    const frames = cleanList(parsed.storyFrames ?? parsed.frames, MAX_FRAMES);
    if (frames) patch.storyFrames = frames;
  }

  if (original.type === "carousel") {
    const slides = cleanList(parsed.slides, MAX_SLIDES);
    if (slides) patch.slides = slides;
  }

  if (original.type === "reel") {
    const script = typeof parsed.reelScript === "string" ? cleanCopy(parsed.reelScript) : "";
    if (script) patch.reelScript = script;
    if (parsed.durationSec !== undefined && parsed.durationSec !== null) {
      patch.durationSec = clampDuration(parsed.durationSec);
    }
  }

  return patch;
}

/** Freedom art has the old words painted into it, so new copy needs new art (and a fresh render of it). */
async function redrawFreedom(item: ContentItem | null): Promise<ContentItem | null> {
  if (!item || item.design?.mode !== "freedom") return item;
  const art = await generateFreeArt(item);
  const redrawn = await patchContent(item.id, {
    design: { mode: "freedom", seed: Math.floor(Math.random() * 1e9), art: art || undefined },
    imageUrls: [],
  });
  if (!redrawn) return redrawn;
  const rendered = await autoRenderContent(redrawn);
  return rendered.imageUrls?.length ? patchContent(item.id, { imageUrls: rendered.imageUrls }) : redrawn;
}

/**
 * Rework an existing piece of content.
 *
 *   action "regenerate" - produce a fresh take on the same brief
 *   action "alter"      - edit this specific text against the operator's note
 *
 * Alter rewrites in place so the queue does not fill up with variants;
 * regenerate can either replace or branch into a new item.
 */
export async function POST(req: NextRequest) {
  try {
    const { id, action = "alter", prompt, replace = true } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Content ID required" }, { status: 400 });
    }
    if (action === "alter" && !String(prompt || "").trim()) {
      return NextResponse.json(
        { error: "A prompt is required to alter content" },
        { status: 400 }
      );
    }

    const original = await getContentById(id);
    if (!original) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (action === "regenerate") {
      // Stories are not in contentTemplates, so generateContent cannot make
      // one. A fresh take keeps the shape the operator already chose.
      const fresh =
        original.type === "story"
          ? (await generateStories(prompt, original.storyFrames?.length))[0]
          : await generateContent(
              original.type,
              original.theme,
              undefined,
              original.agentId || "manual",
              prompt,
              {
                durationSec: original.durationSec,
                count: original.type === "carousel" ? original.slides?.length : undefined,
              }
            );

      if (replace) {
        // Keep the id so the card the operator is looking at updates in
        // place, and render under that same id (not fresh's own, discarded
        // one) so the seeded look this produces matches whatever a later
        // re-render would pick for this row.
        const rendered = await autoRenderContent({ ...fresh, id });
        const updated = await patchContent(id, {
          title: rendered.title,
          caption: rendered.caption,
          hashtags: rendered.hashtags,
          slides: rendered.slides,
          reelScript: rendered.reelScript,
          durationSec: rendered.durationSec,
          storyFrames: rendered.storyFrames,
          svgCode: rendered.svgCode,
          status: "pending",
          imageUrls: rendered.imageUrls || [],
        });
        await flushHistory();
        return NextResponse.json({ content: updated && stripArt((await redrawFreedom(updated)) as ContentItem), action, replaced: true });
      }

      const branched: ContentItem = await autoRenderContent({ ...fresh, id: `${Date.now()}-alt` });
      const verdict = checkDuplicate(branched, await getContent(2));
      await addContent(branched);
      await flushHistory();
      return NextResponse.json({
        content: branched,
        action,
        replaced: false,
        duplicateScore: Number(verdict.score.toFixed(3)),
      });
    }

    // --- alter -------------------------------------------------------------
    if (getProvider() === "none") {
      return NextResponse.json(
        {
          error:
            "Altering content needs a model. Set ANTHROPIC_API_KEY or GEMINI_API_KEY, " +
            "or edit the text by hand.",
        },
        { status: 400 }
      );
    }

    // Everything the direction is allowed to touch, shown to the model as the
    // current state. Editing only the caption used to leave a story's frames
    // untouched, so the artwork never reflected what was asked for.
    const editable: Record<string, unknown> = {
      title: original.title,
      caption: original.caption,
      hashtags: original.hashtags,
    };
    if (original.type === "story") editable.storyFrames = original.storyFrames || [];
    if (original.type === "carousel") editable.slides = original.slides || [];
    if (original.type === "reel") {
      editable.reelScript = original.reelScript || "";
      editable.durationSec = original.durationSec ?? DEFAULT_REEL_SEC;
    }

    const editPrompt = withSteer(
      `You are editing an existing ${original.type} for "The Resistance Night", a
social deduction party game. Keep the brand voice: lowercase, mysterious,
playful, slightly menacing, medieval fantasy meets party game.

This is the piece as it stands:
${JSON.stringify(editable, null, 2)}

Apply the direction below. You may change any of these fields, including
adding or removing story frames or carousel slides, renaming the title,
replacing the hashtags, or changing the reel duration in seconds.

Return ONLY a JSON object containing the fields you actually changed. Omit
every field you are leaving alone. Keep each field the same shape it has above.
${COPY_RULES}`,
      prompt
    );

    const raw = await callAI(editPrompt);
    if (!raw) {
      return NextResponse.json(
        { error: "The model did not return an edit. Try again or rephrase." },
        { status: 502 }
      );
    }

    const patch = buildPatch(original, raw);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "The model returned no usable change. Try rephrasing the direction." },
        { status: 502 }
      );
    }

    const updated = await patchContent(id, {
      ...patch,
      status: "pending",
      imageUrls: (await autoRenderContent({ ...original, ...patch, imageUrls: [] })).imageUrls || [],
    });

    return NextResponse.json({
      content: updated && stripArt((await redrawFreedom(updated)) as ContentItem),
      action,
      prompt,
      changed: Object.keys(patch),
    });
  } catch (error: any) {
    console.error("Alter error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to alter content" },
      { status: 500 }
    );
  }
}
