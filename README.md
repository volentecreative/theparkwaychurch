# theparkwaychurch

Site code for The Parkway Church Webflow build. Everything Parkway-specific
lives here and is loaded from jsDelivr. Shared behaviour (the header
measurements and mobile menu) still comes from
[narthex](https://github.com/volentecreative/narthex) and is not copied here.

## Layout

| Path | What it is |
| --- | --- |
| `src/buttons.js` | Arch button morph, and the nav pill shape that follows it. |
| `src/nav-scroll.js` | Header slides away on scroll down and back on scroll up. |
| `src/nav-dropdown.js` | Connected nav dropdowns (see below). |
| `src/image-sizes-fix.js` | Sets each image's `sizes` to its rendered width. Same fix as The North Church. |
| `scripts/build.js` | Concatenates `src/` into `dist/`. No transpile, no minify. |
| `dist/parkway.js` | **Committed.** Footer bundle: buttons, nav-scroll, nav-dropdown, in that order. |
| `dist/parkway-head.js` | **Committed.** Head bundle: image-sizes-fix. |

Source is ES5-compatible browser JS, because nothing transpiles it.

## Load it

Head code:

```html
<script src="https://cdn.jsdelivr.net/gh/volentecreative/theparkwaychurch@v0.1.0/dist/parkway-head.min.js"></script>
```

Footer code, alongside the narthex nav tag:

```html
<script defer src="https://cdn.jsdelivr.net/gh/volentecreative/theparkwaychurch@v0.1.0/dist/parkway.min.js"></script>
```

jsDelivr minifies on request when the URL ends in `.min.js`, and only serves
public repositories.

## Release

Edit `src/` → `npm run build` → `npm run check` → commit (including `dist/`) →
`git tag vX.Y.Z` → push with tags → bump the version in the two script tags.

## Connected nav dropdowns

Draws the open dropdown as part of the nav pill (one shape, concave corners
where they meet), slides it between dropdowns, crossfades the links, glides one
highlight between the links, and rotates the chevron of the open dropdown.

It only adds to the stock Webflow dropdown. If the file does not load, or the
pill markup is missing, the dropdowns keep their normal floating-card look and
behaviour.

### Style it in Webflow

Everything visual is a class in the style panel. The script only toggles them.

| class | what to set |
| --- | --- |
| `nav_dropdown-list` + combo `is-connected` | background transparent, no border, no shadow. Keep the radius: the script reads the bottom corners for the panel. |
| `nav_dropdown-icon` | transition: transform 250ms |
| `nav_dropdown-icon` + combo `is-open` | rotate 180deg |
| `nav_dropdown-highlight` (optional div inside each list) | background and radius of the gliding hover. Without it the script makes its own from the link radius and `--brand--brand-100`. |

`nav_dropdown-list` + combo `is-leaving` is also applied to the list being left
while Webflow's hover delay still holds it open, if it ever needs its own style.

### Tune it in Webflow

Custom attributes on `nav_pill`, or on any ancestor of it. All optional; the
default is used when the attribute is missing. Publish to apply, no new script
version needed.

| attribute | default | what it does |
| --- | --- | --- |
| `vci-dropdown-travel` | `16` | px the links drift when switching dropdowns |
| `vci-dropdown-crossfade` | `110` | ms for the old and new links to crossfade |
| `vci-dropdown-flip` | `false` | `true` brings the new links in from the other side |
| `vci-dropdown-safe-triangle` | `true` | `false` switches tabs the instant they are touched |
| `vci-dropdown-pass-through` | `0` | ms a tab must be hovered before it takes over; `0` is off |

Slower-changing timings are constants at the top of `src/nav-dropdown.js`:
`SLIDE` (panel), `OPEN_IN`, `DRIFT_MS`, `HOVER_MS`, `SAFE_REST`, `SAFE_SLOPE`,
`SAFE_PAD`.

### What the script sets inline

Only what the style panel cannot express:

- the SVG path for the panel
- each list's `top`, `padding-top` and squared top corners. The list starts flush
  under its tab and its transparent top padding covers any strip of pill between
  tab and panel, so the pointer never leaves the dropdown on the way down.
  Webflow's hover-out timer is not cancelled by re-entering, so without this the
  dropdown closes about 300ms after the pointer crosses that strip.
- a `clip-path` while the panel is moving, so links never show outside it
- the highlight's position, and a transparent background on the links while the
  highlight is doing their hover
