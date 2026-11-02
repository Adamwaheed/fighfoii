const DHIVEHI_MONTHS = [
  "ޖަނަވަރީ", "ފެބްރުއަރީ", "މާރިޗު", "އޭޕްރީލް", "މޭ", "ޖޫން",
  "ޖުލައި", "އޯގަސްޓު", "ސެޕްޓެންބަރު", "އޮކްޓޯބަރު", "ނޮވެންބަރު", "ޑިސެންބަރު",
];

/** SQLite stores naive UTC strings; parse them as UTC rather than local time. */
function parse(value: string | null): Date | null {
  if (!value) return null;
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | null): string {
  const d = parse(value);
  if (!d) return "";
  return `${d.getUTCDate()} ${DHIVEHI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Relative time in Dhivehi — "3 ގަޑިއިރު ކުރިން". */
export function timeAgo(value: string | null): string {
  const d = parse(value);
  if (!d) return "";
  const secs = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "ދެންމެ";

  const steps: [number, string][] = [
    [60, "މިނެޓު"],
    [3600, "ގަޑިއިރު"],
    [86400, "ދުވަސް"],
    [604800, "ހަފުތާ"],
    [2592000, "މަސް"],
    [31536000, "އަހަރު"],
  ];
  let chosen = steps[0];
  for (const step of steps) {
    if (secs >= step[0]) chosen = step;
  }
  return `${Math.floor(secs / chosen[0])} ${chosen[1]} ކުރިން`;
}

/** Rough reading time from the article's block text. */
export function readingTime(words: number): string {
  const mins = Math.max(1, Math.round(words / 180));
  return `${mins} މިނެޓުގެ ކިޔުން`;
}

export function commentLabel(n: number): string {
  return `${n} ކޮމެންޓު`;
}

/**
 * Latin-safe slug, falling back to a timestamped id.
 *
 * Thaana and Arabic letters survive the first pass but not the ASCII filter, so
 * a title written entirely in them reduces to nothing but the separators. The
 * result therefore has to contain an actual alphanumeric to be usable — a slug
 * of bare dashes would otherwise sail through a length check and end up in a
 * public URL.
 */
export function slugify(input: string): string {
  const ascii = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return /[a-z0-9]/.test(ascii) && ascii.length >= 3
    ? ascii
    : `liyun-${Date.now().toString(36)}`;
}
