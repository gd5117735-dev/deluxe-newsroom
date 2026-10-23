import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Newspaper } from "lucide-react";
import { getHome } from "@/lib/api.functions";
import { pageHead } from "@/lib/metadata";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ArticleCard, HeroArticle, SideArticle, SectionTitle } from "@/components/site/ArticleCards";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { SITE } from "@/lib/site";

type ChannelPost = { id: string; body: string; created_at: number };
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Beirut" });

function WhatsAppChannelCard({ posts }: { posts: ChannelPost[] }) {
  return (
    <section className="mt-12 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between gap-4 bg-gradient-to-l from-deeper to-deep px-5 py-5 text-deep-foreground">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-whatsapp shadow-soft">
            <MessageCircle className="size-8" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold md:text-2xl">قناة دليل بيروتي</h2>
            <p className="mt-1 text-sm text-silver/80">تحديثات فورية على واتساب</p>
          </div>
        </div>
        <span className="rounded-full border border-whatsapp/40 bg-whatsapp/15 px-3 py-1 text-xs font-bold text-whatsapp">مباشر</span>
      </div>
      <div className="space-y-3 bg-secondary/40 p-4">
        {posts.map((p) => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-primary">{SITE.nameAr}</span>
              <time className="text-muted-foreground" dir="ltr">{timeFmt.format(new Date(p.created_at))}</time>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground">{p.body}</p>
          </article>
        ))}
        <a
          href={SITE.channel}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-whatsapp py-4 text-base font-bold text-whatsapp-foreground shadow-soft transition-transform hover:scale-[1.01]"
        >
          <MessageCircle className="size-5" /> متابعة القناة على واتساب
        </a>
      </div>
    </section>
  );
}
const logo = { url: "/logo.jpg" };

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  head: () => pageHead("دليل بيروتي — أخبار بيروت ولبنان", "أخبار بيروت ولبنان والعالم عبر دليل بيروتي."),
  component: Index,
});

function Index() {
  const data = Route.useLoaderData();
  const [lead, ...sides] = data.featured;
  return <SiteLayout><div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
    <div className="mb-8 flex items-center justify-between border-b pb-5">
      <div><h1 className="text-3xl font-bold text-deep md:text-4xl">دليل بيروتي</h1></div>
      <span className="hidden text-sm text-muted-foreground sm:block">بيروت • لبنان • العالم</span>
    </div>
    {lead ? <div className="grid gap-5 lg:grid-cols-3"><div className="lg:col-span-2"><HeroArticle a={lead} /></div><div className="grid gap-5">{sides.slice(0, 2).map(a => <SideArticle key={a.id} a={a} />)}</div></div> : <section className="flex min-h-[370px] flex-col items-center justify-center border-y py-12 text-center">
      <img src={logo.url} alt="شعار دليل بيروتي" className="mb-6 size-28 rounded-lg object-cover shadow-soft" />
      <h2 className="font-display text-3xl font-bold text-deep md:text-4xl">الخبر أولاً بأول</h2>
      <p className="mt-4 text-muted-foreground">لا توجد أخبار منشورة بعد</p>
      <Button asChild variant="outline" className="mt-6"><Link to="/news" search={{ q: "", page: 1 }}>كل الأخبار <ArrowLeft /></Link></Button>
    </section>}
    <WhatsAppChannelCard posts={data.channel} />
    <section className="mt-12"><SectionTitle title="مختارات التحرير" />{data.home.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.home.map(a => <ArticleCard key={a.id} a={a} />)}</div> : <div className="flex items-center gap-3 border-y py-8 text-muted-foreground"><Newspaper className="size-6 text-primary" /><p>لم يتم اختيار أخبار للرئيسية بعد</p></div>}</section>
  </div></SiteLayout>;
}
