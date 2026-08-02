# SRD sources for the Class Features page

The markdown in this directory is the input to `scripts/build-class-data.mjs`, which generates
`src/lib/assets/data/dnd/classes/**`. It is committed so the site build never depends on GitHub
being reachable, and so the derivation stays reproducible.

## Licence

This work includes material from the System Reference Document 5.1 ("SRD 5.1") and the System
Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at
<https://www.dndbeyond.com/srd>. The SRD is licensed under the Creative Commons Attribution 4.0
International License, available at <https://creativecommons.org/licenses/by/4.0/legalcode>.

The attribution is owed to **Wizards of the Coast**, not to the mirrors below — the CC-BY grant
comes from WotC. The same notice is rendered at the foot of `/toolkit/class-features`, which is
what actually discharges the licence for site visitors.

Nothing here comes from D&D Beyond's own class pages: that is the Player's Handbook text, which is
copyrighted and not covered by the SRD grant.

## Where the files came from

Retrieved 2026-08-02. Both repositories default to the `master` branch.

| Path | Source | Notes |
| --- | --- | --- |
| `2024-classes.md` | [downfallx/dnd-5e-srd-markdown](https://github.com/downfallx/dnd-5e-srd-markdown) `classes.md` | SRD 5.2.1. 298,277 bytes. Carries a CC-BY-4.0 `LICENSE`. |
| `2014/<Class>.md` | [OldManUmby/DND.SRD.Wiki](https://github.com/OldManUmby/DND.SRD.Wiki) `02_Classes/` | SRD 5.1 + the Nov 2018 errata. No `LICENSE` file of its own; chosen because it is the only per-class markdown conversion. [palikhov/DND5E.SRD.Wiki](https://github.com/palikhov/DND5E.SRD.Wiki) is an equivalent fallback. |

## Refreshing

```sh
curl -sL -o scripts/srd/2024-classes.md \
  https://raw.githubusercontent.com/downfallx/dnd-5e-srd-markdown/master/classes.md
for c in Barbarian Bard Cleric Druid Fighter Monk Paladin Ranger Rogue Sorcerer Warlock Wizard; do
  curl -sL -o "scripts/srd/2014/$c.md" \
    "https://raw.githubusercontent.com/OldManUmby/DND.SRD.Wiki/master/02_Classes/$c.md"
done
node scripts/build-class-data.mjs
npx playwright test tests/classFeatures.spec.ts
```

The build script fails loudly rather than emitting partial data. Read its printed `~` alias and
`+ folded` lines — that is where the parser had to guess, and it is the moment to review a refresh.

## Coverage, and what is missing

Both SRDs contain all twelve core classes with full progression tables and base-class features, but
only **one subclass each**: Berserker, Lore, Life, Land, Champion, Open Hand, Devotion, Hunter,
Thief, Draconic, Fiend, Evoker. **Artificer is in neither SRD.** Anything beyond that is PHB-only
and cannot be shipped here.
