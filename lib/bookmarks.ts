"use client";

/**
 * Saved articles.
 *
 * The site deliberately has no public sign-up — accounts exist only for
 * editors — so bookmarks live in the reader's own browser. Enough of each
 * article is stored alongside the slug to render the list without a round trip,
 * which also means a saved item still shows something if the article moves.
 */

const KEY = "fiqhufoi.bookmarks.v1";

export interface BookmarkSeed {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  categoryName: string;
}

export interface Bookmark extends BookmarkSeed {
  savedAt: number;
}

function read(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed as Bookmark[]).filter((b) => b && typeof b.slug === "string")
      : [];
  } catch {
    return [];
  }
}

function write(list: Bookmark[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("fiqhufoi:bookmarks"));
  } catch {
    // Out of quota: the article is still readable, only the save is lost.
  }
}

export function listBookmarks(): Bookmark[] {
  return read().sort((a, b) => b.savedAt - a.savedAt);
}

export function isBookmarked(slug: string): boolean {
  return read().some((b) => b.slug === slug);
}

/** Adds or removes, returning the state it landed in. */
export function toggleBookmark(seed: BookmarkSeed): boolean {
  const list = read();
  const at = list.findIndex((b) => b.slug === seed.slug);

  if (at !== -1) {
    list.splice(at, 1);
    write(list);
    return false;
  }

  list.push({ ...seed, savedAt: Date.now() });
  write(list);
  return true;
}

export function removeBookmark(slug: string) {
  write(read().filter((b) => b.slug !== slug));
}

export function subscribeBookmarks(fn: () => void): () => void {
  window.addEventListener("fiqhufoi:bookmarks", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("fiqhufoi:bookmarks", fn);
    window.removeEventListener("storage", fn);
  };
}
