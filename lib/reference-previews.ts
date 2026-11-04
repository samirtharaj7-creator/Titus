import "server-only";

import kjvReferenceVerses from "@/lib/generated/kjv-reference-verses.json";
import type { ChapterContent } from "@/lib/schemas";

export type ReferencePreviewVerse = {
  number: number;
  text: string;
};

export type ReferencePreview = {
  reference: string;
  verses: ReferencePreviewVerse[];
  continuesThrough?: number;
};

export type ReferencePreviewMap = Record<string, ReferencePreview>;

const verseLookup = kjvReferenceVerses as Record<string, string>;
const singleChapterBooks = new Set(["Obadiah", "Philemon", "2 John", "3 John", "Jude"]);

export function getReferencePreviewsForChapter(
  chapter: Pick<ChapterContent, "verses">
): ReferencePreviewMap {
  const references = new Set<string>();

  chapter.verses.forEach((verse) => {
    verse.crossReferences.forEach((reference) => references.add(reference.trim()));
    verse.wordNotes.forEach((note) => {
      note.scriptureReferences.forEach((reference) => references.add(reference.trim()));
    });
  });

  return Object.fromEntries(
    [...references].map((reference) => [reference, buildReferencePreview(reference)])
  );
}

function buildReferencePreview(reference: string): ReferencePreview {
  const parsed = parseReference(reference);
  if (!parsed) {
    throw new Error(`Unable to parse the Scripture preview reference: ${reference}`);
  }

  const previewEndVerse = Math.min(parsed.endVerse, parsed.startVerse + 2);
  const verses: ReferencePreviewVerse[] = [];

  for (let verse = parsed.startVerse; verse <= previewEndVerse; verse += 1) {
    const key = `${parsed.book} ${parsed.chapter}:${verse}`;
    const text = verseLookup[key];
    if (!text) {
      throw new Error(`Missing KJV preview text for ${key} (requested by ${reference}).`);
    }
    verses.push({ number: verse, text });
  }

  return {
    reference,
    verses,
    ...(parsed.endVerse > previewEndVerse ? { continuesThrough: parsed.endVerse } : {})
  };
}

function parseReference(reference: string) {
  const match = reference
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
