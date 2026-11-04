import { NextRequest, NextResponse } from "next/server";
import { getContentById } from "@/lib/store";
import { composeImages, renderPng } from "@/lib/render";
import { DesignChoice } from "@/lib/design-system";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Renders one frame of an item's artwork as a PNG, on demand. The dashboard
 * points <img> tags here so every card shows its real artwork the moment it
 * exists - nothing to click to render. Query params (`mode`, `template`,
 * `seed`) override the stored design so a picker can preview before saving.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const id = q.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const item = await getContentById(id);
  if (!item) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const mode = q.get("mode");
  if (mode === "auto" || mode === "template" || mode === "freedom") {
    const design: DesignChoice = {
      mode,
      template: q.get("template") || undefined,
      seed: q.get("seed") ? Number(q.get("seed")) : undefined,
    };
    item.design = design;
  }

  try {
    const frames = composeImages(item);
    const i = Math.max(0, Math.min(frames.length - 1, Number(q.get("i")) || 0));
    const png = renderPng(frames[i].svg);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "X-Frame-Count": String(frames.length),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e: any) {
    console.error("Preview error:", e);
    return NextResponse.json({ error: e.message || "Preview failed" }, { status: 500 });
  }
}
