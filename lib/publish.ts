import { ContentItem } from "./design-system";
import { getContentByStatus, patchContent, isStoreConfigured } from "./store";
import {
  publishToInstagram,
  publishCarouselToInstagram,
  publishStoryToInstagram,
  publishReelToInstagram,
  isInstagramConfigured,
  PublishResult,
} from "./instagram";
import { renderAndUpload } from "./render";
import { renderReelVideo } from "./video";
import { putVideo } from "./supabase";
import { isAgentEnabled } from "./agent-settings";

const NEVER_PUBLISH_AGENTS = ["hashtag-strategist", "analytics-reporter", "competitor-scout", "content-calendar"];

export interface PublishOutcome {
  content: ContentItem | null;
  instagram: PublishResult | null;
  imageUrls: string[];
  renderError: string | null;
}

/**
 * Everything /api/publish's POST handler used to do inline, factored out so
 * the peak-time auto-publish check below can reuse the exact same path
 * instead of a second, drifting copy of the same type-dispatch logic.
 */
export async function publishContentItem(
  content: ContentItem,
  opts: { skipSocial?: boolean; imageUrl?: string } = {}
): Promise<PublishOutcome> {
  // Internal reports are text for the operator, never creative. They are typed "post", so without this they get
  // rendered onto a background and published.
  if (content.agentId && NEVER_PUBLISH_AGENTS.includes(content.agentId)) {
    return {
      content,
      instagram: { success: false, platform: "instagram", error: `${content.agentId} output is an internal report and is never published.` },
      imageUrls: [],
      renderError: null,
    };
  }

  let imageUrls: string[] = opts.imageUrl ? [opts.imageUrl] : content.imageUrls || [];
  let renderError: string | null = null;

  if (imageUrls.length === 0 && isStoreConfigured()) {
    try {
      imageUrls = await renderAndUpload(content);
    } catch (e: any) {
      renderError = `Could not render or upload the artwork: ${e?.message || e}`;
      console.error("renderAndUpload failed:", e);
    }
  }

  let instagram: PublishResult | null = null;

  if (!opts.skipSocial && isInstagramConfigured()) {
    if (imageUrls.length === 0) {
      instagram = {
        success: false,
        platform: "instagram",
        error:
          renderError ||
          "No image available. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY so artwork can be rendered and hosted.",
      };
    } else if (content.type === "reel") {
      try {
        const video = await renderReelVideo(content);
        const videoUrl = await putVideo(
          `media/${content.createdAt.slice(0, 7)}/${content.id}-reel.mp4`,
          video.buffer
        );
        instagram = await publishReelToInstagram(content, videoUrl);
      } catch (e: any) {
        console.error("Reel video failed:", e);
        instagram = {
          success: false,
          platform: "instagram",
          error: `Could not build the reel video: ${e?.message || e}`,
        };
      }
    } else if (content.type === "story") {
      instagram = await publishStoryToInstagram(content, imageUrls);
    } else if (content.type === "carousel" && imageUrls.length >= 2) {
      instagram = await publishCarouselToInstagram(content, imageUrls);
    } else {
      instagram = await publishToInstagram(content, imageUrls[0]);
    }
  }

  const succeeded = !instagram || instagram.success;
  const updated = await patchContent(content.id, {
    status: succeeded ? "published" : content.status,
    imageUrls,
    publishedAt: succeeded ? new Date().toISOString() : undefined,
  });

  return { content: updated, instagram, imageUrls, renderError };
}

/** Virtual id in the same agent_state store the per-agent toggles use (see lib/agent-settings.ts) - not a real content agent, just reusing its on/off persistence. */
const AUTO_PUBLISH_ID = "auto-publish";

export async function isAutoPublishEnabled(): Promise<boolean> {
  return isAgentEnabled(AUTO_PUBLISH_ID);
}

/**
 * Publishes whatever approved content is due. Called from the morning and
 * midday cron routes rather than its own schedule: Vercel's free plan caps a
 * project at a couple of cron jobs fired once a day each, so a dedicated
 * third slot just for this was not available - bundling it into the two
 * slots that already exist, timed near the two peak windows, is what fits.
 *
 * Capped per call, and deliberately small: even one non-reel publish can
 * poll Instagram for up to ~24s before the image finishes processing, a
 * reel considerably longer, and this runs inside the same 60s-ceiling
 * request as that cron's content-generation batch. Two due items plus a
 * batch of agent calls is already a tight fit; whatever does not get to run
 * this time is still due next time, just a bit later.
 */
export async function publishDueContent(limit = 2): Promise<{
  checked: number;
  due: number;
  published: number;
  failed: { id: string; error: string }[];
}> {
  if (!(await isAutoPublishEnabled())) {
    return { checked: 0, due: 0, published: 0, failed: [] };
  }

  const approved = await getContentByStatus("approved");
  const now = Date.now();
  const due = approved.filter((c) => c.scheduledFor && new Date(c.scheduledFor).getTime() <= now);

  let published = 0;
  const failed: { id: string; error: string }[] = [];

  for (const item of due.slice(0, limit)) {
    try {
      const outcome = await publishContentItem(item);
      if (!outcome.instagram || outcome.instagram.success) {
        published++;
      } else {
        failed.push({ id: item.id, error: outcome.instagram.error || "unknown error" });
      }
    } catch (e: any) {
      failed.push({ id: item.id, error: e?.message || String(e) });
    }
  }

  return { checked: approved.length, due: due.length, published, failed };
}
