# Bossard importer

`parse.py` extracts fastener data from Bossard PDF datasheets and writes
`src/data/catalogs/bossard/parts.json` in the normalized catalog schema.

## Regenerating

The datasheets are copyrighted by Bossard and are **not** committed. To rebuild:

1. Download the relevant BN datasheets from [bossard.com](https://www.bossard.com)
2. Put them in `pdfs/` (e.g. `BN_912.pdf`, `BN_610.pdf`)
3. `pip install -r requirements.txt`
4. `python3 parse.py`
5. `cd ../../.. && npm run validate`

The output is committed because it contains only factual dimensional data —
thread sizes, lengths, head dimensions, article numbers.

## Notes

The parser emits `partType`, `variant` and `shape` outright rather than leaving
them to be inferred at runtime. It also skips files it cannot classify, loudly,
instead of guessing: that is how a DIN 6799 retaining ring previously ended up
labelled as a washer, with a shaft diameter in its thread field.
