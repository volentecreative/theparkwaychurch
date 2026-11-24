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
| `src/nav-toggle.js` | Mirrors the hamburger's `is-open` onto its lines, so the X is styled in the panel. |
| `src/reveal.js` | Default scroll entrance for headings, text, images and buttons. |
| `src/nav-dropdown.js` | Connected nav dropdowns (see below). |
| `src/seasons.js` | Swaps `vci-season="name"` text for the current season, from the Seasons CMS collection. |
| `src/script-draw.js` | Trim-path write-on for `.text-style-script` lettering. |
| `src/script-draw-paths.js` | **Generated** pen lines per word, from `scripts/trim-paths/`. |
| `src/image-sizes-fix.js` | Sets each image's `sizes` to its rendered width. Same fix as The North Church. |
| `src/script-draw-early.js` | Head: holds script lettering invisible from before the first paint, so the Designer text doesn't flash before the write-on. |
| `scripts/sync-events.js` | Church calendar (CCB iCal) → Webflow CMS Events sync. Run hourly by `.github/workflows/sync-events.yml`. |
| `scripts/build.js` | Concatenates `src/` into `dist/`. No transpile, no minify. |
| `dist/parkway.js` | **Committed.** Footer bundle: buttons, nav-scroll, nav-dropdown, in that order. |
| `dist/parkway-head.js` | **Committed.** Head bundle: image-sizes-fix, script-draw-early. |

Source is ES5-compatible browser JS, because nothing transpiles it.

## Load it

Head code:

```html
<script src="https://cdn.jsdelivr.net/gh/volentecreative/theparkwaychurch@v0.9.15/dist/parkway-head.min.js"></script>
```

Footer code, alongside the narthex nav tag:

```html
<script defer src="https://cdn.jsdelivr.net/gh/volentecreative/theparkwaychurch@v0.9.15/dist/parkway.min.js"></script>
```

jsDelivr minifies on request when the URL ends in `.min.js`, and only serves
public repositories.

## Release

Edit `src/` → `npm run build` → `npm run check` → commit (including `dist/`) →
`git tag vX.Y.Z` → push with tags → bump the version in the two script tags.

## Scroll-linked header

A direction-aware header. Scrolling down, it belongs to the document and
scrolls away with it. Scrolling up, it slides in from above and stays fixed at
the top. Scrolling down again, it is released back into the document right
where it is and scrolls away naturally. At the top of the page it is exactly as
on load.

CSS does the positioning and motion:

| class | where | what is set |
| --- | --- | --- |
| `nav_component` | style panel | `position: absolute`, `transition: transform 300ms` |
| `nav_component` + combo `is-pinned` | style panel | `position: fixed` |
| reduced motion | site head code | `@media (prefers-reduced-motion: reduce) { .nav_component { transition: none } }` |

`src/nav-scroll.js` sets `data-scroll-direction="up" | "down"` on
`.nav_component` (moves under 6px are ignored), and acts only when the direction
changes. On **up** it adds `is-pinned`, with a one-off inline `transform` so the
slide starts from where the header is on screen; CSS animates it to rest. On
**down** it removes `is-pinned` and sets an inline `top` at the header's current
place in the page. At `scrollY = 0` it clears both. Nothing runs while scrolling
in the same direction.

Change the speed and easing on `nav_component`'s transition; no new script
version needed.

## Current season

Parkway's year runs in four seasons, kept in the **Seasons** CMS collection
(Name, Start Month, End Month; a season may wrap the year, e.g. December to
January). To change when a season starts or ends, edit it there and publish.

A page that shows the season needs a hidden Collection List of Seasons
(class `seasons_list-wrapper`, display none). Each item holds one div with
`vci-season="item"` and `vci-season-name` / `vci-season-start` /
`vci-season-end` bound to the fields. Any element with `vci-season="name"`
then shows the season we're in today. If nothing matches, the Designer text
stays. Home has this next to the "at Parkway" heading. Copy that list to reuse
it on another page. It can't live in a component: the Webflow API won't bind
CMS fields inside a component's Collection List.

## Script lettering write-on

Like an After Effects trim path: each `.text-style-script` word is revealed
along a single pen line, written left to right the way you would draw it, the
first time it scrolls into view. It is one continuous movement: every stroke sits
end to end on one timeline under a single ease, with no pauses between strokes. The final frame is exactly the real text,
which then takes over.

A font only has outlines, so each word's pen line is generated ahead of time
(see `scripts/trim-paths/README.md`). Current words: Winter, Spring, Summer,
Fall. Any other word simply shows without the write-on. Skipped for reduced
motion.

| attribute | default | what it does |
| --- | --- | --- |
| `vci-draw="false"` | | leave this element alone |
| `vci-draw-duration` | `1800` | ms for the whole word |

Script swashes reach well outside the text box (up to ~0.4em left for "Fall"),
and Safari only paints text inside its box. So `text-style-script` carries
padding (2rem left, 1rem elsewhere) cancelled by equal negative margins. That
gives the ink room without changing layout.

## Button depth

Filled (Primary) buttons get `button_shape.is-fill`, which carries the drop
shadow in the style panel. `buttons.js` also adds a `button_shine` path that
copies the button outline with a light-to-shade gradient. The gradient lives in
`shineFor()` in `src/buttons.js` because it has to follow the arch morph.

## Tertiary underline

The Tertiary underline is a Webflow element, not drawn by script:
`button_type > button_underline > button_underline-line` ×2 (the second also
`is-incoming`, parked off the left). `button_underline` is `display: none` and
the Tertiary variant shows it, 0.2em under the label. Change its look (height,
color, offset) in the style panel; the Designer and live site match. On hover
`buttons.js` only slides the two lines with transforms and swaps them.

## Scroll entrances

`src/reveal.js` gives core content one consistent entrance. Headings,
paragraphs, blockquotes, images, video, figures and buttons inside `<main>` fade
in and rise 1rem, once, the first time they scroll into view. Elements that
arrive together cascade in reading order (70ms apart). The curve, distance and
no-replay are fixed site-wide; timing can be tuned:

| how | example | effect |
| --- | --- | --- |
| attribute on the element or any ancestor | `vci-reveal="false"` | no entrance (one on a section turns off all of it) |
| | `vci-reveal` | opt in an element that isn't a default target (a card, a list item) |
| | `vci-reveal-delay="200"` | ms before it starts |
| | `vci-reveal-duration="900"` | ms (default 600) |
| custom property on a class or combo class (style panel, Custom properties) | `--reveal-delay: 200`, `--reveal-duration: 900` | same, inherited by everything inside; an attribute wins over it |

Safe by construction: nothing is hidden unless the script runs; anything on
screen at load is left alone; only `opacity` and `translate` animate, so there
is no layout shift. Reduced motion skips it. Focus, find-in-page and print
reveal anything still waiting. It skips the nav, menus, dialogs, elements with a
Webflow interaction, script lettering, and anything inside another revealing
element.

## Custom code policy (as built)

All CSS lives in the Webflow style panel. The site head code holds only a
credit comment. Where Webflow's own state classes can't be targeted in the
panel, a script mirrors them onto classes that can be:

| state | mirrored by | styled in the panel as |
| --- | --- | --- |
| mobile menu open (`nav_toggle.is-open`, from narthex) | `nav-toggle.js` | `nav_toggle-line.is-open` with first-child / nth-child(even) / last-child |
| dropdown open in the collapsed menu (`w--open`) | `nav-dropdown.js` | `nav_dropdown-list.is-open` (tablet and below), `nav_dropdown-icon.is-open` |

Scripts only set inline styles for things that are measured or animated
(dropdown panel shape, highlight position, header pin/release, write-on,
reveals).

See `docs/roadmap.md` for accessibility and AI-discoverability work to pick up
later.

## Calendar events sync

The homepage "Upcoming events" list is a Collection List of the Webflow
**Events** collection. A GitHub Action (`.github/workflows/sync-events.yml`)
runs `scripts/sync-events.js` every hour. It reads the church's public calendar
in Church Community Builder (CCB) as an iCal feed, expands repeating events, and
makes the collection match the upcoming events. New events are created, edited
ones updated, and past, cancelled or deleted ones removed. Changes are published
straight away. Edit events in CCB, never in the CMS: the next run overwrites CMS
edits.

Feed: `https://theparkwaychurch.ccbchurch.com/w_calendar_sub.ics?strip_html=true`
(the "subscribe" link on the church's public CCB calendar). No API key needed.

Setup (repository → Settings → Secrets and variables → Actions): one secret,
`WEBFLOW_TOKEN` (a Webflow site API token with CMS read and write). Everything
else has a default in the workflow and can be overridden with a variable:

| variable | default | what it does |
| --- | --- | --- |
| `EVENTS_SKIP` | `^(Worship Service\|Evening Prayer Service\|Youth\|Theological Equipping Class)` | regex; matching titles are left out. The weekly gatherings are already in the homepage schedule. |
| `EVENTS_HOME` | `5600 Virginia\|^The Parkway Church$\|McKinney\|TX 750` | address parts left off the card, so on-site events show just the room |
| `EVENTS_DAYS_AHEAD` | `120` | how far ahead to sync |
| `EVENTS_ICAL_URL` | the CCB feed above | calendar feed |
| `WEBFLOW_COLLECTION_ID` | `6b005da0bd484318dd94b6dd` | the Events collection |
| `EVENTS_DEMO` | off | demo mode, see below |

**Demo mode.** To design the event cards while the calendar has nothing coming up, set the
variable `EVENTS_DEMO` to `1` (six events) or any number. Each run then tops the list up to that
many with the calendar's most recent past events (one per title), moved forward by whole weeks so
their weekday, time, room and description stay real. Real upcoming events always come first;
demo items only fill the gap. Their Event ID starts with `demo:`. **Delete the variable before
launch**: the next run removes every demo item and publishes the change.

GitHub only runs scheduled workflows from the default branch, so the hourly
run starts once this is merged to `main`. Run it by hand from the Actions tab
("Sync calendar events" → Run workflow); tick "dry run" to see what would
change without writing.

Fields the sync writes: Name, Slug, Start, End, All day, Time (`6:30–8pm`,
`All day`, `Through Tue, Dec 8`), Location (full), Details (Time · room),
Description (plain text), Event ID (the match key; its slug is `google-event-id`
from the first version). All-day events are stored at noon Central so the date
never shifts a day.

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
| `nav_dropdown-list` + combo `is-connected` | background transparent, no border, no shadow, `isolation: isolate` (keeps the highlight's z-index -1 inside the list), and `::before` display none (the floating card's hover bridge would otherwise cover the bottom of the tab). Keep the radius: the script reads the bottom corners for the panel. |
| `nav_dropdown-icon` | transition: transform 250ms |
| `nav_dropdown-icon` + combo `is-open` | rotate 180deg |
| `nav_dropdown-highlight` (div, first child of each `nav_dropdown-list`) | The gliding link highlight. Absolute at top/left 0, z-index -1, no pointer events, brand-100 tint, 0.75rem radius, opacity 0, fade/glide transitions; hidden at tablet and below. Combos: `is-active` (opacity 1), `is-instant` (transition on opacity only). The script only sets width, height and position. Without it, that list's links keep their native `:hover`. |
| `nav_dropdown-link` + combo `is-glide` | background transparent, also on `:hover`. Applied by the script while the gliding highlight is in charge. |
| `nav_links-highlight` (div, first child of `.nav_links`) | The gliding highlight behind the top-level tabs. Absolute at top/left 0, z-index -1, no pointer events, brand-100 tint, link radius, opacity 0, and the fade/glide transitions. Combos: `is-active` (opacity 1), `is-instant` (transition on opacity only, so a fresh appearance does not glide in). Hidden at tablet and below. The script only sets its width, height and position (the label plus the dropdown links' padding). Without the element there is no tab highlight. |

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
