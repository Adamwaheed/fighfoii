"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BookmarkIcon,
  CheckIcon,
  LinkIcon,
  SendIcon,
  Share2Icon,
} from "lucide-react";
import {
  isBookmarked as readBookmarked,
  toggleBookmark,
  subscribeBookmarks,
  type BookmarkSeed,
} from "@/lib/bookmarks";

/**
 * Appends a citation whenever article text is copied.
 *
 * Readers quote these articles elsewhere, and a bare paste loses where it came
 * from. The copied selection is preserved verbatim and the attribution is added
 * beneath it, so nothing the reader chose is altered.
 */
export function CopyCitation({
  title,
  author,
  published,
  url,
  siteName,
}: {
  title: string;
  author: string;
  published: string;
  url: string;
  siteName: string;
}) {
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;

      const text = sel.toString();
      // Very short selections are usually a word being looked up, not a quote.
      if (text.trim().length < 60) return;

      const parts = [title, author, published, siteName, url].filter(Boolean);
      const citation = `\n\n— ${parts.join(" · ")}`;

      e.clipboardData?.setData("text/plain", text + citation);

      // Keep the rich-text flavour usable too, with the citation as a footer.
      const html = document.createElement("div");
      html.appendChild(sel.getRangeAt(0).cloneContents());
      e.clipboardData?.setData(
        "text/html",
        `${html.innerHTML}<p>— ${parts
          .slice(0, -1)
          .join(" · ")} · <a href="${url}">${url}</a></p>`
      );

      e.preventDefault();
    };

    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [title, author, published, url, siteName]);

  return null;
}

/**
 * Highlights the words that brought the reader here.
 *
 * Uses the CSS Custom Highlight API so no nodes are inserted into the article —
 * the same approach as the book reader's marks, and for the same reason: the
 * rendered text stays React's alone.
 */
export function SearchHighlight({ query }: { query: string }) {
  useEffect(() => {
    const terms = query
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    if (!terms.length || !CSS?.highlights || typeof Highlight === "undefined") return;

    const article = document.querySelector("[data-article-body]");
    if (!article) return;

    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const ranges: Range[] = [];

    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n as Text).data;
      const haystack = text.toLowerCase();

      for (const term of terms) {
        const needle = term.toLowerCase();
        let from = haystack.indexOf(needle);
        while (from !== -1) {
          const r = document.createRange();
          r.setStart(n, from);
          r.setEnd(n, from + needle.length);
          ranges.push(r);
          from = haystack.indexOf(needle, from + needle.length);
        }
      }
    }

    if (!ranges.length) return;
    CSS.highlights.set("fq-search", new Highlight(...ranges));

    // Bring the first match into view, below the sticky header.
    const rect = ranges[0].getBoundingClientRect();
    if (rect.top < 120 || rect.top > window.innerHeight - 120) {
      window.scrollTo({ top: window.scrollY + rect.top - 160, behavior: "smooth" });
    }

    return () => {
      CSS.highlights.delete("fq-search");
    };
  }, [query]);

  return null;
}

/** Share row: the channels these readers actually use, plus a link copier. */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission denied — the address bar still has the link.
    }
  }, [url]);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled by the reader; fall through to copying.
      }
    }
    copy();
  };

  const enc = encodeURIComponent;
  const targets = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${title} ${url}`)}`,
      className: "hover:bg-[#25D366] hover:border-[#25D366] hover:text-white",
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
      className: "hover:bg-[#229ED9] hover:border-[#229ED9] hover:text-white",
    },
    {
      label: "Viber",
      href: `viber://forward?text=${enc(`${title} ${url}`)}`,
      className: "hover:bg-[#7360F2] hover:border-[#7360F2] hover:text-white",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      className: "hover:bg-[#1877F2] hover:border-[#1877F2] hover:text-white",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-faint-ink me-1 text-[12.5px] leading-[1.9]">ޙިއްޞާކުރައްވާ</span>

      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`border-rule-soft text-muted-ink inline-flex min-h-9 items-center rounded-[5px] border px-2.5 text-[12.5px] leading-[1.7] transition-colors ${t.className}`}
        >
          {t.label}
        </a>
      ))}

      <button
        type="button"
        onClick={copy}
        aria-label="ލިންކު ކޮޕީކުރައްވާ"
        title="ލިންކު ކޮޕީކުރައްވާ"
        className="border-rule-soft text-muted-ink hover:border-rule-strong hover:text-ink inline-flex size-9 items-center justify-center rounded-[5px] border transition-colors"
      >
        {copied ? (
          <CheckIcon className="size-4 text-[#1F9D55]" aria-hidden />
        ) : (
          <LinkIcon className="size-4" aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={share}
        aria-label="ޙިއްޞާކުރައްވާ"
        title="ޙިއްޞާކުރައްވާ"
        className="border-rule-soft text-muted-ink hover:border-rule-strong hover:text-ink inline-flex size-9 items-center justify-center rounded-[5px] border transition-colors sm:hidden"
      >
        <Share2Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Bookmark switch. Stored per browser — the site has no reader accounts. */
export function BookmarkButton({ seed }: { seed: BookmarkSeed }) {
  // A boolean snapshot is stable by value, so it needs no caching.
  const on = useSyncExternalStore(
    subscribeBookmarks,
    () => readBookmarked(seed.slug),
    () => false
  );

  return (
    <button
      type="button"
      onClick={() => toggleBookmark(seed)}
      aria-pressed={on}
      title={on ? "ރައްކާކުރެވިފައި" : "ފަހުން ކިޔުއްވުމަށް ރައްކާކުރައްވާ"}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12.5px] leading-[1.7] transition-colors ${
        on
          ? "border-brand bg-brand/10 text-brand"
          : "border-rule-soft text-muted-ink hover:border-rule-strong hover:text-ink"
      }`}
    >
      <BookmarkIcon
        className={`size-4 ${on ? "fill-current" : ""}`}
        aria-hidden
      />
      {on ? "ރައްކާކުރެވިފައި" : "ރައްކާކުރައްވާ"}
    </button>
  );
}

/** Small helper used by the Q&A prompt at the foot of an article. */
export function AskLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="text-brand hover:text-brand-deep inline-flex items-center gap-1.5 text-[14px] leading-[1.8] transition-colors"
    >
      <SendIcon className="size-4" aria-hidden />
      ސުވާލެއް ފޮނުއްވާ
    </a>
  );
}
