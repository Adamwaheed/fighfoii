"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, FileText, BookOpen, BookMarked } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useThaanaKeyboard } from "@/hooks/use-thaana-keyboard";

interface Hit {
  kind: "article" | "book" | "page";
  title: string;
  label: string;
  url: string;
  snippet: { before: string; match: string; after: string } | null;
}

const KIND_META = {
  article: { icon: FileText, label: "ލިޔުން" },
  book: { icon: BookOpen, label: "ފޮތް" },
  page: { icon: BookMarked, label: "ޞަފުޙާ" },
} as const;

/**
 * Site-wide search: a full-screen dialog with results underneath the field.
 *
 * The field types Thaana by default — this is a Dhivehi site, and the phonetic
 * mapping is what a reader expects — but it can be switched off to type Arabic
 * or Latin, which the index also covers.
 */
export function SiteSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [thaana, setThaana] = useState(true);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);

  const { onKeyDown: onThaanaKey } = useThaanaKeyboard({
    enabled: thaana,
    value: query,
    setValue: setQuery,
    textareaRef: inputRef,
  });

  // ⌘K / Ctrl+K from anywhere on the site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced so a fast typist issues one request per pause, not per keystroke;
  // the abort keeps a slow earlier response from overwriting a newer one.
  useEffect(() => {
    const term = query.trim();
    // Too short to search — the results below are derived from `term`, so
    // nothing needs clearing here.
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { hits: Hit[] };
        setHits(data.hits);
        setCursor(0);
      } catch {
        // An aborted request is the normal case here, not a failure.
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const go = useCallback(
    (url: string) => {
      // Carry the query through, so the article can highlight what was sought.
      const q = query.trim();
      if (q && url.startsWith("/article/") && !url.includes("?")) {
        url = `${url}?q=${encodeURIComponent(q)}`;
      }
      setOpen(false);
      router.push(url);
    },
    [router, query]
  );

  const onFieldKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
      return;
    }
    if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor].url);
      return;
    }
    onThaanaKey(e);
  };

  const term = query.trim();
  // Derived rather than stored, so a query shrinking below the threshold hides
  // the previous results without an effect writing state.
  const results = term.length >= 2 ? hits : [];
  const loading = term.length >= 2 && busy;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ހޯއްދަވާ"
        className="text-muted-ink border-rule hover:border-rule-strong hover:bg-paper-2 focus-visible:ring-brand/40 inline-flex min-h-11 items-center gap-2 rounded-[3px] border px-3.5 text-[14.5px] leading-[1.7] transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Search className="size-[18px]" aria-hidden />
        <span className="hidden sm:inline">ހޯއްދަވާ</span>
        <kbd className="border-rule text-faint-ink ms-1 hidden rounded-[3px] border px-1.5 py-0.5 font-sans text-[11px] lg:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="bg-paper inset-0 flex h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 ring-0 sm:max-w-none rtl:translate-x-0"
        >
          <DialogTitle className="sr-only">ހޯއްދަވާ</DialogTitle>

          <div className="border-rule bg-paper/95 border-b backdrop-blur-sm">
            <div className="mx-auto flex max-w-[840px] items-center gap-2.5 px-5 py-3.5">
              <Search className="text-brand-accent size-5 flex-none" aria-hidden />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onFieldKey}
                placeholder="ލިޔުންތަކާއި ފޮތްތަކުން ހޯއްދަވާ…"
                dir="rtl"
                className="text-ink placeholder:text-faint-ink min-w-0 flex-1 bg-transparent py-2 text-[18px] leading-[1.9] outline-none"
              />

              {/* Off for Arabic or Latin; the index holds both. */}
              <button
                type="button"
                onClick={() => {
                  setThaana((v) => !v);
                  inputRef.current?.focus();
                }}
                aria-pressed={thaana}
                title={thaana ? "ދިވެހި ކީބޯޑް ދިރި" : "ދިވެހި ކީބޯޑް ނިވި"}
                className={`min-h-9 flex-none rounded-[3px] border px-2.5 text-[13px] leading-[1.7] transition-colors ${
                  thaana
                    ? "border-brand bg-brand text-paper"
                    : "border-rule text-muted-ink hover:bg-paper-2"
                }`}
              >
                ދިވެހި
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ބަންދުކުރައްވާ"
                className="text-muted-ink hover:bg-paper-2 hover:text-ink inline-flex size-9 flex-none items-center justify-center rounded-[3px] transition-colors"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[840px] px-5 py-5">
              {term.length < 2 ? (
                <p className="text-faint-ink py-16 text-center text-[15px] leading-[2]">
                  ލިޔުންތަކާއި ފޮތްތަކުގެ ތެރެއިން ހޯއްދެވުމަށް ލިޔުއްވާ
                </p>
              ) : loading && !results.length ? (
                <div className="text-faint-ink flex justify-center py-16">
                  <Loader2 className="size-6 animate-spin" aria-hidden />
                </div>
              ) : !results.length ? (
                <p className="text-faint-ink py-16 text-center text-[15px] leading-[2]">
                  ނަތީޖާއެއް ނުފެނުނު
                </p>
              ) : (
                <>
                  <div className="text-faint-ink mb-3 text-[12.5px] leading-[1.9]">
                    {results.length} ނަތީޖާ
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {results.map((hit, i) => {
                      const meta = KIND_META[hit.kind];
                      const Icon = meta.icon;
                      return (
                        <li key={`${hit.url}-${i}`}>
                          <button
                            type="button"
                            onClick={() => go(hit.url)}
                            onMouseEnter={() => setCursor(i)}
                            className={`border-rule-soft flex w-full gap-3 rounded-[5px] border p-3.5 text-start transition-colors ${
                              i === cursor ? "border-rule-strong bg-paper-2" : "hover:bg-paper-2"
                            }`}
                          >
                            <Icon
                              className="text-brand-accent mt-1 size-[18px] flex-none"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="mb-1 flex flex-wrap items-baseline gap-2">
                                <span className="text-heading-ink text-[17px] leading-[1.7] font-semibold">
                                  {hit.title}
                                </span>
                                <span className="text-faint-ink text-[12px] leading-[1.8]">
                                  {meta.label} · {hit.label}
                                </span>
                              </span>
                              {hit.snippet && (
                                <span className="text-article-ink block text-[14.5px] leading-[2]">
                                  {hit.snippet.before}
                                  <mark className="bg-brand-accent-soft text-ink rounded-[2px] px-0.5">
                                    {hit.snippet.match}
                                  </mark>
                                  {hit.snippet.after}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
