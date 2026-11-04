import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ChapterContentSchema, type ChapterContent } from "@/lib/schemas";
import { padChapter } from "@/lib/utils";

export const TITUS_BOOKS = {
  "titus": {
    slug: "titus",
    name: "Titus",
    chapterCount: 3,
    verseCounts: [16, 15, 15]
  }
} as const;

export type TitusBookSlug = keyof typeof TITUS_BOOKS;
export type TitusBookConfig = (typeof TITUS_BOOKS)[TitusBookSlug];

export type ChapterAdjacency = {
  previous: number | null;
  next: number | null;
};

const contentRoot = join(process.cwd(), "content");

export function getTitusBookConfig(bookSlug: TitusBookSlug): TitusBookConfig {
  return TITUS_BOOKS[bookSlug];
}

export function getTitusStaticParams(bookSlug: TitusBookSlug) {
  const { chapterCount } = getTitusBookConfig(bookSlug);
  return Array.from({ length: chapterCount }, (_, index) => ({ chapter: String(index + 1) }));
}

export function parseTitusChapterNumber(
  bookSlug: TitusBookSlug,
  chapter: number | string
): number | null {
  const rawChapter = String(chapter);
  if (!/^[1-9]\d*$/.test(rawChapter)) return null;

  const chapterNumber = Number(rawChapter);
  const { chapterCount } = getTitusBookConfig(bookSlug);
  if (!Number.isSafeInteger(chapterNumber) || chapterNumber > chapterCount) return null;

  return chapterNumber;
}

export function getTitusChapter(
  bookSlug: TitusBookSlug,
  chapter: number | string
): ChapterContent | null {
  const chapterNumber = parseTitusChapterNumber(bookSlug, chapter);
  if (chapterNumber === null) return null;

  const config = getTitusBookConfig(bookSlug);
  const chapterPath = join(contentRoot, config.slug, `chapter-${padChapter(chapterNumber)}.json`);
  if (!existsSync(chapterPath)) return null;

  const parsed = ChapterContentSchema.parse(JSON.parse(readFileSync(chapterPath, "utf8")));
  const expectedVerseCount = config.verseCounts[chapterNumber - 1];

  if (parsed.chapterNumber !== chapterNumber) {
    throw new Error(
      `${config.name} ${chapterNumber} loaded chapterNumber ${parsed.chapterNumber}.`
    );
  }

  if (parsed.verses.length !== expectedVerseCount) {
    throw new Error(
      `${config.name} ${chapterNumber} has ${parsed.verses.length} verses; expected ${expectedVerseCount}.`
    );
  }

  parsed.verses.forEach((verse, index) => {
    const expectedReference = `${config.name} ${chapterNumber}:${index + 1}`;
    if (verse.verse !== expectedReference) {
      throw new Error(
        `${config.name} ${chapterNumber} contains ${verse.verse}; expected ${expectedReference}.`
      );
    }
  });

  return parsed;
}

export function getTitusChapterAdjacency(
  bookSlug: TitusBookSlug,
  chapter: number | string
): ChapterAdjacency | null {
  const chapterNumber = parseTitusChapterNumber(bookSlug, chapter);
  if (chapterNumber === null) return null;

  const { chapterCount } = getTitusBookConfig(bookSlug);
  return {
    previous: chapterNumber > 1 ? chapterNumber - 1 : null,
    next: chapterNumber < chapterCount ? chapterNumber + 1 : null
  };
}
