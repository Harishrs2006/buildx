'use client';

import { useEffect, useRef } from 'react';
import { CHAPTERS, LAST_CHAPTER, photoUrl } from './chapters';
import type { StoryProgress } from './useChapterScroll';

// Full-screen WebGL stage for the landing story: the chapter photos with a slow scroll-driven
// push-in, a little pointer parallax, and a liquid noise dissolve from one photo to the next.
// Plain WebGL 1 (no 3D library); loaded lazily and only for the "full" motion tier.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uSizeA;
uniform vec2 uSizeB;
uniform vec2 uFocusA;
uniform vec2 uFocusB;
uniform vec2 uView;
uniform vec2 uPointer;
uniform float uMix;
uniform float uTime;
uniform float uZoomA;
uniform float uZoomB;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
// object-fit: cover, zoomed, centred on the focus point but never past the photo edge
vec2 cover(vec2 uv, vec2 size, vec2 focus, float zoom, vec2 shift) {
  float rv = uView.x / uView.y;
  float ri = size.x / size.y;
  vec2 s = rv > ri ? vec2(1.0, ri / rv) : vec2(rv / ri, 1.0);
  vec2 win = s / zoom;
  vec2 c = clamp(focus + shift, win * 0.5, 1.0 - win * 0.5);
  return c + (uv - 0.5) * win;
}
void main() {
  float t = uMix;
  float wave = sin(t * 3.14159);
  vec2 flow = vec2(fbm(vUv * 4.0 + uTime * 0.05) - 0.5, fbm(vUv * 4.0 + 7.3 - uTime * 0.04) - 0.5) * 0.08 * wave;
  vec2 par = uPointer * 0.012;
  vec3 a = texture2D(uA, cover(vUv + flow, uSizeA, uFocusA, uZoomA, par)).rgb;
  vec3 b = texture2D(uB, cover(vUv - flow, uSizeB, uFocusB, uZoomB, par)).rgb;
  float n = fbm(vUv * vec2(3.0, 2.0) + vec2(0.0, uTime * 0.03));
  float edge = n * 0.85 + (1.0 - vUv.y) * 0.15;
  float m = smoothstep(edge - 0.12, edge + 0.12, t * 1.24 - 0.12);
  vec3 col = mix(a, b, m);
  // a faint signal-lime seam rides the dissolve front
  float seam = (1.0 - abs(m * 2.0 - 1.0)) * wave;
  col += seam * vec3(0.78, 1.0, 0.24) * 0.16;
  gl_FragColor = vec4(col, 1.0);
}`;

type Tex = { tex: WebGLTexture; w: number; h: number };

function parseFocus(focus?: string): [number, number] {
  const [x = '50%', y = '50%'] = (focus ?? '').split(/\s+/);
  // CSS object-position measures y from the top; texture space measures from the bottom
  return [parseFloat(x) / 100, 1 - parseFloat(y) / 100];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function PhotoStage({
  progress,
  active,
  onReady,
}: {
  progress: StoryProgress;
  active: boolean;
  onReady?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const readyCb = useRef(onReady);
  readyCb.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('[PhotoStage] shader:', gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[PhotoStage] link:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const U = {
      a: u('uA'), b: u('uB'), sizeA: u('uSizeA'), sizeB: u('uSizeB'), focusA: u('uFocusA'), focusB: u('uFocusB'),
      view: u('uView'), pointer: u('uPointer'), mix: u('uMix'), time: u('uTime'), zoomA: u('uZoomA'), zoomB: u('uZoomB'),
    };
    gl.uniform1i(U.a, 0);
    gl.uniform1i(U.b, 1);

    const focus = CHAPTERS.map((c) => parseFocus(c.focus));
    const textures = new Map<string, Tex>();
    const loading = new Set<string>();
    const width = window.innerWidth * Math.min(window.devicePixelRatio, 1.5) > 1300 ? 1920 : 1200;

    const load = (i: number) => {
      const src = CHAPTERS[i]?.photo;
      if (!src || textures.has(src) || loading.has(src)) return;
      loading.add(src);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        textures.set(src, { tex, w: img.naturalWidth, h: img.naturalHeight });
        loading.delete(src);
      };
      img.onerror = () => loading.delete(src);
      img.src = photoUrl(src, width);
    };
    load(0);
    load(1);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    let raf = 0;
    let announced = false;
    const start = performance.now();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!activeRef.current) return;
      const p = Math.min(Math.max(progress.current, 0), LAST_CHAPTER);
      const i = Math.min(Math.floor(p), Math.max(LAST_CHAPTER - 1, 0));
      const f = p - i;
      const j = Math.min(i + 1, LAST_CHAPTER);
      load(i);
      load(j);
      load(j + 1);
      const A = textures.get(CHAPTERS[i].photo!);
      const B = textures.get(CHAPTERS[j].photo!);
      if (!A) return;

      const time = (performance.now() - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      // hold on each photo, then dissolve in the middle of the scroll step
      const t = B ? smooth(0.2, 0.8, f) : 0;
      const drift = Math.sin(time * 0.15) * 0.01;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, A.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, (B ?? A).tex);
      gl.uniform2f(U.sizeA, A.w, A.h);
      gl.uniform2f(U.sizeB, (B ?? A).w, (B ?? A).h);
      gl.uniform2f(U.focusA, focus[i][0], focus[i][1]);
      gl.uniform2f(U.focusB, focus[j][0], focus[j][1]);
      gl.uniform2f(U.view, canvas.width, canvas.height);
      gl.uniform2f(U.pointer, pointer.x, pointer.y);
      gl.uniform1f(U.mix, t);
      gl.uniform1f(U.time, time);
      // the current photo keeps pushing in; the next one arrives from further out and settles
      gl.uniform1f(U.zoomA, 1.08 + 0.08 * f + drift);
      gl.uniform1f(U.zoomB, 1.08 + 0.12 * (1 - t) + drift);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!announced) {
        announced = true;
        readyCb.current?.();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      // free GPU memory but keep the context: React may re-run this effect on the same canvas
      // (Strict Mode), and getContext would then hand back a lost context
      textures.forEach((t) => gl.deleteTexture(t.tex));
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, [progress]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
