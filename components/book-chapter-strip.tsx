"use client";

import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  READER_VERSE_CHANGE_EVENT,
  type ReaderVerseEventDetail
} from "@/lib/reader-events";
import { slugify } from "@/lib/utils";

type BookChapterStripProps = {
  activeChapter: number;
  bookSlug: string;
  bookName: string;
  chapterCount: number;
  verseCounts: readonly number[];
};

type RecentReference = {
  chapter: number;
  verse: number;
};

type OpenMenu = "picker" | "recent" | "all" | null;
type PickerView = "chapters" | "verses";

const MAX_RECENT_REFERENCES = 8;

export function BookChapterStrip({
  activeChapter,
  bookSlug,
  bookName,
  chapterCount,
  verseCounts
}: BookChapterStripProps) {
  const navigatorRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [compactReference, setCompactReference] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [inputValue, setInputValue] = useState(() => formatReference(bookName, activeChapter, 1));
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [pickerView, setPickerView] = useState<PickerView>("chapters");
  const [pickerChapter, setPickerChapter] = useState(activeChapter);
  const [pickerVerse, setPickerVerse] = useState(1);
  const [recentReferences, setRecentReferences] = useState<RecentReference[]>([]);
  const storageKey = `${bookSlug}RecentReferences`;
  const inputBookName = compactReference ? abbreviateBookName(bookName) : bookName;

  const isValidReference = useCallback(
    (chapter: number, verse: number) =>
      Number.isInteger(chapter) &&
      Number.isInteger(verse) &&
      chapter >= 1 &&
      chapter <= chapterCount &&
      verse >= 1 &&
      verse <= (verseCounts[chapter - 1] ?? 0),
    [chapterCount, verseCounts]
  );

  const readRecentReferences = useCallback(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (!Array.isArray(stored)) return [];

      return stored
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const reference = item as Partial<RecentReference>;
          return { chapter: Number(reference.chapter), verse: Number(reference.verse) };
        })
        .filter(
          (reference): reference is RecentReference =>
            reference !== null && isValidReference(reference.chapter, reference.verse)
        )
        .slice(0, MAX_RECENT_REFERENCES);
    } catch {
      return [];
    }
  }, [isValidReference, storageKey]);

  const addRecentReference = useCallback(
    (chapter: number, verse: number) => {
      if (!isValidReference(chapter, verse)) return;

      const updated = [
        { chapter, verse },
        ...readRecentReferences().filter(
          (reference) => reference.chapter !== chapter || reference.verse !== verse
        )
      ].slice(0, MAX_RECENT_REFERENCES);

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    },
    [isValidReference, readRecentReferences, storageKey]
  );

  const selectReference = useCallback(
    (chapter: number, verse: number) => {
      if (!isValidReference(chapter, verse)) return;

      addRecentReference(chapter, verse);
      setOpenMenu(null);

      if (chapter !== activeChapter) {
        window.location.assign(`/${bookSlug}/${chapter}/#v${verse}`);
        return;
      }

      setSelectedVerse(verse);
      setInputValue(formatReference(inputBookName, chapter, verse));
      window.history.replaceState(null, "", `#v${verse}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.requestAnimationFrame(() => {
        scrollVerseButtonIntoPane(bookName, chapter, verse, "smooth");
      });
    },
    [activeChapter, addRecentReference, bookSlug, inputBookName, isValidReference]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const syncWidth = () => setCompactReference(mediaQuery.matches);

    syncWidth();
    mediaQuery.addEventListener("change", syncWidth);
    return () => mediaQuery.removeEventListener("change", syncWidth);
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const hashVerse = verseFromHash(window.location.hash, activeChapter);
      const verse = hashVerse && isValidReference(activeChapter, hashVerse) ? hashVerse : 1;
      setSelectedVerse(verse);
      setInputValue(formatReference(inputBookName, activeChapter, verse));
    };

    const syncFromReader = (event: Event) => {
      const { detail } = event as CustomEvent<ReaderVerseEventDetail>;
      if (
        !detail ||
        detail.bookName !== bookName ||
        detail.chapter !== activeChapter ||
        !isValidReference(detail.chapter, detail.verse)
      ) {
        return;
      }

      setSelectedVerse(detail.verse);
      setInputValue(formatReference(inputBookName, detail.chapter, detail.verse));
      addRecentReference(detail.chapter, detail.verse);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener(READER_VERSE_CHANGE_EVENT, syncFromReader);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener(READER_VERSE_CHANGE_EVENT, syncFromReader);
    };
  }, [activeChapter, addRecentReference, bookName, inputBookName, isValidReference, readRecentReferences]);

  useEffect(() => {
    addRecentReference(activeChapter, selectedVerse);
  }, [activeChapter, addRecentReference, selectedVerse]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const navigator = navigatorRef.current;
      if (navigator && !event.composedPath().includes(navigator)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("click", closeMenus);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenus);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function showPicker() {
    if (openMenu === "picker") return;
    setPickerChapter(activeChapter);
    setPickerVerse(selectedVerse);
    setPickerView("chapters");
    setOpenMenu("picker");
  }

  function togglePicker() {
    if (openMenu === "picker") {
      setOpenMenu(null);
      return;
    }
    showPicker();
  }

  function choosePickerChapter(chapter: number) {
    setPickerChapter(chapter);
    setPickerVerse(chapter === activeChapter ? selectedVerse : 1);
    setPickerView("verses");
  }

  function submitReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reference = parseReference(inputValue, bookName, activeChapter);
    if (reference && isValidReference(reference.chapter, reference.verse)) {
      selectReference(reference.chapter, reference.verse);
      return;
    }

    setInputValue(formatReference(inputBookName, activeChapter, selectedVerse));
  }

  const previousChapter = activeChapter > 1 ? activeChapter - 1 : null;
  const nextChapter = activeChapter < chapterCount ? activeChapter + 1 : null;
  const pickerItems = Array.from(
    { length: pickerView === "chapters" ? chapterCount : verseCounts[pickerChapter - 1] ?? 0 },
    (_, index) => index + 1
  );

  return (
    <nav
      ref={navigatorRef}
      className="mbe-ref-strip no-print"
      aria-label={`${bookName} reference navigation`}
    >
      <div className="mbe-ref-nav">
        {previousChapter ? (
          <a
            className="mbe-ref-step"
            href={`/${bookSlug}/${previousChapter}/`}
            aria-label="Previous chapter"
            title="Previous chapter"
          >
            <ArrowLeft className="mbe-ref-icon" aria-hidden="true" />
          </a>
        ) : (
          <span className="mbe-ref-step mbe-ref-disabled" aria-hidden="true">
            <ArrowLeft className="mbe-ref-icon" />
          </span>
        )}

        <form className="mbe-ref-form" onSubmit={submitReference}>
          <button
            className="mbe-ref-picker-toggle"
            type="button"
            aria-label={`Choose ${bookName} chapter and verse`}
            title="Choose chapter and verse"
            aria-expanded={openMenu === "picker"}
            aria-controls={`${bookSlug}-reference-picker`}
            onClick={togglePicker}
          >
            <span className="mbe-ref-badge">KJV</span>
            <ChevronDown className="mbe-ref-icon" aria-hidden="true" />
          </button>
          <input
            ref={inputRef}
            className="mbe-ref-input"
            type="search"
            inputMode="text"
            autoComplete="off"
            value={inputValue}
            aria-label="Type a verse reference"
            onChange={(event) => setInputValue(event.target.value)}
            onClick={showPicker}
            onFocus={() => inputRef.current?.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div
            id={`${bookSlug}-reference-picker`}
            className="mbe-ref-picker"
            role="dialog"
            aria-label={`Choose a chapter and verse in ${bookName}`}
            hidden={openMenu !== "picker"}
          >
            <div className="mbe-ref-picker-head">
              <button
                className="mbe-ref-back"
                type="button"
                aria-label="Back to chapter selection"
                hidden={pickerView === "chapters"}
                onClick={() => setPickerView("chapters")}
              >
                <ArrowLeft className="mbe-ref-icon" aria-hidden="true" />
              </button>
              <strong className="mbe-ref-picker-title">
                {pickerView === "chapters" ? bookName : `${bookName} ${pickerChapter}`}
              </strong>
              <button
                className="mbe-ref-go"
                type="button"
                onClick={() => selectReference(pickerChapter, pickerVerse)}
              >
                Go
              </button>
              <button
                className="mbe-ref-close"
                type="button"
                aria-label="Close verse picker"
                onClick={() => setOpenMenu(null)}
              >
                &times;
              </button>
            </div>
            <div
              className="mbe-ref-grid"
              role="group"
              aria-label={
                pickerView === "chapters"
                  ? `Choose a ${bookName} chapter`
                  : `Choose a verse in ${bookName} ${pickerChapter}`
              }
            >
              {pickerItems.map((item) => {
                const isActive =
                  pickerView === "chapters" ? item === pickerChapter : item === pickerVerse;
                return (
                  <button
                    className={isActive ? "is-active" : undefined}
                    type="button"
                    key={`${pickerView}-${item}`}
                    aria-pressed={isActive}
                    aria-label={
                      pickerView === "chapters"
                        ? `${bookName} chapter ${item}`
                        : `${bookName} ${pickerChapter}:${item}`
                    }
                    onClick={() => {
                      if (pickerView === "chapters") choosePickerChapter(item);
                      else selectReference(pickerChapter, item);
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        <div className="mbe-ref-menu-wrap">
          <button
            className="mbe-ref-recent-toggle"
            type="button"
            aria-expanded={openMenu === "recent"}
            onClick={() => {
              setRecentReferences(readRecentReferences());
              setOpenMenu((current) => (current === "recent" ? null : "recent"));
            }}
          >
            Recent
            <ChevronDown className="mbe-ref-icon" aria-hidden="true" />
          </button>
          <div className="mbe-ref-recent-dropdown" hidden={openMenu !== "recent"}>
            <div className="mbe-ref-recent-list">
              {recentReferences.length ? (
                recentReferences.map((reference) => (
                  <button
                    type="button"
                    key={`${reference.chapter}-${reference.verse}`}
                    onClick={() => selectReference(reference.chapter, reference.verse)}
                  >
                    {formatReference(bookName, reference.chapter, reference.verse)}
                  </button>
                ))
              ) : (
                <p className="mbe-ref-empty">No recent verses yet.</p>
              )}
            </div>
          </div>
        </div>

        {nextChapter ? (
          <a
            className="mbe-ref-step"
            href={`/${bookSlug}/${nextChapter}/`}
            aria-label="Next chapter"
            title="Next chapter"
          >
            <ArrowRight className="mbe-ref-icon" aria-hidden="true" />
          </a>
        ) : (
          <span className="mbe-ref-step mbe-ref-disabled" aria-hidden="true">
            <ArrowRight className="mbe-ref-icon" />
          </span>
        )}

        <div className="mbe-ref-menu-wrap">
          <button
            className="mbe-ref-all-toggle"
            type="button"
            aria-expanded={openMenu === "all"}
            onClick={() => setOpenMenu((current) => (current === "all" ? null : "all"))}
          >
            All
          </button>
          <div className="mbe-ref-all-dropdown" hidden={openMenu !== "all"}>
            <div className="mbe-ref-grid">
              {Array.from({ length: chapterCount }, (_, index) => index + 1).map((chapter) => (
                <button
                  className={chapter === activeChapter ? "is-active" : undefined}
                  type="button"
                  key={chapter}
                  onClick={() => {
                    setOpenMenu(null);
                    window.location.assign(`/${bookSlug}/${chapter}/`);
                  }}
                >
                  {chapter}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function formatReference(bookName: string, chapter: number, verse: number) {
  return `${bookName} ${chapter}:${verse}`;
}

function abbreviateBookName(bookName: string) {
  const abbreviations: Record<string, string> = {"Titus":"Titus"};
  return abbreviations[bookName] ?? bookName;
}

function getVerseButtonElement(bookName: string, chapter: number, verse: number) {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[data-verse-id="${slugify(formatReference(bookName, chapter, verse))}"]`);
}

function scrollVerseButtonIntoPane(bookName: string, chapter: number, verse: number, behavior: ScrollBehavior) {
  const target = getVerseButtonElement(bookName, chapter, verse);
  const pane = target?.closest<HTMLElement>(".scripture-pane-body");
  if (!target || !pane) return;

  const targetRect = target.getBoundingClientRect();
  const paneRect = pane.getBoundingClientRect();
  pane.scrollTo({
    top: pane.scrollTop + targetRect.top - paneRect.top - (pane.clientHeight - targetRect.height) / 2,
    behavior
  });
}

function verseFromHash(hash: string, currentChapter: number) {
  const simple = hash.match(/^#v-?(\d+)$/);
  if (simple) return Number(simple[1]);

  const full = hash.match(/-(\d+)-(\d+)$/);
  if (!full || Number(full[1]) !== currentChapter) return null;
  return Number(full[2]);
}

function parseReference(raw: string, bookName: string, currentChapter: number) {
  const escapedBook = bookName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAbbreviation = abbreviateBookName(bookName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(new RegExp(`^${escapedBook.toLowerCase()}\\s+`), "")
    .replace(new RegExp(`^${escapedAbbreviation.toLowerCase()}\\s+`), "")
    .replace(/^chapter\s+/, "")
    .replace(/^ch\.?\s+/, "")
    .replace(/^verse\s+/, "")
    .replace(/^v\.?\s*/, "");
  const full = value.match(/^(\d{1,2})\s*[:.]\s*(\d{1,3})$/) ?? value.match(/^(\d{1,2})\s+(\d{1,3})$/);
  const single = value.match(/^(\d{1,3})$/);

  if (full) return { chapter: Number(full[1]), verse: Number(full[2]) };
  if (single) return { chapter: currentChapter, verse: Number(single[1]) };
  return null;
}
