"""Builds the record assets from the uploaded photos.

jacket.webp : the art print cropped to its board and squared.
disc.webp   : the disc squared (fixes slight perspective), vinyl area replaced by a
              rotation-symmetric groove profile (25th percentile per radius) so that only
              the label shows rotation; label kept; spindle hole transparent.
sheen.webp  : the photo's light on the vinyl (photo minus profile) as white + alpha;
              it stays still while the disc turns underneath.
Usage: python3 make-record-assets.py <art-print.png> <disc.png>
"""
import sys
import numpy as np
from PIL import Image

art, disc_src = sys.argv[1], sys.argv[2]
N = 1200
R = N / 2
LR = 0.3417 * R  # label radius

Image.open(art).convert("RGB").crop((100, 126, 1153, 1134)).resize((900, 900), Image.LANCZOS).save("jacket.webp", quality=86)

a = np.asarray(Image.open(disc_src).convert("RGB").crop((82, 76, 1160, 1180)).resize((N, N), Image.LANCZOS)).astype(float)
yy, xx = np.mgrid[0:N, 0:N] + 0.5
r = np.hypot(xx - R, yy - R)
bins = np.floor(r * 2).astype(int)
prof = np.zeros((bins.max() + 1, 3))
m = (r > LR + 4) & (r < R - 1)
for c in range(3):
    order = np.argsort(bins[m])
    bv, vv = bins[m][order], a[..., c][m][order]
    sp = np.searchsorted(bv, np.arange(bins.max() + 2))
    for k in range(bins.max() + 1):
        seg = vv[sp[k]:sp[k + 1]]
        if len(seg):
            prof[k, c] = np.percentile(seg, 25)
out = prof[bins]
w = np.clip((LR + 3 - r) / 3, 0, 1)[..., None]
out = out * (1 - w) + a * w
alpha = np.clip(R - 1 - r, 0, 1) * np.clip(r - 0.028 * R, 0, 1)
disc = np.dstack([np.clip(out, 0, 255), alpha * 255]).astype(np.uint8)
Image.fromarray(disc, "RGBA").resize((900, 900), Image.LANCZOS).save("disc.webp", quality=90)

base = out.mean(2)
sh = np.clip(a.mean(2) - base, 0, 255) / np.maximum(255 - base, 1)
sh *= np.clip((r - LR - 3) / 4, 0, 1) * np.clip((R - 8 - r) / 5, 0, 1)
A = (np.clip(sh, 0, 1) * 255).astype(np.uint8)
Image.fromarray(np.dstack([np.full((N, N), 255, np.uint8)] * 3 + [A]), "RGBA").resize((900, 900), Image.LANCZOS).save("sheen.webp", quality=90)
