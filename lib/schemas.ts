import { z } from "zod";

export const SourceRefSchema = z.object({
  sourceId: z.string(),
  locator: z.string(),
  claimType: z.string(),
  priority: z.number()
});

export const VerseCommentarySchema = z.object({
  detailedExplanation: z.string(),
  exegesis: z.string(),
  historicalBackground: z.string(),
  technicalNotes: z.string(),
  theologicalInsight: z.string(),
  structuralNotes: z.string(),
  otherCommentaryInsights: z.string(),
  application: z.string(),
  reviewFlags: z.array(z.string())
});

export const VerseSourceAuditSchema = z.object({
  exegesis: z.array(SourceRefSchema),
  historicalBackground: z.array(SourceRefSchema),
  technicalNotes: z.array(SourceRefSchema),
  theologicalInsight: z.array(SourceRefSchema),
  structuralNotes: z.array(SourceRefSchema),
  otherCommentaryInsights: z.array(SourceRefSchema),
  application: z.array(SourceRefSchema)
});

export const WordNoteSchema = z.object({
  term: z.string(),
  explanation: z.string(),
  scriptureReferences: z.array(z.string()).default([])
});

export const VerseEntrySchema = z.object({
  verse: z.string(),
  bibleText: z.string(),
  explanation: z.string(),
  historicalBackground: z.string(),
  literaryContext: z.string(),
  theologicalInsight: z.string(),
  structuralNotes: z.string(),
  relatedConnection: z.string(),
  crossReferences: z.array(z.string()),
  application: z.string(),
  sources: z.array(SourceRefSchema),
  commentary: VerseCommentarySchema,
  wordNotes: z.array(WordNoteSchema).default([]),
  sourceAudit: VerseSourceAuditSchema,
  reviewStatus: z.enum(["verified-seed", "needs-source-review", "placeholder"])
});

export const ChapterContentSchema = z.object({
  chapterNumber: z.number(),
  title: z.string(),
  summary: z.string(),
  historicalContext: z.string(),
  literaryContext: z.string(),
  themes: z.array(z.string()),
  outline: z.array(z.object({ range: z.string(), title: z.string(), summary: z.string() })),
  verses: z.array(VerseEntrySchema),
  symbols: z.array(z.object({
    symbol: z.string(),
    references: z.array(z.string()),
    scriptureReferences: z.array(z.string()).default([]),
    meaning: z.string(),
    sources: z.array(SourceRefSchema)
  })),
  charts: z.array(z.object({ id: z.string(), title: z.string(), type: z.string() })),
  images: z.array(z.object({ id: z.string(), alt: z.string(), caption: z.string(), sourceCredit: z.string() })),
  crossReferences: z.array(z.string()),
  relatedConnections: z.array(z.object({
    sourceText: z.string(),
    relatedText: z.string(),
    sources: z.array(SourceRefSchema)
  })),
  teachingNotes: z.object({
    openingQuestion: z.string(),
    mainPoint: z.string(),
    keyVerses: z.array(z.string()),
    importantTerms: z.array(z.string()),
    discussionQuestions: z.array(z.string()),
    commonMisunderstandings: z.array(z.string()),
    emphasis: z.string(),
    closingAppeal: z.string()
  }),
  evangelisticNotes: z.object({
    mainDoctrinalTheme: z.string(),
    keyBibleTexts: z.array(z.string()),
    flow: z.array(z.string()),
    simpleIllustrations: z.array(z.string()),
    appealQuestion: z.string(),
    cautions: z.array(z.string()),
    sources: z.array(SourceRefSchema)
  }),
  reflectionQuestions: z.array(z.string()),
  sources: z.array(SourceRefSchema)
});

export type SourceRef = z.infer<typeof SourceRefSchema>;
export type VerseCommentary = z.infer<typeof VerseCommentarySchema>;
export type VerseSourceAudit = z.infer<typeof VerseSourceAuditSchema>;
export type WordNote = z.infer<typeof WordNoteSchema>;
export type VerseEntry = z.infer<typeof VerseEntrySchema>;
export type ChapterContent = z.infer<typeof ChapterContentSchema>;
