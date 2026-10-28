# Landing page media

The landing page story (`components/cinematic/`) uses **no third-party media**. Everything is original and
lives in this repo, so there is nothing to license and nothing to replace before launch.

| What | Where | How it is made | Size |
|---|---|---|---|
| 3D construction site (trucks, mixer, bricklayers, tiling, painters, electrician, hotel bathroom, skyline) | `components/cinematic/scene/*.tsx` | Built in code with three.js / React Three Fiber primitives; custom GLSL in `scene/shaders.ts` (sky, city windows, bath water, falling stream) | ~0 KB of assets, JS loaded lazily |
| Chapter posters, landscape | `public/cinematic/chapter-<0..8>.webp` | Rendered from the 3D scene at 1920x1080 | 55-150 KB each |
| Chapter posters, portrait | `public/cinematic/chapter-<0..8>-portrait.webp` | Rendered from the 3D scene at 430x900 @2x | 20-75 KB each |

Posters are the LCP image on first paint, the whole story on phones and low-power devices, and the
reduced-motion version.

## Re-rendering the posters after changing the scene
1. `npm run dev` in `apps/buyer-web` (port 3001).
2. Open `http://localhost:3001/?still=<chapter>` (development only) to see the bare 3D stage frozen at that chapter.
3. Capture each chapter at 1920x1080 and at 430x900 (device scale 2) as WebP, quality ~82, into
   `public/cinematic/` with the names above. Any headless Chrome screenshot tool works.

## Optional upgrade: filmed footage
If the team later shoots or licenses real video (for example a hero clip of a site at golden hour), use:
- `public/cinematic/hero.mp4` (H.264) and `hero.webm` (VP9), 720p, under 3 MB, 8-12 s seamless loop, no audio.
- Record the source and licence (Pexels/Mixkit licence or "owned by BuildX") in this file.
- Keep the poster for the first paint and keep the 3D/poster fallbacks for phones and reduced motion.
Do not use footage, logos or copy from other brands.
