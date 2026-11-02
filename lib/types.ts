export type BlockType =
  | "text"
  | "heading"
  | "subheading"
  | "ayah"
  | "hadith"
  | "quote"
  | "qna"
  | "image"
  | "list"
  | "callout"
  | "note"
  | "reference"
  | "diagram"
  | "pdf"
  | "divider";

export type ArticleStatus = "draft" | "published";

/** Where an article surfaces on the front page. */
export type Placement = "none" | "lead" | "secondary" | "pick";

export interface Block {
  id: number;
  articleId: number;
  sort: number;
  type: BlockType;
  /** Primary content: paragraph text, heading text, ayah/hadith Arabic, caption, list source. */
  main: string;
  /**
   * Secondary line: the Dhivehi translation on ayah/hadith/quote blocks, the
   * answer on a Q&A block, or the small head that sits above a heading.
   */
  sub: string;
  /** Citation: surah + ayah number, or hadith source. */
  ref: string;
  /**
   * Heading depth 1–4; ayah frame style (1 = framed, 0 = plain).
   * Heading depth drives size, indent and the automatic numbering.
   */
  level: number;
  /** Image URL for image blocks. */
  image: string;
  /** Serialised BlockStyle; empty for an unstyled block. */
  style: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  sub: string;
  sort: number;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  kicker: string;
  excerpt: string;
  categoryId: number;
  author: string;
  status: ArticleStatus;
  placement: Placement;
  image: string;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleWithCategory extends Article {
  categoryName: string;
  categorySlug: string;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: "ފޮޅުވަތް",
  heading: "ސުރުޚީ",
  subheading: "ދަށު ސުރުޚީ",
  ayah: "އާޔަތް",
  hadith: "ޙަދީޘް",
  quote: "ނަޤުލު",
  qna: "ސުވާލާއި ޖަވާބު",
  image: "ފޮޓޯ",
  list: "ނުކުތާތައް",
  callout: "މުހިންމު",
  note: "ފާހަގަ",
  reference: "މަޞްދަރުތައް",
  diagram: "ޑަޔަގްރާމް",
  pdf: "PDF",
  divider: "ވަކިކުރާ ރޮނގު",
};

export const BLOCK_ORDER: BlockType[] = [
  "text",
  "heading",
  "subheading",
  "ayah",
  "hadith",
  "quote",
  "qna",
  "list",
  "callout",
  "note",
  "reference",
  "diagram",
  "image",
  "pdf",
  "divider",
];

/** Heading depths, outermost first. */
export const HEADING_LEVELS = [1, 2, 3, 4] as const;

export const HEADING_LEVEL_LABELS: Record<number, string> = {
  1: "ބޮޑު ސުރުޚީ",
  2: "ދެވަނަ",
  3: "ތިންވަނަ",
  4: "ހަތަރުވަނަ",
};

export const PLACEMENT_LABELS: Record<Placement, string> = {
  none: "އާދައިގެ",
  lead: "ލީޑް",
  secondary: "ދެވަނަ",
  pick: "އެޑިޓަރުގެ ހޮވުން",
};

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "ދެލިކޮޕީ",
  published: "ޝާއިޢުކޮށްފައި",
};
