import { beforeEach, describe, expect, it } from "vitest";
import * as repo from "@/server/repo.server";

beforeEach(() => { Reflect.deleteProperty(globalThis, "__DB_MEM__"); });
const user = (id: string) => ({ id, name: id, email: `${id}@example.invalid`, password_hash: "unused", created_at: Date.now() });
const story = { title: "اختبار", excerpt: "", content: "", cover_key: null, category_id: null, is_featured: 0, show_on_home: 0, is_breaking: 0, status: "published" as const, author_name: null };
describe("Editorial rules", () => {
  it("grants admin only to the first account even during concurrent registration", async () => {
    const results = await Promise.all([repo.createUser(user("first")), repo.createUser(user("second"))]);
    expect(results).toEqual([true, false]);
    expect(await repo.getUserRoles("first")).toEqual(["admin"]);
    expect(await repo.getUserRoles("second")).toEqual(["user"]);
  });
  it("starts without fabricated news", async () => { expect(await repo.listArticles()).toEqual({ items: [], total: 0 }); });
  it("shows only owner-selected published stories on the homepage", async () => {
    await repo.saveArticle(null, story);
    const selected = await repo.saveArticle(null, { ...story, show_on_home: 1 });
    await repo.saveArticle(null, { ...story, show_on_home: 1, status: "draft" });
    expect((await repo.listArticles({ home: true })).items.map(a => a.id)).toEqual([selected]);
  });
  it("does not impose a total news creation limit", async () => {
    for (let i = 0; i < 125; i++) await repo.saveArticle(null, story);
    expect((await repo.listArticles({ limit: 100, offset: 100 })).total).toBe(125);
    expect((await repo.listArticles({ limit: 100, offset: 100 })).items).toHaveLength(25);
  });
  it("does not impose a total category creation limit", async () => {
    for (let i = 0; i < 125; i++) await repo.upsertCategory({ id: String(i), name: String(i), slug: String(i), description: null, sort: i, created_at: i });
    expect(await repo.listCategories()).toHaveLength(125);
  });
});