import { NextRequest, NextResponse } from "next/server";
import { getContentById, isStoreConfigured } from "@/lib/store";
import { isInstagramConfigured } from "@/lib/instagram";
import { publishContentItem } from "@/lib/publish";
import { stripArt } from "@/lib/design-system";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { id, skipSocial, imageUrl } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Content ID required" }, { status: 400 });
    }

    const content = await getContentById(id);
    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Published is allowed through so a post that failed at Instagram, or one
    // worth sending again, can be retried without regenerating it.
    if (content.status !== "approved" && content.status !== "published") {
      return NextResponse.json(
        { error: "Content must be approved before publishing" },
        { status: 400 }
      );
    }

    const outcome = await publishContentItem(content, { skipSocial, imageUrl });

    return NextResponse.json({
      content: outcome.content ? stripArt(outcome.content) : outcome.content,
      instagram: outcome.instagram,
      imageUrls: outcome.imageUrls,
      renderError: outcome.renderError,
      instagramConfigured: isInstagramConfigured(),
      storeConfigured: isStoreConfigured(),
    });
  } catch (error: any) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    instagram: isInstagramConfigured(),
    store: isStoreConfigured(),
  });
}
