import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);

const paragraphBlockSchema = z
  .object({
    type: z.literal("paragraph"),
    text: nonEmptyText
  })
  .strict();

const timelineBlockSchema = z
  .object({
    type: z.literal("timeline"),
    title: nonEmptyText,
    note: nonEmptyText,
    events: z
      .array(
        z
          .object({
            date: nonEmptyText,
            title: nonEmptyText,
            description: nonEmptyText
          })
          .strict()
      )
      .length(7)
  })
  .strict();

const comparisonRowSchema = z.tuple([nonEmptyText, nonEmptyText, nonEmptyText]);

const comparisonBlockSchema = z
  .object({
    type: z.literal("comparison"),
    title: nonEmptyText,
    headers: comparisonRowSchema,
    rows: z.array(comparisonRowSchema).min(3).max(6)
  })
  .strict();

const glanceRowSchema = z.tuple([nonEmptyText, nonEmptyText]);

const glanceBlockSchema = z
  .object({
    type: z.literal("glance"),
    title: nonEmptyText,
    headers: glanceRowSchema,
    rows: z.array(glanceRowSchema).min(6).max(10)
  })
  .strict();

const backgroundBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  timelineBlockSchema,
  glanceBlockSchema,
  comparisonBlockSchema
]);

const backgroundSectionSchema = z
  .object({
    id: nonEmptyText,
    title: nonEmptyText,
    blocks: z.array(backgroundBlockSchema).min(3)
  })
  .strict();

const sectionIds = [
  "pauline-authorship",
  "date-and-place-of-writing",
  "the-island-of-crete",
  "titus-in-the-story-of-paul",
  "the-churches-of-crete",
  "the-false-teachers",
  "why-paul-wrote",
  "the-letter-at-a-glance"
] as const;

const backgroundContentSchema = z
  .object({
    title: nonEmptyText,
    subtitle: nonEmptyText,
    sections: z.array(backgroundSectionSchema).length(8)
  })
  .strict()
  .superRefine((content, context) => {
    content.sections.forEach((section, index) => {
      if (section.id !== sectionIds[index]) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "id"],
          message: `Expected section id ${sectionIds[index]}.`
        });
      }
    });

    const timelineBlocks = content.sections.flatMap((section) =>
      section.blocks.filter((block) => block.type === "timeline")
    );
    const comparisonBlocks = content.sections.flatMap((section) =>
      section.blocks.filter((block) => block.type === "comparison")
    );
    const glanceBlocks = content.sections.flatMap((section) =>
      section.blocks.filter((block) => block.type === "glance")
    );

    const relationshipSection = content.sections.find((section) => section.id === "titus-in-the-story-of-paul");
    const finalSection = content.sections.find((section) => section.id === "the-letter-at-a-glance");

    if (timelineBlocks.length !== 1 || !relationshipSection?.blocks.some((block) => block.type === "timeline")) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "The timeline section must contain the only timeline."
      });
    }

    if (
      comparisonBlocks.length !== 1 ||
      !finalSection?.blocks.some((block) => block.type === "comparison")
    ) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "The final section must contain the only comparison table."
      });
    }

    if (
      glanceBlocks.length !== 1 ||
      !finalSection?.blocks.some((block) => block.type === "glance")
    ) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "The final section must contain the only Book at a Glance table."
      });
    }
  });

export type BackgroundBlock = z.infer<typeof backgroundBlockSchema>;
export type BackgroundSection = z.infer<typeof backgroundSectionSchema>;
export type BackgroundContent = z.infer<typeof backgroundContentSchema>;

export function getBackgroundContent(): BackgroundContent {
  const path = join(process.cwd(), "content/background.json");
  const rawContent: unknown = JSON.parse(readFileSync(path, "utf8"));
  return backgroundContentSchema.parse(rawContent);
}
