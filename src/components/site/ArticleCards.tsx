import { Link } from "@tanstack/react-router";
import { Clock, Eye, Newspaper } from "lucide-react";
import { mediaUrl, type Article } from "@/lib/types";
import { LiveTime } from "./LiveTime";
import { cn } from "@/lib/utils";

function Cover({ a, className }: { a: Article; className?: string }) {
  const src = mediaUrl(a.cover_key);
  return src ? (
    <img src={src} alt={a.title} loading="lazy" className={cn("size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105", className)} />
  ) : (
    <div className="grid size-full place-items-center bg-cedar">
      <Newspaper className="size-10 text-silver/40" />
    </div>
  );
}

export function CategoryChip({ a, tone = "light" }: { a: Article; tone?: "light" | "dark" }) {
  if (!a.category_name) return null;
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-[11px] font-black",
        tone === "dark" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      {a.category_name}
    </span>
  );
}

export function HeroArticle({ a }: { a: Article }) {
  return (
    <Link to="/news/$id" params={{ id: a.id }} className="group relative block h-[440px] overflow-hidden rounded-3xl shadow-lift md:h-[560px]">
      <Cover a={a} />
      <div className="absolute inset-0 bg-veil" />
      <div className="absolute inset-x-0 bottom-0 space-y-4 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <CategoryChip a={a} tone="dark" />
          {a.is_breaking ? <span className="rounded-full bg-breaking px-3 py-1 text-[11px] font-black text-breaking-foreground">عاجل</span> : null}
        </div>
        <h2 className="max-w-3xl font-display text-2xl leading-snug font-bold text-deep-foreground md:text-5xl md:leading-tight">{a.title}</h2>
        {a.excerpt && <p className="line-clamp-2 max-w-2xl text-sm leading-7 font-normal text-silver md:text-base">{a.excerpt}</p>}
        <Meta a={a} light />
      </div>
    </Link>
  );
}

export function SideArticle({ a }: { a: Article }) {
  return (
    <Link to="/news/$id" params={{ id: a.id }} className="group relative block h-full min-h-[200px] overflow-hidden rounded-2xl shadow-soft">
      <Cover a={a} />
      <div className="absolute inset-0 bg-veil" />
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5">
        <CategoryChip a={a} tone="dark" />
        <h3 className="line-clamp-2 font-display text-lg leading-snug font-bold text-deep-foreground">{a.title}</h3>
      </div>
    </Link>
  );
}

export function ArticleCard({ a }: { a: Article }) {
  return (
    <Link to="/news/$id" params={{ id: a.id }} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="aspect-[16/10] overflow-hidden">
        <Cover a={a} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <CategoryChip a={a} />
        <h3 className="line-clamp-2 font-display text-lg leading-snug font-bold text-foreground group-hover:text-primary">{a.title}</h3>
        {a.excerpt && <p className="line-clamp-2 text-sm leading-6 font-normal text-muted-foreground">{a.excerpt}</p>}
        <div className="mt-auto pt-2">
          <Meta a={a} />
        </div>
      </div>
    </Link>
  );
}

export function CompactArticle({ a, index }: { a: Article; index?: number }) {
  return (
    <Link to="/news/$id" params={{ id: a.id }} className="group flex items-start gap-4 py-4">
      {index !== undefined ? (
        <span className="font-display text-3xl font-bold text-silver">{(index + 1).toLocaleString("ar")}</span>
      ) : (
        <div className="size-20 shrink-0 overflow-hidden rounded-xl">
          <Cover a={a} />
        </div>
      )}
      <div className="space-y-1.5">
        <h4 className="line-clamp-2 font-bold leading-snug text-foreground group-hover:text-primary">{a.title}</h4>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" /> <LiveTime ts={a.created_at} />
        </span>
      </div>
    </Link>
  );
}

function Meta({ a, light }: { a: Article; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-4 text-xs", light ? "text-silver/80" : "text-muted-foreground")}>
      <span className="flex items-center gap-1"><Clock className="size-3.5" /> <LiveTime ts={a.created_at} /></span>
      <span className="flex items-center gap-1"><Eye className="size-3.5" /> {a.views.toLocaleString("ar")}</span>
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-deep md:text-3xl">{title}</h2>
        <div className="mt-3 h-1 w-16 rounded-full bg-cedar" />
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <Newspaper className="mx-auto size-12 text-silver" />
      <h3 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h3>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
