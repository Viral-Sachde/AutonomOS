const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The game app at the repo root has its own lockfile; pin tracing to this app.
  outputFileTracingRoot: path.join(__dirname),
  // resvg-js loads a platform-specific .node binary. Webpack cannot parse that,
  // so it has to stay an external require resolved at runtime.
  // Both ship a platform-specific binary that webpack cannot parse, so they
  // stay external requires resolved at runtime.
  serverExternalPackages: ["@resvg/resvg-js", "ffmpeg-static"],
  // The renderer reads .ttf files from disk at request time. Nothing imports
  // them, so tracing cannot discover them and the serverless bundle ships
  // without the directory, which makes every render throw and every publish
  // fail with no artwork uploaded. These globs put the fonts in the bundle.
  //
  // ffmpeg-static is the same problem again: lib/video.ts spawns the binary
  // by path instead of requiring it as a module, so tracing never sees it
  // either, and only /api/publish (the only caller of renderReelVideo) needs
  // it bundled. Without this, reel publishing fails in production with
  // "Could not start ffmpeg: spawn .../ffmpeg-static/ffmpeg ENOENT" even
  // though the exact same code runs fine wherever the package is installed.
  //
  // assets/audio is the same again: lib/video.ts reads whatever music files
  // are dropped there by path, at request time, so nothing imports them and
  // tracing cannot discover them either. The directory starts empty, so this
  // is a no-op bundle-wise until tracks are actually added - but without it,
  // adding tracks later would silently not ship them, the exact failure mode
  // already hit twice above.
  outputFileTracingIncludes: {
    "/api/publish": [
      "./assets/fonts/**",
      "./assets/audio/**",
      "./node_modules/ffmpeg-static/ffmpeg",
    ],
    "/api/render": ["./assets/fonts/**"],
    "/api/diagnostics": ["./assets/fonts/**"],
    "/api/alter": ["./assets/fonts/**"],
    "/api/generate": ["./assets/fonts/**"],
    // scheduled/ is the pre-made week of creatives, read by path at request time.
    "/api/cron/**": ["./assets/fonts/**", "./scheduled/**"],
    "/api/creatives": ["./scheduled/**"],
    "/api/creatives/media": ["./scheduled/**"],
  },
};

module.exports = nextConfig;
