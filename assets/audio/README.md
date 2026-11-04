# Reel background music

Drop royalty-free instrumental tracks here (`.mp3`, `.m4a`, `.wav` or
`.ogg`) and every reel published after that automatically gets one mixed in
as its audio track, replacing the silent track Instagram otherwise requires.
No code change needed - `lib/video.ts` picks up whatever is in this
directory at render time.

This directory starts empty on purpose: reels fall back to silence until
tracks exist here, so nothing breaks before you add any.

## What to add

- Instrumental only - no vocals, since on-screen text is already carrying
  the copy and a voice in the mix would compete with it.
- Mood that fits the brand: dark, medieval, mysterious, a little tense.
  Orchestral, tavern/folk, or dark ambient all work.
- Any length. Shorter than the reel loops automatically; longer gets
  trimmed to the reel's length, with a short fade in and out either way.
- Make sure you actually have the right to use each track in a published
  video (your own license purchase, a royalty-free library's commercial
  license, or a Creative Commons track whose terms allow this). Check
  licensing per track before adding it here - this is on you, not something
  the code checks.

## How a track is picked

Deterministic per reel (hashed from the content id), so re-rendering the
same reel keeps the same track instead of reshuffling it on every retry.
With multiple tracks in here, different reels land on different ones.

## Naming

Filenames don't matter beyond the extension - name them however helps you
keep track of what's in here.
