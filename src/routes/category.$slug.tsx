import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { listNews } from "@/lib/api.functions";
import { pageHead } from "@/lib/metadata";
import { NewsListing } from "@/components/site/NewsListing";
export const Route = createFileRoute("/category/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"].slice(0, 100) : "", page: Math.max(1, Math.floor(Number(s["page"]) || 1)) }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => { const r = await listNews({ data: { ...deps, slug: params.slug } }); if (r.notFound) throw notFound(); return r; },
  head: ({ loaderData }) => pageHead(loaderData?.category?.name ?? "تصنيف غير متاح", loaderData?.category?.description ?? "أخبار التصنيف في دليل بيروتي."),
  component: Category,
});
function Category() {
  const data = Route.useLoaderData(); const search = Route.useSearch(); const params = Route.useParams(); const navigate = useNavigate();
  return <NewsListing title={data.category?.name ?? "الأخبار"} description={data.category?.description ?? null} {...data} q={search.q} onSearch={q => { void navigate({ to: "/category/$slug", params, search: { q, page: 1 } }); }} onPage={page => { void navigate({ to: "/category/$slug", params, search: { ...search, page } }); }} />;
}