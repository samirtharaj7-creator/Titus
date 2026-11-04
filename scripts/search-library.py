#!/usr/bin/env python3
"""Search this study's private research library.

  python3 scripts/search-library.py "1 Thessalonians 4:13 asleep" [--limit 8] [--source ID]
  python3 scripts/search-library.py --pages SOURCE_ID 120-123
  python3 scripts/search-library.py --list

Results show the source id, short title, page number and an excerpt. Use them
to form independent understanding; never copy their wording into public content.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path

ROOT = Path.cwd()
CORPUS = next((ROOT / ".research").glob("*-corpus"))
STOP = set("the a an and or of to in on for is are was were be by with as at that this it its from his her he she they them their not but which who whom".split())


def tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]


def load():
    manifest = json.loads((CORPUS / "manifest.json").read_text())
    titles = {r["id"]: r["title"] for r in manifest["resources"]}
    pages = [json.loads(line) for line in (CORPUS / "pages.jsonl").open()]
    return titles, pages


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("query", nargs="?")
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--source")
    parser.add_argument("--pages", nargs=2, metavar=("SOURCE_ID", "RANGE"))
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()
    titles, pages = load()

    if args.list:
        for sid, title in titles.items():
            print(f"{sid}  {title}")
        return 0

    if args.pages:
        sid, span = args.pages
        start, _, end = span.partition("-")
        start, end = int(start), int(end or start)
        for page in pages:
            if page["id"] == sid and start <= page["page"] <= end:
                print(f"===== {titles.get(sid, sid)[:80]} — page {page['page']} =====\n{page['text']}\n")
        return 0

    if not args.query:
        parser.error("query required")
    query = tokens(args.query)
    refs = re.findall(r"\b(\d+)[:.](\d+)\b", args.query)
    pool = [p for p in pages if not args.source or p["id"] == args.source]
    df = Counter()
    page_tokens = []
    for page in pool:
        toks = tokens(page["text"])
        page_tokens.append(Counter(toks))
        df.update(set(toks) & set(query))
    n = len(pool) or 1
    scored = []
    for page, counts in zip(pool, page_tokens):
        length = sum(counts.values()) or 1
        score = 0.0
        for term in set(query):
            tf = counts.get(term, 0)
            if tf:
                idf = math.log(1 + n / (1 + df[term]))
                score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * length / 450))
        for chapter, verse in refs:
            if re.search(rf"\b{chapter}[:.]\s?{verse}\b", page["text"]):
                score += 4.0
        if score > 0:
            scored.append((score, page))
    scored.sort(key=lambda item: item[0], reverse=True)
    for score, page in scored[: args.limit]:
        text = re.sub(r"\s+", " ", page["text"])
        hit = min((text.lower().find(t) for t in query if text.lower().find(t) >= 0), default=0)
        excerpt = text[max(0, hit - 200): hit + 700]
        print(f"[{score:5.1f}] {page['id']} p.{page['page']}  {titles.get(page['id'], '')[:70]}\n    {excerpt}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
