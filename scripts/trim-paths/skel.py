import sys, json, numpy as np
from PIL import Image
from skimage.morphology import skeletonize, remove_small_objects
from scipy import ndimage as ndi
w = sys.argv[1]
img = np.array(Image.open(f'scripts/trim-paths/out/{w}.png').convert('L'))
ink = img < 128
ink = ndi.binary_closing(ink, iterations=2)
sk = skeletonize(ink)
dist = ndi.distance_transform_edt(ink)
np.save(f'scripts/trim-paths/out/{w}-skel.npy', sk); np.save(f'scripts/trim-paths/out/{w}-dist.npy', dist)
print('ink px', ink.sum(), 'skeleton px', sk.sum(), 'max half-thickness px', dist[sk].max().round(1), 'p95', np.percentile(dist[sk], 95).round(1))
# picture: ink light grey, skeleton red
rgb = np.stack([255 - ink * 60] * 3, -1).astype(np.uint8)
rgb[sk] = [220, 30, 30]
ys, xs = np.nonzero(ink); Image.fromarray(rgb[ys.min()-10:ys.max()+10, xs.min()-10:xs.max()+10]).save(f'scripts/trim-paths/out/{w}-skel.png')
