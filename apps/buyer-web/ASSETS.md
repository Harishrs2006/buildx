# Landing page media

The landing page story (`components/cinematic/`) is built from one photo per chapter. Each photo is
listed in `components/cinematic/chapters.ts`; a chapter without a photo is left out of the story
automatically, so adding a photo is all it takes to switch a chapter on.

## Photos in use (`public/cinematic/`)

| File | Chapter | Scene | Source |
|---|---|---|---|
| `hero.jpg` | Hero, and the closing chapter for now | Indian construction site at golden hour: tower crane, concrete frame, mixer and tipper trucks, workers in hi-vis walking | AI-generated for BuildX with Canva AI (Magic Media), 2026-10-28 |
| `trucks.jpg` | Delivery | Supervisor waving a truck loaded with steel bars through the site gate | AI-generated, Canva AI, 2026-10-28 |
| `concrete.jpg` | Concrete | Transit mixer pouring concrete down a chute onto rebar mesh, workers spreading it | AI-generated, Canva AI, 2026-10-28 |
| `bricks.jpg` | Masonry | Worker tossing a brick to a mason laying a red brick wall | AI-generated, Canva AI, 2026-10-28 |
| `interiors.jpg` | Interiors | Tile layer setting large vitrified tiles, plywood and tile boxes behind | AI-generated, Canva AI, 2026-10-28 |

All photos are 1680x944 JPG (~220-470 KB). They are served through the Next.js image optimiser
(`next/image` and `photoUrl()` in `chapters.ts`), which resizes them per screen and converts them to
WebP/AVIF, so visitors never download the originals. These are generated images, not photos of real
BuildX suppliers or sites, and they contain no brand names or logos.

## Still to add (chapter is hidden until its photo exists)

| File | Chapter | Scene to create |
|---|---|---|
| `paint.jpg` | Paint | Painters on rope-access seats rolling bold colours onto a building facade |
| `electrical.jpg` | Electrical | Electrician on a ladder at dusk, distribution board wiring, colourful string lights glowing |
| `plumbing.jpg` | Plumbing | Five-star hotel bathroom, gold tap filling a freestanding tub, rain shower behind glass, plumber checking a fitting |
| `skyline.jpg` | Closing chapter | Indian city skyline at dusk, new towers with lit windows, cranes on a tower nearing completion |

To add one: save a landscape photo (at least 1600 px wide, 16:9) as `public/cinematic/<file>`, set
`photo: '/cinematic/<file>'` (and optionally `focus`) on that chapter in `chapters.ts`. For the skyline,
replace the hero photo on the `skyline` chapter. Use only images BuildX generated, owns, or has a
licence for, and note the source in the tables above. No other brands' photos, logos or copy.

## Optional upgrade: filmed footage
A real hero clip (site at golden hour, 8-12 s seamless loop, 720p, under 3 MB, H.264 + VP9, no audio)
can replace the hero photo later. Keep the photo as its poster and for phones and reduced motion.
