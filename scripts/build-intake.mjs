// Build blank intake chapter files with KJV text for every verse in this study.
// Usage: node scripts/build-intake.mjs /path/to/verses-1769.json [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const site = JSON.parse(readFileSync(join(root, "scripts", "site.json"), "utf8"));
const kjvPath = process.argv[2];
if (!kjvPath) throw new Error("Usage: node scripts/build-intake.mjs /path/to/verses-1769.json");
const kjv = JSON.parse(readFileSync(kjvPath, "utf8"));
const force = process.argv.includes("--force");

const emptyCommentary = () => ({
  detailedExplanation: "", exegesis: "", historicalBackground: "", technicalNotes: "", theologicalInsight: "",
  structuralNotes: "", otherCommentaryInsights: "", application: "", reviewFlags: []
});
const emptyAudit = () => ({
  exegesis: [], historicalBackground: [], technicalNotes: [], theologicalInsight: [], structuralNotes: [],
  otherCommentaryInsights: [], application: []
});

let count = 0;
for (const book of site.books) {
  const dir = join(root, "content", book.slug);
  mkdirSync(dir, { recursive: true });
  book.verseCounts.forEach((verseCount, index) => {
    const chapter = index + 1;
    const file = join(dir, `chapter-${String(chapter).padStart(2, "0")}.json`);
    if (existsSync(file) && !force) return;
    const verses = Array.from({ length: verseCount }, (_, verseIndex) => {
      const reference = `${book.name} ${chapter}:${verseIndex + 1}`;
      const raw = kjv[reference];
      if (typeof raw !== "string") throw new Error(`Missing KJV text for ${reference}`);
      count += 1;
      return {
        verse: reference,
        bibleText: raw.replace(/\[(.*?)\]/g, "$1").replace(/\s+/g, " ").trim(),
        explanation: "", historicalBackground: "", literaryContext: "", theologicalInsight: "", structuralNotes: "",
        relatedConnection: "", crossReferences: [], application: "", sources: [],
        commentary: emptyCommentary(), wordNotes: [], sourceAudit: emptyAudit(), reviewStatus: "placeholder"
      };
    });
    if (kjv[`${book.name} ${chapter}:${verseCount + 1}`]) throw new Error(`${book.name} ${chapter} has more than ${verseCount} verses in the KJV.`);
    const content = {
      chapterNumber: chapter, title: "", summary: "", historicalContext: "", literaryContext: "", themes: [], outline: [],
      verses, symbols: [], charts: [], images: [], crossReferences: [], relatedConnections: [],
      teachingNotes: { openingQuestion: "", mainPoint: "", keyVerses: [], importantTerms: [], discussionQuestions: [], commonMisunderstandings: [], emphasis: "", closingAppeal: "" },
      evangelisticNotes: { mainDoctrinalTheme: "", keyBibleTexts: [], flow: [], simpleIllustrations: [], appealQuestion: "", cautions: [], sources: [] },
      reflectionQuestions: [], sources: []
    };
    writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`);
  });
}
if (!existsSync(join(root, "content", "background.json"))) {
  writeFileSync(join(root, "content", "background.json"), `${JSON.stringify({
    title: "", subtitle: "", sections: site.backgroundSections.map(([id, title]) => ({ id, title, blocks: [] }))
  }, null, 2)}\n`);
}
console.log(`Intake ready: ${count} KJV verses written for ${site.title}.`);
