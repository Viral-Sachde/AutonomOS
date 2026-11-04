import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import { ContentItem } from "./design-system";
import { composeImages, renderPng, reelBeats } from "./render";

/**
 * Builds the MP4 a reel needs.
 *
 * Instagram will not accept a still image as a reel, and nothing else here
 * produces video, so reels used to go out as square feed posts. This renders
 * the script's beats as 9:16 cards and holds each on screen for its share of
 * the runtime, cutting between them.
 *
 * Constraints this works inside: a serverless function with a 60 second
 * ceiling and a writable /tmp only. Encoding settings are chosen for speed
 * over file size, since the input is a handful of still frames and the whole
 * job has to finish inside one request.
 */

/** Instagram's floor for reel width. Frames are already 1080 wide. */
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Instagram's Graph API has no way to attach its own trending/licensed music
// catalogue to a Reel published through the API - that only exists in the
// app's own editor. A royalty-free track baked into the video file before
// upload is the only audio a third-party publish can control. Drop files
// here (see assets/audio/README.md) and they are picked up automatically;
// an empty directory falls back to the silent track Instagram requires at a
// minimum, so this is safe to ship before any tracks exist.
const MUSIC_DIR = path.join(process.cwd(), "assets", "audio");
const MUSIC_EXT = new Set([".mp3", ".m4a", ".wav", ".ogg"]);

function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Picks a track deterministically from whatever the operator has dropped in
 * assets/audio, so re-rendering the same reel keeps the same music instead
 * of reshuffling it. Returns null when the directory does not exist or is
 * empty, which the caller treats as "no music supplied yet".
 */
async function pickMusicTrack(item: ContentItem): Promise<string | null> {
  let entries: string[];
  try {
    entries = await fs.readdir(MUSIC_DIR);
  } catch {
    return null;
  }
  const files = entries.filter((f) => MUSIC_EXT.has(path.extname(f).toLowerCase())).sort();
  if (files.length === 0) return null;
  const idx = hashId(item.id || item.title) % files.length;
  return path.join(MUSIC_DIR, files[idx]);
}

export interface ReelVideo {
  buffer: Buffer;
  durationSec: number;
  beats: number;
  track: string | null;
}

function ffmpegBinary(): string {
  const bin = ffmpegPath as unknown as string | null;
  if (!bin) {
    throw new Error(
      "ffmpeg binary not found. Check that ffmpeg-static installed and is listed in serverExternalPackages."
    );
  }
  return bin;
}

function run(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      // Keep only the tail: ffmpeg is extremely chatty and the error is last.
      stderr = (stderr + chunk.toString()).slice(-4000);
    });

    proc.on("error", (e) => reject(new Error(`Could not start ffmpeg: ${e.message}`)));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

export async function renderReelVideo(item: ContentItem): Promise<ReelVideo> {
  const frames = composeImages(item);
  if (frames.length === 0) {
    throw new Error("The reel has no frames to show");
  }

  const totalSec = Math.max(3, Math.min(90, item.durationSec || 30));
  const perBeat = totalSec / frames.length;

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "reel-"));

  try {
    const pngPaths: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const file = path.join(dir, `beat-${String(i).padStart(3, "0")}.png`);
      await fs.writeFile(file, renderPng(frames[i].svg));
      pngPaths.push(file);
    }

    // The concat demuxer holds each still for its own duration. The last entry
    // is repeated without a duration because ffmpeg ignores the final one.
    const listLines: string[] = [];
    for (const file of pngPaths) {
      listLines.push(`file '${file.replace(/'/g, "'\\''")}'`);
      listLines.push(`duration ${perBeat.toFixed(3)}`);
    }
    listLines.push(`file '${pngPaths[pngPaths.length - 1].replace(/'/g, "'\\''")}'`);

    const listPath = path.join(dir, "beats.txt");
    await fs.writeFile(listPath, listLines.join("\n"));

    const outPath = path.join(dir, "reel.mp4");
    const track = await pickMusicTrack(item);

    // A music file is looped indefinitely (it may be shorter than the reel)
    // and -shortest below trims the output to the video's actual length
    // either way, so this works whether the track is longer or shorter than
    // the reel. No track supplied yet falls back to the silent stream
    // Instagram requires at a minimum.
    const audioInput = track
      ? ["-stream_loop", "-1", "-i", track]
      : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"];
    const fadeOutStart = Math.max(0, totalSec - 1.5).toFixed(2);
    const audioFilter = track
      ? ["-af", `afade=t=in:d=0.6,afade=t=out:st=${fadeOutStart}:d=1.5,volume=0.85`]
      : [];

    await run(ffmpegBinary(), [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      ...audioInput,
      "-shortest",
      "-vf", `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      ...audioFilter,
      "-r", String(FPS),
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "26",
      "-c:a", "aac",
      "-b:a", "96k",
      // Puts the index first so Instagram can start reading before the whole
      // file has downloaded.
      "-movflags", "+faststart",
      outPath,
    ]);

    const buffer = await fs.readFile(outPath);
    if (buffer.length === 0) throw new Error("ffmpeg produced an empty file");

    return { buffer, durationSec: totalSec, beats: frames.length, track: track ? path.basename(track) : null };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** How many beats a reel will cut between, without rendering anything. */
export function reelBeatCount(item: ContentItem): number {
  return reelBeats(item).length;
}
