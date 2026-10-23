import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole } from "lucide-react";
import { getMe, signIn, signUp } from "@/lib/api.functions";
import { pageHead } from "@/lib/metadata";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({ head: () => pageHead("تسجيل الدخول", "الدخول إلى حسابك في دليل بيروتي."), component: Login });
function Login() {
  const [register, setRegister] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const router = useRouter(); const login = useServerFn(signIn); const signup = useServerFn(signUp); const me = useServerFn(getMe);
  return <SiteLayout><div className="mx-auto max-w-md px-6 py-16">
    <LockKeyhole className="mb-6 size-9 text-primary" /><h1 className="text-3xl font-bold text-deep">{register ? "إنشاء حساب" : "أهلاً بعودتك"}</h1>
    <form className="mt-8 space-y-5" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(""); const form = new FormData(e.currentTarget);
      try {
        const email = String(form.get("email")); const password = String(form.get("password"));
        if (register) await signup({ data: { name: String(form.get("name")), email, password } }); else await login({ data: { email, password } });
        const user = await me(); await router.invalidate(); await router.navigate({ to: user?.isAdmin ? "/admin" : "/" });
      } catch (err) { setError(err instanceof Error ? err.message : "تعذّر تسجيل الدخول"); } finally { setBusy(false); }
    }}>
      {register && <label className="block space-y-2"><span>الاسم</span><Input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>}
      <label className="block space-y-2"><span>البريد الإلكتروني</span><Input name="email" type="email" dir="ltr" autoComplete="email" required maxLength={160} /></label>
      <label className="block space-y-2"><span>كلمة المرور</span><Input name="password" type="password" dir="ltr" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 8 : 1} maxLength={128} /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} type="submit" className="h-11 w-full">{busy ? "جارٍ المتابعة…" : register ? "إنشاء حساب" : "تسجيل الدخول"}</Button>
    </form>
    <Button variant="link" className="mt-5 px-0" onClick={() => { setRegister(!register); setError(""); }}>{register ? "لديك حساب؟ تسجيل الدخول" : "حساب جديد"}</Button>
  </div></SiteLayout>;
}