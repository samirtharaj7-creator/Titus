import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const rawKjvPath =
  process.argv[2]
  || process.env.KJV_VERSES_PATH
  || "/Users/samuel/Documents/Codex/2026-05-15/files-mentioned-by-the-user-christ/data/raw/verses-1769.json";
const outputPath = join(root, "lib", "generated", "kjv-reference-verses.json");
const contentRoot = join(root, "content");
const bookSlugs = ["titus"];
const singleChapterBooks = new Set(["Obadiah", "Philemon", "2 John", "3 John", "Jude"]);

const sourceBookNames = {
  "Song of Solomon": "Solomon's Song"
};

function parseReference(reference) {
  const match = String(reference)
    .trim()
    .match(/^((?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)*) (?:(\d+):)?(\d+)(?:[-–—](\d+))?$/u);
  if (!match) return null;

  const [, rawBook, rawChapter, rawStartVerse, rawEndVerse] = match;
  const book = rawBook === "Psalm"
    ? "Psalms"
    : rawBook === "Song of Songs"
      ? "Song of Solomon"
      : rawBook;
  const chapter = rawChapter ? Number(rawChapter) : singleChapterBooks.has(book) ? 1 : NaN;
  const startVerse = Number(rawStartVerse);
  const endVerse = Number(rawEndVerse ?? rawStartVerse);

  if (![chapter, startVerse, endVerse].every(Number.isSafeInteger)) return null;
  if (chapter < 1 || startVerse < 1 || endVerse < startVerse) return null;

  return { book, chapter, startVerse, endVerse };
}

function cleanVerse(text) {
  return String(text)
    .replace(/^#\s*/, "")
    .replace(/\[(.*?)\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function collectReferences() {
  const references = new Set();

  for (const bookSlug of bookSlugs) {
    const bookRoot = join(contentRoot, bookSlug);
    const chapterFiles = readdirSync(bookRoot)
      .filter((file) => file.endsWith(".json"))
      .sort();

    for (const chapterFile of chapterFiles) {
      const chapter = JSON.parse(readFileSync(join(bookRoot, chapterFile), "utf8"));
      for (const verse of chapter.verses ?? []) {
        for (const reference of verse.crossReferences ?? []) references.add(reference.trim());
        for (const note of verse.wordNotes ?? []) {
          for (const reference of note.scriptureReferences ?? []) references.add(reference.trim());
        }
      }
    }
  }

  return [...references].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

function main() {
  const sourceVerses = JSON.parse(readFileSync(rawKjvPath, "utf8"));
  const references = collectReferences();
  const selectedVerses = {};
  const missing = [];

  for (const reference of references) {
    const parsed = parseReference(reference);
    if (!parsed) {
      missing.push(`${reference} (could not parse)`);
      continue;
    }

    const sourceBook = sourceBookNames[parsed.book] ?? parsed.book;
    const previewEndVerse = Math.min(parsed.endVerse, parsed.startVerse + 2);
    for (let verse = parsed.startVerse; verse <= previewEndVerse; verse += 1) {
      const sourceKey = `${sourceBook} ${parsed.chapter}:${verse}`;
      const publicKey = `${parsed.book} ${parsed.chapter}:${verse}`;
      const text = sourceVerses[sourceKey];
      if (!text) {
        missing.push(`${reference} (${sourceKey})`);
        continue;
      }
      selectedVerses[publicKey] = cleanVerse(text);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing KJV text for ${missing.length} reference verse(s):\n${missing.join("\n")}`);
  }

  const sortedVerses = Object.fromEntries(
    Object.entries(selectedVerses).sort(([left], [right]) =>
      left.localeCompare(right, "en", { numeric: true })
    )
  );

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(sortedVerses, null, 2)}\n`);
  console.log(
    `Wrote ${outputPath} with ${Object.keys(sortedVerses).length} KJV verses for ${references.length} unique references.`
  );
}

main();
