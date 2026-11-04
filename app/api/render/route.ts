import { NextRequest, NextResponse } from "next/server";
import { getContentById, patchContent } from "@/lib/store";
import { renderAndUpload } from "@/lib/render";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Renders a piece's artwork and stores the public URLs on it.
 *
 * Artwork used to be produced only while publishing, so the review queue
 * showed nothing but text and there was no way to see what was about to go
 * out. Rendering is on demand rather than automatic at generation time:
 * pieces that get rejected never cost any storage, which matters on the free
 * tier where the PNGs are what fills the quota.
 */
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Content ID required" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "Artwork needs somewhere to live. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 400 }
      );
    }

    const content = await getContentById(id);
    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const imageUrls = await renderAndUpload(content);
    const updated = await patchContent(id, { imageUrls });

    return NextResponse.json({ content: updated, imageUrls });
  } catch (error: any) {
    console.error("Render error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to render artwork" },
      { status: 500 }
    );
  }
}
