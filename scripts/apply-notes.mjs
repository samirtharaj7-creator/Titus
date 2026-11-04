// Merge a commentary draft into a chapter file.
// Usage: node scripts/apply-notes.mjs path/to/draft.json [more drafts...]
//
// Draft shape (every key optional except book/chapter):
// {
//   "book": "1-peter", "chapter": 3,
//   "chapterFields": { "title": "", "summary": "", "historicalContext": "", "literaryContext": "",
//     "themes": [], "outline": [{ "range": "1 Peter 3:1-7", "title": "", "summary": "" }],
//     "crossReferences": [], "relatedConnections": [{ "sourceText": "", "relatedText": "" }],
//     "teachingNotes": { ... }, "evangelisticNotes": { ... }, "reflectionQuestions": [] },
//   "verses": { "1": { "detailedExplanation": "para\n\npara", "crossReferences": ["Romans 8:1"],
//     "wordNotes": [{ "term": "", "explanation": "", "scriptureReferences": [] }] } }
// }
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const site = JSON.parse(readFileSync(join(root, "scripts", "site.json"), "utf8"));
const drafts = process.argv.slice(2);
if (!drafts.length) throw new Error("Usage: node scripts/apply-notes.mjs draft.json [...]");

const str = (value, label) => {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  return value.trim();
};
const strList = (value, label) => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) throw new Error(`${label} must be an array of strings.`);
  return value.map((entry) => entry.trim()).filter(Boolean);
};

for (const draftPath of drafts) {
  const draft = JSON.parse(readFileSync(draftPath, "utf8"));
  const book = site.books.find((entry) => entry.slug === draft.book);
  if (!book) throw new Error(`${draftPath}: unknown book ${draft.book}; expected one of ${site.books.map((b) => b.slug).join(", ")}.`);
  const file = join(root, "content", book.slug, `chapter-${String(draft.chapter).padStart(2, "0")}.json`);
  const chapter = JSON.parse(readFileSync(file, "utf8"));
  const label = `${book.name} ${draft.chapter}`;

  const fields = draft.chapterFields ?? {};
  for (const key of ["title", "summary", "historicalContext", "literaryContext"]) {
    if (key in fields) chapter[key] = str(fields[key], `${label} ${key}`);
  }
  for (const key of ["themes", "crossReferences", "reflectionQuestions"]) {
    if (key in fields) chapter[key] = strList(fields[key], `${label} ${key}`);
  }
  if ("outline" in fields) {
    chapter.outline = fields.outline.map((item, index) => ({
      range: str(item.range, `${label} outline[${index}].range`),
      title: str(item.title, `${label} outline[${index}].title`),
      summary: str(item.summary, `${label} outline[${index}].summary`)
    }));
  }
  if ("relatedConnections" in fields) {
    chapter.relatedConnections = fields.relatedConnections.map((item, index) => ({
      sourceText: str(item.sourceText, `${label} relatedConnections[${index}].sourceText`),
      relatedText: str(item.relatedText, `${label} relatedConnections[${index}].relatedText`),
      sources: []
    }));
  }
  if ("teachingNotes" in fields) {
    const t = fields.teachingNotes;
    chapter.teachingNotes = {
      openingQuestion: str(t.openingQuestion, `${label} teachingNotes.openingQuestion`),
      mainPoint: str(t.mainPoint, `${label} teachingNotes.mainPoint`),
      keyVerses: strList(t.keyVerses, `${label} teachingNotes.keyVerses`),
      importantTerms: strList(t.importantTerms, `${label} teachingNotes.importantTerms`),
      discussionQuestions: strList(t.discussionQuestions, `${label} teachingNotes.discussionQuestions`),
      commonMisunderstandings: strList(t.commonMisunderstandings, `${label} teachingNotes.commonMisunderstandings`),
      emphasis: str(t.emphasis, `${label} teachingNotes.emphasis`),
      closingAppeal: str(t.closingAppeal, `${label} teachingNotes.closingAppeal`)
    };
  }
  if ("evangelisticNotes" in fields) {
    const e = fields.evangelisticNotes;
    chapter.evangelisticNotes = {
      mainDoctrinalTheme: str(e.mainDoctrinalTheme, `${label} evangelisticNotes.mainDoctrinalTheme`),
      keyBibleTexts: strList(e.keyBibleTexts, `${label} evangelisticNotes.keyBibleTexts`),
      flow: strList(e.flow, `${label} evangelisticNotes.flow`),
      simpleIllustrations: strList(e.simpleIllustrations, `${label} evangelisticNotes.simpleIllustrations`),
      appealQuestion: str(e.appealQuestion, `${label} evangelisticNotes.appealQuestion`),
      cautions: strList(e.cautions, `${label} evangelisticNotes.cautions`),
      sources: []
    };
  }

  let applied = 0;
  for (const [verseNumber, note] of Object.entries(draft.verses ?? {})) {
    const entry = chapter.verses[Number(verseNumber) - 1];
    if (!entry) throw new Error(`${label}: verse ${verseNumber} does not exist.`);
    if ("detailedExplanation" in note) {
      entry.commentary.detailedExplanation = str(note.detailedExplanation, `${entry.verse} detailedExplanation`);
    }
    if ("crossReferences" in note) entry.crossReferences = strList(note.crossReferences, `${entry.verse} crossReferences`);
    if ("wordNotes" in note) {
      if (note.wordNotes.length > 2) throw new Error(`${entry.verse} has more than two word notes.`);
      entry.wordNotes = note.wordNotes.map((wordNote, index) => ({
        term: str(wordNote.term, `${entry.verse} wordNotes[${index}].term`),
        explanation: str(wordNote.explanation, `${entry.verse} wordNotes[${index}].explanation`),
        scriptureReferences: strList(wordNote.scriptureReferences ?? [], `${entry.verse} wordNotes[${index}].scriptureReferences`)
      }));
    }
    entry.reviewStatus = entry.commentary.detailedExplanation ? "verified-seed" : "placeholder";
    applied += 1;
  }
  writeFileSync(file, `${JSON.stringify(chapter, null, 2)}\n`);
  const done = chapter.verses.filter((verse) => verse.commentary.detailedExplanation).length;
  console.log(`${label}: applied ${applied} verse note(s) from ${draftPath}; ${done}/${chapter.verses.length} verses now written.`);
}
