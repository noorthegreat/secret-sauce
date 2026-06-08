#!/usr/bin/env python3
"""
Read matches_speed_dating_FS26.xlsx (or path arg) and list mutual likes.

Uses only the Python standard library (xlsx is ZIP + XML). No pip deps.

Optional: pass a CSV with columns name,email (header row) to print suggested
email bodies with addresses. Names are matched case-insensitively after strip.

Example:
  python3 scripts/speed_dating_mutual_matches.py matches_speed_dating_FS26.xlsx
  python3 scripts/speed_dating_mutual_matches.py matches_speed_dating_FS26.xlsx contacts.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_to_idx(col: str) -> int:
    n = 0
    for c in col:
        n = n * 26 + (ord(c) - ord("A") + 1)
    return n - 1


def parse_shared_strings(z: zipfile.ZipFile) -> list[str]:
    try:
        data = z.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(data)
    strings: list[str] = []
    for si in root.findall("main:si", NS):
        texts: list[str] = []
        t = si.find("main:t", NS)
        if t is not None and t.text:
            texts.append(t.text)
        else:
            for r in si.findall("main:r", NS):
                tt = r.find("main:t", NS)
                if tt is not None and tt.text:
                    texts.append(tt.text)
        strings.append("".join(texts))
    return strings


def cell_ref_to_row_col(ref: str) -> tuple[int | None, int | None]:
    m = re.match(r"([A-Z]+)(\d+)", ref)
    if not m:
        return None, None
    return int(m.group(2)) - 1, col_to_idx(m.group(1))


def load_sheet(
    z: zipfile.ZipFile, path: str, shared: list[str]
) -> tuple[dict[int, dict[int, object]], int]:
    root = ET.fromstring(z.read(path))
    sheet_data = root.find("main:sheetData", NS)
    rows: dict[int, dict[int, object]] = {}
    max_c = 0
    for row_el in sheet_data.findall("main:row", NS):
        for c in row_el.findall("main:c", NS):
            ref = c.get("r")
            if not ref:
                continue
            rr, cc = cell_ref_to_row_col(ref)
            if rr is None or cc is None:
                continue
            v_el = c.find("main:v", NS)
            if v_el is None or v_el.text is None:
                continue
            val: object = v_el.text
            t = c.get("t")
            if t == "s":
                val = shared[int(str(val))]
            elif t == "b":
                val = val == "1"
            else:
                try:
                    val = float(val) if "." in str(val) else int(val)
                except ValueError:
                    pass
            rows.setdefault(rr, {})[cc] = val
            max_c = max(max_c, cc)
    return rows, max_c


def is_like(v: object) -> bool:
    if v == 1 or v is True:
        return True
    if isinstance(v, str) and v.strip() == "1":
        return True
    return False


def normalize_name(s: str) -> str:
    s = str(s).strip()
    if s == "KÃ¡ri":
        return "Kári"
    return s


def mutual_pairs_from_xlsx(path: Path) -> tuple[list[tuple[str, str]], list[str], list[str]]:
    with zipfile.ZipFile(path, "r") as z:
        shared = parse_shared_strings(z)
        s1, max_c1 = load_sheet(z, "xl/worksheets/sheet1.xml", shared)
        s2, max_c2 = load_sheet(z, "xl/worksheets/sheet2.xml", shared)

    r1 = s1[1]
    women: list[str] = []
    for c in range(2, max_c1 + 1):
        v = r1.get(c)
        if v is None or (isinstance(v, str) and v.startswith("Summary")):
            break
        women.append(str(v))

    men_s1: list[tuple[int, str]] = []
    for r in range(2, 40):
        if r not in s1 or 1 not in s1[r]:
            continue
        if s1[r].get(0) != "Man":
            continue
        name = s1[r].get(1)
        if name:
            men_s1.append((r, normalize_name(str(name))))

    man_to_women: dict[str, set[str]] = {}
    for r, mname in men_s1:
        man_to_women[mname] = set()
        for ci, w in enumerate(women):
            col = 2 + ci
            if col in s1[r] and is_like(s1[r][col]):
                man_to_women[mname].add(w)

    r2h = s2[1]
    men_s2: list[str] = []
    for c in range(2, max_c2 + 1):
        v = r2h.get(c)
        if v is None:
            continue
        if isinstance(v, str) and v.strip() in ("Summary",):
            break
        men_s2.append(normalize_name(str(v)))

    woman_to_men: dict[str, set[str]] = {}
    for r in range(2, 30):
        if r not in s2 or s2[r].get(0) != "Woman":
            continue
        wn = s2[r].get(1)
        if not wn:
            continue
        wname = str(wn).strip()
        woman_to_men[wname] = set()
        for ci, m in enumerate(men_s2):
            col = 2 + ci
            if col in s2[r] and is_like(s2[r][col]):
                woman_to_men[wname].add(m)

    mutual: list[tuple[str, str]] = []
    for m, ws in man_to_women.items():
        for w in ws:
            if m in woman_to_men.get(w, set()):
                mutual.append((m, w))
    mutual.sort()

    return mutual, women, men_s2


def load_contacts_csv(path: Path) -> dict[str, str]:
    by_lower: dict[str, str] = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            return by_lower
        # accept name/email or Name/Email
        lower = {k.lower().strip(): k for k in reader.fieldnames}
        name_key = lower.get("name") or lower.get("full name") or list(reader.fieldnames)[0]
        email_key = lower.get("email") or lower.get("e-mail")
        if not email_key:
            raise SystemExit("CSV must have an email column")
        for row in reader:
            n = (row.get(name_key) or "").strip()
            e = (row.get(email_key) or "").strip()
            if n and e:
                by_lower[n.lower()] = e
    return by_lower


def main() -> None:
    ap = argparse.ArgumentParser(description="List mutual speed-dating matches from xlsx")
    ap.add_argument("xlsx", type=Path, help="Path to matches workbook")
    ap.add_argument(
        "contacts_csv",
        nargs="?",
        type=Path,
        help="Optional CSV: name,email for merge output",
    )
    ap.add_argument(
        "--json-pairs-by-name",
        action="store_true",
        help="Print JSON fragment for send-event-speed-dating-mutuals pairsByName (add eventId yourself)",
    )
    args = ap.parse_args()

    if not args.xlsx.is_file():
        print(f"Not found: {args.xlsx}", file=sys.stderr)
        sys.exit(1)

    mutual, women, men = mutual_pairs_from_xlsx(args.xlsx)
    print(f"Women ({len(women)}): {', '.join(women)}")
    print(f"Men ({len(men)}): {', '.join(men)}")
    print()
    print(f"Mutual matches ({len(mutual)}):")
    for m, w in mutual:
        print(f"  {m}  <->  {w}")

    if args.json_pairs_by_name:
        pairs = [{"a": m, "b": w} for m, w in mutual]
        print()
        print("--- Paste into send-event-speed-dating-mutuals body (set eventId) ---")
        print(json.dumps({"pairsByName": pairs}, ensure_ascii=False, indent=2))

    if args.contacts_csv:
        if not args.contacts_csv.is_file():
            print(f"\nContacts file not found: {args.contacts_csv}", file=sys.stderr)
            sys.exit(1)
        contacts = load_contacts_csv(args.contacts_csv)

        def em(name: str) -> str | None:
            return contacts.get(name.strip().lower())

        print()
        print("--- Suggested messages (verify emails manually) ---")
        for m, w in mutual:
            me, we = em(m), em(w)
            print()
            print(f"Pair: {m} / {w}")
            if not me or not we:
                print(f"  MISSING contact: {m}={me!r} {w}={we!r}")
                continue
            print(f"  To: {me}, {we}")
            print(
                "  Body: Hi both — you each selected one another at the wine speed dating. "
                f"Here are your details: {m} <{me}>, {w} <{we}>. "
                "We hope you enjoy staying in touch!"
            )


if __name__ == "__main__":
    main()
