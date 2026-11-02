"use client";

/**
 * Reader preferences: theme and body text size.
 *
 * Kept in localStorage under one key and applied to <html> as a class and a
 * CSS variable, so the whole site follows without prop-drilling. The same key
 * is read by the inline boot script in the layout, which must run before paint
 * to avoid a flash of the wrong theme.
 */

export const PREFS_KEY = "fiqhufoi.prefs.v1";

export type Theme = "light" | "dark";

export interface Prefs {
  theme: Theme;
  /** Percentage applied to article body text; 100 is the design default. */
  fontScale: number;
}

export const DEFAULT_PREFS: Prefs = { theme: "light", fontScale: 100 };

export const FONT_MIN = 85;
export const FONT_MAX = 145;
export const FONT_STEP = 10;

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      theme: p.theme === "dark" ? "dark" : "light",
      fontScale:
        typeof p.fontScale === "number"
          ? Math.min(Math.max(p.fontScale, FONT_MIN), FONT_MAX)
          : DEFAULT_PREFS.fontScale,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("fiqhufoi:prefs"));
  } catch {
    // Private browsing or a full quota must not break the controls.
  }
  applyPrefs(prefs);
}

/** Writes the preferences onto <html>. Shared with the boot script. */
export function applyPrefs(prefs: Prefs) {
  const root = document.documentElement;
  root.classList.toggle("dark", prefs.theme === "dark");
  root.style.setProperty("--reader-scale", String(prefs.fontScale / 100));
  root.style.colorScheme = prefs.theme;
}

/**
 * Cached snapshot for useSyncExternalStore.
 *
 * That hook compares snapshots by identity and re-renders until two agree, so
 * returning a freshly parsed object every call would loop forever. The cache is
 * rebuilt only when the stored string actually changes.
 */
let cached: Prefs = DEFAULT_PREFS;
let cachedRaw: string | null = null;

export function getPrefsSnapshot(): Prefs {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PREFS_KEY);
  } catch {
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = readPrefs();
  }
  return cached;
}

/** Server render has no storage, so it always sees the defaults. */
export function getPrefsServerSnapshot(): Prefs {
  return DEFAULT_PREFS;
}

export function subscribePrefs(fn: () => void): () => void {
  window.addEventListener("fiqhufoi:prefs", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("fiqhufoi:prefs", fn);
    window.removeEventListener("storage", fn);
  };
}

/**
 * Runs before first paint, inlined into the document.
 *
 * Written as a string rather than imported: it must execute synchronously in
 * <head>, before React loads, or the page paints light and then flips.
 */
export const BOOT_SCRIPT = `
(function(){
  try {
    var p = JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)}) || "{}");
    var root = document.documentElement;
    if (p.theme === "dark") { root.classList.add("dark"); root.style.colorScheme = "dark"; }
    if (typeof p.fontScale === "number") {
      root.style.setProperty("--reader-scale", String(p.fontScale / 100));
    }
  } catch (e) {}
})();
`;
