import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { getArticlePage } from "@/lib/api.functions";
import { pageHead } from "@/lib/metadata";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ArticleBody } from "@/components/site/ArticleBody";
import { ArticleCard, SectionTitle } from "@/components/site/ArticleCards";
import { mediaUrl } from "@/lib/types";
import { LiveTime } from "@/components/site/LiveTime";
export const Route = createFileRoute("/news/$id")({
  loader: async ({ params }) => { const data = await getArticlePage({ data: params }); if (!data) throw notFound(); return data; },
  head: ({ loaderData }) => {
    const head = pageHead(loaderData?.article.title ?? "خبر غير متاح", loaderData?.article.excerpt ?? "أخبار دليل بيروتي.");
    const image = loaderData?.article.cover_key;
    return image?.startsWith("https://") ? { meta: [...head.meta, { property: "og:image", content: image }, { name: "twitter:image", content: image }] } : head;
  },
  component: Article,
});
function Article() {
  const { article: a, related } = Route.useLoaderData(); const cover = mediaUrl(a.cover_key);
  return <SiteLayout><article className="mx-auto max-w-4xl px-4 py-12 md:px-6">
    <Link to="/news" search={{ q: "", page: 1 }} className="text-sm text-primary">كل الأخبار / {a.category_name ?? "أخبار"}</Link>
    {a.status === "draft" && <p className="mt-4 text-breaking">مسودة — غير منشورة</p>}
    <h1 className="mt-6 text-3xl font-bold leading-relaxed text-deep md:text-5xl">{a.title}</h1>
    {a.excerpt && <p className="mt-5 text-xl leading-9 font-normal text-muted-foreground">{a.excerpt}</p>}
    <div className="my-7 flex flex-wrap gap-5 border-y py-4 text-sm text-muted-foreground"><span>{a.author_name}</span><span><LiveTime ts={a.created_at} withDate /></span><span>{a.views.toLocaleString("ar")} مشاهدة</span></div>
    {cover && <img src={cover} alt={a.title} className="mb-8 aspect-video w-full rounded-lg object-cover" />}
    <ArticleBody content={a.content} />
    {related.length > 0 && <section className="mt-16"><SectionTitle title="أخبار ذات صلة" /><div className="grid gap-5 sm:grid-cols-3">{related.map(x => <ArticleCard key={x.id} a={x} />)}</div></section>}
  </article></SiteLayout>;
}