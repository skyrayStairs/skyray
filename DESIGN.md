---
name: skyray
description: A personal photo site with small, dense tools for the hobbies attached to it.
colors:
  cream: "#F0EDCC"
  teal: "#02343F"
  primary: "oklch(0.4912 0.3096 275.75)"
  error: "oklch(0.7176 0.221 22.18)"
  alert: "#B3261E"
  surface-card: "rgba(255, 255, 255, 0.6)"
  surface-field: "#FFFFFF"
  surface-muted: "rgba(2, 52, 63, 0.07)"
  hairline: "rgba(2, 52, 63, 0.15)"
  border-card: "rgba(2, 52, 63, 0.2)"
  border-field: "rgba(2, 52, 63, 0.3)"
typography:
  display:
    fontFamily: "KNUTRUTHTTF, sans-serif"
    fontSize: "clamp(1.25rem, 5vh, 2.5rem)"
    fontWeight: 300
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  field:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  button:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
  caption:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
  chip:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 400
    letterSpacing: "0.025em"
  clock:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1
rounded:
  control: "8px"
  card: "12px"
  sheet: "16px"
  pill: "9999px"
spacing:
  hair: "4px"
  tight: "8px"
  base: "12px"
  loose: "16px"
components:
  control:
    height: "2rem"
    rounded: "{rounded.control}"
  tap-target:
    height: "2.5rem"
    width: "2.5rem"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.control}"
    height: "{components.control.height}"
    padding: "0 12px"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.teal}"
    rounded: "{rounded.control}"
    height: "{components.control.height}"
    padding: "0 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.teal}"
    rounded: "{rounded.control}"
    height: "{components.control.height}"
    padding: "0 8px"
  field:
    backgroundColor: "{colors.surface-field}"
    textColor: "{colors.teal}"
    rounded: "{rounded.control}"
    height: "{components.control.height}"
    padding: "0 4px"
    typography: "{typography.field}"
  field-muted:
    backgroundColor: "rgba(255, 255, 255, 0.6)"
    rounded: "{rounded.control}"
    height: "{components.control.height}"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.teal}"
    rounded: "{rounded.card}"
    padding: "8px"
  sheet:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.teal}"
    rounded: "{rounded.sheet}"
---

# Design System: skyray

## Overview

A cream page with one dark teal on it, holding tools that are mostly numbers. Two different jobs
live under the same roof and get different treatment: the **photo surfaces** are quiet and let the
image lead; the **tools** (`/sandbox/gym`, `/sandbox/guitar-routine`, `/toolkit/spell-sets`) are
dense instrument panels operated one-handed while doing something else.

The identity is cream `#F0EDCC` and teal `#02343F` with a Korean wordmark (기록, set horizontally in
the header — it read vertically until 2026-08-09). PRODUCT.md
records it as the current implementation rather than a binding commitment — it is evidence of where
the site landed, and a future redesign may replace it.

**What is chosen versus inherited.** Cream, teal, and the compact control scale below are chosen.
The `primary` violet and `error` red are daisyUI's untouched light-theme defaults — they are
recorded here because they are what ships, not because anyone picked them. Treat them as the first
thing to revisit in a redesign.

*Not captured here:* the qualitative pass — creative north star, mood adjectives, colour character
names. `/impeccable document` Step 3 needs the owner for those and has not been run. This file was
written by hand rather than generated, so it has no sidecar; `/impeccable doctor` will report that
as drift, and that report is expected rather than a problem to chase.

## Colors

| Token | Value | Role |
|---|---|---|
| `cream` | `#F0EDCC` | Every page background, and the background of every sheet and drawer. |
| `teal` | `#02343F` | All text, all borders, all hairlines. There is no second text colour. |
| `primary` | daisyUI default violet | Primary action, current selection, progress. Never decoration. |
| `error` | daisyUI default red | Destructive actions and validation only. |
| `alert` | `#B3261E` | The one warm hue, and only for a choice the page is still owed — the blinking feature box in the class reference and its count badge. Never decoration, never a surface. |

`alert` exists because daisyUI's `error` is `rgb(255 88 97)`, which carries cream text at 2.6:1 and red-on-cream text at the same — under AA for anything small. `#B3261E` clears 5.5:1 against cream, so a 0.65rem bold badge on it is legible. Use `error` for validation and destructive actions as before; use `alert` only for the unfinished-choice state.

Secondary text is **teal at reduced opacity**, never grey — `opacity-70` for supporting text,
`opacity-50` for units and hints, `opacity-40` for ordinals. Nesting opacities multiplies them; set
one explicitly on the inner element rather than letting `0.7 × 0.8` decide.

Surfaces are tonal layers of the same two colours:

- **page** — cream
- **card** — `rgba(255,255,255,.6)` over cream, border `teal/20`
- **field** — solid white, border `teal/30`
- **muted band** — `teal/[0.07]`, used for content that is present but not the work (gym warm-up sets)
- **selected row** — `primary/15`

Brand colours are tokenized in two places on purpose (`src/app.css :root` for CSS blocks,
`tailwind.config.js` for utilities, so `/NN` opacity modifiers work). SVG `fill=`/`stroke=` and
`rgba(2,52,63,…)` forms are deliberately left as literals.

## Typography

One system sans for everything in the tools. The display face is **`KNUTRUTHTTF`** (Korean brand
face, `@font-face` from the projectnoonnu CDN in `src/app.css`), declared as the `display` role in
this file's frontmatter and reserved for site chrome — the wordmark, the nav, and page/exercise
headings — never a control, a label, or data. Write it as the full stack (`KNUTRUTHTTF, sans-serif`)
wherever it's applied, inline styles included, so the fallback is explicit.

Fixed rem steps, not fluid: these are instrument panels read at consistent size, and a heading that
shrinks inside a drawer looks worse, not better. The wordmark is the one exception (`clamp()` on
viewport height, because it scales with the header).

| Role | Size | Use |
|---|---|---|
| clock | 28px | The one live countdown per surface, read at arm's length |
| title | 16px / 600 | Exercise names, routine names, sheet headings |
| body | 16px / 400 | Prose, sheet copy |
| **field** | **16px / 400** | Every `input`, `select`, `textarea` — **a floor, not a choice** |
| button | 13px / 600 | All button text |
| label | 12px | Units (`kg`, `reps`), secondary counts |
| caption | 11px | Goals, eyebrows, per-set annotations |
| chip | 10px | Status pills and fold chevrons — the floor of the ramp |

The ramp bottoms out at 10px and it is for **pills and chevrons only** — a badge whose shape and
position carry the meaning and whose text is confirmation. Nothing a user has to read to act on
goes below `caption`.

`clock` is the only step above `title`. It exists because one number per surface — a rest
countdown — is read from across a room rather than in the hand, and it earns the size by being the
only thing that large.

**The 16px field floor is non-negotiable.** iOS Safari zooms the page whenever a focused field's
computed font-size is under 16px. The viewport hack that suppresses it (`maximum-scale=1`) also
kills pinch-zoom, so the only honest fix is the type size. Apply it once with a scoped rule over a
wrapper class, not per-control — see the `<style>` block in `src/routes/sandbox/gym/+page.svelte`.
Buttons are exempt: only *focused fields* trigger the zoom, so button labels sit at 13px.

Numbers use `tabular-nums` everywhere they can change — a countdown or a weight that reflows as its
digits change is unreadable at a glance.

## Layout

Phone-first, always. Content columns cap at `max-w-2xl` and centre; desktop is a wider view of the
same thing, never a different layout.

**Density is the point — in the tools.** They are read at a glance mid-activity, and vertical space
is the scarcest resource: a screen that shows four sets beats one that shows two in bigger boxes.
Controls are sized down to 32px rather than up to a touch minimum.

**Scope, precisely.** The compact scale governs the mid-activity tools, and it is implemented
per-surface by a scoped wrapper class rather than globally — the reference implementation is the
`<style>` block over `.gym` in `src/routes/sandbox/gym/+page.svelte`, and `/sandbox/gym` is
currently the only surface that has adopted it. Everywhere else — `/toolkit/spell-sets`,
`/sandbox/guitar-routine`, the nav, the photo surfaces — still gets `app.css`'s
`@media (pointer: coarse)` bump to 40px on touch, which remains the site-wide default. Adopting the
compact scale on a new surface is a decision to make with the owner, not something to apply because
this file describes it.

- **Control height: `2rem` / 32px.** Fields, selects, and buttons all share it.
- **`.tap-target`: `2.5rem` / 40px.** An opt-in class, not a default. It goes on the two or three
  controls per surface that are genuinely hit mid-activity — the gym's done checkbox, its header
  clock — and nowhere else.
- **Number fields are sized to three digits**, the realistic maximum for a weight or a rep count:
  `w-12` (48px) for reps and goals, `w-14` (56px) for weights, which also need a decimal.

This is **deliberately under Apple's 44px touch minimum**, chosen against the default after the
44px version was built and rejected as too bulky. Do not "restore" it. If real-device use starts
producing misses, raise the control pair to `2.25rem` first and keep `.tap-target` where it is.

Rows fit on one line at 390px or they wrap — they never shrink a control below its floor to save a
line. Measure the row (`getBoundingClientRect` on each child versus the container's `clientWidth`)
rather than eyeballing it; the difference between fitting and wrapping has repeatedly been 1px.

Overlays escape their container: sheets and drawers are `position: fixed`, in three fixed bands —
**full-screen drawer `z-50`**, **sheets `z-60`/`z-70`** (backdrop/panel), **site nav `z-100`/`z-101`**.
Sheets are only ever opened *on top of* a drawer, never under one, so the bands never collide. Do
not paint them at the same z and rely on DOM order: that leaves a sheet's backdrop beneath the
drawer it is covering, and the drawer's own buttons stay live behind it.

## Elevation & Depth

Flat and tonal. Depth comes from surface opacity and 1px hairlines, not shadows.

The single exception is the sheet/drawer, which carries a real shadow (`shadow-2xl`) because it has
to read as detached from the page under it. Backdrops are `bg-black/50`. Nothing else in the system
has a shadow, and nothing has a coloured glow.

## Shapes

Radii climb with the size of the thing: `8px` controls, `12px` cards, `16px` sheet tops, full pills
for status chips. Borders are always 1px, always teal at some alpha.

Dividers are hairlines at `teal/15`. Where a divider carries a value — the gym's rest between sets —
it is drawn as **a rule broken in the middle by the number**, which separates the two rows rather
than hanging off one of them.

## Components

**Buttons.** Three roles and no more: `btn-primary` for the one action a surface exists for,
`btn-outline` for secondary, `btn-ghost` for tertiary and icon buttons. daisyUI's `button-pop`
animation leaves every `.btn` resting at `transform: scale(0.95)` in this build, so a nominal
height paints ~5% short — every surface using these must set `animation: none; transform: none` on
`.btn` for its sizing to be real rather than nominal.

**Fields.** Solid white on the tonal card, `teal/30` border. `type="number"` fields have their
spinner arrows removed: the arrows steal ~15px from a small box and are unusable with a thumb.
Where stepping matters, supply explicit `−`/`+` buttons beside the field — there is no way to add
steppers to a mobile software keyboard, so the buttons are the affordance.

Borderless fields (`.input-ghost`) are typography rather than boxes: transparent, no border, a
tinted background only on focus. Used where a label and its value are the same thing — a day name in
a header, a one-line note.

**Sheets and drawers** are the only modal vocabulary. One shell (`$lib/components/Sheet.svelte`,
with `ActionSheet.svelte` layering a list of choices over it — both live outside any feature
folder because gym, guitar and the D&D toolkit all use them) with three modes:

- **sheet** — bottom, `max-h-85dvh`, backdrop, grabber, dismissable.
- **full-screen drawer** — `inset-0` over the site header and footer, no backdrop, and
  `dismissable={false}` when it owns an explicit exit. Used when the user is *in* a task rather than
  on a page that contains one.
- Both take pinned `header`/`footer` regions outside the scroller, so a surface's primary action
  survives a long list.

Menus are **bottom sheets, never dropdowns**: a `⋯` button inside a scroller gets its dropdown
clipped at the worst moment, and a menu anchored to the top of a phone is where a thumb cannot
reach. Rows are full-width so the target is the row, not the label.

**Long lists fold.** A picker with dozens of entries opens collapsed by group with a count on each,
and a search box that expands everything while it has a query — a filtered group that stays folded
is just a wrong answer.

**Empty states teach the surface**: what the thing is, then the action that creates one.

**Errors are inline, never `alert()`**: a dismissible banner in the surface's sticky bar
(`bg-error/10 text-error border-error/30 rounded px-2 py-1 text-xs role="alert"`), cleared at the
start of the handler that can set it.

## Do's and Don'ts

**Do**

- Size a control from the grid it lives in; add `.tap-target` only where a thumb genuinely lands.
- Keep field text at 16px. Shrink height, width, and button labels instead.
- Tint secondary text from teal. Set one opacity, on one element.
- Measure the row at 390px before claiming it fits.
- Give overlays a band from the three above.
- Reach for a bottom sheet before a dropdown, a popover, or a native `confirm()` that needs more
  than two answers.

**Don't**

- Don't restore 44px controls. It was built that way and rejected.
- Don't introduce a hue beyond `alert`. Warm-ups, disabled states, and secondary surfaces are all
  teal at some alpha, and `alert` is spent on the one thing that is asking you for something.
- Don't put the display face in a label, a button, or data.
- Don't add a shadow to anything that isn't a sheet.
- Don't use emoji glyphs at their default presentation — append U+FE0E (`⏱︎`) so they render as
  monochrome text and inherit teal instead of arriving as colour cartoons.
- Don't rely on a Tailwind `text-*` utility to override a scoped `.btn` font-size rule: the scoped
  selector wins on specificity and the utility silently does nothing. Use an inline `style` for the
  handful of controls that need a deliberate size.
