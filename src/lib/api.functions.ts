import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as repo from "@/server/repo.server";
import * as auth from "@/server/auth.server";
import { slugify } from "@/lib/types";

/* ------------------------------ Auth ------------------------------ */
export const getMe = createServerFn({ method: "GET" }).handler(() => auth.currentUser());

export const signUp = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(2, "الاسم قصير").max(80),
      email: z.string().trim().toLowerCase().email("بريد غير صالح").max(160),
      password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(128),
    }),
  )
  .handler(async ({ data }) => {
    const u = await auth.registerUser(data.name, data.email, data.password);
    await auth.startSession(u.id);
    return u;
  });

export const signIn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    const u = await repo.getUserByEmail(data.email);
    if (!u || !(await auth.verifyPassword(data.password, u.password_hash))) {
      throw new Error("البريد أو كلمة المرور غير صحيحة");
    }
    await auth.startSession(u.id);
    return { ok: true };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  await auth.endSession();
  return { ok: true };
});

/* ----------------------------- Public ----------------------------- */
export const getNav = createServerFn({ method: "GET" }).handler(async () => {
  const [me, categories, breaking] = await Promise.all([
    auth.currentUser(),
    repo.listCategories(),
    repo.listArticles({ breaking: true, limit: 10 }),
  ]);
  return { me, categories, breaking: breaking.items.map((a) => ({ id: a.id, title: a.title })) };
});

export const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const [featured, home, latest, categories, channel] = await Promise.all([
    repo.listArticles({ featured: true, limit: 5 }),
    repo.listArticles({ home: true, limit: 24 }),
    repo.listArticles({ limit: 8 }),
    repo.listCategories(),
    repo.listChannelPosts(50),
  ]);
  const sections = await Promise.all(
    categories.filter((c) => c.count > 0).slice(0, 8).map(async (c) => ({
      category: c,
      items: (await repo.listArticles({ categoryId: c.id, limit: 4 })).items,
    })),
  );
  return { featured: featured.items, home: home.items, latest: latest.items, sections, channel };
});

const PAGE = 12;
export const listNews = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().optional(), q: z.string().max(100).optional(), page: z.number().int().min(1).default(1) }))
  .handler(async ({ data }) => {
    const category = data.slug ? await repo.getCategoryBySlug(data.slug) : null;
    if (data.slug && !category) return { category: null, items: [], total: 0, page: 1, pages: 0, notFound: true };
    const r = await repo.listArticles({ categoryId: category?.id, q: data.q, limit: PAGE, offset: (data.page - 1) * PAGE });
    return { category, ...r, page: data.page, pages: Math.ceil(r.total / PAGE), notFound: false };
  });

export const getArticlePage = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().min(1).max(64) }))
  .handler(async ({ data }) => {
    const a = await repo.getArticle(data.id);
    if (!a) return null;
    if (a.status !== "published") {
      const me = await auth.currentUser();
      if (!me?.isAdmin) return null;
    } else {
      await repo.incrementViews(a.id);
    }
    const related = a.category_id
      ? (await repo.listArticles({ categoryId: a.category_id, limit: 4 })).items.filter((x) => x.id !== a.id).slice(0, 3)
      : [];
    return { article: a, related };
  });

/* ------------------------------ Admin ----------------------------- */
export const adminOverview = createServerFn({ method: "GET" }).handler(async () => {
  await auth.requireAdmin();
  const [s, mode, recent] = await Promise.all([repo.stats(), repo.storageMode(), repo.listArticles({ status: "all", limit: 6 })]);
  return { stats: s, mode, recent: recent.items };
});

export const adminListArticles = createServerFn({ method: "GET" })
  .inputValidator(z.object({ q: z.string().max(100).optional(), status: z.enum(["all", "published", "draft"]).default("all"), page: z.number().int().min(1).default(1) }))
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    const r = await repo.listArticles({ status: data.status, q: data.q, limit: 20, offset: (data.page - 1) * 20 });
    return { ...r, page: data.page, pages: Math.ceil(r.total / 20) };
  });

export const adminGetArticle = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    return repo.getArticle(data.id);
  });

const articleSchema = z.object({
  id: z.string().nullable(),
  title: z.string().trim().min(3, "العنوان مطلوب").max(300),
  excerpt: z.string().trim().max(600).default(""),
  content: z.string().max(200_000).default(""),
  cover_key: z.string().max(500).nullable(),
  category_id: z.string().nullable(),
  is_featured: z.boolean(),
  show_on_home: z.boolean(),
  is_breaking: z.boolean(),
  status: z.enum(["published", "draft"]),
});

export const adminSaveArticle = createServerFn({ method: "POST" })
  .inputValidator(articleSchema)
  .handler(async ({ data }) => {
    const me = await auth.requireAdmin();
    const { id, ...rest } = data;
    const existing = id ? await repo.getArticle(id) : null;
    return {
      id: await repo.saveArticle(id, {
        ...rest,
        is_featured: rest.is_featured ? 1 : 0,
        show_on_home: rest.show_on_home ? 1 : 0,
        is_breaking: rest.is_breaking ? 1 : 0,
        author_name: existing?.author_name ?? me.name,
      }),
    };
  });

export const adminSetFlag = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), flag: z.enum(["is_featured", "show_on_home", "is_breaking"]), value: z.boolean() }))
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    await repo.setArticleFlag(data.id, data.flag, data.value);
    return { ok: true };
  });

export const adminDeleteArticle = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    await repo.deleteArticle(data.id);
    return { ok: true };
  });

export const adminListCategories = createServerFn({ method: "GET" }).handler(async () => {
  await auth.requireAdmin();
  return repo.listCategories();
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().nullable(),
      name: z.string().trim().min(2, "اسم التصنيف مطلوب").max(60),
      slug: z.string().trim().max(80).optional(),
      description: z.string().trim().max(300).nullable(),
      sort: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    const slug = slugify(data.slug || data.name);
    if (!slug) throw new Error("رابط التصنيف غير صالح");
    const all = await repo.listCategories();
    const prev = all.find((c) => c.id === data.id);
    if (all.some((c) => c.slug === slug && c.id !== data.id)) throw new Error("يوجد تصنيف بنفس الرابط");
    await repo.upsertCategory({
      id: data.id ?? crypto.randomUUID(),
      name: data.name,
      slug,
      description: data.description,
      sort: data.sort,
      created_at: prev?.created_at ?? Date.now(),
    });
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    await repo.deleteCategory(data.id);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" }).handler(async () => {
  await auth.requireAdmin();
  return repo.listUsers();
});

export const adminCreateAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(2, "الاسم قصير").max(80),
      email: z.string().trim().toLowerCase().email("بريد غير صالح").max(160),
      password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(128),
    }),
  )
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    if (await repo.getUserByEmail(data.email)) throw new Error("هذا البريد مسجّل مسبقاً");
    await repo.createAdminUser({ id: crypto.randomUUID(), name: data.name, email: data.email, password_hash: await auth.hashPassword(data.password), created_at: Date.now() });
    return { ok: true };
  });

export const adminSetAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1).max(64), value: z.boolean() }))
  .handler(async ({ data }) => {
    const me = await auth.requireAdmin();
    if (data.id === me.id && !data.value) throw new Error("لا يمكنك إزالة صلاحية المدير عن حسابك");
    await repo.setAdmin(data.id, data.value);
    return { ok: true };
  });

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const adminUploadImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("طلب غير صالح");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("لم يتم اختيار صورة");
    if (!IMAGE_TYPES.includes(file.type)) throw new Error("نوع الملف غير مدعوم");
    if (file.size > 25 * 1024 * 1024) throw new Error("الصورة كبيرة جداً");
    return file;
  })
  .handler(async ({ data: file }) => {
    await auth.requireAdmin();
    const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const d = new Date();
    const key = `uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
    await repo.putMedia(key, await file.arrayBuffer(), file.type);
    return { key };
  });

/* ------------------------ WhatsApp channel ------------------------ */
export const adminListChannelPosts = createServerFn({ method: "GET" }).handler(async () => {
  await auth.requireAdmin();
  return repo.listChannelPosts(200);
});
export const adminAddChannelPost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ body: z.string().trim().min(2, "النص قصير").max(500, "النص طويل") }))
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    await repo.addChannelPost(data.body);
    return { ok: true };
  });
export const adminDeleteChannelPost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    await auth.requireAdmin();
    await repo.deleteChannelPost(data.id);
    return { ok: true };
  });
