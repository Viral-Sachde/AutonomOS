import { ContentItem, ContentType, Improvement } from "./design-system";
import { generateContent, generateImprovements } from "./ai";
import { setCurrentAgent } from "./ai-provider";
import {
  generateStories,
  generateHashtagStrategy,
  generateAnalyticsReport,
  generateCompetitorReport,
  generateConceptPolish,
  generateTrendContent,
  generateContentCalendar,
  generateIllustrations,
} from "./agents";
import { addContent, addImprovement, getContent } from "./store";
import { isAgentEnabled, recordAgentRun } from "./agent-settings";
import { autoRenderContent } from "./render";
import { flushHistory } from "./history";
import { checkDuplicate, DuplicateVerdict } from "./dedup";

/**
 * Single place where an agent is actually executed.
 *
 * Every scheduled agent goes through here so that four things are guaranteed in
 * one spot: the operator's on/off switch is honoured, output is stamped with the
 * agent that produced it, near-duplicates are caught before they reach the
 * queue, and one agent's failure never aborts the rest of the batch.
 */

type Producer = (steer?: string, count?: number) => Promise<{
  content?: ContentItem[];
  improvements?: Improvement[];
}>;

const producers: Record<string, Producer> = {
  // One of the three is written without a template each run, so the feed keeps
  // a reliable house baseline while still getting pieces a formula would never
  // produce. Which one rotates, so no format is always the freewheeling one.
  "content-writer": async (steer) => {
    const freeIndex = Math.floor(Math.random() * 3);
    const types: ContentType[] = ["reel", "post", "carousel"];

    const content: ContentItem[] = [];
    for (const [i, type] of types.entries()) {
      content.push(
        await generateContent(type, undefined, undefined, "content-writer", steer, {
          mode: i === freeIndex ? "free" : "template",
        })
      );
    }
    return { content };
  },
  // Retired: it produced a text report typed as a "post", which then got rendered onto a background and published.
  // Kept as a no-op so the cron route and dashboard entry do not break.
  "hashtag-strategist": async () => ({ content: [] }),
  "story-generator": async (steer, count) => ({ content: await generateStories(steer, count) }),
  "analytics-reporter": async (steer) => ({ content: [await generateAnalyticsReport(steer)] }),
  "competitor-scout": async (steer) => ({ content: [await generateCompetitorReport(steer)] }),
  "code-improver": async (steer) => ({ improvements: await generateImprovements(steer) }),
  "concept-polisher": async (steer) => ({ improvements: await generateConceptPolish(steer) }),
  "trend-rider": async (steer) => ({ content: await generateTrendContent(steer) }),
  "content-calendar": async (steer) => ({ content: [await generateContentCalendar(steer)] }),
  "illustration-studio": async (steer) => ({ content: await generateIllustrations(steer) }),
};

export function knownAgentIds(): string[] {
  return Object.keys(producers);
}

export interface AgentRunResult {
  agentId: string;
  ran: boolean;
  count: number;
  skipped?: string;
  error?: string;
  /** Items rejected as near-duplicates of something already stored. */
  duplicatesRejected?: { title: string; score: number; matchedTitle?: string }[];
  items?: ContentItem[];
}

export interface RunOptions {
  /** Operator's ad-hoc direction for this run. */
  steer?: string;
  /** Run even when the agent is switched off (a manual run from the UI). */
  force?: boolean;
  /** Skip near-duplicate filtering. */
  allowDuplicates?: boolean;
  /**
   * Explicit number of frames or slides to produce. Set from the dashboard, it
   * overrides anything the agent would otherwise infer from the steer text.
   */
  count?: number;
}

export async function runAgent(
  agentId: string,
  opts: RunOptions = {}
): Promise<AgentRunResult> {
  const produce = producers[agentId];
  if (!produce) {
    return { agentId, ran: false, count: 0, skipped: "unknown agent" };
  }

  if (!opts.force && !(await isAgentEnabled(agentId))) {
    return { agentId, ran: false, count: 0, skipped: "disabled" };
  }

  try {
    setCurrentAgent(agentId);
    const { content = [], improvements = [] } = await produce(opts.steer, opts.count);

    // Compare against what is already stored so the feed does not fill up with
    // the same idea reworded every morning.
    const existing = opts.allowDuplicates ? [] : await getContent(2);
    const kept: ContentItem[] = [];
    const rejected: { title: string; score: number; matchedTitle?: string }[] = [];

    for (const item of content) {
      const stamped = { ...item, agentId };
      const verdict: DuplicateVerdict = opts.allowDuplicates
        ? { isDuplicate: false, score: 0 }
        : checkDuplicate(stamped, [...existing, ...kept]);

      if (verdict.isDuplicate) {
        rejected.push({
          title: stamped.title,
          score: Number(verdict.score.toFixed(3)),
          matchedTitle: verdict.matchedTitle,
        });
        continue;
      }

      const rendered = await autoRenderContent(stamped);
      await addContent(rendered);
      kept.push(rendered);
    }

    for (const item of improvements) {
      await addImprovement(item);
    }

    const count = kept.length + improvements.length;
    await recordAgentRun(agentId, count);

    return {
      agentId,
      ran: true,
      count,
      items: kept,
      duplicatesRejected: rejected.length ? rejected : undefined,
    };
  } catch (e: any) {
    const error = e?.message || String(e);
    console.error(`Agent ${agentId} failed:`, e);
    await recordAgentRun(agentId, 0, error);
    return { agentId, ran: false, count: 0, error };
  }
}

/**
 * Runs a batch sequentially. Sequential rather than parallel on purpose: the
 * store commits to a single git repo, and concurrent writes to the same file
 * just burn retries on 409s.
 */
export async function runAgents(
  agentIds: string[],
  opts: RunOptions = {}
): Promise<AgentRunResult[]> {
  const results: AgentRunResult[] = [];
  for (const id of agentIds) {
    results.push(await runAgent(id, opts));
  }
  await flushHistory();
  return results;
}

export function summarize(results: AgentRunResult[]) {
  const duplicates = results.flatMap((r) => r.duplicatesRejected || []);
  return {
    count: results.reduce((sum, r) => sum + r.count, 0),
    ran: results.filter((r) => r.ran).map((r) => r.agentId),
    skipped: results.filter((r) => r.skipped).map((r) => `${r.agentId}: ${r.skipped}`),
    errors: results.filter((r) => r.error).map((r) => `${r.agentId}: ${r.error}`),
    duplicatesRejected: duplicates.length ? duplicates : undefined,
    results,
  };
}

/** Shared cron auth. Returns null when the request is allowed through. */
export function checkCronAuth(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // unset means open, which is only sane locally

  const header = req.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
