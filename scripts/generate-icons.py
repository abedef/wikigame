#!/usr/bin/env python3
"""Regenerate static/ icons from one vector definition of the mark.

    pip install Pillow && python3 scripts/generate-icons.py

static/favicon.png is the original hand-made 48px icon and is left alone; the
geometry below was traced from it so the generated sizes match. Every other
icon, including static/favicon.svg, is written from GLYPH, so the mark only
ever has to be corrected in one place.
"""

import json
import math
import pathlib
from PIL import Image, ImageDraw

# A serif capital L, matching the wordmark in static/logo.png. Coordinates are
# on a 48-unit grid — the size of the original favicon — so its proportions
# carry over unchanged.
GLYPH = (
    'M 13 12 H 26 V 14.35 '
    'Q 22.2 14.6 21.8 17.9 V 33.8 '
    'Q 21.8 36.7 25.2 36.9 H 29.0 '
    'Q 32.4 35.8 34.0 31.5 L 35.5 32.0 '
    'Q 35.0 35.6 35.2 38.6 H 13 V 36.3 '
    'Q 16.5 36.2 17.5 33.6 V 17.9 '
    'Q 17.1 14.6 13 14.35 Z'
)
GRID = 48.0
CORNER = 7.0 / GRID   # corner radius as a fraction of the tile, measured off the original
TILE = (255, 255, 255, 255)
INK = (0, 0, 0, 255)
SUPERSAMPLE = 8

# Android crops a maskable icon to an arbitrary shape and only guarantees the
# middle 80%. At full size the mark's corners reach 77.5% of the width, which
# clears that by too little to trust, so maskable variants draw it smaller.
MASKABLE_SCALE = 0.82

ROOT = pathlib.Path(__file__).resolve().parent.parent
STATIC = ROOT / 'static'


def _tokens(d):
    out, num = [], ''
    for ch in d:
        if ch in 'MLHVQZ':
            if num:
                out.append(float(num))
                num = ''
            out.append(ch)
        elif ch in ' ,':
            if num:
                out.append(float(num))
                num = ''
        else:
            num += ch
    if num:
        out.append(float(num))
    return out


def outline(steps=64):
    """The path as a polygon. The mark is only ever filled, never stroked, so
    a dense polyline is indistinguishable from the curves it replaces."""
    pts, cur, start, i = [], (0.0, 0.0), (0.0, 0.0), 0
    t = _tokens(GLYPH)
    while i < len(t):
        op = t[i]
        i += 1
        if op == 'M':
            cur = start = (t[i], t[i + 1]); i += 2; pts.append(cur)
        elif op == 'L':
            cur = (t[i], t[i + 1]); i += 2; pts.append(cur)
        elif op == 'H':
            cur = (t[i], cur[1]); i += 1; pts.append(cur)
        elif op == 'V':
            cur = (cur[0], t[i]); i += 1; pts.append(cur)
        elif op == 'Q':
            c, e = (t[i], t[i + 1]), (t[i + 2], t[i + 3]); i += 4
            for s in range(1, steps + 1):
                u = s / steps
                v = 1 - u
                pts.append((v * v * cur[0] + 2 * v * u * c[0] + u * u * e[0],
                            v * v * cur[1] + 2 * v * u * c[1] + u * u * e[1]))
            cur = e
        elif op == 'Z':
            pts.append(start); cur = start
    return pts


def render(size, *, rounded=True, scale=1.0):
    """Draw the mark oversized and average it down, which antialiases both the
    glyph and the tile's corners without needing a real rasteriser."""
    n = size * SUPERSAMPLE
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        draw.rounded_rectangle([0, 0, n - 1, n - 1], radius=CORNER * n, fill=TILE)
    else:
        draw.rectangle([0, 0, n - 1, n - 1], fill=TILE)

    pts = outline()
    k = (n / GRID) * scale
    # Centre the glyph's own bounding box, not the grid it was drawn on: the L
    # sits slightly low and right of centre, which shows up once it is inset.
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    ox = (n - (max(xs) - min(xs)) * k) / 2 - min(xs) * k
    oy = (n - (max(ys) - min(ys)) * k) / 2 - min(ys) * k
    draw.polygon([(ox + x * k, oy + y * k) for x, y in pts], fill=INK)
    return img.resize((size, size), Image.LANCZOS)


def oklch_to_hex(lightness, chroma, hue):
    """The palette in src/app.css is authored in OKLCH; a web manifest and a
    theme-color meta tag both need hex."""
    a = chroma * math.cos(math.radians(hue))
    b = chroma * math.sin(math.radians(hue))
    l_ = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3
    rgb = (
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )
    def channel(u):
        u = max(0.0, min(1.0, u))
        u = 1.055 * u ** (1 / 2.4) - 0.055 if u > 0.0031308 else 12.92 * u
        return max(0, min(255, round(u * 255)))
    return '#%02x%02x%02x' % tuple(channel(c) for c in rgb)


def main():
    surface_light = oklch_to_hex(0.98, 0.012, 85)
    surface_dark = oklch_to_hex(0.19, 0.014, 60)

    STATIC.joinpath('favicon.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">\n'
        f'\t<rect width="48" height="48" rx="{CORNER * GRID:g}" fill="#fff" />\n'
        f'\t<path d="{GLYPH.strip()}" />\n'
        '</svg>\n'
    )

    # iOS applies its own squircle and paints transparent pixels black, so this
    # one is a full-bleed opaque square with no corners of its own.
    render(180, rounded=False).save(STATIC / 'apple-touch-icon.png')
    # Rounded, because nothing masks these for us.
    render(192).save(STATIC / 'icon-192.png')
    render(512).save(STATIC / 'icon-512.png')
    # Full bleed and inset, because the platform crops these to its own shape.
    render(192, rounded=False, scale=MASKABLE_SCALE).save(STATIC / 'icon-maskable-192.png')
    render(512, rounded=False, scale=MASKABLE_SCALE).save(STATIC / 'icon-maskable-512.png')
    render(64).save(STATIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

    STATIC.joinpath('manifest.webmanifest').write_text(json.dumps({
        'name': 'Lie to Me',
        'short_name': 'Lie to Me',
        'description': 'A bluffing game played with Wikipedia articles.',
        'start_url': '/',
        'scope': '/',
        'display': 'standalone',
        'background_color': surface_light,
        'theme_color': surface_light,
        'icons': [
            {'src': '/favicon.svg', 'type': 'image/svg+xml', 'sizes': 'any'},
            {'src': '/icon-192.png', 'type': 'image/png', 'sizes': '192x192'},
            {'src': '/icon-512.png', 'type': 'image/png', 'sizes': '512x512'},
            {'src': '/icon-maskable-192.png', 'type': 'image/png', 'sizes': '192x192', 'purpose': 'maskable'},
            {'src': '/icon-maskable-512.png', 'type': 'image/png', 'sizes': '512x512', 'purpose': 'maskable'},
        ],
    }, indent='\t') + '\n')

    print(f'theme-color light {surface_light}  dark {surface_dark}')
    for f in sorted(STATIC.iterdir()):
        print(f'  {f.name:28} {f.stat().st_size:>7,} B')


if __name__ == '__main__':
    main()
