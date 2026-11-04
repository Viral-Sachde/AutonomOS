import { NextRequest, NextResponse } from "next/server";
import { getContent, getContentById, deleteContent } from "@/lib/store";
import { deleteImagesByUrl } from "@/lib/supabase";
import { ContentItem } from "@/lib/design-system";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Removes content and the artwork rendered for it.
 *
 * Two shapes, because clearing out a backlog one card at a time is tedious:
 *
 *   { ids: ["..."] }                              delete these
 *   { olderThanDays: 30, statuses: ["rejected"] } delete everything matching
 *
 * A bulk request without any filter is refused rather than treated as "all",
 * so a malformed call cannot empty the queue. `published` is never included
 * unless it is asked for by name, since those are the records of what actually
 * went out.
 */

interface DeleteBody {
  ids?: string[];
  olderThanDays?: number;
  statuses?: ContentItem["status"][];
  /** Required to delete published items in a bulk request. */
  includePublished?: boolean;
  /** Preview the effect without removing anything. */
  dryRun?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as DeleteBody;
    const { ids, olderThanDays, statuses, includePublished, dryRun } = body;

    let targets: ContentItem[] = [];

    if (Array.isArray(ids) && ids.length > 0) {
      const found = await Promise.all(ids.map((id) => getContentById(id)));
      targets = found.filter((c): c is ContentItem => !!c);
    } else {
      const hasFilter =
        (Number.isFinite(olderThanDays) && Number(olderThanDays) >= 0) ||
        (Array.isArray(statuses) && statuses.length > 0);

      if (!hasFilter) {
        return NextResponse.json(
          { error: "Pass ids, or olderThanDays and/or statuses. Refusing to delete everything." },
          { status: 400 }
        );
      }

      // A generous window: this is a cleanup tool, so it has to be able to see
      // further back than the dashboard's default listing.
      targets = await getContent(120);

      if (Number.isFinite(olderThanDays)) {
        const cutoff = Date.now() - Number(olderThanDays) * 86_400_000;
        targets = targets.filter((c) => new Date(c.createdAt).getTime() < cutoff);
      }
      if (Array.isArray(statuses) && statuses.length > 0) {
        targets = targets.filter((c) => statuses.includes(c.status));
      }
      if (!includePublished) {
        targets = targets.filter((c) => c.status !== "published");
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({ deleted: 0, imagesRemoved: 0, items: [] });
    }

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        deleted: 0,
        wouldDelete: targets.length,
        images: targets.reduce((n, c) => n + (c.imageUrls?.length || 0), 0),
        items: targets.map((c) => ({ id: c.id, title: c.title, status: c.status, createdAt: c.createdAt })),
      });
    }

    const urls = targets.flatMap((c) => c.imageUrls || []);
    const imagesRemoved = await deleteImagesByUrl(urls);
    const deleted = await deleteContent(targets.map((c) => c.id));

    return NextResponse.json({
      deleted,
      imagesRemoved,
      items: targets.map((c) => ({ id: c.id, title: c.title })),
    });
  } catch (error: any) {
    console.error("Content delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete content" },
      { status: 500 }
    );
  }
}
