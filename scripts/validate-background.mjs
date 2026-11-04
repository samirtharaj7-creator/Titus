// Validate the public introduction (content/background.json).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const site = JSON.parse(readFileSync(join(root, "scripts", "site.json"), "utf8"));
const path = join(root, "content", "background.json");
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const prohibited = [
  { label: "source terminology", pattern: /\bsources?\b/iu },
  { label: "resource terminology", pattern: /\bresources?\b/iu },
  { label: "research-process wording", pattern: /\bresearch(?:ed|ers?)?\b|\buploaded\b|\bsupplied\b|\bcorpus\b/iu },
  { label: "bibliography or citation wording", pattern: /\bbibliograph\w*|\bcitations?\b|\bfootnotes?\b|\bendnotes?\b/iu },
  { label: "attribution wording", pattern: /\baccording\s+to\b|\bcommentators?\b|\bcommentaries\b/iu },
  { label: "page locator", pattern: /\bpp?\.\s*\d+/iu },
  { label: "author-year citation", pattern: /\([\p{Lu}][\p{L}'’.-]+,?\s+\d{4}\)/u },
  { label: "URL or identifier", pattern: /https?:\/\/|\bwww\.|\b(?:doi|isbn)\b/iu },
  { label: "et al.", pattern: /\bet\s+al\.?/iu },
  { label: "direct quotation marks", pattern: /["“”„‟«»]/u },
  { label: "denominational self-label", pattern: /\b(?:Seventh[- ]day Adventist|Adventist|SDA)\b/iu }
];

const privateNames = new Set(["Weima", "Beale", "Stott", "Malherbe", "Knight", "Guthrie", "Plummer", "Perkins", "Kostenberger", "Köstenberger", "Moo", "Witherington", "Jobes", "Samra", "Bauckham", "deSilva", "Painter", "McKnight", "Akin", "Howell", "Marshall", "Wright", "Mbuvi", "Chester", "Davids", "Webb", "Nystrom", "Reapsome", "Bird", "Merida", "Wilder"]);

const leaves = (value) => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(leaves) : value && typeof value === "object" ? Object.entries(value).filter(([k]) => k !== "type").flatMap(([, v]) => leaves(v)) : [];
const countWords =(value) => value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;

if (!existsSync(path)) {
  errors.push("content/background.json is missing.");
} else {
  const content = JSON.parse(readFileSync(path, "utf8"));
  assert(typeof content.title === "string" && content.title.trim(), "Introduction title is empty.");
  assert(typeof content.subtitle === "string" && content.subtitle.trim(), "Introduction subtitle is empty.");
  assert(Array.isArray(content.sections) && content.sections.length === 8, "Introduction must contain exactly eight sections.");
  let total = 0;
  const strings = [];
  (content.sections ?? []).forEach((section, index) => {
    const [expectedId] = site.backgroundSections[index] ?? [];
    assert(section.id === expectedId, `Section ${index + 1} must have id ${expectedId}.`);
    assert(Array.isArray(section.blocks) && section.blocks.length >= 3, `${section.id} needs at least three blocks.`);
    for (const block of section.blocks ?? []) {
      if (block.type === "paragraph") {
        const n = countWords(block.text ?? "");
        total += n;
        assert(n >= 40, `${section.id} has a paragraph under 40 words.`);
        strings.push([`${section.id} paragraph`, block.text]);
      } else if (block.type === "timeline") {
        assert(section.id === site.timelineSection, `Only ${site.timelineSection} may contain the timeline.`);
        assert(block.events?.length === 7, `${section.id} timeline needs exactly seven events.`);
        leaves(block).forEach((t) => strings.push([`${section.id} timeline`, t]));
      } else if (block.type === "glance" || block.type === "comparison") {
        assert(section.id === site.finalSection, `Only ${site.finalSection} may contain the ${block.type} table.`);
        leaves(block).forEach((t) => strings.push([`${section.id} ${block.type}`, t]));
      } else {
        errors.push(`${section.id} has unknown block type ${block.type}.`);
      }
    }
  });
  const types = (content.sections ?? []).flatMap((s) => s.blocks ?? []).map((b) => b.type);
  for (const type of ["timeline", "glance", "comparison"]) assert(types.filter((t) => t === type).length === 1, `Introduction must contain exactly one ${type} block.`);
  assert(total >= 2200, `Introduction paragraphs total ${total} words; expected at least 2,200.`);
  strings.push(["title", content.title], ["subtitle", content.subtitle]);
  for (const [label, value] of strings) {
    for (const { label: name, pattern } of prohibited) {
      assert(!pattern.test(String(value)), `${label} contains prohibited ${name}.`);
    }
    for (const name of privateNames) {
      assert(!new RegExp(`\\b${name}\\b`, "u").test(String(value)), `${label} exposes a private author name (${name}).`);
    }
  }
}

if (errors.length) {
  console.error(`Introduction validation failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`${site.title} introduction validated.`);
