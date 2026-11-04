export const READER_SELECT_VERSE_EVENT = "mbe:reader-select-verse";
export const READER_VERSE_CHANGE_EVENT = "mbe:reader-verse-change";

export type ReaderVerseEventDetail = {
  bookName: string;
  chapter: number;
  verse: number;
};
