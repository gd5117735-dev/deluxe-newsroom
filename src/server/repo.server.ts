import type { Article, Category } from "@/lib/types";
import { getBindings, type D1Like } from "./bindings.server";

export type UserRow = { id: string; name: string; email: string; password_hash: string; created_at: number };
export type ListOpts = {
  status?: "published" | "draft" | "all" | undefined;
  categoryId?: string | undefined;
  home?: boolean | undefined;
  breaking?: boolean | undefined;
  featured?: boolean | undefined;
  q?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS user_roles (user_id TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY (user_id, role));
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT, sort INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', cover_key TEXT, category_id TEXT, is_featured INTEGER NOT NULL DEFAULT 0, show_on_home INTEGER NOT NULL DEFAULT 0, is_breaking INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', views INTEGER NOT NULL DEFAULT 0, author_name TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_articles_created ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_cat ON articles(category_id);
CREATE TABLE IF NOT EXISTS media (key TEXT PRIMARY KEY, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS channel_posts (id TEXT PRIMARY KEY, body TEXT NOT NULL, created_at INTEGER NOT NULL);
`;

const ARTICLE_COLS = [
  "title", "excerpt", "content", "cover_key", "category_id", "is_featured",
  "show_on_home", "is_breaking", "status", "author_name",
] as const;
export type ArticleInput = Pick<Article, (typeof ARTICLE_COLS)[number]>;

/* ------------------------------ D1 ------------------------------ */
let schemaReady = false;
async function d1(): Promise<D1Like | null> {
  const db = getBindings().DB;
  if (!db) return null;
  if (!schemaReady) {
    for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
      await db.prepare(stmt).run();
    }
    schemaReady = true;
  }
  return db;
}

/* ------------------------- Preview memory ------------------------ */
type Mem = {
  users: UserRow[];
  roles: { user_id: string; role: string }[];
  sessions: { token: string; user_id: string; expires_at: number }[];
  categories: Category[];
  articles: Article[];
  media: Map<string, { bytes: ArrayBuffer; type: string }>;
  channel: { id: string; body: string; created_at: number }[];
};
function mem(): Mem {
  const g = globalThis as unknown as { __DB_MEM__?: Mem };
  g.__DB_MEM__ ??= { users: [], roles: [], sessions: [], categories: [], articles: [], media: new Map(), channel: [] };
  return g.__DB_MEM__;
}

export async function storageMode(): Promise<"cloudflare" | "preview"> {
  return (await d1()) ? "cloudflare" : "preview";
}

/* ----------------------------- Users ----------------------------- */
export async function countUsers(): Promise<number> {
  const db = await d1();
  if (!db) return mem().users.length;
  const r = await db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
  return Number(r?.n ?? 0);
}
export async function createUser(u: UserRow): Promise<boolean> {
  const db = await d1();
  if (!db) {
    if (mem().users.some(x => x.email === u.email)) throw new Error("هذا البريد مسجّل مسبقاً");
    const isFirst = mem().users.length === 0;
    mem().users.push(u);
    mem().roles.push({ user_id: u.id, role: isFirst ? "admin" : "user" });
    return isFirst;
  }
  await db.batch([
    db.prepare("INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)").bind(u.id, u.name, u.email, u.password_hash, u.created_at),
    db.prepare("INSERT INTO user_roles (user_id, role) SELECT id, CASE WHEN id = (SELECT id FROM users ORDER BY rowid ASC LIMIT 1) THEN 'admin' ELSE 'user' END FROM users WHERE id = ?").bind(u.id),
  ]);
  return (await getUserRoles(u.id)).includes("admin");
}
export async function createAdminUser(u: UserRow): Promise<void> {
  const db = await d1();
  if (!db) {
    if (mem().users.some(x => x.email === u.email)) throw new Error("هذا البريد مسجّل مسبقاً");
    mem().users.push(u); mem().roles.push({ user_id: u.id, role: "admin" }); return;
  }
  await db.batch([
    db.prepare("INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)").bind(u.id, u.name, u.email, u.password_hash, u.created_at),
    db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'admin')").bind(u.id),
  ]);
}
export async function setAdmin(userId: string, value: boolean): Promise<void> {
  const db = await d1();
  if (!db) {
    const m = mem(); m.roles = m.roles.filter(r => !(r.user_id === userId && r.role === "admin"));
    if (value) m.roles.push({ user_id: userId, role: "admin" }); return;
  }
  if (value) await db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'admin')").bind(userId).run();
  else await db.prepare("DELETE FROM user_roles WHERE user_id = ? AND role = 'admin'").bind(userId).run();
}
export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const db = await d1();
  if (!db) return mem().users.find((u) => u.email === email) ?? null;
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
}
export async function getUserRoles(userId: string): Promise<string[]> {
  const db = await d1();
  if (!db) return mem().roles.filter((r) => r.user_id === userId).map((r) => r.role);
  const r = await db.prepare("SELECT role FROM user_roles WHERE user_id = ?").bind(userId).all<{ role: string }>();
  return r.results.map((x) => x.role);
}
export async function listUsers(): Promise<(Omit<UserRow, "password_hash"> & { isAdmin: boolean })[]> {
  const db = await d1();
  if (!db) {
    return mem().users.map(({ password_hash: _p, ...u }) => ({
      ...u,
      isAdmin: mem().roles.some((r) => r.user_id === u.id && r.role === "admin"),
    }));
  }
  const r = await db.prepare(
    "SELECT u.id,u.name,u.email,u.created_at, EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='admin') AS is_admin FROM users u ORDER BY u.created_at ASC",
  ).all<{ id: string; name: string; email: string; created_at: number; is_admin: number }>();
  return r.results.map(({ is_admin, ...u }) => ({ ...u, isAdmin: !!is_admin }));
}

/* ---------------------------- Sessions --------------------------- */
export async function createSession(token: string, userId: string, expiresAt: number) {
  const db = await d1();
  if (!db) return void mem().sessions.push({ token, user_id: userId, expires_at: expiresAt });
  await db.prepare("INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)").bind(token, userId, expiresAt).run();
}
export async function getSessionUser(token: string): Promise<UserRow | null> {
  const now = Date.now();
  const db = await d1();
  if (!db) {
    const s = mem().sessions.find((x) => x.token === token && x.expires_at > now);
    return s ? (mem().users.find((u) => u.id === s.user_id) ?? null) : null;
  }
  return db.prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?")
    .bind(token, now).first<UserRow>();
}
export async function deleteSession(token: string) {
  const db = await d1();
  if (!db) {
    mem().sessions = mem().sessions.filter((s) => s.token !== token);
    return;
  }
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

/* --------------------------- Categories -------------------------- */
export async function listCategories(): Promise<(Category & { count: number })[]> {
  const db = await d1();
  if (!db) {
    return [...mem().categories]
      .sort((a, b) => a.sort - b.sort || a.created_at - b.created_at)
      .map((c) => ({ ...c, count: mem().articles.filter((a) => a.category_id === c.id && a.status === "published").length }));
  }
  const r = await db.prepare(
    "SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id=c.id AND a.status='published') AS count FROM categories c ORDER BY c.sort ASC, c.created_at ASC",
  ).all<Category & { count: number }>();
  return r.results;
}
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = await d1();
  if (!db) return mem().categories.find((c) => c.slug === slug) ?? null;
  return db.prepare("SELECT * FROM categories WHERE slug = ?").bind(slug).first<Category>();
}
export async function upsertCategory(c: Category) {
  const db = await d1();
  if (!db) {
    const list = mem().categories;
    const i = list.findIndex((x) => x.id === c.id);
    if (list.some((x) => x.slug === c.slug && x.id !== c.id)) throw new Error("الرابط مستخدم لتصنيف آخر");
    if (i >= 0) list[i] = c;
    else list.push(c);
    return;
  }
  await db.prepare(
    "INSERT INTO categories (id,name,slug,description,sort,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, description=excluded.description, sort=excluded.sort",
  ).bind(c.id, c.name, c.slug, c.description, c.sort, c.created_at).run();
}
export async function deleteCategory(id: string) {
  const db = await d1();
  if (!db) {
    mem().categories = mem().categories.filter((c) => c.id !== id);
    mem().articles.forEach((a) => { if (a.category_id === id) a.category_id = null; });
    return;
  }
  await db.prepare("UPDATE articles SET category_id = NULL WHERE category_id = ?").bind(id).run();
  await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
}

/* ---------------------------- Articles --------------------------- */
function withCat(a: Article): Article {
  const c = mem().categories.find((x) => x.id === a.category_id);
  return { ...a, category_name: c?.name ?? null, category_slug: c?.slug ?? null };
}

export async function listArticles(o: ListOpts = {}): Promise<{ items: Article[]; total: number }> {
  const limit = Math.min(o.limit ?? 12, 100);
  const offset = o.offset ?? 0;
  const status = o.status ?? "published";
  const db = await d1();
  if (!db) {
    const q = o.q?.trim();
    const all = mem().articles
      .filter((a) => status === "all" || a.status === status)
      .filter((a) => !o.categoryId || a.category_id === o.categoryId)
      .filter((a) => !o.home || a.show_on_home)
      .filter((a) => !o.breaking || a.is_breaking)
      .filter((a) => !o.featured || a.is_featured)
      .filter((a) => !q || a.title.includes(q) || a.excerpt.includes(q))
      .sort((a, b) => b.created_at - a.created_at);
    return { items: all.slice(offset, offset + limit).map(withCat), total: all.length };
  }
  const where: string[] = [];
  const params: unknown[] = [];
  if (status !== "all") { where.push("a.status = ?"); params.push(status); }
  if (o.categoryId) { where.push("a.category_id = ?"); params.push(o.categoryId); }
  if (o.home) where.push("a.show_on_home = 1");
  if (o.breaking) where.push("a.is_breaking = 1");
  if (o.featured) where.push("a.is_featured = 1");
  if (o.q?.trim()) { where.push("(a.title LIKE ? OR a.excerpt LIKE ?)"); params.push(`%${o.q.trim()}%`, `%${o.q.trim()}%`); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const items = await db.prepare(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug FROM articles a LEFT JOIN categories c ON c.id = a.category_id ${w} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...params, limit, offset).all<Article>();
  const total = await db.prepare(`SELECT COUNT(*) AS n FROM articles a ${w}`).bind(...params).first<{ n: number }>();
  return { items: items.results, total: Number(total?.n ?? 0) };
}

export async function getArticle(id: string): Promise<Article | null> {
  const db = await d1();
  if (!db) {
    const a = mem().articles.find((x) => x.id === id);
    return a ? withCat(a) : null;
  }
  return db.prepare(
    "SELECT a.*, c.name AS category_name, c.slug AS category_slug FROM articles a LEFT JOIN categories c ON c.id = a.category_id WHERE a.id = ?",
  ).bind(id).first<Article>();
}

export async function incrementViews(id: string) {
  const db = await d1();
  if (!db) {
    const a = mem().articles.find((x) => x.id === id);
    if (a) a.views += 1;
    return;
  }
  await db.prepare("UPDATE articles SET views = views + 1 WHERE id = ?").bind(id).run();
}

export async function saveArticle(id: string | null, input: ArticleInput): Promise<string> {
  const now = Date.now();
  const db = await d1();
  const newId = id ?? crypto.randomUUID();
  if (!db) {
    const list = mem().articles;
    const i = list.findIndex((a) => a.id === id);
    const existing = list[i];
    if (i >= 0 && existing) list[i] = { ...existing, ...input, updated_at: now };
    else list.push({ id: newId, ...input, views: 0, created_at: now, updated_at: now });
    return newId;
  }
  const vals = ARTICLE_COLS.map((k) => input[k]);
  if (id) {
    await db.prepare(`UPDATE articles SET ${ARTICLE_COLS.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`)
      .bind(...vals, now, id).run();
  } else {
    await db.prepare(
      `INSERT INTO articles (id, ${ARTICLE_COLS.join(", ")}, views, created_at, updated_at) VALUES (?, ${ARTICLE_COLS.map(() => "?").join(", ")}, 0, ?, ?)`,
    ).bind(newId, ...vals, now, now).run();
  }
  return newId;
}

export async function setArticleFlag(id: string, flag: "is_featured" | "show_on_home" | "is_breaking", value: boolean) {
  const db = await d1();
  if (!db) {
    const a = mem().articles.find((x) => x.id === id);
    if (a) a[flag] = value ? 1 : 0;
    return;
  }
  await db.prepare(`UPDATE articles SET ${flag} = ? WHERE id = ?`).bind(value ? 1 : 0, id).run();
}

export async function deleteArticle(id: string) {
  const db = await d1();
  if (!db) {
    mem().articles = mem().articles.filter((a) => a.id !== id);
    return;
  }
  await db.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
}

export async function stats() {
  const db = await d1();
  if (!db) {
    const a = mem().articles;
    return {
      published: a.filter((x) => x.status === "published").length,
      drafts: a.filter((x) => x.status === "draft").length,
      categories: mem().categories.length,
      views: a.reduce((s, x) => s + x.views, 0),
      users: mem().users.length,
      media: mem().media.size,
    };
  }
  const r = await db.prepare(
    `SELECT (SELECT COUNT(*) FROM articles WHERE status='published') AS published, (SELECT COUNT(*) FROM articles WHERE status='draft') AS drafts, (SELECT COUNT(*) FROM categories) AS categories, (SELECT COALESCE(SUM(views),0) FROM articles) AS views, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM media) AS media`,
  ).first<{ published: number; drafts: number; categories: number; views: number; users: number; media: number }>();
  return {
    published: Number(r?.published ?? 0), drafts: Number(r?.drafts ?? 0), categories: Number(r?.categories ?? 0),
    views: Number(r?.views ?? 0), users: Number(r?.users ?? 0), media: Number(r?.media ?? 0),
  };
}

/* ------------------------------ Media ---------------------------- */
export async function putMedia(key: string, bytes: ArrayBuffer, type: string) {
  const bucket = getBindings().BUCKET;
  if (bucket) await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
  else mem().media.set(key, { bytes, type });
  const db = await d1();
  if (db) {
    await db.prepare("INSERT OR REPLACE INTO media (key, content_type, size, created_at) VALUES (?,?,?,?)")
      .bind(key, type, bytes.byteLength, Date.now()).run();
  }
}
export async function getMedia(key: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const bucket = getBindings().BUCKET;
  if (bucket) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    return { bytes: await obj.arrayBuffer(), type: obj.httpMetadata?.contentType ?? "application/octet-stream" };
  }
  return mem().media.get(key) ?? null;
}

/* ------------------------ WhatsApp channel ------------------------ */
export type ChannelPost = { id: string; body: string; created_at: number };
export async function listChannelPosts(limit = 3): Promise<ChannelPost[]> {
  const db = await d1();
  if (!db) return [...mem().channel].sort((a, b) => b.created_at - a.created_at).slice(0, limit);
  const r = await db.prepare("SELECT id, body, created_at FROM channel_posts ORDER BY created_at DESC LIMIT ?").bind(limit).all<ChannelPost>();
  return r.results;
}
export async function addChannelPost(body: string): Promise<void> {
  const post = { id: crypto.randomUUID(), body, created_at: Date.now() };
  const db = await d1();
  if (!db) { mem().channel.push(post); return; }
  await db.prepare("INSERT INTO channel_posts (id, body, created_at) VALUES (?,?,?)").bind(post.id, post.body, post.created_at).run();
}
export async function deleteChannelPost(id: string): Promise<void> {
  const db = await d1();
  if (!db) { mem().channel = mem().channel.filter((x) => x.id !== id); return; }
  await db.prepare("DELETE FROM channel_posts WHERE id = ?").bind(id).run();
      }
    
