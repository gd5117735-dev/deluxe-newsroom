import { Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, MessageCircle, Search, ShieldCheck, X, Zap, LogOut, CalendarDays } from "lucide-react";
const logo = { url: "/logo.jpg" };
import { SITE } from "@/lib/site";
import { signOut } from "@/lib/api.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-3">
      <span className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-silver/40 transition-transform duration-300 group-hover:scale-105 md:size-14">
        <img src={logo.url} alt={SITE.nameAr} className="size-full object-cover" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-xl font-bold text-deep-foreground md:text-2xl">{SITE.nameAr}</span>
        </span>
      )}
    </Link>
  );
}

function useNav() {
  return useLoaderData({ from: "__root__" });
}

function BreakingTicker() {
  const { breaking } = useNav();
  if (!breaking.length) return null;
  const items = [...breaking, ...breaking];
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-stretch">
        <span className="z-10 flex shrink-0 items-center gap-1.5 bg-breaking px-4 py-2 text-sm font-black text-breaking-foreground">
          <Zap className="size-4" /> عاجل
        </span>
        <div className="relative flex-1 overflow-hidden whitespace-nowrap py-2">
          <div className="ticker-move">
            {items.map((b, i) => (
              <Link key={i} to="/news/$id" params={{ id: b.id }} className="mx-6 text-sm font-semibold text-foreground hover:text-primary">
                <span className="me-2 text-gold">◆</span>
                {b.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { categories, me } = useNav();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const logoutFn = useServerFn(signOut);
  const today = new Intl.DateTimeFormat("ar-LB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Beirut" }).format(new Date());

  const logout = async () => {
    await logoutFn();
    await router.invalidate();
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="hidden bg-deeper text-xs text-silver md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-3.5 text-accent" /> بيروت، {today}
          </span>
          <div className="flex items-center gap-4">
            {me ? (
              <span className="flex items-center gap-3">
                {me.isAdmin && (
                  <Link to="/admin" className="flex items-center gap-1 font-bold text-gold hover:text-deep-foreground">
                    <ShieldCheck className="size-3.5" /> لوحة التحكم
                  </Link>
                )}
                <span>{me.name}</span>
                <Button variant="ghost" onClick={logout} className="h-auto p-0 text-xs hover:text-deep-foreground">
                  <LogOut className="size-3.5" /> خروج
                </Button>
              </span>
            ) : (
              <Link to="/login" className="hover:text-deep-foreground">تسجيل الدخول</Link>
            )}
            <span className="opacity-30">|</span>
            <a href={SITE.whatsapp} target="_blank" rel="noreferrer" dir="ltr" className="font-bold hover:text-whatsapp">
              {SITE.phone}
            </a>
            <a href={SITE.channel} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-whatsapp px-3 py-1 font-bold text-whatsapp-foreground">
              <MessageCircle className="size-3.5" /> انضم للقناة
            </a>
          </div>
        </div>
      </div>

      <div className="glass-nav border-b border-deep-foreground/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 lg:px-6">
          <Logo />
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            <NavLink to="/">الرئيسية</NavLink>
            {categories.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to="/category/$slug" search={{ q: "", page: 1 }}
                params={{ slug: c.slug }}
                className="rounded-full px-4 py-2 text-sm font-bold text-silver transition-colors hover:bg-deep-foreground/10 hover:text-deep-foreground"
                activeProps={{ className: "bg-deep-foreground/10 text-deep-foreground" }}
              >
                {c.name}
              </Link>
            ))}
            <NavLink to="/news">كل الأخبار</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/news" search={{ q: "", page: 1 }} aria-label="بحث" className="grid size-10 place-items-center rounded-full text-silver hover:bg-deep-foreground/10 hover:text-deep-foreground">
              <Search className="size-5" />
            </Link>
            <Button variant="ghost" size="icon" aria-label="القائمة" onClick={() => setOpen(true)} className="size-10 rounded-full text-silver hover:bg-deep-foreground/10 lg:hidden">
              <Menu className="size-6" />
            </Button>
          </div>
        </div>
      </div>
      <BreakingTicker />

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <Button variant="ghost" aria-label="إغلاق الخلفية" className="absolute inset-0 h-full w-full rounded-none bg-deeper/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="fade-up absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col bg-deeper p-6 text-deep-foreground">
            <div className="flex items-center justify-between">
              <Logo />
              <Button variant="ghost" size="icon" aria-label="إغلاق" onClick={() => setOpen(false)} className="size-10 rounded-full hover:bg-deep-foreground/10">
                <X className="size-6" />
              </Button>
            </div>
            <div className="gold-rule my-6" />
            <nav className="flex flex-col gap-1 overflow-y-auto" onClick={() => setOpen(false)}>
              <Link to="/" className="rounded-xl px-4 py-3 font-bold hover:bg-deep-foreground/10">الرئيسية</Link>
              <Link to="/news" search={{ q: "", page: 1 }} className="rounded-xl px-4 py-3 font-bold hover:bg-deep-foreground/10">كل الأخبار</Link>
              {categories.map((c) => (
                <Link key={c.id} to="/category/$slug" search={{ q: "", page: 1 }} params={{ slug: c.slug }} className="rounded-xl px-4 py-3 font-bold text-silver hover:bg-deep-foreground/10">
                  {c.name}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 pt-6">
              {me?.isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-full bg-gold py-3 font-bold text-deeper">
                  <ShieldCheck className="size-4" /> لوحة التحكم
                </Link>
              )}
              {me ? (
                <Button variant="outline" onClick={logout} className="rounded-full border-deep-foreground/20 bg-transparent py-3 font-bold">تسجيل الخروج</Button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="rounded-full border border-deep-foreground/20 py-3 text-center font-bold">تسجيل الدخول</Link>
              )}
              <a href={SITE.channel} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-whatsapp py-3 font-bold text-whatsapp-foreground">
                <MessageCircle className="size-4" /> قناة الواتساب
              </a>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

const NAV_CLASS = "rounded-full px-4 py-2 text-sm font-bold text-silver transition-colors hover:bg-deep-foreground/10 hover:text-deep-foreground";
const NAV_ACTIVE = { className: "bg-deep-foreground/10 text-deep-foreground" };

function NavLink({ to, children }: { to: "/" | "/news"; children: ReactNode }) {
  if (to === "/news") {
    return (
      <Link to="/news" search={{ q: "", page: 1 }} activeOptions={{ exact: true }} className={NAV_CLASS} activeProps={NAV_ACTIVE}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/" activeOptions={{ exact: true }} className={NAV_CLASS} activeProps={NAV_ACTIVE}>
      {children}
    </Link>
  );
}

export function SiteFooter() {
  const { categories } = useNav();
  return (
    <footer className="mt-24 bg-deeper text-silver">
      <div className="gold-rule" />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-3">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-7 text-silver/70">منصة إخبارية لبنانية تنقل لكم الخبر بدقة وموضوعية.</p>
        </div>
        <div>
          <h3 className="mb-4 font-display text-lg text-deep-foreground">الأقسام</h3>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to="/category/$slug" search={{ q: "", page: 1 }} params={{ slug: c.slug }} className="hover:text-deep-foreground">{c.name}</Link>
              </li>
            ))}
            <li><Link to="/news" search={{ q: "", page: 1 }} className="hover:text-deep-foreground">كل الأخبار</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="mb-4 font-display text-lg text-deep-foreground">تواصل مع التحرير</h3>
          <a href={SITE.whatsapp} target="_blank" rel="noreferrer" dir="ltr" className="block text-lg font-bold text-deep-foreground hover:text-whatsapp">
            {SITE.phone}
          </a>
          <a href={SITE.channel} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-bold text-whatsapp-foreground">
            <MessageCircle className="size-4" /> تابع قناة الواتساب
          </a>
        </div>
      </div>
      <div className="border-t border-deep-foreground/10 py-5 text-center text-xs text-silver/60">
        © {new Date().getFullYear()} {SITE.nameAr} — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
