import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { SiteLayout } from "./SiteLayout";
import { ArticleCard, EmptyState } from "./ArticleCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Article } from "@/lib/types";

export function NewsListing({ title, description, items, q, page, pages, onSearch, onPage }: {
  title: string; description?: string | null; items: Article[]; q: string; page: number; pages: number;
  onSearch: (q: string) => void; onPage: (page: number) => void;
}) {
  const [query, setQuery] = useState(q);
  return <SiteLayout><div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
    <Link to="/" className="text-sm text-muted-foreground">الرئيسية / {title}</Link>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-6 border-b pb-8">
      <div><h1 className="text-4xl font-bold text-deep">{title}</h1>{description && <p className="mt-3 text-muted-foreground">{description}</p>}</div>
      <form className="flex w-full gap-2 sm:w-80" onSubmit={e => { e.preventDefault(); onSearch(query); }}>
        <Input aria-label="البحث في الأخبار" placeholder="ابحث عن خبر…" value={query} onChange={e => setQuery(e.target.value)} />
        <Button type="submit" size="icon" aria-label="بحث"><Search /></Button>
      </form>
    </div>
    {items.length ? <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map(a => <ArticleCard key={a.id} a={a} />)}</div> : <div className="mt-8"><EmptyState title={q ? "لا توجد نتائج" : "لا توجد أخبار منشورة بعد"} /></div>}
    {pages > 1 && <div className="mt-10 flex items-center justify-center gap-4">
      <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="الصفحة السابقة"><ChevronRight /></Button>
      <span>{page.toLocaleString("ar")} / {pages.toLocaleString("ar")}</span>
      <Button variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="الصفحة التالية"><ChevronLeft /></Button>
    </div>}
  </div></SiteLayout>;
}