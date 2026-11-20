import sys, json, math, numpy as np
from PIL import Image, ImageDraw
w = sys.argv[1]
meta = json.load(open(f'scripts/trim-paths/out/{w}.json'))
sk = np.load(f'scripts/trim-paths/out/{w}-skel.npy'); dist = np.load(f'scripts/trim-paths/out/{w}-dist.npy')
H, W = sk.shape
pts = set(zip(*np.nonzero(sk)))
N8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
def nb(p): return [(p[0]+a, p[1]+b) for a, b in N8 if (p[0]+a, p[1]+b) in pts]
def deg(p): return len(nb(p))

def edges_of(pts):
    """Split the skeleton into chains between nodes (ends / junctions)."""
    node = {p for p in pts if deg(p) != 2}
    seen, edges = set(), []
    for n in node:
        for q in nb(n):
            if (n, q) in seen: continue
            chain = [n, q]; seen.add((n, q))
            prev, cur = n, q
            while cur not in node:
                nxt = [r for r in nb(cur) if r != prev and r not in chain[-3:]]
                if not nxt: break
                prev, cur = cur, nxt[0]; chain.append(cur)
            seen.add((chain[-1], chain[-2]))
            edges.append(chain)
    # pure loops with no node
    rest = pts - {p for e in edges for p in e}
    while rest:
        s = rest.pop(); chain = [s]; prev = None; cur = s
        while True:
            nxt = [r for r in nb(cur) if r != prev and r in rest]
            if not nxt: break
            prev, cur = cur, nxt[0]; rest.discard(cur); chain.append(cur)
        edges.append(chain)
    # dedupe edges found from both ends
    out, keys = [], set()
    for e in edges:
        k = (min(e[0], e[-1]), max(e[0], e[-1]), len(e))
        if k in keys: continue
        keys.add(k); out.append(e)
    return out

# prune short spurs (a free end hanging off a junction, shorter than ~2.5x the local stroke thickness)
for _ in range(4):
    es = edges_of(pts)
    removed = 0
    for e in es:
        a, b = deg(e[0]), deg(e[-1])
        if (a == 1) != (b == 1):
            th = max(dist[e[0]], dist[e[-1]], 4)
            if len(e) < 2.5 * th:
                for p in e:
                    if deg(p) <= 2 or p in (e[0], e[-1]) and deg(p) == 1: pts.discard(p)
                removed += 1
    if not removed: break
edges = [e for e in edges_of(pts) if len(e) >= 3]

def direction(chain, n=12):
    a, b = chain[max(0, len(chain)-n)], chain[-1]
    v = (b[1]-a[1], b[0]-a[0]); l = math.hypot(*v) or 1
    return (v[0]/l, v[1]/l)

fs0 = meta['fs']
TWIG = 0.18 * fs0
def is_twig(e):
    return (deg(e[0]) == 1) != (deg(e[-1]) == 1) and len(e) < TWIG

used = [False]*len(edges)
at = {}
for i, e in enumerate(edges):
    at.setdefault(e[0], []).append((i, False)); at.setdefault(e[-1], []).append((i, True))
# Junctions joined by a very short bridge are one junction to the pen.
group = {}
def find(n):
    while group.get(n, n) != n: n = group[n]
    return n
for e in edges:
    if deg(e[0]) >= 3 and deg(e[-1]) >= 3 and len(e) < 0.06 * fs0:
        group[find(e[0])] = find(e[-1])
members = {}
for n in at: members.setdefault(find(n), []).append(n)
def near(p):
    """edges touching the junction at p, including junctions bridged to it"""
    out, seen = [], set()
    nodes = set()
    for q in [p] + [(p[0]+a, p[1]+b) for a in range(-3, 4) for b in range(-3, 4)]:
        if q in at: nodes.update(members.get(find(q), [q]))
    for q in nodes:
        for j, r in at.get(q, []):
            if (j, r) not in seen: seen.add((j, r)); out.append((j, r))
    return out
def oriented(j, r): return list(reversed(edges[j])) if r else list(edges[j])

# Each stroke: {'pts': [...], 'parent': index or None, 'at': fraction along the parent}
strokes = []
def attach_twigs(node, sidx, pos):
    for j, r in near(node):
        if used[j] or not is_twig(edges[j]): continue
        e = oriented(j, r)
        if deg(e[0]) == 1: e = e[::-1]  # draw outward from the junction
        used[j] = True
        strokes.append({'pts': e, 'parent': sidx, 'at': pos})

while not all(used):
    cands = []
    for i, e in enumerate(edges):
        if used[i]: continue
        for rev, p in ((False, e[0]), (True, e[-1])):
            cands.append((1 if is_twig(e) else 0, p[1], i, rev))
    cands.sort(); *_, i, rev = cands[0]
    chain = oriented(i, rev); used[i] = True
    sidx = len(strokes); strokes.append({'pts': chain, 'parent': None, 'at': 0})
    marks = []  # (node, index in chain) where twigs hang
    marks.append((chain[0], 0))
    while True:
        marks.append((chain[-1], len(chain) - 1))
        d = direction(chain)
        best = None
        for j, r in near(chain[-1]):
            if used[j] or is_twig(edges[j]): continue
            e = oriented(j, r)
            d2 = direction(e[:14][::-1]); d2 = (-d2[0], -d2[1])
            turn = math.acos(max(-1, min(1, d[0]*d2[0] + d[1]*d2[1])))
            if best is None or turn < best[0]: best = (turn, j, e)
        if not best: break
        used[best[1]] = True; chain += best[2][1:]
    strokes[sidx]['pts'] = chain
    for node, k in marks: attach_twigs(node, sidx, k / max(1, len(chain) - 1))

# order: top-level strokes left to right by their start; children follow their parent
tops = sorted([k for k, st in enumerate(strokes) if st['parent'] is None], key=lambda k: min(p[1] for p in strokes[k]['pts']))
order = []
for k in tops:
    order.append(k); order += [c for c, st in enumerate(strokes) if st['parent'] == k]
remap = {old: new for new, old in enumerate(order)}
strokes = [dict(strokes[k], parent=None if strokes[k]['parent'] is None else remap[strokes[k]['parent']]) for k in order]

def rdp(p, eps):
    if len(p) < 3: return p
    a, b = np.array(p[0], float), np.array(p[-1], float)
    ab = b - a; L = np.hypot(*ab) or 1
    d = [abs(ab[0] * (q[1] - a[1]) - ab[1] * (q[0] - a[0])) / L for q in p[1:-1]]
    i = int(np.argmax(d)) + 1
    if d[i-1] > eps: return rdp(p[:i+1], eps)[:-1] + rdp(p[i:], eps)
    return [p[0], p[-1]]

fs, ox, base = meta['fs'], meta['ox'], meta['base']
def em(p): return ((p[1] - ox) / fs, (p[0] - base) / fs)
def cubic(pp):
    # Catmull-Rom through the simplified points -> cubic beziers
    P = [em(p) for p in pp]
    d = f'M{P[0][0]:.3f} {P[0][1]:.3f}'
    for k in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(k-1, 0)], P[k], P[k+1], P[min(k+2, len(P)-1)]
        c1 = (p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6)
        c2 = (p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6)
        d += f'C{c1[0]:.3f} {c1[1]:.3f} {c2[0]:.3f} {c2[1]:.3f} {p2[0]:.3f} {p2[1]:.3f}'
    return d
keep = [k for k, st in enumerate(strokes) if len(st['pts']) > 4]
paths = [{'d': cubic(rdp(strokes[k]['pts'], 2.5)), 'len': round(len(strokes[k]['pts']) / fs, 4),
          'parent': None if strokes[k]['parent'] is None else keep.index(strokes[k]['parent']), 'at': round(strokes[k]['at'], 3)} for k in keep]
width = round(2 * float(np.percentile([dist[p] for st in strokes for p in st['pts']], 99)) / fs + 0.02, 4)
json.dump({'word': w, 'width': width, 'paths': paths}, open(f'scripts/trim-paths/out/{w}-paths.json', 'w'))
print(w, 'strokes:', [(i, p['len'], p['parent'], p['at']) for i, p in enumerate(paths)], 'mask width em:', width)
strokes = [strokes[k]['pts'] for k in keep]

# preview: order coloured blue -> red, numbered at each stroke start
img = Image.open(f'scripts/trim-paths/out/{w}.png').convert('RGB'); img = Image.eval(img, lambda v: 255 - (255 - v) // 5)
dr = ImageDraw.Draw(img); n = len(strokes)
for k, s in enumerate(strokes):
    col = (int(255 * k / max(1, n-1)), 40, int(255 * (1 - k / max(1, n-1))))
    dr.line([(p[1], p[0]) for p in s], fill=col, width=5)
    dr.text((s[0][1] + 6, s[0][0] - 18), str(k + 1), fill=(0, 0, 0))
ys, xs = np.nonzero(np.array(img.convert('L')) < 250)
img.crop((xs.min()-10, ys.min()-10, xs.max()+10, ys.max()+10)).save(f'scripts/trim-paths/out/{w}-order.png')

