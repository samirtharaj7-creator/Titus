import type { Metadata } from "next";
import { BookOpenCheck, CalendarDays } from "lucide-react";
import {
  getBackgroundContent,
  type BackgroundBlock
} from "@/lib/background";

export const metadata: Metadata = {
  title: "Introduction to the Letter to Titus",
  description:
    "Explore Pauline authorship, the island of Crete, Titus's life and ministry, the false teachers, and why Paul wrote the letter."
};

function BackgroundBlockView({ block, sectionTitle }: {
  block: BackgroundBlock;
  sectionTitle: string;
}) {
  if (block.type === "paragraph") {
    return <p>{block.text}</p>;
  }

  if (block.type === "timeline") {
    return (
      <section className="background-timeline" aria-label={block.title}>
        <div className="background-structured-heading">
          <CalendarDays className="h-5 w-5" />
          <div>
            <p>Chronology</p>
            <h3>{block.title}</h3>
          </div>
        </div>
        <p className="background-chronology-note">{block.note}</p>
        <ol>
          {block.events.map((event) => (
            <li key={`${event.date}-${event.title}`}>
              <span>{event.date}</span>
              <p>
                <strong>{event.title}.</strong> {event.description}
              </p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (block.type === "glance") {
    return (
      <section className="background-glance" aria-labelledby="background-glance-title">
        <div className="background-structured-heading">
          <BookOpenCheck className="h-5 w-5" />
          <div>
            <p>Overview</p>
            <h3 id="background-glance-title">{block.title}</h3>
          </div>
        </div>
        <div
          className="background-table-wrap background-glance-table-wrap"
          role="region"
          aria-label={`${sectionTitle}: ${block.title}`}
          tabIndex={0}
        >
          <table className="background-data-table background-glance-table">
            <caption className="sr-only">{block.title}</caption>
            <thead>
              <tr>
                {block.headers.map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cellIndex}-${cell.slice(0, 24)}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="background-table-wrap" role="region" aria-label={`${sectionTitle}: ${block.title}`} tabIndex={0}>
      <table className="background-data-table">
        <caption className="sr-only">{block.title}</caption>
        <thead>
          <tr>
            {block.headers.map((header) => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, cellIndex) => (
                <td key={`${cellIndex}-${cell.slice(0, 24)}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BackgroundPage() {
  const content = getBackgroundContent();

  return (
    <main className="background-page titus-background-page">
      <section className="background-hero" aria-labelledby="background-title">
        <div className="background-hero-copy">
          <h1 id="background-title" className="background-introduction-title" aria-label={content.title}>
            <span className="background-introduction-prefix" aria-hidden="true">
              Introduction to the Letter to
            </span>
            <span className="background-introduction-book" aria-hidden="true">
              {"Titus"}
            </span>
          </h1>
          <p className="background-subtitle">{content.subtitle}</p>
        </div>
      </section>

      <section className="background-section-nav" aria-label="Introduction page sections">
        <div className="background-section-nav-scroll">
          <nav>
            {content.sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="background-shell" aria-label="Titus introduction study">
        <div className="background-study">
          <div className="background-section-list">
            {content.sections.map((section, sectionIndex) => (
              <section key={section.id} id={section.id} className="background-section">
                <span className="background-section-number">{String(sectionIndex + 1).padStart(2, "0")}</span>
                <div className="background-section-body">
                  <h2>{section.title}</h2>
                  {section.blocks.map((block, blockIndex) => (
                    <BackgroundBlockView
                      key={`${section.id}-${block.type}-${blockIndex}`}
                      block={block}
                      sectionTitle={section.title}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
