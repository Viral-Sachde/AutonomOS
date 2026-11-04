import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { loadSchedule, mediaPath } from "@/lib/scheduled-creatives";

export const dynamic = "force-dynamic";

/** Serves a scheduled item's media to the dashboard preview. Only manifest ids resolve, so no path is ever taken from the request. */
export async function GET(req: NextRequest) {
  const item = loadSchedule().find((i) => i.id === req.nextUrl.searchParams.get("id"));
  if (!item) return NextResponse.json({ error: "Unknown item" }, { status: 404 });

  const bytes = fs.readFileSync(mediaPath(item));
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": item.file.endsWith(".mp4") ? "video/mp4" : item.file.endsWith(".jpg") ? "image/jpeg" : "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
