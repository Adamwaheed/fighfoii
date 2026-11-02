import "server-only";
import { parse, type HTMLElement as ParsedElement } from "node-html-parser";
import type { BlockType } from "./types";

export interface ImportedBlock {
  type: BlockType;
  main: string;
  sub: string;
  ref: string;
  level: number;
  image: string;
}

export interface ImportedArticle {
  sourceId: number;
  sourceUrl: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
  cover: string;
  blocks: ImportedBlock[];
}

const block = (type: BlockType, main: string, extra: Partial<ImportedBlock> = {}): ImportedBlock => ({
  type,
  main,
  sub: "",
  ref: "",
  level: 1,
  image: "",
  ...extra,
});

/** Decodes entities and collapses the whitespace WordPress leaves behind. */
function text(el: ParsedElement): string {
  return el.textContent
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/**
 * Turns rendered WordPress HTML into editor blocks.
 *
 * Structure is mapped faithfully; semantics are not guessed. A paragraph of
 * Arabic could be a Qur'anic ayah or an ordinary quotation, and mislabelling
 * scripture is worse than leaving it as text for a human to classify.
 */
export function htmlToBlocks(html: string): ImportedBlock[] {
  const root = parse(html, { blockTextElements: { script: false, style: false } });
  const out: ImportedBlock[] = [];

  const walk = (node: ParsedElement) => {
    for (const child of node.childNodes) {
      const el = child as ParsedElement;
      if (!el.tagName) continue;
      const tag = el.tagName.toLowerCase();
      const content = text(el);

      switch (tag) {
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5": {
          if (content) {
            const level = Math.min(Math.max(Number(tag[1]) - 1, 1), 4);
            out.push(block("heading", content, { level }));
          }
          break;
        }

        case "p": {
          const img = el.querySelector("img");
          if (img) {
            const src = img.getAttribute("src") ?? "";
            if (src) out.push(block("image", content, { image: src }));
            break;
          }
          if (content) out.push(block("text", content));
          break;
        }

        case "blockquote": {
          if (content) out.push(block("quote", content));
          break;
        }

        case "ul":
        case "ol": {
          const items = el
            .querySelectorAll("li")
            .map((li) => text(li as ParsedElement))
            .filter(Boolean);
          if (items.length) out.push(block("list", items.join("\n")));
          break;
        }

        case "figure": {
          const img = el.querySelector("img");
          const cap = el.querySelector("figcaption");
          const src = img?.getAttribute("src") ?? "";
          if (src) {
            out.push(block("image", cap ? text(cap as ParsedElement) : "", { image: src }));
          }
          break;
        }

        case "img": {
          const src = el.getAttribute("src") ?? "";
          if (src) out.push(block("image", "", { image: src }));
          break;
        }

        case "hr":
          out.push(block("divider", ""));
          break;

        case "script":
        case "style":
        case "iframe":
          break;

        default:
          // Wrappers (div, section, article) contribute nothing themselves.
          walk(el);
      }
    }
  };

  walk(root);
  return out;
}

/** Post id from any of the usual WordPress URL shapes. */
export function parsePostId(input: string): number | null {
  const s = input.trim();
  const path = s.match(/\/(?:article|p|\?p=)?\/?(\d{2,})(?:[/?#]|$)/);
  if (path) return Number(path[1]);
  const query = s.match(/[?&]p=(\d+)/);
  if (query) return Number(query[1]);
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export async function fetchWpArticle(url: string): Promise<ImportedArticle> {
  const id = parsePostId(url);
  const origin = originOf(url);
  if (!id || !origin) throw new Error("ލިންކު ރަނގަޅެއް ނޫން");

  const res = await fetch(`${origin}/wp-json/wp/v2/posts/${id}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  if (res.status === 404) throw new Error("މި ލިޔުމެއް ނުފެނުނު");
  if (!res.ok) throw new Error(`ލިޔުން ނުލިބުނު (${res.status})`);

  const post = (await res.json()) as {
    id: number;
    link?: string;
    date?: string;
    featured_media?: number;
    title?: { rendered?: string };
    content?: { rendered?: string };
    excerpt?: { rendered?: string };
  };

  const strip = (s: string) => parse(s).textContent.replace(/\s+/g, " ").trim();

  // The featured image lives behind a second lookup; a failure here is not
  // worth losing the whole import over.
  let cover = "";
  if (post.featured_media) {
    try {
      const m = await fetch(`${origin}/wp-json/wp/v2/media/${post.featured_media}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (m.ok) cover = ((await m.json()) as { source_url?: string }).source_url ?? "";
    } catch {
      cover = "";
    }
  }

  return {
    sourceId: post.id,
    sourceUrl: post.link ?? url,
    title: strip(post.title?.rendered ?? "") || "ސުރުޚީ ނެތް ލިޔުމެއް",
    excerpt: strip(post.excerpt?.rendered ?? ""),
    publishedAt: post.date ?? null,
    cover,
    blocks: htmlToBlocks(post.content?.rendered ?? ""),
  };
}
