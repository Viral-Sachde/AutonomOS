import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/ai";
import { generateStories } from "@/lib/agents";
import { flushHistory } from "@/lib/history";
import { ContentItem, ContentType, DesignChoice, templateOptions, stripArt } from "@/lib/design-system";
import { generateFreeArt } from "@/lib/freedom-ai";
import { addContent } from "@/lib/store";
import { autoRenderContent } from "@/lib/render";

// Freedom asks the model to draw, which can take a while; Vercel clamps this to the plan limit.
export const maxDuration = 300;

/**
 * Artwork direction, separate from how the copy is written: pin one of the
 * templates, or let the model draw it from scratch. Applied before the
 * auto-render so the pictures match the choice. Returns how freedom was drawn.
 */
async function applyDesign(
  content: ContentItem,
  design: DesignChoice | undefined,
  steer: string | undefined
): Promise<"ai" | "procedural" | undefined> {
  if (!design || design.mode === "auto") return undefined;
  if (design.mode === "freedom") {
    // A fresh seed per piece is what makes every freedom output different.
    content.design = { mode: "freedom", seed: Math.floor(Math.random() * 1e9) };
    // Null means no AI provider (or every frame failed), so the procedural composer is used.
    const art = await generateFreeArt(content, typeof steer === "string" ? steer : undefined);
    if (art) content.design.art = art;
    return art ? "ai" : "procedural";
  }
  if (design.mode === "template" && templateOptions.some((t) => t.id === design.template)) {
    content.design = { mode: "template", template: design.template };
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, theme, roleId, design, steer, count, durationSec, mode } = body as {
      type: ContentType;
      theme?: string;
      roleId?: string;
      design?: DesignChoice;
      steer?: string;
      count?: number;
      durationSec?: number;
      mode?: "template" | "free";
    };

    if (!type || !["reel", "post", "carousel", "story"].includes(type)) {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    // Stories have no entry in contentTemplates, so they come from their own
    // generator. Routing them through generateContent threw "Unknown content
    // type" and made the story button in the forge fail outright.
    if (type === "story") {
      const stories = await generateStories(steer, count, theme, roleId, mode === "free" ? "free" : "template");
      let freeArt: "ai" | "procedural" | undefined;
      let first: ContentItem | undefined;
      for (const story of stories) {
        const item: ContentItem = { ...story, agentId: "manual" };
        freeArt = (await applyDesign(item, design, steer)) ?? freeArt;
        const rendered = await autoRenderContent(item);
        await addContent(rendered);
        first = first || rendered;
      }
      await flushHistory();
      return NextResponse.json({ content: first && stripArt(first), count: stories.length, freeArt });
    }

    // Hand-made from the dashboard, so it belongs to no scheduled agent.
    const content = await generateContent(type, theme, roleId, "manual", steer, {
      count,
      durationSec,
      mode: mode === "free" ? "free" : "template",
    });
    const freeArt = await applyDesign(content, design, steer);
    const rendered = await autoRenderContent(content);
    await addContent(rendered);
    await flushHistory();

    return NextResponse.json({ content: stripArt(rendered), freeArt });
  } catch (error: any) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
