/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation is intentional for the static Pages export. */

import {
  ArrowRight,
  BookOpen,
  BookOpenCheck
} from "lucide-react";

const studyActions = [
  {
    title: "Introduction",
    href: "/background/",
    description: "Explore Titus, the churches of Crete, the false teachers, and the setting of the letter.",
    icon: BookOpenCheck
  },
  {
    title: "Titus",
    href: "/titus/1/",
    description: "Read the three-chapter study of qualified elders, grace that teaches, and good works that adorn the gospel.",
    icon: BookOpen
  }
] as const;

const bookPlans = [
  {
    id: "titus",
    slug: "titus",
    eyebrow: "Letter to Titus · Three Chapters",
    title: "Titus",
    chapterCount: 3
  }
] as const;

export function HeroSection() {
  return (
    <section className="home-showcase">
      <div className="home-showcase-shell">
        <section className="home-showcase-hero" aria-labelledby="home-title">
          <div className="home-showcase-copy">
            <p className="home-title-prefix">The Letter to</p>
            <h1 id="home-title">Titus</h1>
            <p className="home-showcase-description">
              {"Enter Paul's letter to his trusted coworker on Crete, where qualified elders, sound teaching, and the grace of God that teaches holy living set young churches in order while they look for the blessed hope."}
            </p>
            <div className="home-showcase-actions">
              <a href="/titus/1/" className="home-showcase-primary">
                Explore Titus
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/background/" className="home-showcase-secondary">
                Read the Introduction
              </a>
            </div>
          </div>
        </section>

        <section className="home-action-grid" aria-label="Primary study paths">
          {studyActions.map((action) => {
            const Icon = action.icon;
            return (
              <a key={action.href} href={action.href} className="home-action-card">
                <span className="home-action-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <strong>{action.title}</strong>
                <span>{action.description}</span>
                <em>
                  Open
                  <ArrowRight className="h-4 w-4" />
                </em>
              </a>
            );
          })}
        </section>

        <section className="home-chapter-study" aria-labelledby="home-chapter-title">
          <div className="home-section-split">
            <div>
              <p className="home-section-kicker">Three-Chapter Study</p>
              <h2 id="home-chapter-title">{"Choose a chapter and follow Paul's counsel to Titus."}</h2>
            </div>
            <p id="content-status">
              The complete 3-chapter reader places Scripture on the left and verse-by-verse
              exposition, historical context, and selected word studies on the right.
            </p>
          </div>

          <div className="home-chapter-group-grid">
            {bookPlans.map((book) => (
              <article key={book.id} id={book.id} className="home-chapter-group">
                <BookOpen className="home-chapter-group-icon h-6 w-6" />
                <p>{book.eyebrow}</p>
                <h3>{book.title}</h3>
                <div className="home-chapter-mini-grid">
                  {Array.from({ length: book.chapterCount }, (_, index) => index + 1).map((chapterNumber) => (
                    <a key={chapterNumber} href={`/${book.slug}/${chapterNumber}/`} aria-label={`${book.title} chapter ${chapterNumber}`}>
                      <span>{book.title}</span>
                      <strong>Chapter {chapterNumber}</strong>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
