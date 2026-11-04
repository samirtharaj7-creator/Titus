"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, Library, List, Minus, Plus } from "lucide-react";
import { ScriptureReferenceChip } from "@/components/scripture-reference-chip";
import type { ChapterContent, VerseEntry } from "@/lib/schemas";
import type { ReferencePreviewMap } from "@/lib/reference-previews";
import {
  READER_VERSE_CHANGE_EVENT,
  type ReaderVerseEventDetail
} from "@/lib/reader-events";
import { slugify } from "@/lib/utils";

type PublicVerseEntry = Omit<VerseEntry, "sources" | "sourceAudit">;
type PublicSymbol = Omit<ChapterContent["symbols"][number], "sources">;
type PublicRelatedConnection = Omit<ChapterContent["relatedConnections"][number], "sources">;
type PublicEvangelisticNotes = Omit<ChapterContent["evangelisticNotes"], "sources">;

export type PublicChapterContent = Omit<
  ChapterContent,
  "sources" | "symbols" | "relatedConnections" | "evangelisticNotes" | "verses"
> & {
  symbols: PublicSymbol[];
  relatedConnections: PublicRelatedConnection[];
  evangelisticNotes: PublicEvangelisticNotes;
  verses: PublicVerseEntry[];
};

const SCRIPTURE_MIN_LEVEL = -1;
const SCRIPTURE_MOBILE_MAX_LEVEL = 3;
const SCRIPTURE_DESKTOP_MAX_LEVEL = 5;
const NOTES_MIN_LEVEL = -1;
const NOTES_MAX_LEVEL = 3;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ChapterStudy({
  chapter,
  bookName,
  referencePreviews
}: {
  chapter: PublicChapterContent;
  bookName: string;
  referencePreviews: ReferencePreviewMap;
}) {
  const firstVerse = chapter.verses[0]?.verse ?? "";
  const [selectedVerseRef, setSelectedVerseRef] = useState(firstVerse);
  const [expandedCompactVerseRef, setExpandedCompactVerseRef] = useState<string | null>(null);
  const [scriptureLevel, setScriptureLevel] = useState(0);
  const [notesLevel, setNotesLevel] = useState(0);
  const [isMobileReader, setIsMobileReader] = useState(false);
  const [isCompactReader, setIsCompactReader] = useState(false);
  const readerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace("#", "");
      const simpleVerse = hash.match(/^v-?(\d+)$/);
      const match = simpleVerse
        ? chapter.verses[Number(simpleVerse[1]) - 1]
        : chapter.verses.find((verse) => slugify(verse.verse) === hash);
      if (match) {
        const compactReader = window.matchMedia("(max-width: 980px)").matches;
        setSelectedVerseRef(match.verse);
        setExpandedCompactVerseRef(compactReader ? match.verse : null);
        window.requestAnimationFrame(() => {
          if (compactReader) getVerseButtonElement(match.verse)?.scrollIntoView({ block: "nearest" });
          else scrollVerseButtonIntoPane(match.verse, "auto");
        });
      }
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [chapter.verses]);

  useEffect(() => {
    const match = selectedVerseRef.match(/:(\d+)$/);
    if (!match) return;

    window.dispatchEvent(
      new CustomEvent<ReaderVerseEventDetail>(READER_VERSE_CHANGE_EVENT, {
        detail: {
          bookName,
          chapter: chapter.chapterNumber,
          verse: Number(match[1])
        }
      })
    );
  }, [bookName, chapter.chapterNumber, selectedVerseRef]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");

    function syncReaderWidth() {
      setIsMobileReader(mediaQuery.matches);
    }

    syncReaderWidth();
    mediaQuery.addEventListener("change", syncReaderWidth);
    return () => mediaQuery.removeEventListener("change", syncReaderWidth);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 980px)");

    function handleCompactReaderChange(event: MediaQueryListEvent) {
      setIsCompactReader(event.matches);
      setExpandedCompactVerseRef(event.matches ? selectedVerseRef : null);
    }

    function syncInitialCompactReader() {
      setIsCompactReader(mediaQuery.matches);
    }

    syncInitialCompactReader();
    mediaQuery.addEventListener("change", handleCompactReaderChange);
    return () => mediaQuery.removeEventListener("change", handleCompactReaderChange);
  }, [selectedVerseRef]);

  useEffect(() => {
    const reader = readerRef.current;
    const footer = document.querySelector<HTMLElement>("body > .mbe-global-footer");
    if (!reader || !footer) return;

    const readerElement = reader;
    const footerElement = footer;
    const body = document.body;
    const desktopQuery = window.matchMedia("(min-width: 981px)");
    let disposeDesktop: (() => void) | undefined;

    function clearFooterState() {
      body.removeAttribute("data-reader-footer-visible");
      body.style.removeProperty("--reader-footer-height");
    }

    function installDesktopFooterReveal() {
      const panes = Array.from(
        readerElement.querySelectorAll<HTMLElement>(".scripture-pane-body, .commentary-pane-body")
      );
      const content = Array.from(
        readerElement.querySelectorAll<HTMLElement>(".scripture-list, .commentary-shell")
      );
      const atEnd = new Map<HTMLElement, boolean>(panes.map((pane) => [pane, false]));
      let animationFrame = 0;
      let pinFrame = 0;
      let footerHeight = 0;

      function syncFooterVisibility() {
        const shouldShow = Array.from(atEnd.values()).some(Boolean);
        const wasVisible = body.hasAttribute("data-reader-footer-visible");
        body.toggleAttribute("data-reader-footer-visible", shouldShow);

        if (shouldShow && !wasVisible) {
          window.cancelAnimationFrame(pinFrame);
          pinFrame = window.requestAnimationFrame(() => {
            panes.forEach((pane) => {
              if (atEnd.get(pane)) {
                pane.scrollTop = pane.scrollHeight - pane.clientHeight;
              }
            });
          });
        }
      }

      function measureFooter() {
        const height = Math.ceil(footerElement.getBoundingClientRect().height);
        if (height > 0) {
          footerHeight = height;
          body.style.setProperty("--reader-footer-height", `${height}px`);
        }
      }

      function updatePane(pane: HTMLElement) {
        const maximumScroll = pane.scrollHeight - pane.clientHeight;
        const distanceFromEnd = maximumScroll - pane.scrollTop;
        const exitThreshold = Math.max(24, footerHeight + 16);
        const threshold = atEnd.get(pane) ? exitThreshold : 4;
        atEnd.set(pane, maximumScroll > 8 && distanceFromEnd <= threshold);
      }

      function updateAll() {
        measureFooter();
        panes.forEach(updatePane);
        syncFooterVisibility();
      }

      function scheduleUpdate() {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = window.requestAnimationFrame(updateAll);
      }

      function handlePaneScroll(event: Event) {
        updatePane(event.currentTarget as HTMLElement);
        syncFooterVisibility();
      }

      panes.forEach((pane) => pane.addEventListener("scroll", handlePaneScroll, { passive: true }));

      const resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(footerElement);
      panes.forEach((pane) => resizeObserver.observe(pane));
      content.forEach((element) => resizeObserver.observe(element));
      scheduleUpdate();

      return () => {
        window.cancelAnimationFrame(animationFrame);
        window.cancelAnimationFrame(pinFrame);
        resizeObserver.disconnect();
        panes.forEach((pane) => pane.removeEventListener("scroll", handlePaneScroll));
      };
    }

    function syncViewportMode() {
      disposeDesktop?.();
      disposeDesktop = undefined;
      clearFooterState();

      if (desktopQuery.matches) {
        disposeDesktop = installDesktopFooterReveal();
      }
    }

    syncViewportMode();
    desktopQuery.addEventListener("change", syncViewportMode);

    return () => {
      desktopQuery.removeEventListener("change", syncViewportMode);
      disposeDesktop?.();
      clearFooterState();
    };
  }, [bookName, chapter.chapterNumber, selectedVerseRef]);

  const selectedVerse = useMemo(
    () => chapter.verses.find((verse) => verse.verse === selectedVerseRef) ?? chapter.verses[0],
    [chapter.verses, selectedVerseRef]
  );

  const outlineByStartVerse = useMemo(() => {
    const sections = new Map<string, PublicChapterContent["outline"][number]>();
    chapter.outline.forEach((section) => {
      const parsed = parseReference(section.range);
      if (parsed) {
        sections.set(`${bookName} ${parsed.chapter}:${parsed.startVerse}`, section);
      }
    });
    return sections;
  }, [bookName, chapter.outline]);

  function selectVerse(verse: PublicVerseEntry, trigger: HTMLButtonElement) {
    setSelectedVerseRef(verse.verse);
    if (isCompactReader) {
      const currentScrollTop = window.scrollY;
      const switchingOpenVerse = Boolean(
        expandedCompactVerseRef && expandedCompactVerseRef !== verse.verse
      );
      setExpandedCompactVerseRef((current) => current === verse.verse ? null : verse.verse);
      if (switchingOpenVerse) {
        window.requestAnimationFrame(() => {
          trigger.scrollIntoView({ block: "nearest" });
        });
      } else {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: currentScrollTop, behavior: "auto" });
        });
      }
    } else {
      setExpandedCompactVerseRef(null);
    }
    if (typeof window !== "undefined") {
      const verseNumber = verse.verse.match(/:(\d+)$/)?.[1];
      window.history.replaceState(null, "", verseNumber ? `#v${verseNumber}` : `#${slugify(verse.verse)}`);
    }
  }

  if (!selectedVerse) return null;

  const scriptureMaxLevel = isMobileReader ? SCRIPTURE_MOBILE_MAX_LEVEL : SCRIPTURE_DESKTOP_MAX_LEVEL;
  const scriptureMobileFontSize = clampNumber(18 + scriptureLevel * 2, 16, 24);
  const scriptureDesktopFontSize = clampNumber(20 + scriptureLevel * 2, 18, 30);
  const notesFontSize = clampNumber(18 + notesLevel * 2, 16, 24);
  const chapterTheme = chapter.title || chapter.themes[0] || "";
  return (
    <section
      ref={readerRef}
      className="split-reader"
      aria-label={`${bookName} ${chapter.chapterNumber} reader`}
      style={{
        "--scripture-mobile-font-size": `${scriptureMobileFontSize}px`,
        "--scripture-desktop-font-size": `${scriptureDesktopFontSize}px`,
        "--notes-font-size": `${notesFontSize}px`
      } as CSSProperties}
    >
      <div className="scripture-pane">
        <div className="reader-pane-toolbar no-print">
          <div>
            <div className="reader-pane-kicker">
              <BookOpen className="h-5 w-5" />
              King James Version
            </div>
            <p className="reader-pane-subtitle">
              <span className="reader-pane-subtitle-main">{bookName} {chapter.chapterNumber}</span>
              {chapterTheme ? (
                <>
                  <span className="reader-pane-subtitle-separator" aria-hidden="true">
                    ·
                  </span>
                  <span className="reader-pane-subtitle-theme">{chapterTheme}</span>
                </>
              ) : null}
            </p>
          </div>
          <FontScaleControls
            label="Bible text size controls"
            decreaseLabel="Decrease Bible text size"
            increaseLabel="Increase Bible text size"
            onDecrease={() => setScriptureLevel((value) => Math.max(SCRIPTURE_MIN_LEVEL, value - 1))}
            onIncrease={() => setScriptureLevel((value) => Math.min(scriptureMaxLevel, value + 1))}
          />
        </div>
        <div className="scripture-pane-body">
          <div className="scripture-pane-header">
            <h1>{bookName} Chapter {chapter.chapterNumber}</h1>
            {chapter.summary ? <p className="scripture-chapter-summary">{chapter.summary}</p> : null}
          </div>
          <div className="scripture-list">
            {chapter.verses.map((verse, index) => {
              const outlineSection = outlineByStartVerse.get(verse.verse);
              const expanded = isCompactReader && expandedCompactVerseRef === verse.verse;
              const notesPanelId = `${slugify(verse.verse)}-study-notes`;

              return (
                <div className="scripture-list-item" key={verse.verse}>
                  {outlineSection ? (
                    <PassageOutlineDivider
                      bookName={bookName}
                      chapterNumber={chapter.chapterNumber}
                      section={outlineSection}
                    />
                  ) : null}
                  <VerseButton
                    index={index + 1}
                    verse={verse}
                    active={verse.verse === selectedVerse.verse}
                    expanded={expanded}
                    notesPanelId={notesPanelId}
                    compact={isCompactReader}
                    onSelect={(trigger) => selectVerse(verse, trigger)}
                  />
                  {expanded ? (
                    <section
                      id={notesPanelId}
                      className="mobile-verse-notes"
                      aria-label={`Study notes for ${verse.verse}`}
                    >
                      <div className="mobile-verse-notes-toolbar no-print">
                        <div className="reader-pane-kicker">
                          <List className="h-5 w-5" />
                          Study Notes
                        </div>
                        <FontScaleControls
                          label={`Study Notes text size controls for ${verse.verse}`}
                          decreaseLabel="Decrease Study Notes text size"
                          increaseLabel="Increase Study Notes text size"
                          onDecrease={() => setNotesLevel((value) => Math.max(NOTES_MIN_LEVEL, value - 1))}
                          onIncrease={() => setNotesLevel((value) => Math.min(NOTES_MAX_LEVEL, value + 1))}
                        />
                      </div>
                      <div className="mobile-verse-notes-body">
                        <VerseNotesArticle
                          verse={verse}
                          referencePreviews={referencePreviews}
                        />
                      </div>
                    </section>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="commentary-pane">
        <div className="reader-pane-toolbar reader-pane-toolbar-notes no-print">
          <div className="reader-pane-kicker">
            <List className="h-5 w-5" />
            Study Notes
          </div>
          <FontScaleControls
            label="Study Notes text size controls"
            decreaseLabel="Decrease Study Notes text size"
            increaseLabel="Increase Study Notes text size"
            onDecrease={() => setNotesLevel((value) => Math.max(NOTES_MIN_LEVEL, value - 1))}
            onIncrease={() => setNotesLevel((value) => Math.min(NOTES_MAX_LEVEL, value + 1))}
          />
        </div>
        <div className="commentary-pane-body">
          <div className="commentary-shell">
            <VerseNotesArticle
              verse={selectedVerse}
              referencePreviews={referencePreviews}
            />
          </div>
        </div>
      </aside>
    </section>
  );
}

function PassageOutlineDivider({
  bookName,
  chapterNumber,
  section
}: {
  bookName: string;
  chapterNumber: number;
  section: PublicChapterContent["outline"][number];
}) {
  return (
    <div className="passage-outline-divider" aria-label={`Passage outline: ${bookName} ${section.range}`}>
      <div className="passage-outline-range">{bookName} {section.range}</div>
      <div className="passage-outline-title">{section.title}</div>
      <span className="sr-only">Chapter {chapterNumber} passage section</span>
    </div>
  );
}

function FontScaleControls({
  label,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease
}: {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="reader-pane-controls" aria-label={label}>
      <button type="button" onClick={onDecrease} aria-label={decreaseLabel}>
        <Minus className="h-5 w-5" />
      </button>
      <button type="button" onClick={onIncrease} aria-label={increaseLabel}>
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function getVerseButtonElement(verse: string) {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[data-verse-id="${slugify(verse)}"]`);
}

function scrollVerseButtonIntoPane(verse: string, behavior: ScrollBehavior) {
  const target = getVerseButtonElement(verse);
  const pane = target?.closest<HTMLElement>(".scripture-pane-body");
  if (!target || !pane) return;

  const targetRect = target.getBoundingClientRect();
  const paneRect = pane.getBoundingClientRect();
  pane.scrollTo({
    top: pane.scrollTop + targetRect.top - paneRect.top - (pane.clientHeight - targetRect.height) / 2,
    behavior
  });
}

function VerseButton({
  index,
  verse,
  active,
  expanded,
  notesPanelId,
  compact,
  onSelect
}: {
  index: number;
  verse: PublicVerseEntry;
  active: boolean;
  expanded: boolean;
  notesPanelId: string;
  compact: boolean;
  onSelect: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <button
      data-verse-id={slugify(verse.verse)}
      className={active ? "scripture-card scripture-card-active" : "scripture-card"}
      aria-controls={compact && expanded ? notesPanelId : undefined}
      aria-expanded={compact ? expanded : undefined}
      onClick={(event) => onSelect(event.currentTarget)}
      type="button"
    >
      <span className="verse-number">{index}</span>
      <span className="verse-copy">
        {verse.bibleText || "Verse text unavailable."}
      </span>
      <ChevronDown className="verse-dropdown-icon" aria-hidden="true" />
    </button>
  );
}

function VerseNotesArticle({
  verse,
  referencePreviews
}: {
  verse: PublicVerseEntry;
  referencePreviews: ReferencePreviewMap;
}) {
  const hasDetailedExplanation = Boolean(verse.commentary.detailedExplanation.trim());

  return (
    <article className="exposition-card">
      <div className="exposition-card-heading">
        <h2>{verse.verse}</h2>
      </div>
      {hasDetailedExplanation ? (
        <DetailedExplanation value={verse.commentary.detailedExplanation} />
      ) : (
        <div className="commentary-blank-space" aria-label={`Blank study notes for ${verse.verse}`} />
      )}
      <VerseStudyCard
        key={verse.verse}
        crossReferences={verse.crossReferences}
        referencePreviews={referencePreviews}
        wordNotes={verse.wordNotes}
      />
    </article>
  );
}

function DetailedExplanation({ value }: { value: string }) {
  return (
    <div className="commentary-reading">
      {value.split("\n\n").map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
    </div>
  );
}

function VerseStudyCard({
  crossReferences,
  referencePreviews,
  wordNotes
}: {
  crossReferences: string[];
  referencePreviews: ReferencePreviewMap;
  wordNotes: PublicVerseEntry["wordNotes"];
}) {
  const hasReferences = crossReferences.length > 0;
  const hasWordNotes = wordNotes.length > 0;

  return (
    <section className="verse-study-card" aria-label="Cross references and word notes">
      <div className="verse-study-card-header">
        <Library className="h-4 w-4" />
        Study Links
      </div>
      {hasReferences || hasWordNotes ? (
        <div className="verse-study-grid">
          {hasReferences ? (
            <div className="study-card-section">
              <h3>Cross References</h3>
              <div className="reference-chip-list">
                {crossReferences.map((reference) => (
                  <ScriptureReferenceChip
                    className="reference-chip"
                    key={reference}
                    preview={referencePreviews[reference]!}
                    reference={reference}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {hasWordNotes ? (
            <div className="study-card-section study-card-section-wide">
              <h3>Word / Phrase Notes</h3>
              <div className="word-note-list">
                {wordNotes.map((note) => (
                  <article className="word-note" key={`${note.term}-${note.scriptureReferences.join("-")}`}>
                    <div className="word-note-title">{note.term}</div>
                    <p>{note.explanation}</p>
                    {note.scriptureReferences.length > 0 ? (
                      <div className="word-reference-list" aria-label={`${note.term} Scripture references`}>
                        {note.scriptureReferences.map((reference) => (
                          <ScriptureReferenceChip
                            className="word-reference-chip"
                            key={`${note.term}-${reference}`}
                            preview={referencePreviews[reference]!}
                            reference={reference}
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="study-card-empty">Study links are ready to be added for this verse.</p>
      )}
    </section>
  );
}

function parseReference(reference: string) {
  const match = reference.match(/(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const chapter = Number(match[1]);
  const verse = Number(match[2]);
  const endVerse = Number(match[3] ?? match[2]);
  if (!Number.isFinite(chapter) || !Number.isFinite(verse) || !Number.isFinite(endVerse)) return null;
  return { chapter, verse, startVerse: verse, endVerse };
}
