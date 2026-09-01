#!/usr/bin/env python3
"""Regenerate static/ icons from one vector definition of the mark.

    pip install Pillow && python3 scripts/generate-icons.py

Every icon, including static/favicon.svg, is written from GLYPHS, so the mark
only ever has to be corrected in one place.
"""

import json
import pathlib
from PIL import Image, ImageDraw

# The wordmark reduced to its brackets: the empty slot a citation goes in.
# Two shapes rather than one, so each is filled separately. Coordinates are on
# a 48-unit grid, the size of the original favicon.
GLYPHS = (
    # [
    'M 11 10 H 20 V 13 H 14.4 V 35 H 20 V 38 H 11 Z',
    # ]
    'M 37 10 H 28 V 13 H 33.6 V 35 H 28 V 38 H 37 Z',
)
GRID = 48.0
CORNER = 7.0 / GRID   # corner radius as a fraction of the tile, measured off the original
TILE = (255, 255, 255, 255)
INK = (0, 0, 0, 255)
SUPERSAMPLE = 8

# Android crops a maskable icon to an arbitrary shape and only guarantees the
# middle 80%, which the mark at full size does not clear by enough to trust,
# so maskable variants draw it smaller.
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


def outline(path, steps=64):
    """One path as a polygon. The mark is only ever filled, never stroked, so
    a dense polyline is indistinguishable from any curves it replaces."""
    pts, cur, start, i = [], (0.0, 0.0), (0.0, 0.0), 0
    t = _tokens(path)
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

    shapes = [outline(p) for p in GLYPHS]
    k = (n / GRID) * scale
    # Centre the mark's own bounding box, not the grid it was drawn on, so the
    # inset variants stay centred rather than drifting with the grid.
    xs = [x for shape in shapes for x, _ in shape]
    ys = [y for shape in shapes for _, y in shape]
    ox = (n - (max(xs) - min(xs)) * k) / 2 - min(xs) * k
    oy = (n - (max(ys) - min(ys)) * k) / 2 - min(ys) * k
    for shape in shapes:
        draw.polygon([(ox + x * k, oy + y * k) for x, y in shape], fill=INK)
    return img.resize((size, size), Image.LANCZOS)


# Mirrors --surface in src/app.css, so the manifest and the page agree.
SURFACE_LIGHT = '#f8f9fa'
SURFACE_DARK = '#101418'


def main():
    paths = '\n'.join(f'\t<path d="{p}" />' for p in GLYPHS)
    STATIC.joinpath('favicon.svg').write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">\n'
        f'\t<rect width="48" height="48" rx="{CORNER * GRID:g}" fill="#fff" />\n'
        f'{paths}\n'
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
    render(48).save(STATIC / 'favicon.png')
    render(64).save(STATIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

    STATIC.joinpath('manifest.webmanifest').write_text(json.dumps({
        'name': '[citation needed]',
        'short_name': '[citation needed]',
        'description': 'A bluffing game played with Wikipedia articles. Everyone claims they read it; one of them did.',
        'start_url': '/',
        'scope': '/',
        'display': 'standalone',
        'background_color': SURFACE_LIGHT,
        'theme_color': SURFACE_LIGHT,
        'icons': [
            {'src': '/favicon.svg', 'type': 'image/svg+xml', 'sizes': 'any'},
            {'src': '/icon-192.png', 'type': 'image/png', 'sizes': '192x192'},
            {'src': '/icon-512.png', 'type': 'image/png', 'sizes': '512x512'},
            {'src': '/icon-maskable-192.png', 'type': 'image/png', 'sizes': '192x192', 'purpose': 'maskable'},
            {'src': '/icon-maskable-512.png', 'type': 'image/png', 'sizes': '512x512', 'purpose': 'maskable'},
        ],
    }, indent='\t') + '\n')

    print(f'theme-color light {SURFACE_LIGHT}  dark {SURFACE_DARK}')
    for f in sorted(STATIC.iterdir()):
        print(f'  {f.name:28} {f.stat().st_size:>7,} B')


if __name__ == '__main__':
    main()
