# Motedis importer

There isn't one yet. `src/data/catalogs/motedis/parts.json` was transcribed by
hand from the eleven product pages listed below, because the range is small and
Motedis publishes no machine-readable catalogue.

## What came from the pages

For each product: the article number (`Art. No.`), the slot, the thread
(`Size`), and the material. All verbatim, except that Motedis describes the same
material as both "zinc plated" and "galvanized" across pages in one product
line — those are normalised to `Steel, zinc-plated`.

| Slot | Article numbers |
|---|---|
| 5 | `S5ISMONM3G`, `S5ISMONM4G`, `S5ISMONM5G` |
| 6 | `S6ISMONM3G`, `S6ISMONM4G`, `S6ISMONM5G`, `S6ISMONM6G` |
| 8 | `S8ISMONM4`, `S8ISMONM5`, `S8ISMONM6`, `S8ISMONM8` |

Slot 8 is titled "T-nut guided" and slots 5 and 6 "T-nut with spring ball, with
guidance", but every page's product data lists a stainless spring ball. They are
recorded as one variant, `tnut-spring-ball`, on the strength of the data rather
than the titles.

## What is still missing

**Block dimensions.** Motedis does not publish length, width or height on the
product pages — only the thread and the slot. The figures that feed
`volumeMM3`, and therefore every order-list quantity, are the estimates in
`BLOCK_MM` at the top of `src/data/partTypes/tSlotNut.js`.

Each product page links a drawing PDF (`Motedis_S8ISMONM8-Drawing_1.pdf` and
friends) which will have the real numbers. Replacing the three rows in
`BLOCK_MM` with measured values is the single highest-value fix here, and it is
the only place those dimensions are used.

## Extending the catalog

Motedis sells far more than T-nuts: brackets, corner connectors, connector
plates, profile end caps. Each needs a part type that can describe it, so start
from `doc/CATALOG_SCHEMA.md` and `CONTRIBUTING.md` rather than bolting extra
fields onto `t-slot-nut`.

Source pages, retrieved 2026-09-16:
`https://www.motedis.com/en/T-nut-with-spring-ball-with-guidance-I-Type-slot-{5,6}-M{3,4,5,6}`
and `https://www.motedis.com/en/T-nut-guided-I-type-slot-8-M{4,5,6,8}`.
