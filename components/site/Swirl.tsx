"use client";

import { useEffect, useRef } from "react";

/**
 * The AutonomOS backdrop: marbled contour bands (slate, bronze, teal, cream,
 * periwinkle) flowing over a starry night, rendered live in a WebGL shader.
 *
 * Domain-warped fractal noise gives the flowing shapes; quantising it into
 * bands with thin outlines gives the poster look; stars and grain finish it.
 * It pauses offscreen, honours reduced motion with a single still frame, and
 * falls back to the parent's CSS background when WebGL is unavailable.
 */

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform float uScale;
uniform vec2 uMouse;
uniform vec3 uAccent;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02 + 3.1; a *= 0.5; }
  return v;
}
float fbm3(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = r * p * 2.0 + 1.7; a *= 0.5; }
  return v / 0.875;
}
float band(float v, float a, float b){ float e = max(fwidth(v) * 0.9, 0.0006); return smoothstep(a - e, a + e, v) - smoothstep(b - e, b + e, v); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime * 0.035;
  vec2 m = uMouse * vec2(uRes.x / uRes.y, 1.0);
  float pull = exp(-6.0 * dot(uv - m, uv - m)) * 0.35;

  vec2 p = uv * uScale * 0.55 + uSeed * 7.13;
  vec2 q = vec2(fbm3(p + vec2(0.0, t)), fbm3(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm3(p + 2.0 * q + vec2(1.7, 9.2) + t * 0.6 + pull), fbm3(p + 2.0 * q + vec2(8.3, 2.8) - t * 0.4));
  float v = fbm3(p + 2.2 * r);

  vec3 night  = vec3(0.020, 0.020, 0.020);
  vec3 slate  = vec3(0.165, 0.176, 0.200);
  vec3 bronze = vec3(0.612, 0.420, 0.278);
  vec3 teal   = vec3(0.310, 0.659, 0.608);
  vec3 cream  = vec3(0.929, 0.894, 0.812);

  vec3 col = night;
  // Stars twinkle only in open night.
  vec2 cell = floor(gl_FragCoord.xy / 3.0);
  float s = hash(cell + uSeed);
  float tw = 0.6 + 0.4 * sin(uTime * 1.3 + s * 40.0);
  col += step(0.9975, s) * tw * 0.9;

  col = mix(col, slate,   band(v, 0.600, 0.636));
  col = mix(col, bronze,  band(v, 0.636, 0.652));
  col = mix(col, teal,    band(v, 0.652, 0.678));
  col = mix(col, cream,   band(v, 0.678, 0.698));
  col = mix(col, teal,    band(v, 0.698, 0.704));
  col = mix(col, cream,   band(v, 0.704, 0.716));
  col = mix(col, uAccent, band(v, 0.716, 0.770));
  col = mix(col, cream,   band(v, 0.770, 0.788));
  col = mix(col, teal,    band(v, 0.788, 0.794));
  col = mix(col, cream,   band(v, 0.794, 0.810));
  col = mix(col, uAccent, band(v, 0.810, 2.000));

  // Film grain.
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.07;
  gl_FragColor = vec4(col, 1.0);
}`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export default function Swirl({
  seed = 1,
  scale = 1.5,
  speed = 1,
  accent = "#6E8CCB",
  interactive = true,
  className = "",
}: {
  seed?: number;
  scale?: number;
  speed?: number;
  accent?: string;
  interactive?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ seed, scale, speed, accent });
  live.current = { seed, scale, speed, accent };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    // Needed for fwidth(), which keeps band edges one pixel crisp at any zoom.
    if (!gl.getExtension("OES_standard_derivatives")) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uTime = u("uTime"), uSeed = u("uSeed"), uScale = u("uScale"), uMouse = u("uMouse"), uAccent = u("uAccent");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -5, y: -5, tx: -5, ty: -5 };
    let visible = true;
    let raf = 0;
    let clock = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };

    const draw = () => {
      resize();
      const now = performance.now();
      clock += ((now - last) / 1000) * live.current.speed;
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, clock + 20);
      gl.uniform1f(uSeed, live.current.seed);
      gl.uniform1f(uScale, live.current.scale);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform3f(uAccent, ...hexToRgb(live.current.accent));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      if (visible) draw();
      raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = performance.now();
    });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      if (!interactive) return;
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    };
    const onLeave = () => { mouse.tx = -5; mouse.ty = -5; };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    if (reduced) {
      draw();
      const onResize = () => draw();
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        io.disconnect();
      };
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive]);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
