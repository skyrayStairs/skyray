# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the owner (Kyung Song), using the site's tools in the middle of the activity they support — mid-set at the gym, mid-practice with a guitar in hand, mid-session at a D&D table. Phone in one hand, attention on something else.

Secondary: people the owner hands a link to — friends, a D&D table, gym company. They arrive with no onboarding, no account, and no explanation, and are expected to get somewhere useful in their first minute. This is a real audience, not a hypothetical one: the site must survive a stranger's first visit.

Not an audience: anonymous search traffic, customers, or anyone the site is trying to convert.

## Product Purpose

A personal site that puts one person's photography and one person's hobbies under a single roof. Two things it does at once:

- shows the owner's photographs;
- houses the small tools the owner's hobbies need — currently a D&D spell-set manager, a guitar practice routine runner, and a gym tracker.

Success in a year: the tools are still in daily/weekly use by the owner, and the photo work is worth showing. A tool that stops being used has failed regardless of how it looks.

## Positioning

Not a product competing for users. Its advantage over any commercial gym/practice/D&D app is that it is built to fit exactly one person's actual routine — no account, no upsell, no feature it wasn't asked for, no data leaving the device. That fit is the whole reason it exists, and it is what a general-purpose app cannot copy.

## Operating Context

- **Gym tracker** (`/sandbox/gym`): used standing up, one-handed, out of breath, between sets, on a phone. Rest timer runs with audio. Data is a routine → days → exercises → sets plan, plus a session log.
- **Guitar routine** (`/sandbox/guitar-routine`): used with a guitar in hand, glancing at the screen. Metronome, fretboard exercises, video looping.
- **Spell sets** (`/toolkit/spell-sets`): used at a table during play; Known vs Prepared spell lists for a D&D 5e character.
- **Photo home** (`/`): auto-rotating vertical carousel; the front door.
- **Photo map** (`/photo`): Leaflet map of photographs (loads Leaflet from a CDN).

Everything is reachable from a hamburger drawer with nested Toolkit / Sandbox sections. *(Inferred, not confirmed: `/sandbox` appears to hold what is still being tried out and `/toolkit` what has settled — the route copy reads that way, but the owner has not stated it.)*

## Capabilities and Constraints

Binding constraints — future work must preserve all three:

- **No backend, ever.** No accounts, no server, no sync service, no analytics backend. All state lives in `localStorage`. JSON import/export is the only way data moves between devices, and therefore the only backup — export/import must stay first-class, not an advanced feature.
- **Phone-first in use.** The tools are operated during the activity, not at a desk. Tap targets, glanceability, and one-handed reach outrank information density on any surface used mid-activity. Desktop is a secondary, larger view of the same thing.
- **Static and free to host.** Fully static SvelteKit build (`adapter-static`) deployed to Netlify. Nothing may require a runtime, an edge function, or a paid tier.

Technical facts:

- SvelteKit 2 + Svelte 5 runes, TypeScript, Tailwind + daisyUI, Playwright for tests.
- Repo: `github.com/skyrayStairs/skyray`. Build → `build/`, published by Netlify.
- Fonts and Leaflet load from CDNs; there is no self-hosted asset pipeline beyond `static/`.

Undecided / not established: whether `/sandbox` tools graduate to `/toolkit` and on what signal; whether anything is ever shared to a URL rather than a JSON file.

## Brand Commitments

None binding. The incumbent identity — the vertical Korean wordmark 기록, cream `#F0EDCC` / teal `#02343F`, KNUTRUTHTTF headings with SUITE-Regular body — is the current implementation, explicitly **open to replacement** in a future redesign. It is evidence of where the site landed, not a commitment future work must honor.

## Evidence on Hand

- Real photographs by the owner in `src/lib/assets/img/` (vertical set drives the home carousel).
- Real usage data: the gym and guitar tools are the owner's own, and their session logs are real.
- No testimonials, customers, press, metrics, or third-party validation exist. Future work must not fabricate any.

## Product Principles

1. **The activity comes first, the screen second.** Every tool is used while doing something else. If a design decision costs a glance or a second hand, it loses.
2. **One person's fit beats general-purpose completeness.** Build the thing this routine needs. A feature nobody asked for is a liability.
3. **The device is the database.** No backend is a feature, not a limitation — but it makes export the safety net, so it can never be buried.
4. **A stranger gets one minute.** Handing someone a link is a real distribution path; a surface must be self-explanatory without onboarding.
5. **Narrow is fine, broken on a phone is not.** An experiment may do one thing and stop there. It may not fail the phone-first constraint — that floor applies to every surface, finished or not.

## Accessibility & Inclusion

Established requirement is **phone ergonomics**, not a broader standard: touch targets sized for a thumb (≥44px on surfaces used mid-activity), form fields at ≥16px so iOS never zooms on focus, and OS reduced-motion respected. Wider accessibility work (contrast ratios, screen-reader flows) is present in places from past audits but is not a stated product requirement.
