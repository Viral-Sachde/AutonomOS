import { NextRequest, NextResponse } from "next/server";
import { getContentById, patchContent } from "@/lib/store";
import { templateOptions, stripArt } from "@/lib/design-system";
import { generateFreeArt } from "@/lib/freedom-ai";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { id, design } = await req.json();
    if (!id || !design || !["auto", "template", "freedom"].includes(design.mode)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (design.mode === "template" && !templateOptions.some((t) => t.id === design.template)) {
      return NextResponse.json({ error: "Unknown template" }, { status: 400 });
    }

    // Freedom is redrawn from scratch each time, so a new composition is a new
    // model generation rather than a new seed for a fixed layout.
    let art: (string | null)[] | null = null;
    let freeArt: "ai" | "procedural" | undefined;
    if (design.mode === "freedom") {
      const current = await getContentById(id);
      if (!current) return NextResponse.json({ error: "Content not found" }, { status: 404 });
      art = await generateFreeArt(current, undefined);
      freeArt = art ? "ai" : "procedural";
    }

    // Changing the art invalidates anything already rendered and uploaded.
    const updated = await patchContent(id, {
      design: {
        mode: design.mode,
        template: design.mode === "template" ? design.template : undefined,
        seed: Number.isFinite(design.seed) ? design.seed : undefined,
        art: art || undefined,
      },
      imageUrls: [],
    });
    if (!updated) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    return NextResponse.json({ content: stripArt(updated), freeArt });
  } catch (error: any) {
    console.error("Design error:", error);
    return NextResponse.json({ error: error.message || "Failed to save design" }, { status: 500 });
  }
}
