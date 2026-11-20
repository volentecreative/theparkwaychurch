# Trim-path pen lines for script lettering

`src/script-draw.js` writes `.text-style-script` words on like an After Effects
trim path. A font only has outlines, so each word's pen line is generated here
ahead of time and saved in `src/script-draw-paths.js`. Words without one simply
show without the write-on.

How a pen line is made:

1. `render.js` renders the word in the site's script font (loaded from the
   staging site) at 400px, and records the text origin and baseline.
2. `skel.py` thins the lettering down to its centerline (skeleton).
3. `trace.py` turns the skeleton into pen strokes in writing order:
   - it starts at the leftmost free end;
   - at each junction it carries on in the straightest direction, so it runs
     through cusps like a pen does;
   - short dead-end hooks are "twigs", drawn as the pen passes them;
   - strokes are ordered by their leftmost point.

   It also writes `out/<word>-order.png`, coloured blue to red in drawing
   order. **Look at it**: script is irregular and a new word may need a tweak.
4. `export.py` writes all the words into `src/script-draw-paths.js`.

## Add a word

From the repo root (Python 3 with scikit-image, and Node with Playwright):

```sh
python3 -m venv /tmp/trimvenv && /tmp/trimvenv/bin/pip install scikit-image
node scripts/trim-paths/render.js Advent
/tmp/trimvenv/bin/python scripts/trim-paths/skel.py Advent
/tmp/trimvenv/bin/python scripts/trim-paths/trace.py Advent
# check scripts/trim-paths/out/Advent-order.png, then list every word to keep:
python3 scripts/trim-paths/export.py Winter Spring Summer Fall Advent
npm run build
```

Current words: Winter, Spring, Summer, Fall.
