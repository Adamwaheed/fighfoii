"use client";

/**
 * Reading state kept in the browser: where the reader got to, and the passages
 * they marked up.
 *
 * There are no reader accounts, so this is localStorage and nothing else. That
 * shapes two decisions: everything is namespaced under one versioned key so a
 * future schema change can be migrated or dropped cleanly, and every read is
 * defensive — a hand-edited or truncated value must not take the page down.
 */

const KEY = "fiqhufoi.reader.v1";

export const HIGHLIGHT_COLORS = ["yellow", "blue", "green", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export interface Mark {
  id: string;
  page: number;
  /** page_blocks.id — the anchor survives re-ordering of other blocks. */
  blockId: number;
  /** Character offsets within that block's text content. */
  start: number;
  end: number;
  /** The marked text, so a note is still meaningful if the block is edited. */
  text: string;
  color: HighlightColor;
  note: string;
  createdAt: number;
}

export interface BookState {
  page: number;
  updatedAt: number;
  marks: Mark[];
}

type Store = Record<string, BookState>;

const EMPTY: BookState = { page: 0, updatedAt: 0, marks: [] };

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    // Same-tab listeners; the native `storage` event only fires for other tabs.
    window.dispatchEvent(new CustomEvent("fiqhufoi:reader"));
  } catch {
    // A full or disabled localStorage must not break reading.
  }
}

export function getBookState(slug: string): BookState {
  const s = readStore()[slug];
  if (!s) return EMPTY;
  return {
    page: typeof s.page === "number" ? s.page : 0,
    updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : 0,
    marks: Array.isArray(s.marks) ? s.marks.filter(isMark) : [],
  };
}

function isMark(m: unknown): m is Mark {
  const v = m as Mark;
  return (
    !!v &&
    typeof v.id === "string" &&
    typeof v.blockId === "number" &&
    typeof v.start === "number" &&
    typeof v.end === "number" &&
    v.end > v.start
  );
}

function update(slug: string, fn: (state: BookState) => BookState) {
  const store = readStore();
  store[slug] = fn(store[slug] ?? EMPTY);
  writeStore(store);
}

/** Records the furthest-read position. Called as the reader moves between pages. */
export function saveProgress(slug: string, page: number) {
  update(slug, (s) => ({ ...s, page, updatedAt: Date.now() }));
}

export function addMark(slug: string, mark: Mark) {
  update(slug, (s) => ({ ...s, marks: [...s.marks, mark] }));
}

export function updateMark(slug: string, id: string, patch: Partial<Mark>) {
  update(slug, (s) => ({
    ...s,
    marks: s.marks.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  }));
}

export function removeMark(slug: string, id: string) {
  update(slug, (s) => ({ ...s, marks: s.marks.filter((m) => m.id !== id) }));
}

/** Books the reader has opened, most recent first — for a "continue" shelf. */
export function recentBooks(): { slug: string; page: number; updatedAt: number }[] {
  return Object.entries(readStore())
    .filter(([, s]) => s?.updatedAt)
    .map(([slug, s]) => ({ slug, page: s.page, updatedAt: s.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function subscribe(fn: () => void): () => void {
  window.addEventListener("fiqhufoi:reader", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("fiqhufoi:reader", fn);
    window.removeEventListener("storage", fn);
  };
}

export function newId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
