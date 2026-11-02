/**
 * The site's public origin.
 *
 * Used wherever a link has to be absolute — social previews, share targets and
 * copy citations — since those are read outside the browser that produced them.
 */
export const SITE_URL = (process.env.SITE_URL || "https://fiqhfoiy.com").replace(/\/$/, "");
