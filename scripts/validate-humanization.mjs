import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const books = ["titus"];
const SCALE = 46 / 694;
const cap = (value) => Math.max(1, Math.ceil(value * SCALE));
const notes = [];
const editorialFields = [];
const errors = [];

const stockPatterns = [
  { label: '“For the reader, this verse”', pattern: /\bfor the reader,? this verse\b/giu, max: cap(4) },
  { label: '“At the same time”', pattern: /\bat the same time\b/giu, max: cap(60) },
  { label: '“This verse also”', pattern: /\bthis verse also\b/giu, max: cap(30) },
  { label: '“The verse also”', pattern: /\bthe verse also\b/giu, max: cap(30) },
  { label: '“Paul does not”', pattern: /\bpaul does not\b/giu, max: cap(220) },
  { label: '“not merely”', pattern: /\bnot merely\b/giu, max: cap(150) },
  { label: '“This protects”', pattern: /\bthis protects\b/giu, max: cap(10) },
  { label: '“There is tenderness”', pattern: /\bthere is tenderness\b/giu, max: cap(2) },
  { label: '“Christian maturity”', pattern: /\bchristian maturity\b/giu, max: cap(3) },
  { label: '“The issue is not”', pattern: /\bthe issue is not\b/giu, max: cap(12) },
  { label: '“This does not mean”', pattern: /\bthis does not mean\b/giu, max: cap(25) }
];

const genericEndingPattern = /\b(?:for (?:the reader|believers|the church),?|christian maturity|this verse (?:calls|invites)|the verse (?:calls|invites)|this protects the church)\b/iu;
const disclaimerPattern = /\b(?:does not mean|does not say|paul does not|must not|should not|cannot be used|never be used|is not permission|does not authorize)\b/giu;
const contrastPattern = /\bnot\b[^.!?]{0,110}\bbut\b/giu;
const fillerPatterns = ["deeply", "genuine", "quietly", "tenderness", "beautifully"];

function words(value) {
  return value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) ?? [];
}

function normalize(value) {
  return words(value).join(" ").toLocaleLowerCase();
}

function countMatches(value, pattern) {
  pattern.lastIndex = 0;
  return [...value.matchAll(pattern)].length;
}

function splitSentences(value) {
  return value
    .replace(/\s+/gu, " ")
    .split(/(?<=[.!?])\s+(?=[“"']?[A-Z0-9])/gu)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function ngrams(value, size = 4) {
  const tokens = words(value).map((word) => word.toLocaleLowerCase());
  const result = new Set();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  for (const value of smaller) if (larger.has(value)) overlap += 1;
  return overlap / (left.size + right.size - overlap);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coefficientOfVariation(values) {
  const average = mean(values);
  if (!average) return 0;
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance) / average;
}

function addEditorialField(reference, text) {
  const value = String(text ?? "").trim();
  if (!value) return;
  const paragraphs = value.split(/\n\s*\n/gu).map((paragraph) => paragraph.trim()).filter(Boolean);
  editorialFields.push({
    reference,
    text: value,
    paragraphs,
    sentences: splitSentences(value)
  });
}

for (const book of books) {
  const bookRoot = join(root, "content", book);
  for (const file of readdirSync(bookRoot).filter((entry) => entry.endsWith(".json")).sort()) {
    const chapter = JSON.parse(readFileSync(join(bookRoot, file), "utf8"));
    const chapterReference = `${book} ${chapter.chapterNumber}`;
    addEditorialField(`${chapterReference} summary`, chapter.summary);
    (chapter.outline ?? []).forEach((section, index) => {
      addEditorialField(`${chapterReference} outline ${index + 1}`, section.summary);
    });
    const chapterNotes = [];
    for (const verse of chapter.verses ?? []) {
      const text = String(verse.commentary?.detailedExplanation ?? "").trim();
      const paragraphs = text.split(/\n\s*\n/gu).map((paragraph) => paragraph.trim()).filter(Boolean);
      const sentences = splitSentences(text);
      const wordCount = words(text).length;
      const lastParagraph = paragraphs.at(-1) ?? "";
      const note = {
        reference: verse.verse,
        book,
        chapter: chapter.chapterNumber,
        text,
        paragraphs,
        sentences,
        wordCount,
        paragraphCount: paragraphs.length,
        disclaimerCount: countMatches(text, disclaimerPattern),
        genericEnding: genericEndingPattern.test(lastParagraph),
        grams: ngrams(text)
      };
      notes.push(note);
      chapterNotes.push(note);
      (verse.wordNotes ?? []).forEach((wordNote, index) => {
        addEditorialField(`${verse.verse} word note ${index + 1}`, wordNote.explanation);
      });
    }

    const counts = chapterNotes.map((note) => note.wordCount);
    const cv = coefficientOfVariation(counts);
    if (chapterNotes.length >= 10 && cv < 0.075) {
      errors.push(`${book} ${chapter.chapterNumber} remains suspiciously uniform (word-count CV ${cv.toFixed(3)}).`);
    }
    const paragraphFrequency = new Map();
    for (const note of chapterNotes) {
      paragraphFrequency.set(note.paragraphCount, (paragraphFrequency.get(note.paragraphCount) ?? 0) + 1);
    }
    const dominantParagraphCount = [...paragraphFrequency.entries()].sort((left, right) => right[1] - left[1])[0];
    if (chapterNotes.length >= 10 && dominantParagraphCount?.[1] / chapterNotes.length > 0.8) {
      errors.push(
        `${book} ${chapter.chapterNumber} gives ${dominantParagraphCount[1]} of ${chapterNotes.length} notes exactly ` +
        `${dominantParagraphCount[0]} paragraphs; paragraph architecture remains templated.`
      );
    }
  }
}

const backgroundPath = join(root, "content", "background.json");
if (existsSync(backgroundPath)) {
  const background = JSON.parse(readFileSync(backgroundPath, "utf8"));
  const visit = (value, reference = "Introduction") => {
    if (typeof value === "string") {
      if (words(value).length >= 8) addEditorialField(reference, value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${reference}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, entry]) => {
      if (!new Set(["id", "type"]).has(key)) visit(entry, `${reference}.${key}`);
    });
  };
  visit(background);
}

const homepagePath = join(root, "components", "hero-section.tsx");
if (existsSync(homepagePath)) {
  addEditorialField("Homepage", readFileSync(homepagePath, "utf8"));
}

const EXPECTED_NOTES = JSON.parse(readFileSync(join(root, "scripts", "site.json"), "utf8")).totalVerses;
if (notes.length !== EXPECTED_NOTES) errors.push(`Expected ${EXPECTED_NOTES} notes; found ${notes.length}.`);
for (const note of notes) {
  if (note.wordCount < 40) errors.push(`${note.reference} is unexpectedly short (${note.wordCount} words).`);
  if (/ {2,}/u.test(note.text)) errors.push(`${note.reference} contains repeated spaces.`);
}

const allText = [...notes.map((note) => note.text), ...editorialFields.map((field) => field.text)].join("\n");
for (const item of stockPatterns) {
  const count = countMatches(allText, item.pattern);
  item.count = count;
  if (count > item.max) errors.push(`${item.label} occurs ${count} times; the humanization ceiling is ${item.max}.`);
}

const contrastCount = countMatches(allText, contrastPattern);
if (contrastCount > cap(470)) errors.push(`“not … but …” contrasts occur ${contrastCount} times; expected ${cap(470)} or fewer.`);

const genericEndingCount = notes.filter((note) => note.genericEnding).length;
if (genericEndingCount > cap(70)) errors.push(`${genericEndingCount} notes retain generic application endings; expected ${cap(70)} or fewer.`);

const denseDisclaimerNotes = notes.filter((note) => note.disclaimerCount >= 5);
if (denseDisclaimerNotes.length > cap(20)) {
  errors.push(`${denseDisclaimerNotes.length} notes contain five or more disclaimer frames; expected ${cap(20)} or fewer.`);
}

const duplicateSentences = new Map();
const duplicateParagraphs = new Map();
for (const note of [...notes, ...editorialFields]) {
  for (const sentence of note.sentences) {
    if (words(sentence).length < 16) continue;
    const key = normalize(sentence);
    const occurrence = duplicateSentences.get(key) ?? { count: 0, refs: new Set() };
    occurrence.count += 1;
    occurrence.refs.add(note.reference);
    duplicateSentences.set(key, occurrence);
  }
  for (const paragraph of note.paragraphs) {
    if (words(paragraph).length < 30) continue;
    const key = normalize(paragraph);
    const occurrence = duplicateParagraphs.get(key) ?? { count: 0, refs: new Set() };
    occurrence.count += 1;
    occurrence.refs.add(note.reference);
    duplicateParagraphs.set(key, occurrence);
  }
}

const repeatedSentences = [...duplicateSentences.entries()].filter(([, occurrence]) => occurrence.count > 1);
const repeatedParagraphs = [...duplicateParagraphs.entries()].filter(([, occurrence]) => occurrence.count > 1);
if (repeatedSentences.length) errors.push(`${repeatedSentences.length} long sentence(s) are repeated within or across notes.`);
if (repeatedParagraphs.length) errors.push(`${repeatedParagraphs.length} substantial paragraph(s) are repeated within or across notes.`);

const adjacentSimilarity = [];
for (let index = 1; index < notes.length; index += 1) {
  const previous = notes[index - 1];
  const current = notes[index];
  if (previous.book !== current.book || previous.chapter !== current.chapter) continue;
  if (Math.min(previous.wordCount, current.wordCount) < 80) continue;
  const score = jaccard(previous.grams, current.grams);
  if (score >= 0.42) adjacentSimilarity.push({ left: previous.reference, right: current.reference, score });
}
const severeAdjacent = adjacentSimilarity.filter((item) => item.score >= 0.62);
if (severeAdjacent.length) errors.push(`${severeAdjacent.length} adjacent note pair(s) retain severe phrase-level similarity.`);

const bands = new Map();
for (const note of notes) {
  const start = Math.floor(note.wordCount / 25) * 25;
  bands.set(start, (bands.get(start) ?? 0) + 1);
}
const densestBand = [...bands.entries()].sort((left, right) => right[1] - left[1])[0] ?? [0, 0];
if (densestBand[1] / notes.length > 0.2) {
  errors.push(`${densestBand[1]} notes fall in the ${densestBand[0]}–${densestBand[0] + 24}-word band; length remains overly uniform.`);
}

const averageWords = mean(notes.map((note) => note.wordCount));
const averageParagraphs = mean(notes.map((note) => note.paragraphCount));
console.log("Titus Study humanization audit");
console.log(`- Notes: ${notes.length}`);
console.log(`- Additional editorial fields: ${editorialFields.length}`);
console.log(`- Total words: ${notes.reduce((sum, note) => sum + note.wordCount, 0).toLocaleString()}`);
console.log(`- Average words per note: ${averageWords.toFixed(1)}`);
console.log(`- Average paragraphs per note: ${averageParagraphs.toFixed(1)}`);
console.log(`- Densest 25-word band: ${densestBand[0]}–${densestBand[0] + 24} (${densestBand[1]} notes)`);
for (const item of stockPatterns) console.log(`- ${item.label}: ${item.count}`);
console.log(`- “not … but …” contrasts: ${contrastCount}`);
console.log(`- Generic endings: ${genericEndingCount}`);
console.log(`- Notes with 5+ disclaimer frames: ${denseDisclaimerNotes.length}`);
console.log(`- Reused long sentences: ${repeatedSentences.length}`);
console.log(`- Reused substantial paragraphs: ${repeatedParagraphs.length}`);
console.log(`- Adjacent similarity flags: ${adjacentSimilarity.length} (${severeAdjacent.length} severe)`);
console.log(`- Filler counts: ${fillerPatterns.map((term) => `${term}=${countMatches(allText, new RegExp(`\\b${term}\\b`, "giu"))}`).join(", ")}`);

if (errors.length) {
  console.error(`Humanization validation failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Titus Study humanization validation passed.");
