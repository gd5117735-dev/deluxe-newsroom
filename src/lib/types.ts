export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort: number;
  created_at: number;
};

export type Article = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  cover_key: string | null;
  category_id: string | null;
  is_featured: number;
  show_on_home: number;
  is_breaking: number;
  status: "published" | "draft";
  views: number;
  author_name: string | null;
  created_at: number;
  updated_at: number;
  category_name?: string | null;
  category_slug?: string | null;
};

export type PublicUser = { id: string; name: string; email: string; isAdmin: boolean };

export const mediaUrl = (key: string | null | undefined) =>
  key ? (key.startsWith("http") ? key : `/api/public/media/${key}`) : null;

export const formatDate = (ts: number) =>
  new Intl.DateTimeFormat("ar-LB", { dateStyle: "long", timeZone: "Asia/Beirut" }).format(new Date(ts));

export const timeAgo = (ts: number) => {
  const diff = Math.max(0, Date.now() - ts) / 1000;
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  if (diff < 3600) return rtf.format(-Math.max(1, Math.round(diff / 60)), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 86400 * 7) return rtf.format(-Math.round(diff / 86400), "day");
  return formatDate(ts);
};

export const slugify = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
