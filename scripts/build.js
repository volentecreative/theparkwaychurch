// Concatenates src/ into the two files Webflow loads. No transpile, no minify:
// jsDelivr minifies on request when the URL ends in .min.js.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const bundles = {
  // footer: order matters. buttons draws the pill that nav-dropdown hangs off.
  'dist/parkway.js': ['src/announcement.js', 'src/button-icons.js', 'src/buttons.js', 'src/nav-scroll.js', 'src/nav-toggle.js', 'src/nav-dropdown.js', 'src/accordion-highlight.js', 'src/form-validate.js', 'src/form-submit.js', 'src/read-time.js', 'src/card-date.js', 'src/pager.js', 'src/media-item.js', 'src/media-filters.js', 'src/connected-dropdown.js', 'src/fluid-scroll.js', 'src/hover-highlight.js', 'src/seasons.js', 'src/events-calendar.js', 'src/script-draw-paths.js', 'src/script-draw.js', 'src/parallax.js', 'src/reveal.js'],
  // head: has to run before images start loading / before the first paint.
  'dist/parkway-head.js': ['src/image-sizes-fix.js', 'src/script-draw-early.js', 'src/reveal-early.js'],
};

mkdirSync('dist', { recursive: true });
for (const [out, parts] of Object.entries(bundles)) {
  const body = parts
    .map((p) => `/* ---- ${p} ---- */\n${readFileSync(p, 'utf8').trim()}\n`)
    .join('\n');
  writeFileSync(out, `/*! The Parkway Church site code v${version}. Built from src/, do not edit. */\n${body}`);
  console.log(out, Buffer.byteLength(body), 'bytes');
}
