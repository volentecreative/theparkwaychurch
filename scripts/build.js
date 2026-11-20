// Concatenates src/ into the two files Webflow loads. No transpile, no minify:
// jsDelivr minifies on request when the URL ends in .min.js.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const bundles = {
  // footer: order matters. buttons draws the pill that nav-dropdown hangs off.
  'dist/parkway.js': ['src/buttons.js', 'src/nav-scroll.js', 'src/nav-dropdown.js', 'src/script-draw.js'],
  // head: has to run before images start loading.
  'dist/parkway-head.js': ['src/image-sizes-fix.js'],
};

mkdirSync('dist', { recursive: true });
for (const [out, parts] of Object.entries(bundles)) {
  const body = parts
    .map((p) => `/* ---- ${p} ---- */\n${readFileSync(p, 'utf8').trim()}\n`)
    .join('\n');
  writeFileSync(out, `/*! The Parkway Church site code v${version}. Built from src/, do not edit. */\n${body}`);
  console.log(out, Buffer.byteLength(body), 'bytes');
}
