"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { EyeIcon, HeartIcon, Loader2Icon, MessageSquareIcon, SendIcon } from "lucide-react";
import { submitComment } from "@/lib/feedback-actions";

/**
 * View and like counters, and the private feedback form.
 *
 * The counters start from the server's numbers and correct themselves after
 * the browser reports in, so the page is never blank while waiting. Whether an
 * event is worth sending is decided here: a view once per article per day, a
 * like once, both remembered locally.
 */

const VIEW_KEY = "fiqhufoi.viewed.v1";
const LIKE_KEY = "fiqhufoi.liked.v1";

function readSet(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSet(key: string, value: Record<string, number>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("fiqhufoi:likes"));
  } catch {
    // Nothing here is important enough to interrupt reading.
  }
}

function subscribeLikes(fn: () => void): () => void {
  window.addEventListener("fiqhufoi:likes", fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener("fiqhufoi:likes", fn);
    window.removeEventListener("storage", fn);
  };
}

export function Engagement({
  slug,
  views,
  likes,
}: {
  slug: string;
  views: number;
  likes: number;
}) {
  const [counts, setCounts] = useState({ views, likes });
  const [busy, setBusy] = useState(false);

  // Whether this browser already liked the article. A boolean snapshot is
  // stable by value, so it needs no caching.
  const likedStored = useSyncExternalStore(
    subscribeLikes,
    () => !!readSet(LIKE_KEY)[slug],
    () => false
  );

  const [likedOverride, setLikedOverride] = useState<boolean | null>(null);
  const liked = likedOverride ?? likedStored;

  useEffect(() => {
    // One view per article per day from a given browser.
    const seen = readSet(VIEW_KEY);
    const today = new Date().toISOString().slice(0, 10);
    const stamp = Number(seen[slug] ?? 0);
    const todayStamp = Number(today.replace(/-/g, ""));
    if (stamp === todayStamp) return;

    let cancelled = false;
    fetch("/api/engagement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, action: "view" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        seen[slug] = todayStamp;
        writeSet(VIEW_KEY, seen);
        setCounts(data);
      })
      .catch(() => {
        // A blocked request just means this view is not counted.
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);

    const next = !liked;
    // Move the number straight away; correct it from the response.
    setLikedOverride(next);
    setCounts((c) => ({ ...c, likes: Math.max(0, c.likes + (next ? 1 : -1)) }));

    try {
      const res = await fetch("/api/engagement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, action: "like", delta: next ? 1 : -1 }),
      });
      if (res.ok) {
        setCounts(await res.json());
        const store = readSet(LIKE_KEY);
        if (next) store[slug] = 1;
        else delete store[slug];
        writeSet(LIKE_KEY, store);
        setLikedOverride(null);
      } else {
        setLikedOverride(!next);
      }
    } catch {
      setLikedOverride(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="text-faint-ink inline-flex items-center gap-1.5 text-[13px] leading-[1.8]"
        title="ބެލި ޢަދަދު"
      >
        <EyeIcon className="size-4" aria-hidden />
        <span className="font-arabic tabular-nums">{counts.views.toLocaleString("en")}</span>
      </span>

      <button
        type="button"
        onClick={toggleLike}
        disabled={busy}
        aria-pressed={liked}
        title={liked ? "ލައިކް ނަގާލައްވާ" : "ލައިކްކުރައްވާ"}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-[5px] border px-2.5 text-[13px] leading-[1.7] transition-colors ${
          liked
            ? "border-[#D9536F] bg-[#D9536F]/10 text-[#D9536F]"
            : "border-rule-soft text-muted-ink hover:border-rule-strong hover:text-ink"
        }`}
      >
        <HeartIcon className={`size-4 ${liked ? "fill-current" : ""}`} aria-hidden />
        <span className="font-arabic tabular-nums">{counts.likes.toLocaleString("en")}</span>
      </button>
    </div>
  );
}

/**
 * Feedback form.
 *
 * The reader is told plainly that this is not a public comment thread — the
 * entries go to the editors and nowhere else. Saying so is what makes the
 * absence of replies on the page make sense.
 */
export function CommentForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <div className="border-rule-soft bg-paper-4 rounded-[8px] border p-5 text-center">
        <p className="text-heading-ink text-[15px] leading-[1.9]">
          ޚިޔާލު ލިބިއްޖެ. ޝުކުރިއްޔާ.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-rule-soft text-muted-ink hover:border-rule-strong hover:text-ink inline-flex min-h-11 items-center gap-2 rounded-[6px] border px-4 text-[14px] leading-[1.8] transition-colors"
      >
        <MessageSquareIcon className="size-4" aria-hidden />
        އެޑިޓަރުންނަށް ޚިޔާލެއް ފޮނުއްވާ
      </button>
    );
  }

  return (
    <form
      className="border-rule-soft bg-paper-4 grid gap-3 rounded-[8px] border p-4"
      action={async (fd) => {
        setBusy(true);
        setError("");
        fd.set("slug", slug);
        const res = await submitComment(fd);
        setBusy(false);
        if (res.error) setError(res.error);
        else setSent(true);
      }}
    >
      <div>
        <h3 className="font-heading text-heading-ink text-[18px] leading-[1.6]">
          އެޑިޓަރުންނަށް ޚިޔާލެއް
        </h3>
        <p className="text-faint-ink mt-1 text-[12.5px] leading-[1.9]">
          މި ޚިޔާލު ވެބްސައިޓުގައި ޢާންމުކޮށް ނުދެއްކޭނެއެވެ. ފެންނާނީ ހަމައެކަނި އެޑިޓަރުންނަށެވެ.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          dir="rtl"
          placeholder="ނަން (ބޭނުމިއްޔާ)"
          maxLength={120}
          className="border-rule focus:border-brand text-ink min-h-11 rounded-[5px] border bg-transparent px-3 text-[14px] outline-none"
        />
        <input
          name="contact"
          dir="ltr"
          placeholder="އީމެއިލް ނުވަތަ ފޯނު (ބޭނުމިއްޔާ)"
          maxLength={160}
          className="border-rule focus:border-brand text-ink min-h-11 rounded-[5px] border bg-transparent px-3 text-start text-[14px] outline-none"
        />
      </div>

      <textarea
        name="body"
        dir="rtl"
        rows={4}
        required
        maxLength={4000}
        placeholder="ޚިޔާލު…"
        className="border-rule focus:border-brand text-ink rounded-[5px] border bg-transparent p-3 text-[14.5px] leading-[1.95] outline-none"
      />

      {/* Honeypot: hidden from readers, tempting to a bot. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
      />

      {error && <p className="text-[13.5px] leading-[1.8] text-[#C0392B]">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="border-brand bg-brand text-paper hover:bg-brand-deep hover:border-brand-deep inline-flex min-h-11 items-center gap-2 rounded-[5px] border px-5 text-[14.5px] leading-[1.7] transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <SendIcon className="size-4" aria-hidden />
          )}
          ފޮނުއްވާ
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-ink hover:text-ink min-h-11 px-3 text-[14px] transition-colors"
        >
          ބާޠިލު
        </button>
      </div>
    </form>
  );
}
