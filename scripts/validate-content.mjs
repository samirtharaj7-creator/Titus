import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const contentRoot = join(root, "content");
const previewVersePath = join(root, "lib", "generated", "kjv-reference-verses.json");
const books = {
  "titus": {
    "name": "Titus",
    "verseCounts": [
      16,
      15,
      15
    ]
  }
};
const blankCommentaryFields = [
  "exegesis",
  "historicalBackground",
  "technicalNotes",
  "theologicalInsight",
  "structuralNotes",
  "otherCommentaryInsights",
  "application"
];
const verseTextFields = [
  "explanation",
  "historicalBackground",
  "literaryContext",
  "theologicalInsight",
  "structuralNotes",
  "relatedConnection",
  "application"
];
const scriptureBooks = new Set([
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalm", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Song of Songs",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
  "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians",
  "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
]);
const singleChapterBooks = new Set(["Obadiah", "Philemon", "2 John", "3 John", "Jude"]);
const errors = [];
const previewVerseLookup = existsSync(previewVersePath)
  ? JSON.parse(readFileSync(previewVersePath, "utf8"))
  : {};
if (!existsSync(previewVersePath)) {
  errors.push("The generated KJV reference-preview lookup is missing.");
}
const requiredPreviewVerseKeys = new Set();
let populatedNoteCount = 0;
let partialChapterCount = 0;
let verseRecordCount = 0;
let studyLinksVerseCount = 0;
let crossReferenceCount = 0;
let wordNotesVerseCount = 0;

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function validateScriptureReference(citation, noteContext) {
  if (typeof citation !== "string" || !citation.trim()) {
    assert(false, `${noteContext} has an empty Scripture reference.`);
    return null;
  }

  const match = citation.trim().match(/^((?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)*) (?:(\d+):)?(\d+)(?:[-–—](\d+))?$/u);
  assert(Boolean(match), `${noteContext} has an invalid Scripture reference: ${citation}.`);
  if (!match) return null;

  const [, bookName, chapterText, startText, endText] = match;
  assert(scriptureBooks.has(bookName), `${noteContext} names an unrecognized biblical book: ${bookName}.`);
  assert(Boolean(chapterText) || singleChapterBooks.has(bookName), `${noteContext} must include a chapter number for ${bookName}.`);
  const chapter = Number(chapterText ?? 1);
  const startVerse = Number(startText);
  const endVerse = Number(endText ?? startText);
  assert(chapter > 0, `${noteContext} has an invalid chapter number in ${citation}.`);
  assert(startVerse > 0, `${noteContext} has an invalid verse number in ${citation}.`);
  assert(endVerse >= startVerse, `${noteContext} has a reversed verse range in ${citation}.`);

  const localBook = Object.values(books).find((book) => book.name === bookName);
  if (localBook) {
    assert(
      chapter <= localBook.verseCounts.length,
      `${noteContext} cites a chapter outside ${bookName}: ${citation}.`
    );
    const chapterVerseCount = localBook.verseCounts[chapter - 1];
    if (chapterVerseCount) {
      assert(
        endVerse <= chapterVerseCount,
        `${noteContext} cites a verse outside ${bookName} ${chapter}: ${citation}.`
      );
    }
  }

  const previewBookName = bookName === "Psalm"
    ? "Psalms"
    : bookName === "Song of Songs"
      ? "Song of Solomon"
      : bookName;
  const previewEndVerse = Math.min(endVerse, startVerse + 2);
  for (let verse = startVerse; verse <= previewEndVerse; verse += 1) {
    const previewKey = `${previewBookName} ${chapter}:${verse}`;
    requiredPreviewVerseKeys.add(previewKey);
    assert(
      typeof previewVerseLookup[previewKey] === "string" && previewVerseLookup[previewKey].trim().length > 0,
      `${noteContext} is missing hover-preview text for ${previewKey}.`
    );
  }

  return {
    bookName,
    chapter,
    startVerse,
    endVerse
  };
}

for (const [bookSlug, book] of Object.entries(books)) {
  const bookRoot = join(contentRoot, bookSlug);
  assert(existsSync(bookRoot), `${bookSlug} content directory is missing.`);
  if (!existsSync(bookRoot)) continue;

  const actualFiles = readdirSync(bookRoot).filter((file) => file.endsWith(".json")).sort();
  const expectedFiles = book.verseCounts.map((_, index) => `chapter-${pad(index + 1)}.json`);
  assert(
    JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
    `${bookSlug} must contain exactly ${expectedFiles.length} zero-padded chapter files.`
  );

  expectedFiles.forEach((file, index) => {
    const chapterNumber = index + 1;
    const context = `${book.name} ${chapterNumber}`;
    const chapter = JSON.parse(readFileSync(join(bookRoot, file), "utf8"));
    assert(chapter.chapterNumber === chapterNumber, `${context} has an incorrect chapterNumber.`);
    const summaryWords = chapter.summary?.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? [];
    assert(summaryWords.length >= 8, `${context} is missing its brief chapter summary.`);
    assert(summaryWords.length <= 28, `${context} chapter summary must remain brief; found ${summaryWords.length} words.`);
    assert(Array.isArray(chapter.verses), `${context} is missing its verses array.`);
    assert(chapter.verses?.length === book.verseCounts[index], `${context} must contain ${book.verseCounts[index]} verses.`);

    assert(Array.isArray(chapter.outline) && chapter.outline.length > 0, `${context} is missing its passage outline.`);
    let expectedOutlineStart = 1;
    (Array.isArray(chapter.outline) ? chapter.outline : []).forEach((section, sectionIndex) => {
      const sectionContext = `${context} outline section ${sectionIndex + 1}`;
      assert(typeof section.title === "string" && section.title.trim().length > 0, `${sectionContext} is missing a title.`);
      assert(typeof section.summary === "string" && section.summary.trim().length > 0, `${sectionContext} is missing a summary.`);
      const match = typeof section.range === "string"
        ? section.range.match(/^(\d+):(\d+)(?:-(\d+))?$/)
        : null;
      assert(Boolean(match), `${sectionContext} has an invalid range.`);
      if (!match) return;

      const rangeChapter = Number(match[1]);
      const startVerse = Number(match[2]);
      const endVerse = Number(match[3] ?? match[2]);
      assert(rangeChapter === chapterNumber, `${sectionContext} belongs to chapter ${rangeChapter}.`);
      assert(startVerse === expectedOutlineStart, `${sectionContext} must begin at verse ${expectedOutlineStart}.`);
      assert(endVerse >= startVerse, `${sectionContext} ends before it begins.`);
      assert(endVerse <= book.verseCounts[index], `${sectionContext} exceeds the chapter’s verse count.`);
      expectedOutlineStart = endVerse + 1;
    });
    assert(
      expectedOutlineStart === book.verseCounts[index] + 1,
      `${context} passage outline must cover every verse exactly once.`
    );

    let populatedChapterNotes = 0;
    (chapter.verses ?? []).forEach((verse, verseIndex) => {
      const reference = `${book.name} ${chapterNumber}:${verseIndex + 1}`;
      verseRecordCount += 1;
      assert(verse.verse === reference, `${context} verse ${verseIndex + 1} must be ${reference}.`);
      assert(typeof verse.bibleText === "string" && verse.bibleText.trim().length > 0, `${reference} is missing KJV text.`);
      verseTextFields.forEach((field) => {
        assert(verse[field] === "", `${reference}.${field} must remain blank.`);
      });
      const detailedExplanation = verse.commentary?.detailedExplanation ?? "";
      const hasDetailedExplanation = detailedExplanation.trim().length > 0;
      if (hasDetailedExplanation) {
        populatedChapterNotes += 1;
        populatedNoteCount += 1;
        assert(
          detailedExplanation.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length >= 40,
          `${reference}.commentary.detailedExplanation is unexpectedly short.`
        );
      }
      blankCommentaryFields.forEach((field) => {
        assert(verse.commentary?.[field] === "", `${reference}.commentary.${field} must remain blank.`);
      });
      assert(Array.isArray(verse.commentary?.reviewFlags) && verse.commentary.reviewFlags.length === 0, `${reference} must not have review flags.`);
      const crossReferences = Array.isArray(verse.crossReferences) ? verse.crossReferences : [];
      assert(Array.isArray(verse.crossReferences), `${reference} cross references must be an array.`);
      assert(crossReferences.length >= 3, `${reference} must include at least three useful cross references.`);
      assert(crossReferences.length <= 5, `${reference} may include at most five selective cross references.`);
      if (Array.isArray(verse.crossReferences) && crossReferences.length >= 3 && crossReferences.length <= 5) {
        studyLinksVerseCount += 1;
      }
      crossReferenceCount += crossReferences.length;
      const seenCrossReferences = new Set();
      crossReferences.forEach((citation) => {
        const citationContext = `${reference} cross reference`;
        const parsedCitation = validateScriptureReference(citation, citationContext);
        if (typeof citation !== "string") return;

        const normalizedCitation = citation.trim().toLocaleLowerCase().replace(/[–—]/gu, "-");
        assert(
          !seenCrossReferences.has(normalizedCitation),
          `${reference} repeats the cross reference ${citation}.`
        );
        seenCrossReferences.add(normalizedCitation);

        if (!parsedCitation) return;
        const containsCurrentVerse = parsedCitation.bookName === book.name
          && parsedCitation.chapter === chapterNumber
          && parsedCitation.startVerse <= verseIndex + 1
          && parsedCitation.endVerse >= verseIndex + 1;
        assert(
          !containsCurrentVerse,
          `${reference} must not cite itself, including within the range ${citation}.`
        );
      });
      const wordNotes = Array.isArray(verse.wordNotes) ? verse.wordNotes : [];
      assert(Array.isArray(verse.wordNotes), `${reference} word notes must be an array.`);
      assert(wordNotes.length >= 1, `${reference} must include at least one focused Word / Phrase Note.`);
      assert(wordNotes.length <= 2, `${reference} may contain at most two selective word notes.`);
      if (wordNotes.length >= 1 && wordNotes.length <= 2) {
        wordNotesVerseCount += 1;
      }
      const wordNoteTerms = new Set();
      wordNotes.forEach((note, noteIndex) => {
        const noteContext = `${reference} word note ${noteIndex + 1}`;
        const safeNote = note && typeof note === "object" ? note : {};
        const term = typeof safeNote.term === "string" ? safeNote.term : "";
        const explanation = typeof safeNote.explanation === "string" ? safeNote.explanation : "";
        assert(term.trim().length > 0, `${noteContext} is missing its term.`);
        assert(explanation.trim().length > 0, `${noteContext} is missing its explanation.`);
        const explanationWords = explanation.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? [];
        assert(explanationWords.length >= 12, `${noteContext} is too brief to explain the term responsibly.`);
        assert(explanationWords.length <= 180, `${noteContext} should remain a focused lexical note; found ${explanationWords.length} words.`);
        const noteReferences = Array.isArray(safeNote.scriptureReferences) ? safeNote.scriptureReferences : [];
        assert(Array.isArray(safeNote.scriptureReferences), `${noteContext} Scripture references must be an array.`);
        assert(noteReferences.length > 0, `${noteContext} must include at least one useful Scripture reference.`);
        const scriptureReferences = new Set();
        noteReferences.forEach((citation) => {
          validateScriptureReference(citation, noteContext);
          if (typeof citation !== "string") return;
          const normalizedCitation = citation.trim().toLocaleLowerCase().replace(/[–—]/gu, "-");
          assert(!scriptureReferences.has(normalizedCitation), `${noteContext} repeats the Scripture reference ${citation}.`);
          scriptureReferences.add(normalizedCitation);
        });
        if (term) {
          const normalizedTerm = term.trim().toLocaleLowerCase();
          assert(!wordNoteTerms.has(normalizedTerm), `${reference} repeats the word note ${term}.`);
          wordNoteTerms.add(normalizedTerm);
        }
      });
      assert(Array.isArray(verse.sources) && verse.sources.length === 0, `${reference} sources must remain blank.`);
      const validReviewStatuses = hasDetailedExplanation
        ? new Set(["needs-source-review", "verified-seed"])
        : new Set(["placeholder"]);
      assert(
        validReviewStatuses.has(verse.reviewStatus),
        `${reference} has a review status inconsistent with its study notes.`
      );
      Object.entries(verse.sourceAudit ?? {}).forEach(([field, entries]) => {
        assert(Array.isArray(entries) && entries.length === 0, `${reference}.sourceAudit.${field} must remain blank.`);
      });
    });
    if (populatedChapterNotes > 0 && populatedChapterNotes < book.verseCounts[index]) {
      partialChapterCount += 1;
    }
  });
}

const expectedVerseTotal = Object.values(books)
  .flatMap((book) => book.verseCounts)
  .reduce((total, chapterVerseCount) => total + chapterVerseCount, 0);
assert(verseRecordCount === expectedVerseTotal, `Expected ${expectedVerseTotal} verse records, found ${verseRecordCount}.`);
assert(
  studyLinksVerseCount === expectedVerseTotal,
  `Every verse must have three to five cross references; ${studyLinksVerseCount} of ${expectedVerseTotal} currently do.`
);
assert(
  wordNotesVerseCount === expectedVerseTotal,
  `Every verse must have one or two Word / Phrase Notes; ${wordNotesVerseCount} of ${expectedVerseTotal} currently do.`
);
Object.keys(previewVerseLookup).forEach((previewKey) => {
  assert(
    requiredPreviewVerseKeys.has(previewKey),
    `The hover-preview lookup contains stale or unused text for ${previewKey}.`
  );
});

if (errors.length) {
  console.error(`Titus Study validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Titus Study content validated: 3 chapters, ${verseRecordCount} KJV verses, ${populatedNoteCount} populated study notes, ${crossReferenceCount} cross references, Word / Phrase Notes on all ${wordNotesVerseCount} verses, ${requiredPreviewVerseKeys.size} KJV hover-preview verses, and ${partialChapterCount} partially populated chapter${partialChapterCount === 1 ? "" : "s"}.`
);
