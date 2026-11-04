# Titus Study Workspace

Verse-by-verse commentary for Titus, in the same design, voice, and depth as the James and Corinthians studies.

## Writing a chapter

1. Read this file, then study the voice and depth of `/Users/samuel/Documents/GitHub/James/content/james/chapter-01.json` (detailedExplanation, wordNotes, and the chapter-level fields).
2. Research with the private library (never copy wording):
   ```bash
   python3 scripts/search-library.py "1 Peter 3:19 spirits in prison Noah"
   python3 scripts/search-library.py --list
   python3 scripts/search-library.py --pages SOURCE_ID 120-123
   ```
   The Seventh-day Adventist Bible Commentary volume in the list is the doctrinal anchor; consult at least two other works for exegesis and background on every passage.
3. Write drafts (JSON) under `.research/drafts/` and merge them with `node scripts/apply-notes.mjs .research/drafts/<file>.json`. Draft shape is documented at the top of `scripts/apply-notes.mjs`. Work in batches of 4–8 verses so each draft stays small.
4. Validate your chapter:
   ```bash
   node scripts/generate-reference-previews.mjs
   node scripts/validate-content.mjs 2>&1 | grep -F "<Book> <chapter>:"     # your verses only
   node scripts/validate-theology.mjs --allow-pending-review --only "<Book> <chapter>"
   python3 scripts/audit-copying.py --chapter "<Book> <chapter>"
   ```

## What each chapter needs

- **title** (3–7 words), **summary** (8–28 words), **historicalContext** and **literaryContext** (one rich paragraph each, 90–170 words), **themes** (5–6 short phrases), **outline** (3–6 sections whose ranges, written `c:v-v` (e.g. `3:1-7`, no book name), cover every verse exactly once in order), **crossReferences** (5–7 chapter-level references), **relatedConnections** (3 pairs: `sourceText` in this chapter, `relatedText` elsewhere), **teachingNotes** (openingQuestion, mainPoint, keyVerses 3–4, importantTerms 4–6, discussionQuestions 4–5, commonMisunderstandings 2–4, emphasis, closingAppeal), **evangelisticNotes** (mainDoctrinalTheme, keyBibleTexts 4, flow 4–5 steps, simpleIllustrations 2–3, appealQuestion, cautions 2–3), **reflectionQuestions** (4–5, first person).
- Every verse: **detailedExplanation** (2–5 paragraphs separated by a blank line), **crossReferences** (3–5, format `Romans 8:28` or `Romans 8:28-30`; single-chapter books are written `Jude 1:3`, `Philemon 1:10`, `2 John 1:7`), **wordNotes** (1–2; 12–180 words each; each with ≥1 scriptureReference; no repeated references within one note).
- Leave all other verse-level string fields blank and `sources`/`sourceAudit` empty. `apply-notes.mjs` sets `reviewStatus`.

## Commentary voice

- A blended pastoral-scholarly and formal voice: careful exegesis, historical and literary context, theological insight, and Christ-centered application woven together, not labelled.
- Work passage-by-passage so adjacent notes share context without repetition. Length follows the weight of the verse: roughly 150–450 words, average about 270, with real variation (no more than a fifth of notes in any 25-word band).
- Avoid stock openings, balanced disclaimer chains, generic endings ("For the reader, this verse…", "This verse invites…"), and filler (deeply, genuine, quietly, beautifully). Limit "not … but" contrasts. Never reuse a sentence.
- Quote the KJV wording of the verse where it helps; use “curly quotes”. Greek word notes show the Greek form and transliteration, e.g. `ἐλπίδα ζῶσαν (elpida zōsan) — a lively hope`, explain the contextual sense, and avoid root or gloss fallacies.

## Copyright and attribution (strict)

- Form independent synthesis in original wording. Never copy or closely paraphrase sentences from the library; the copying audit fails on any 12-word overlap.
- Never name commentators, books, series, page numbers, or the research process in public text. No "scholars say", "according to", "commentators note".
- Never use denominational labels ("Adventist", "SDA") in public text; express the theology directly from Scripture.
- Never place PDFs, extracted text, or research files inside `content/` or the app.

## Doctrinal safeguards (enforced by scripts/validate-theology.mjs)

The study follows a historic, Bible-only, Sabbath-keeping Protestant reading consistent with the Seventh-day Adventist Bible Commentary: salvation by grace through faith producing obedience; the continuing Ten Commandments including the seventh-day Sabbath; the unconscious sleep of the dead until the resurrection (conditional immortality); a literal, visible, personal Second Coming (no secret rapture); final destruction of the wicked (not eternal torment); Christ's heavenly high-priestly ministry; historicist prophetic interpretation; the clean/unclean food distinction; health and holy living; the great controversy between Christ and Satan. Present these from the text, charitably and without polemic.

- **Titus 2:11–14** — grace teaches holy living; the blessed hope is the glorious, visible appearing of Christ.
- **Titus 3:5** — salvation by mercy; the washing of regeneration is the Spirit's renewing work signified by baptism, not a mechanical ritual effect.
- Elders and good works: practical, pastoral, applicable today.
