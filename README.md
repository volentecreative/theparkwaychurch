# theparkwaychurch

Custom code for The Parkway Church Webflow site. Loaded from jsDelivr.

## dist/nav-dropdown.js

Connects the open nav dropdown to the nav pill as one shape (concave corners where
they meet), slides the shape between dropdowns, crossfades the links, glides one
highlight between the links, and rotates the chevron of the open dropdown.

It only adds to the stock Webflow dropdown. If the file does not load, or the
narthex pill markup is missing, the dropdowns keep their normal floating-card
look and behaviour.

### Load it

Site settings, footer code (after the narthex `nav.js` tag):

```html
<script defer src="https://cdn.jsdelivr.net/gh/volentecreative/theparkwaychurch@v0.1.0/dist/nav-dropdown.js"></script>
```

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

Custom attributes on `nav_pill` (Element settings). All optional; the value in
brackets is used when the attribute is missing. Publish to apply, no new script
version needed.

| attribute | default | what it does |
| --- | --- | --- |
| `data-dropdown-travel` | `16` | px the links drift when switching dropdowns |
| `data-dropdown-crossfade` | `110` | ms for the old and new links to crossfade |
| `data-dropdown-flip` | `false` | `true` brings the new links in from the other side |
| `data-dropdown-safe-triangle` | `true` | `false` switches tabs the instant they are touched |
| `data-dropdown-pass-through` | `0` | ms a tab must be hovered before it takes over; `0` is off |

Slower-changing timings are constants at the top of the file: `SLIDE` (panel),
`OPEN_IN`, `DRIFT_MS`, `HOVER_MS`, `SAFE_REST`, `SAFE_SLOPE`, `SAFE_PAD`.

### What the script sets inline

Only what the style panel cannot express:

- the SVG path for the panel
- each list's `top`, `padding-top` and squared top corners. The list starts flush
  under its tab and its transparent top padding covers the strip of pill between
  tab and panel, so the pointer never leaves the dropdown on the way down.
  Webflow's hover-out timer is not cancelled by re-entering, so without this the
  dropdown closes about 300ms after the pointer crosses that strip.
- a `clip-path` while the panel is moving, so links never show outside it
- the highlight's position, and a transparent background on the links while the
  highlight is doing their hover
