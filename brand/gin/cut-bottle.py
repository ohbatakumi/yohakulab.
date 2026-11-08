import numpy as np, sys
from PIL import Image, ImageDraw, ImageFilter
im = Image.open('front.png').convert('RGB'); A = np.asarray(im).astype(float)
H, W = A.shape[:2]
CX = float(sys.argv[1]) if len(sys.argv) > 1 else 512
prof = [(72,138),(76,149),(86,153),(192,153),(200,146),(212,145),(244,143),(256,124),(270,117),(368,117),(382,135),(400,190),(425,236),(450,272),(475,293),(500,305),(530,319),(560,328),(600,331),(1435,331),(1455,326),(1472,313),(1483,292),(1489,255),(1491,0)]
def r_at(y):
    for (y0,r0),(y1,r1) in zip(prof,prof[1:]):
        if y0<=y<=y1: return r0+(r1-r0)*(y-y0)/max(1,y1-y0)
    return 0
mask = Image.new('L',(W,H),0); d = ImageDraw.Draw(mask)
left = [(CX-r_at(y), y) for y in range(75,1497)]; right=[(CX+r_at(y), y) for y in range(1496,74,-1)]
d.polygon(left+right, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(0.8))
if len(sys.argv) > 2:
    o = im.copy(); ov = Image.new('RGB',(W,H),(255,0,0)); o = Image.composite(Image.blend(o,ov,0.35), o, mask); o.crop((100,0,950,1616)).resize((425,808)).save('cut-overlay.png'); sys.exit()
from scipy import ndimage as ndi
M = np.asarray(mask).astype(float)/255
lum = A.mean(2)
# regions
Y, X = np.mgrid[0:H, 0:W]
label = (X>=273)&(X<=761)&(Y>=621+ (X-273)*0.012)&(Y<=1294)
woody = ndi.binary_opening((A[...,0]-A[...,2])>14, iterations=2)
woody = ndi.binary_closing(woody, iterations=4)
capimg = Image.new('L',(W,H),0); cd = ImageDraw.Draw(capimg)
cd.rounded_rectangle([CX-151, 77, CX+151, 202], radius=30, fill=255)
cd.rounded_rectangle([CX-152, 130, CX+152, 202], radius=6, fill=255)
cd.rounded_rectangle([CX-93, 190, CX+93, 338], radius=6, fill=255)
capf = np.asarray(capimg.filter(ImageFilter.GaussianBlur(1.2))).astype(float)/255
cap = capf>0.5
M = M.copy(); M[:196] = capf[:196]
cork = np.zeros_like(cap)
opaque = (label|cap|cork)&(M>0.5)
glass = (M>0)&~opaque
skin = (A[...,0]>A[...,1]+18)&(A[...,0]>105)&(Y>1080)
skin = ndi.binary_dilation(skin, iterations=6)&glass
# wall estimate: normalized blur of glass pixels that are not skin
valid = (glass&~skin).astype(float)
s = 45
wall = ndi.gaussian_filter(lum*valid, s)/np.maximum(ndi.gaussian_filter(valid, s),1e-3)
diff = lum - wall
# fill skin: mirror, then vertical extend
mx = np.clip((2*CX - X).astype(int), 0, W-1)
mir_ok = ~skin[Y, mx] & glass[Y, mx]
diff_f = diff.copy()
diff_f[skin & mir_ok] = diff[Y, mx][skin & mir_ok]
rem = skin & ~mir_ok
for x in np.unique(np.where(rem)[1]):
    col = np.where(rem[:,x])[0]
    ys = col.min()
    src = diff_f[max(ys-60,0):ys, x]
    if len(src)==0: diff_f[col,x]=0; continue
    # repeat the last clean stretch, faded toward 0
    for i,yy in enumerate(col):
        diff_f[yy,x] = src[i % len(src)]*0.8
diff = ndi.gaussian_filter(diff_f, 0.6)
# rim: darken a thin band along the silhouette edge
edge_d = ndi.distance_transform_edt(M>0.5)
rim = np.clip(1 - edge_d/7, 0, 1)**1.5 * 0.55
dark = np.clip(-ndi.gaussian_filter(diff,1.2)/70*1.5, 0, 1)
light = np.clip(diff/90*1.4, 0, 1)
a_dark = np.clip(np.maximum(dark*0.55, rim), 0, 1)
base = 0.07
# compose glass as premult layers over transparent: dark ink + white light
ink = np.array([38,36,32.]); white = np.array([255,255,255.])
aG = 1 - (1-a_dark)*(1-light*0.9)*(1-base)
colG = (ink*a_dark[...,None] + white*(light*0.9)[...,None]*(1-a_dark[...,None]) + np.array([235,236,232.])*base*(1-a_dark[...,None])*(1-light[...,None]*0.9)) / np.maximum(aG[...,None],1e-3)
wb = np.array([236/203, 235/212, 230/217])
colO = np.clip(A*wb, 0, 255)
lab = np.zeros((H,W)); lab[label]=1; lab = ndi.gaussian_filter(lab,0.8)
wO = np.clip(np.maximum(capf, lab), 0, 1) * (M>0)
alpha = (wO + (1-wO)*aG) * M
col = (colO*wO[...,None] + colG*aG[...,None]*(1-wO[...,None])) / np.maximum((wO + (1-wO)*aG)[...,None], 1e-3)
# soften opaque/glass seam
out = np.dstack([col, alpha*255]).clip(0,255).astype('uint8')
img = Image.fromarray(out, 'RGBA')
bbox = (int(CX-345), 60, int(CX+345), 1500)
img = img.crop(bbox)
img.save('gin-front-cut.png')
bg = Image.new('RGBA', img.size, (247,247,245,255)); d2 = ImageDraw.Draw(bg)
bg.alpha_composite(img); bg.convert('RGB').save('gin-front-preview.jpg', quality=90)
print(img.size)
