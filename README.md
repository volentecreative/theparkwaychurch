# theparkwaychurch

Custom code for The Parkway Church Webflow site. Loaded from jsDelivr.

## dist/nav-dropdown.js

Connects the open nav dropdown to the nav pill as one shape (concave corners where
they meet), slides the shape between dropdowns, glides one highlight between the
links, and rotates the chevron of the open dropdown.

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
| `nav_dropdown-list` + combo `is-connected` | background transparent, no border, no shadow. Keep the radius: the script reads it for the corners. |
| `nav_dropdown-icon` | transition: transform 250ms |
| `nav_dropdown-icon` + combo `is-open` | rotate 180deg |
| `nav_dropdown-highlight` (optional div inside each list) | background and radius of the gliding hover. Without it the script makes its own from the link radius and `--brand--brand-100`. |

`nav_dropdown-list` + combo `is-leaving` is also applied to the list being left
while Webflow's hover delay still holds it open, if it ever needs its own style.

### What the script sets inline

Only what the style panel cannot express: the SVG path, the list's `top` (so it
meets the pill's bottom edge), a `clip-path` while the shape is moving, the
highlight's position, and a transparent background on the links while the
highlight is doing their hover.

### Tuning

Constants at the top of the file: `SLIDE`, `LINK_IN`, `LINK_OUT`, `LINK_SHIFT`,
`HOVER_MS`, `HOVER_TINT`.
