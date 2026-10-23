import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { listNews } from "@/lib/api.functions";
import { pageHead } from "@/lib/metadata";
import { NewsListing } from "@/components/site/NewsListing";

export const Route = createFileRoute("/news/")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"].slice(0, 100) : "", page: Math.max(1, Math.floor(Number(s["page"]) || 1)) }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listNews({ data: deps }),
  head: () => pageHead("كل الأخبار", "آخر الأخبار المنشورة في دليل بيروتي."),
  component: News,
});
function News() {
  const data = Route.useLoaderData(); const search = Route.useSearch(); const navigate = useNavigate();
  return <NewsListing title="كل الأخبار" {...data} q={search.q} onSearch={q => { void navigate({ to: "/news", search: { q, page: 1 } }); }} onPage={page => { void navigate({ to: "/news", search: { ...search, page } }); }} />;
}