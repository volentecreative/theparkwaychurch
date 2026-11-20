# Later: accessibility and AI discoverability

Notes to pick up once the content is in. Nothing here is built yet.

## Accessibility: what Webflow doesn't cover

Webflow handles a lot natively (semantic tags, alt text fields, `lang`,
focus-visible states in the style panel). These gaps are on us:

| gap | how | where |
| --- | --- | --- |
| **Skip link.** No "Skip to content" before the nav, so keyboard users tab through the whole header on every page. | A visually hidden link as the first element in the page wrapper, targeting `main` (give it an id). It becomes visible on focus. | Designer (native), no script needed |
| **Focus inside the open mobile menu.** narthex locks scroll, sets `aria-expanded` and closes on Escape, but focus can tab out of the open menu into the page behind. | Trap Tab inside the menu while open, and return focus to the hamburger on close. | narthex `nav` module (benefits every site) |
| **Links that open a new tab.** Screen readers don't announce it. | A script adds visually hidden "(opens in a new tab)" text and `rel="noopener"` to `target="_blank"` links. | small site script, or narthex |
| **Visible focus on custom controls.** The arch buttons draw with SVG; check that focus-visible is clearly visible on every variant and on the dark sections. | Focus-visible state on `button` / `button_type` in the style panel. | Designer |
| **Placeholder links.** Several buttons are `href="#"` ("Our mission", "What we believe"). They read as links that go nowhere. | Point them at real pages before launch. | content |
| **Heading order.** Check each page goes h1 → h2 → h3 without skips once real content is in (style can differ from the tag via `heading-style-*`). | Audit. | content |
| **Reduced motion.** Done: the header slide, script write-on and scroll reveals all respect it. | | |
| **Colour contrast.** Light text on `brand-100` / `brand-200` and muted captions need a check against WCAG AA (4.5:1 body, 3:1 large). | Audit with the final palette. | Designer |

## AI discoverability (and search)

Goal: assistants and search engines can answer "when are services at The
Parkway Church?", "where is it?", "what's coming up?" correctly, with **no
code or meta edits when things change**. Everything should flow from data
the church already edits: the Webflow CMS, the CCB calendar (already synced
into the Events collection), and a few fixed facts.

### 1. Organisation schema (fixed facts), site-wide

JSON-LD in the site head: `@type: Church` (a `Place` /
`LocalBusiness`-family type) with name, url, logo, address (5600 Virginia
Parkway, McKinney, TX 75070), geo, telephone, email, sameAs (Facebook, etc.).
These rarely change, so hard-coding them is fine. Keep them in one place.

### 2. Service times, from the CMS, not code

Add a small **Gatherings** CMS collection (Sunday Worship 10:30, TEC 9:00,
Evening Prayer 5pm on 1st and 3rd Sundays, …) that also drives the "service
times" block on the homepage. Generate schema from the same items, so the page
and the schema can never disagree:

- either a CMS-bound Embed on a Collection List that prints each gathering as
  an `Event` with `eventSchedule` (`Schedule`: `byDay`, `startTime`,
  `repeatFrequency`), placed on the homepage / visit page;
- or have the calendar sync job write it (it already reads CCB, which has
  these as repeating events with exact rules).

### 3. Upcoming events, already in the CMS

The sync keeps the Events collection current. Add an Events template page
(one page per event) with a CMS-bound JSON-LD `Event` (name, startDate,
endDate, location, description, url). Search and assistants then see every
upcoming event without anyone touching code.

### 4. Page summaries

Each page's SEO description comes from its own content. For CMS pages
(sermons, events) bind the meta description to a summary field. For static
pages, write the description once in Page settings. Avoid generated
boilerplate.

### 5. `llms.txt`

A plain-text `/llms.txt` that tells AI crawlers what the site is and where the
key facts live (visit, beliefs, gatherings, events, sermons, contact). Webflow
can't host arbitrary root files, so either a 301 from `/llms.txt` to a
Webflow page with the same plain content, or serve it from a Cloudflare
Worker in front of the domain once it's live. Generate its "upcoming events"
section from the Events collection so it stays current.

### 6. Sermons

When sermons move into the CMS: `PodcastEpisode` / `VideoObject` /
`CreativeWork` schema per item, bound to CMS fields (title, speaker, date,
scripture, media URL).

### Checks

Google Rich Results Test and the Schema.org validator on the homepage, an
event page and a sermon page. Spot-check by asking an assistant the questions
above once the domain is live and indexed.
