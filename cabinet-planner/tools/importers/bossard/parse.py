#!/usr/bin/env python3
"""
Bossard PDF catalog parser.

Reads all PDFs in ./pdfs/, extracts part metadata and article numbers,
outputs ../src/data/catalogs/bossard/parts.json in the normalized
catalog schema (see doc/CATALOG_SCHEMA.md).

Usage (from cabinet-planner/tools/importers/bossard/):
    python3 parse.py

Requirements:
    pip install pymupdf
"""

import json
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("Missing dependency: pip install pymupdf")

PDF_DIR = Path(__file__).parent / "pdfs"
# Repo root is three levels up now: tools/importers/bossard/parse.py
ROOT = Path(__file__).resolve().parents[3]
OUT_FILE = ROOT / "src" / "data" / "catalogs" / "bossard" / "parts.json"

# --- Mappings ---

HEAD_TYPE_MAP = {
    "Zylindrisch niedrig": "low-socket",
    "Zylindrisch":         "socket",
    "Linsen":              "button",
    "Senk":                "countersunk",
    "Flach":               "flat",
    "Rund":                "round",
    "Sechskant":           "hex",
    "ohne Kopf":           "insert",
    "Ohne Kopf":           "insert",
}

DRIVE_MAP = {
    "Innensechskant":  "Hex",
    "Innensechsrund":  "Torx",
    "Kreuzschlitz":    "Phillips",
    "Schlitz":         "Slotted",
    "Torx":            "Torx",
}

# --- Normalized-schema mappings ---
# The app needs partType, variant and shape stated explicitly; they used to be
# inferred at runtime from head types, BN norms and German title text.

PART_TYPE_BY_HEAD = {
    "button": "screw", "socket": "screw", "low-socket": "screw",
    "countersunk": "screw", "pan": "screw", "flat": "screw",
    "nut": "nut", "washer": "washer", "standoff": "standoff",
    "set-screw": "set-screw", "insert": "insert", "pin": "pin",
    "press-nut": "press-nut",
}

VARIANT_BY_NORM = {
    "BN 145": "nut-square",    "BN 3525": "nut-square",
    "BN 161": "nut-nylon",     "BN 20242": "nut-hex-thin",
    "BN 715": "washer-std",    "BN 729": "washer-large",
    "BN 726": "washer-socket",
    "BN 3318": "standoff-mf",  "BN 3319": "standoff-ff",
}


def derive_shape(norm: str, title: str, part_type: str) -> dict:
    """Geometry discriminators the silhouette renderers need stated outright."""
    shape = {}
    if part_type == "nut":
        shape["nutShape"] = "square" if norm == "BN 145" or "Vierkant" in title else "hex"
        shape["locking"] = "nylon" if norm == "BN 161" or "nyloc" in title.lower() else "none"
    if part_type == "standoff":
        shape["standoffEnds"] = "mf" if "Aussengewinde" in title else "ff"
    return shape


ARTICLE_RE   = re.compile(r'^\d+$')
THREAD_RE    = re.compile(r'^M\d+([,\.]\d+)?$')
DIAMETER_RE  = re.compile(r'^\d+([,\.]\d+)?$')


def map_head_type(kopfform: str) -> str:
    for key, val in HEAD_TYPE_MAP.items():
        if key in kopfform:
            return val
    return kopfform.lower()


def map_drive(antrieb: str) -> str:
    for key, val in DRIVE_MAP.items():
        if key in antrieb:
            return val
    return antrieb


def normalize_thread(s: str) -> str:
    """'M1,6' -> 'M1.6', 'M3' -> 'M3'"""
    return s.replace(",", ".")


def parse_number(s: str):
    """German-locale number string to int or float."""
    s = s.replace(",", ".")
    try:
        f = float(s)
        return int(f) if f == int(f) else f
    except ValueError:
        return s


def parse_pdf(path: Path) -> list[dict]:
    doc = fitz.open(path)
    lines = []
    for page in doc:
        lines.extend(page.get_text().splitlines())
    doc.close()
    lines = [l.strip() for l in lines if l.strip()]

    # --- Extract header metadata ---
    meta = {
        "bossardNorm": "",
        "title": lines[0] if lines else "",
        "norms": [],
        "headType": "",
        "drive": "",
        "material": "",
        "materialGrade": "",
    }

    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(r'^BN \d+', line):
            m = re.match(r'^(BN \d+)', line)
            meta["bossardNorm"] = m.group(1)
        elif line == "Norm" and i + 1 < len(lines):
            raw = lines[i + 1]
            meta["norms"] = [p.strip() for p in re.split(r',\s*', raw) if p.strip()]
            i += 1
        elif line == "Kopfform" and i + 1 < len(lines):
            meta["headType"] = map_head_type(lines[i + 1])
            i += 1
        elif line == "Antrieb" and i + 1 < len(lines):
            meta["drive"] = map_drive(lines[i + 1])
            i += 1
        elif line == "Werkstoff" and i + 1 < len(lines):
            meta["material"] = lines[i + 1]
            i += 1
        elif line == "Werkstoffsorte" and i + 1 < len(lines):
            meta["materialGrade"] = lines[i + 1]
            i += 1
        elif line == "Artikelnummer":
            break
        i += 1

    # Infer headType from title for parts without Kopfform (nuts, washers, etc.)
    if not meta["headType"]:
        title_lower = meta["title"].lower()
        # Retaining rings / circlips (DIN 6799, DIN 471/472) match "scheib" but
        # are not washers: no thread, different geometry, and the d1 column is a
        # shaft diameter. There is no part type for them yet, so leave headType
        # empty and let the guard below skip the file rather than mislabel them.
        if "sicherungsscheibe" in title_lower or "sicherungsring" in title_lower:
            meta["headType"] = ""
        elif "mutter" in title_lower:
            meta["headType"] = "nut"
        elif "scheib" in title_lower or "unterleg" in title_lower:
            meta["headType"] = "washer"
        elif "abstandshalter" in title_lower or "distanz" in title_lower or "abstandshülse" in title_lower:
            meta["headType"] = "standoff"
        elif "gewindestift" in title_lower or "gewindestifte" in title_lower:
            meta["headType"] = "set-screw"
        elif "gewindeeinsatz" in title_lower or "gewindeeinsätze" in title_lower:
            meta["headType"] = "insert"
        elif "einpressmutter" in title_lower or "einpress" in title_lower:
            meta["headType"] = "press-nut"
        elif "stift" in title_lower:
            meta["headType"] = "pin"

    # A file we cannot classify would emit entries with an empty headType, which
    # have no silhouette renderer and no density model. Skip it loudly instead.
    if not meta["headType"]:
        print(f"skipped (unrecognised part type: {meta['title'][:50]!r})", end=" ", flush=True)
        return []

    # --- Parse table: columns are each on their own line ---
    # After "Artikelnummer", column header names follow until the first article number.
    # Then rows: article_number + one value per column, repeated.
    # The table header repeats on each new page — handle by re-detecting it.

    # Find all "Artikelnummer" positions
    artnr_positions = [j for j, l in enumerate(lines) if l == "Artikelnummer"]

    # Collect all table segments (one per page)
    parts_list = []

    for start in artnr_positions:
        # Read column headers: lines after "Artikelnummer" until the first article number
        col_headers = []
        j = start + 1
        while j < len(lines) and not ARTICLE_RE.match(lines[j]):
            col_headers.append(lines[j])
            j += 1

        # 'für Gewinde' (washers) takes priority over 'd1' as thread column.
        # 'Gewindegrösse' (press-in nuts) is also a thread column.
        # 'Durchmesser (d1)' is used for pins — detected as a diameter, not a thread.
        is_diameter = False
        if "für Gewinde" in col_headers:
            thread_idx = col_headers.index("für Gewinde")
        elif "d1" in col_headers:
            thread_idx = col_headers.index("d1")
        elif any("gewinde" in h.lower() for h in col_headers):
            # Handles "Gewindegrösse", "Gewindegrösse (d1)", etc.
            thread_idx = next(i for i, h in enumerate(col_headers) if "gewinde" in h.lower())
        else:
            diam_idx = next((i for i, h in enumerate(col_headers) if "d1" in h.lower()), -1)
            if diam_idx >= 0:
                thread_idx = diam_idx
                is_diameter = True
            else:
                continue  # Can't find thread/diameter column, skip segment

        # Find length column index ('L' or 'Länge (L)') — may not exist for nuts
        if "L" in col_headers:
            length_idx = col_headers.index("L")
        else:
            length_idx = next((i for i, h in enumerate(col_headers) if re.match(r'^L[äa]nge', h)), None)

        num_cols = len(col_headers)

        # Read rows: each row = 1 article line + num_cols value lines
        while j + num_cols < len(lines):
            article = lines[j]
            if not ARTICLE_RE.match(article):
                break  # End of this segment's data

            # Check we have enough lines and next segment doesn't start here
            values = lines[j + 1 : j + 1 + num_cols]
            if len(values) < num_cols:
                break

            thread_raw = values[thread_idx]
            if is_diameter:
                if not DIAMETER_RE.match(thread_raw):
                    break  # Not a data row
                thread = "\u00D8" + normalize_thread(thread_raw)
            else:
                if not THREAD_RE.match(thread_raw):
                    break  # Not a data row (e.g. ran into next page header)
                thread = normalize_thread(thread_raw)
            length = parse_number(values[length_idx]) if length_idx is not None else None

            part_type = PART_TYPE_BY_HEAD.get(meta["headType"], meta["headType"])
            entry = {
                "sku": article,
                "catalogRef": meta["bossardNorm"],
                "title": meta["title"],
                "norms": meta["norms"],
                "partType": part_type,
                "headType": meta["headType"],
                "thread": thread,
                "drive": meta["drive"],
                "material": meta["material"],
                "materialGrade": meta["materialGrade"],
            }
            variant = VARIANT_BY_NORM.get(meta["bossardNorm"])
            if variant:
                entry["variant"] = variant
            if length is not None:
                entry["length"] = length
            shape = derive_shape(meta["bossardNorm"], meta["title"], part_type)
            if shape:
                entry["shape"] = shape

            parts_list.append(entry)
            j += 1 + num_cols

    return parts_list


def main():
    pdf_files = sorted(PDF_DIR.glob("*.pdf"))
    if not pdf_files:
        sys.exit(f"No PDF files found in {PDF_DIR}")

    all_parts = []
    for pdf in pdf_files:
        print(f"Parsing {pdf.name}...", end=" ", flush=True)
        parts = parse_pdf(pdf)
        print(f"{len(parts)} parts")
        all_parts.extend(parts)

    print(f"\nTotal: {len(all_parts)} parts across {len(pdf_files)} files")
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(all_parts, ensure_ascii=False, indent=2))
    print(f"Written to {OUT_FILE}")
    print("Run `npm run validate` from cabinet-planner/ to check the result.")


if __name__ == "__main__":
    main()
