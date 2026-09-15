# Tools

## Bossard Catalog Parser

`parse_bossard.py` extracts fastener dimensional data from Bossard PDF datasheets and produces `src/data/bossard-db.json`.

### Obtaining the PDFs

The PDF datasheets are copyrighted by Bossard and are not included in this repository. To regenerate the database:

1. Download the relevant BN (Bossard Norm) datasheets from [bossard.com](https://www.bossard.com)
2. Place the PDF files in `tools/pdfs/` (e.g., `BN_912.pdf`, `BN_610.pdf`, etc.)
3. Install Python dependencies: `pip install -r requirements.txt`
4. Run the parser: `python parse_bossard.py`

The output `bossard-db.json` is committed to the repository since it contains only factual dimensional data (thread sizes, lengths, head dimensions).
