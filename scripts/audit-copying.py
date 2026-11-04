#!/usr/bin/env python3
"""Flag public prose that repeats long word runs from the private research library.

  python3 scripts/audit-copying.py [--chapter "1 Peter 3"] [--min 12]

Scripture wording (KJV) is excluded so quoted verses do not count as copying.
Exits 1 when any run of --min (default 12) or more consecutive words matches a
library page.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path.cwd()
SITE = json.loads((ROOT / "scripts" / "site.json").read_text())
CORPUS = ROOT / ".research" / f"{SITE['key']}-corpus" / "pages.jsonl"
KJV = Path("/Users/samuel/Documents/Codex/2026-05-15/files-mentioned-by-the-user-christ/data/raw/verses-1769.json")
N = 8


def words(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower().replace("’", "'"))


def shingles(tokens: list[str]) -> set[int]:
    return {hash(" ".join(tokens[i:i + N])) for i in range(len(tokens) - N + 1)}


def public_strings(value, path=""):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, list):
        for index, entry in enumerate(value):
            yield from public_strings(entry, f"{path}[{index}]")
    elif isinstance(value, dict):
        for key, entry in value.items():
            if key in {"sources", "sourceAudit", "bibleText", "verse"}:
                continue
            yield from public_strings(entry, f"{path}.{key}" if path else key)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chapter")
    parser.add_argument("--min", type=int, default=12)
    args = parser.parse_args()
    if not CORPUS.exists():
        print("Research library not indexed; skipping copying audit.")
        return 0

    scripture = set()
    if KJV.exists():
        for text in json.loads(KJV.read_text()).values():
            scripture |= shingles(words(re.sub(r"[\[\]]", "", text)))

    library = set()
    with CORPUS.open() as handle:
        for line in handle:
            library |= shingles(words(json.loads(line)["text"]))
    library -= scripture

    targets = []
    for book in SITE["books"]:
        for file in sorted((ROOT / "content" / book["slug"]).glob("chapter-*.json")):
            chapter = json.loads(file.read_text())
            label = f"{book['name']} {chapter['chapterNumber']}"
            if args.chapter and args.chapter != label:
                continue
            targets.append((label, chapter))
    if not args.chapter:
        background = ROOT / "content" / "background.json"
        if background.exists():
            targets.append(("Introduction", json.loads(background.read_text())))

    problems = 0
    for label, content in targets:
        for path, text in public_strings(content):
            tokens = words(text)
            run_start, run_len = None, 0
            hits = [hash(" ".join(tokens[i:i + N])) in library for i in range(len(tokens) - N + 1)]
            i = 0
            while i < len(hits):
                if hits[i]:
                    j = i
                    while j < len(hits) and hits[j]:
                        j += 1
                    length = (j - i) + N - 1
                    if length >= args.min:
                        problems += 1
                        print(f"{label} {path}: {length}-word overlap → “{' '.join(tokens[i:i + length])}”")
                    i = j
                else:
                    i += 1
    if problems:
        print(f"Copying audit failed: {problems} overlapping run(s) of {args.min}+ words.", file=sys.stderr)
        return 1
    print(f"Copying audit passed ({len(targets)} file(s) checked, threshold {args.min} words).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
