# theparkwaychurch

Site code for The Parkway Church Webflow build. Everything Parkway-specific
lives here and is loaded from jsDelivr. Shared behaviour (the header
measurements and mobile menu) still comes from
[narthex](https://github.com/volentecreative/narthex) and is not copied here.

## Layout

| Path | What it is |
| --- | --- |
| `src/buttons.js` | Arch button morph, and the nav pill shape that follows it. |
| `src/nav-scroll.js` | Header slides away on scroll down and back on scroll up. Closes an open dropdown after 8px of scrolling down. |
| `src/nav-dropdown.js` | Connected nav dropdowns (see below). |
| `src/script-draw.js` | Draw-on for `.text-style-script` lettering when it scrolls into view. |
| `src/image-sizes-fix.js` | Sets each image's `sizes` to its rendered width. Same fix as The North Church. |
| `scripts/sync-events.js` | Google Calendar → Webflow CMS Events sync. Run hourly by `.github/workflows/sync-events.yml`. |
| `scripts/build.js` | Concatenates `src/` into `dist/`. No transpile, no minify. |
| `dist/parkway.js` | **Committed.** Footer bundle: buttons, nav-scroll, nav-dropdown, in that order. |
| `dist/parkway-head.js` | **Committed.** Head bundle: image-sizes-fix. |

Source is ES5-compatible browser JS, because nothing transpiles it.

## Load it

Head code:

```html
<script src="https://cdn.jsdelivr.net/gh/volentecreative/theparkwaychurch@v0.4.0/dist/parkway-head.min.js"></script>
```

Footer code, alongside the narthex nav tag:

```html
<script defer src="https://cdn.jsdelivr.net/gh/volentecreative/theparkwaychurch@v0.4.0/dist/parkway.min.js"></script>
```

jsDelivr minifies on request when the URL ends in `.min.js`, and only serves
public repositories.

## Release

Edit `src/` → `npm run build` → `npm run check` → commit (including `dist/`) →
`git tag vX.Y.Z` → push with tags → bump the version in the two script tags.

## Scroll-linked header

`src/nav-scroll.js` only adds and removes `is-hidden` on `.nav_component`: on
when the page scrolls down, off when it scrolls up or is near the top. The
motion is all in the Webflow style panel:

| class | what is set |
| --- | --- |
| `nav_component` | `position: fixed`, `transition: transform 300ms` |
| `nav_component` + combo `is-hidden` | `transform: translate(0, calc(-100% - 2rem))` |

Change the speed, easing or distance there; no new script version needed.

## Script lettering draw-on

`src/script-draw.js`: each `.text-style-script` (or any element with `vci-draw`)
writes itself on the first time it scrolls into view. The letter outlines are
traced left to right, then the letters fill. The real text is only hidden while
it plays and is restored afterwards. Skipped for reduced motion, wrapped
lettering, and lettering that contains other elements.

| attribute | default | what it does |
| --- | --- | --- |
| `vci-draw="false"` | | leave this element alone |
| `vci-draw-duration` | `2200` | ms for the whole draw |
| `vci-draw-stroke` | `0.018` | outline width, as a fraction of the font size |

## Button depth

Filled (Primary) buttons get `button_shape.is-fill`, which carries the drop
shadow in the style panel. `buttons.js` also adds a `button_shine` path that
copies the button outline with a light-to-shade gradient. The gradient lives in
`shineFor()` in `src/buttons.js` because it has to follow the arch morph.

## Calendar events sync

The homepage "Upcoming events" list is a Collection List of the Webflow
**Events** collection. A GitHub Action (`.github/workflows/sync-events.yml`)
runs `scripts/sync-events.js` every hour: it reads the church's public Google
Calendar and makes the collection match the upcoming events. New events are
created, edited ones updated, and past, cancelled or deleted ones removed.
Changes are published straight away. Edit events in Google Calendar, never in
the CMS: the next run overwrites CMS edits.

Setup (repository → Settings → Secrets and variables → Actions):

| name | kind | value |
| --- | --- | --- |
| `GOOGLE_API_KEY` | secret | Google Cloud API key with the Google Calendar API enabled |
| `WEBFLOW_TOKEN` | secret | Webflow site API token with CMS read and write |
| `GOOGLE_CALENDAR_ID` | variable | e.g. `abc123@group.calendar.google.com`. The calendar must be public. |
| `WEBFLOW_COLLECTION_ID` | variable | `6b005da0bd484318dd94b6dd` (Events) |
| `EVENTS_DAYS_AHEAD` | variable, optional | how far ahead to sync; default `120` |
| `EVENTS_SKIP` | variable, optional | regex; events whose title matches are left out, e.g. `^Sunday Worship` |

GitHub only runs scheduled workflows from the default branch, so the hourly
run starts once this is merged to `main`. Run it by hand from the Actions tab
("Sync calendar events" → Run workflow); tick "dry run" to see what would
change without writing.

Fields the sync writes: Name, Slug, Start, End, All day, Time (`6:30–8pm`,
`All day`, `Through Tue, Dec 8`), Location, Details (Time · Location),
Description (plain text), Calendar link, Google event ID (the match key). All-day
events are stored at noon Central so the date never shifts a day.

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
