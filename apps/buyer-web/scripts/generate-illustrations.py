"""Generates the BuildX material illustrations in public/illustrations/*.svg.

Original artwork (owned by BuildX, no licence restrictions), drawn in the Hi-Vis style: isometric
forms on a sand stage. Shown on product cards when a supplier has not uploaded a photo, always
labelled as an illustration. Re-run after editing:  python scripts/generate-illustrations.py
"""
import math
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'illustrations')
W, H = 480, 360
INK, SAND, LIME, COBALT = '#0B0C0A', '#F2EFE7', '#C8FF3D', '#2457FF'


def shade(hex_color, f):
    h = hex_color.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    c = lambda v: max(0, min(255, int(v * f)))
    return f'#{c(r):02X}{c(g):02X}{c(b):02X}'


def pts(*p):
    return ' '.join(f'{x:.1f},{y:.1f}' for x, y in p)


def box(x, y, a, b, h, color, extra=''):
    """Isometric box. (x, y) = top-back corner on screen; a along right axis, b along left, h up."""
    r, l, f = (x + a, y + a / 2), (x - b, y + b / 2), (x + a - b, y + (a + b) / 2)
    top = pts((x, y), r, f, l)
    left = pts(l, f, (f[0], f[1] + h), (l[0], l[1] + h))
    right = pts(f, r, (r[0], r[1] + h), (f[0], f[1] + h))
    return (f'<g {extra}><polygon points="{left}" fill="{shade(color, 0.86)}"/>'
            f'<polygon points="{right}" fill="{shade(color, 0.7)}"/>'
            f'<polygon points="{top}" fill="{color}"/></g>')


def iso(x0, y0, u, v, z=0):
    """Grid point (u right, v left, z up) to screen."""
    return x0 + u - v, y0 + (u + v) / 2 - z


def at(x0, y0, u, v, z, a, b, h, color, extra=''):
    x, y = iso(x0, y0, u, v, z + h)
    return box(x, y, a, b, h, color, extra)


def frame(body, label):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="{label}">
<defs>
  <radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#FAF8F3"/><stop offset="1" stop-color="#E4DFD3"/></radialGradient>
  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#0B0C0A" stroke-opacity=".05"/></pattern>
</defs>
<rect width="{W}" height="{H}" fill="url(#g)"/>
<rect width="{W}" height="{H}" fill="url(#grid)"/>
<ellipse cx="240" cy="292" rx="170" ry="30" fill="#0B0C0A" opacity=".12"/>
{body}
</svg>
'''


def blocks():
    c, s = '#B9B6AE', []
    x0, y0 = 240, 150
    for z in range(3):
        for i in range(2 - (z == 2)):
            u = i * 92 + (46 if z == 2 else 0)
            s.append(at(x0, y0, u, 0, z * 44, 88, 70, 44, c))
            # two hollow cores on the top face
            for k in (0, 1):
                cx, cy = iso(x0, y0, u + 22 + k * 44, 35, z * 44 + 44)
                s.append(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="15" ry="9" fill="{shade(c, 0.55)}"/>')
    return ''.join(s)


def bricks():
    s, x0, y0 = [], 240, 140
    colors = ['#C2562E', '#B44C27', '#CC6236']
    for z in range(5):
        for i in range(3):
            off = 0 if z % 2 == 0 else 26
            if z % 2 and i == 2:
                continue
            s.append(at(x0, y0, i * 54 + off, 0, z * 22, 50, 92, 22, colors[(i + z) % 3]))
    s.append(at(x0, y0, 120, 120, 0, 50, 24, 22, '#C2562E'))
    return ''.join(s)


def cement():
    s, x0, y0 = [], 240, 150
    bag = '#E9E5DA'
    for z, (u, v) in enumerate([(0, 0), (0, 0), (0, 0)]):
        x, y = iso(x0, y0, 0, 0, z * 38 + 38)
        s.append(box(x, y, 150, 90, 38, bag))
        # label band
        lx, ly = iso(x0, y0, 40, 90, z * 38 + 30)
        s.append(f'<polygon points="{pts((lx, ly), (lx + 70, ly + 35), (lx + 70, ly + 51), (lx, ly + 16))}" fill="{LIME if z == 2 else INK}" opacity="{1 if z == 2 else .85}"/>')
    tx, ty = iso(x0, y0, 0, 0, 114)
    s.append(f'<text x="{tx - 10:.0f}" y="{ty + 70:.0f}" transform="rotate(26.57 {tx - 10:.0f} {ty + 70:.0f})" font-family="Arial, sans-serif" font-weight="800" font-size="18" fill="{INK}" letter-spacing="2">CEMENT</text>')
    return ''.join(s)


def sand():
    s = [f'<path d="M80 290 Q150 150 240 120 Q330 150 400 290 Z" fill="#D9B98A"/>',
         f'<path d="M240 120 Q330 150 400 290 L300 290 Q290 180 240 120Z" fill="#C7A574"/>']
    import random
    random.seed(7)
    for _ in range(140):
        x, y = random.uniform(110, 370), random.uniform(160, 285)
        if abs(x - 240) < (y - 120) * 1.0:
            s.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{random.choice([1, 1.4, 2])}" fill="#A88655" opacity=".7"/>')
    # shovel
    s.append(f'<g transform="rotate(-28 330 170)"><rect x="325" y="60" width="9" height="140" rx="4" fill="{INK}"/>'
             f'<path d="M312 196h36l-4 46q-14 12-28 0z" fill="{LIME}"/><rect x="318" y="56" width="22" height="9" rx="4" fill="{INK}"/></g>')
    return ''.join(s)


def steel():
    s = []
    ang = 26.57
    for row, (yy, n) in enumerate([(0, 5), (-19, 4), (-38, 3)]):
        for i in range(n):
            x = 110 + i * 20 + row * 10
            y = 210 + yy - i * 0
            s.append(f'<g transform="rotate({ang} {x} {y})"><rect x="{x}" y="{y - 8}" width="260" height="16" rx="8" fill="#55585C"/>'
                     + ''.join(f'<rect x="{x + 8 + k * 14}" y="{y - 6}" width="4" height="16" fill="#3B3D40" transform="rotate(-20 {x + 9 + k * 14} {y})"/>' for k in range(17))
                     + f'<ellipse cx="{x}" cy="{y}" rx="5" ry="8" fill="#8C9096"/></g>')
    s.append(f'<g transform="rotate({ang} 200 200)"><rect x="190" y="160" width="14" height="70" rx="3" fill="{LIME}"/><rect x="330" y="160" width="14" height="70" rx="3" fill="{LIME}"/></g>')
    return ''.join(s)


def plumbing():
    s = []
    pipes = [(150, 168, '#EDEBE5', '#C9C4B5'), (128, 196, COBALT, '#1A43CC'), (106, 224, '#EDEBE5', '#C9C4B5'), (152, 218, '#EDEBE5', '#C9C4B5')]
    for x, y, c, end in pipes:
        s.append(f'<g transform="rotate(26.57 {x} {y})"><rect x="{x}" y="{y - 15}" width="230" height="30" rx="3" fill="{c}"/>'
                 f'<rect x="{x}" y="{y - 15}" width="230" height="9" fill="#FFFFFF" opacity=".35"/>'
                 f'<ellipse cx="{x}" cy="{y}" rx="8" ry="15" fill="{end}"/><ellipse cx="{x}" cy="{y}" rx="4.5" ry="9" fill="{shade(end, 0.6)}"/></g>')
    # elbow fitting
    s.append(f'<path d="M330 120 h34 a26 26 0 0 1 26 26 v34 h-30 v-30 h-30z" fill="{INK}"/>'
             f'<rect x="322" y="116" width="12" height="38" rx="3" fill="{LIME}"/><rect x="356" y="172" width="38" height="12" rx="3" fill="{LIME}"/>')
    return ''.join(s)


def electrical():
    s = []
    for i in range(7):
        s.append(f'<ellipse cx="200" cy="{235 - i * 9}" rx="{95 - i * 1.5}" ry="{40 - i}" fill="none" stroke="{"#E5484D" if i % 2 else "#C93A3F"}" stroke-width="9"/>')
    s.append(f'<ellipse cx="200" cy="175" rx="40" ry="16" fill="#E4DFD3"/>')
    s.append(f'<path d="M290 200 C330 190 340 120 380 110" fill="none" stroke="#E5484D" stroke-width="9" stroke-linecap="round"/>')
    s.append(box(355, 92, 64, 14, 74, '#FAF8F3'))
    s.append(f'<polygon points="{pts((370, 118), (398, 132), (398, 150), (370, 136))}" fill="{INK}"/>')
    s.append(f'<polygon points="{pts((372, 121), (386, 128), (386, 141), (372, 134))}" fill="{LIME}"/>')
    return ''.join(s)


def paint():
    s = []
    s.append(f'<path d="M150 140 v110 a90 32 0 0 0 180 0 v-110" fill="{INK}"/>')
    s.append(f'<path d="M150 175 v40 a90 32 0 0 0 180 0 v-40 a90 32 0 0 1 -180 0z" fill="{LIME}"/>')
    s.append(f'<ellipse cx="240" cy="140" rx="90" ry="32" fill="#2A2C26"/><ellipse cx="240" cy="140" rx="74" ry="24" fill="{COBALT}"/>')
    s.append(f'<path d="M188 150 q6 40 0 60 q-6 8 -10 0 q-2 -30 10 -60z" fill="{COBALT}"/>')
    s.append(f'<path d="M150 140 C150 60 330 60 330 140" fill="none" stroke="#8F8A7D" stroke-width="5"/>')
    s.append(f'<g transform="rotate(30 360 120)"><rect x="350" y="40" width="20" height="80" rx="4" fill="#C2562E"/><rect x="344" y="118" width="32" height="14" fill="#8F8A7D"/><rect x="342" y="130" width="36" height="34" rx="3" fill="{COBALT}"/></g>')
    return ''.join(s)


def plywood():
    s, x0, y0 = [], 240, 130
    for z in range(7):
        s.append(at(x0, y0, z * 2, 0, z * 13, 170, 120, 11, '#D9B07A' if z % 2 else '#CFA36B'))
        x, y = iso(x0, y0, z * 2 + 170, 120 // 2 + 0, z * 13 + 6)
    gx, gy = iso(x0, y0, 14, 0, 7 * 13)
    for k in range(5):
        s.append(f'<path d="M{gx - 60 + k * 20} {gy + 40 + k * 8} q40 10 80 40" fill="none" stroke="#B0844E" stroke-width="2" opacity=".6"/>')
    return ''.join(s)


def tools():
    s = []
    s.append(f'<g transform="rotate(-35 220 200)"><rect x="212" y="110" width="18" height="170" rx="6" fill="#C2562E"/>'
             f'<rect x="170" y="92" width="100" height="34" rx="6" fill="{INK}"/><rect x="250" y="92" width="34" height="34" rx="4" fill="#2A2C26"/></g>')
    s.append(f'<g transform="rotate(40 290 190)"><rect x="282" y="110" width="16" height="160" rx="8" fill="#8C9096"/>'
             f'<circle cx="290" cy="105" r="26" fill="#8C9096"/><rect x="280" y="72" width="20" height="34" fill="url(#g)"/>'
             f'<circle cx="290" cy="270" r="18" fill="#8C9096"/><circle cx="290" cy="270" r="8" fill="url(#g)"/></g>')
    s.append(box(140, 228, 70, 40, 26, LIME))
    return ''.join(s)


def tiles():
    s, x0, y0 = [], 240, 120
    for i in range(4):
        for j in range(4):
            c = '#FAF8F3' if (i + j) % 2 else '#D8D3C6'
            if (i, j) == (2, 1):
                c = LIME
            s.append(at(x0, y0, i * 44, j * 44, 0, 41, 41, 8, c))
    s.append(at(x0, y0, 60, 160, 40, 70, 70, 10, '#2A2C26', 'opacity=".95"'))
    return ''.join(s)


def generic():
    return (at(240, 150, 0, 0, 0, 120, 100, 90, '#D8C3A0') +
            f'<polygon points="{pts(iso(240,150,50,0,90), iso(240,150,70,0,90), iso(240,150,70,100,90), iso(240,150,50,100,90))}" fill="{LIME}"/>')


ART = {
    'blocks': (blocks, 'Concrete blocks illustration'),
    'bricks': (bricks, 'Bricks illustration'),
    'cement': (cement, 'Cement bags illustration'),
    'sand': (sand, 'Sand and aggregates illustration'),
    'steel': (steel, 'Steel TMT bars illustration'),
    'plumbing': (plumbing, 'Plumbing pipes illustration'),
    'electrical': (electrical, 'Electrical wire and switch illustration'),
    'paint': (paint, 'Paint bucket illustration'),
    'plywood': (plywood, 'Plywood sheets illustration'),
    'tools': (tools, 'Tools illustration'),
    'tiles': (tiles, 'Tiles illustration'),
    'generic': (generic, 'Construction material illustration'),
}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, (fn, label) in ART.items():
        with open(os.path.join(OUT, f'{name}.svg'), 'w', encoding='utf-8') as f:
            f.write(frame(fn(), label))
    print('wrote', len(ART), 'illustrations to', os.path.abspath(OUT))
