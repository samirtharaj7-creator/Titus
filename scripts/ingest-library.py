#!/usr/bin/env python3
"""Copy and index this study's private research library.

Usage: python3 scripts/ingest-library.py

Reads `.research/library-sources.json` (a list of absolute file paths), copies
each file under `.research/<key>-corpus/files/`, extracts page text, and writes
`pages.jsonl` plus `manifest.json`. Everything stays under `.research/`, which
is ignored by Git and must never be imported into the application.
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import html
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path.cwd()
CONFIG = json.loads((ROOT / ".research" / "library-sources.json").read_text())
KEY = CONFIG["key"]
OUT = ROOT / ".research" / f"{KEY}-corpus"
FILES = OUT / "files"
EPUB_PAGE_CHARS = 3200


def source_id(path: Path) -> str:
    digest = hashlib.sha256(str(path.name).encode()).hexdigest()[:12]
    return f"{KEY}-{digest}"


def clean(text: str) -> str:
    text = text.replace("­", "")
    text = re.sub(r"-\n(?=[a-z])", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf(path: Path) -> list[str]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        try:
            pages.append(clean(page.extract_text() or ""))
        except Exception:  # noqa: BLE001 - keep going on damaged pages
            pages.append("")
    return pages


def extract_epub(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as archive:
        names = [n for n in archive.namelist() if n.lower().endswith((".xhtml", ".html", ".htm"))]
        opf = next((n for n in archive.namelist() if n.lower().endswith(".opf")), None)
        if opf:
            opf_text = archive.read(opf).decode("utf-8", "ignore")
            base = opf.rsplit("/", 1)[0] + "/" if "/" in opf else ""
            manifest = dict(re.findall(r'<item[^>]*id="([^"]+)"[^>]*href="([^"]+)"', opf_text))
            manifest.update({k: v for v, k in re.findall(r'<item[^>]*href="([^"]+)"[^>]*id="([^"]+)"', opf_text)})
            spine = re.findall(r'<itemref[^>]*idref="([^"]+)"', opf_text)
            ordered = [base + manifest[i] for i in spine if i in manifest]
            ordered = [n for n in ordered if n in archive.namelist()]
            if ordered:
                names = ordered
        text = []
        for name in names:
            raw = archive.read(name).decode("utf-8", "ignore")
            raw = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw)
            raw = re.sub(r"(?i)<br\s*/?>|</p>|</h\d>|</li>|</div>", "\n", raw)
            raw = re.sub(r"<[^>]+>", " ", raw)
            text.append(clean(html.unescape(raw)))
    joined = "\n\n".join(t for t in text if t)
    pages, current = [], ""
    for paragraph in joined.split("\n\n"):
        if len(current) + len(paragraph) > EPUB_PAGE_CHARS and current:
            pages.append(current)
            current = ""
        current += paragraph + "\n\n"
    if current.strip():
        pages.append(current.strip())
    return pages


def process(src: str) -> dict:
    path = Path(src)
    sid = source_id(path)
    target = FILES / path.name
    if not target.exists() or target.stat().st_size != path.stat().st_size:
        shutil.copyfile(path, target)
    try:
        pages = extract_epub(target) if target.suffix.lower() == ".epub" else extract_pdf(target)
        status = "ok"
    except Exception as error:  # noqa: BLE001
        pages, status = [], f"error: {error}"
    words = sum(len(p.split()) for p in pages)
    return {
        "id": sid,
        "filename": path.name,
        "title": path.stem,
        "pageCount": len(pages),
        "wordCount": words,
        "extractionStatus": status if words > 500 or status != "ok" else "needs-ocr",
        "pages": pages,
    }


def main() -> int:
    FILES.mkdir(parents=True, exist_ok=True)
    sources = [s for s in CONFIG["sources"] if Path(s).exists()]
    missing = [s for s in CONFIG["sources"] if not Path(s).exists()]
    for m in missing:
        print(f"missing: {m}", file=sys.stderr)
    with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(process, sources))
    with (OUT / "pages.jsonl").open("w") as handle:
        for result in results:
            for number, text in enumerate(result["pages"], start=1):
                if text.strip():
                    handle.write(json.dumps({"id": result["id"], "page": number, "text": text}) + "\n")
    manifest = {"version": 1, "key": KEY, "resources": [{k: v for k, v in r.items() if k != "pages"} for r in results]}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    for r in results:
        print(f"{r['extractionStatus']:>10}  {r['pageCount']:>5}p  {r['wordCount']:>8}w  {r['id']}  {r['filename'][:90]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
