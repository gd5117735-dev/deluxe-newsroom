import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Save, Upload, X } from "lucide-react";
import { adminSaveArticle, adminUploadImage } from "@/lib/api.functions";
import type { Article, Category } from "@/lib/types";
import { mediaUrl } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ArticleEditor({ article, categories, onClose, onSaved }: { article: Article | null; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [cover, setCover] = useState(article?.cover_key ?? null); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false);
  const save = useServerFn(adminSaveArticle); const upload = useServerFn(adminUploadImage); const src = mediaUrl(cover);
  return <section><div className="mb-8 flex items-center justify-between"><h2 className="text-2xl font-bold text-deep">{article ? "تعديل الخبر" : "خبر جديد"}</h2><Button variant="ghost" size="icon" aria-label="إغلاق المحرر" onClick={onClose}><X /></Button></div>
    <form className="grid gap-8 lg:grid-cols-[1fr_280px]" onSubmit={async e => {
      e.preventDefault(); setBusy(true); const f = new FormData(e.currentTarget);
      try { await save({ data: { id: article?.id ?? null, title: String(f.get("title")), excerpt: String(f.get("excerpt")), content: String(f.get("content")), cover_key: cover, category_id: String(f.get("category")) || null, status: f.get("status") === "published" ? "published" : "draft", is_featured: f.get("featured") === "on", show_on_home: f.get("home") === "on", is_breaking: f.get("breaking") === "on" } }); toast.success("تم حفظ الخبر"); onSaved(); }
      catch (err) { toast.error(err instanceof Error ? err.message : "تعذّر الحفظ"); } finally { setBusy(false); }
    }}>
      <div className="space-y-6">
        <label className="block space-y-2"><span className="font-bold">عنوان الخبر</span><Input name="title" required minLength={3} maxLength={300} defaultValue={article?.title} className="h-12 text-lg" /></label>
        <label className="block space-y-2"><span className="font-bold">الموجز</span><Textarea name="excerpt" maxLength={600} defaultValue={article?.excerpt} className="min-h-24" /></label>
        <label className="block space-y-2"><span className="font-bold">نص الخبر</span><Textarea name="content" maxLength={200000} defaultValue={article?.content} className="min-h-80 leading-8" /></label>
      </div>
      <div className="space-y-6 border-t pt-6 lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0">
        <label className="block space-y-2"><span className="font-bold">صورة الغلاف</span>{src && <img src={src} alt="صورة الغلاف" className="aspect-video w-full rounded-md object-cover" />}<span className="flex items-center gap-2 text-sm text-muted-foreground"><Upload className="size-4" />{uploading ? "جارٍ رفع الصورة…" : "اختيار صورة"}</span>
          <Input aria-label="صورة الغلاف" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={uploading} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setUploading(true); const f = new FormData(); f.set("file", file); try { const r = await upload({ data: f }); setCover(r.key); } catch (err) { toast.error(err instanceof Error ? err.message : "تعذّر رفع الصورة"); } finally { setUploading(false); } }} />
        </label>
        {cover && <Button type="button" variant="ghost" onClick={() => setCover(null)}>إزالة الصورة</Button>}
        <label className="block space-y-2"><span className="font-bold">التصنيف</span><select name="category" defaultValue={article?.category_id ?? ""} className="h-10 w-full rounded-md border bg-background px-3"><option value="">بدون تصنيف</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="block space-y-2"><span className="font-bold">الحالة</span><select name="status" defaultValue={article?.status ?? "draft"} className="h-10 w-full rounded-md border bg-background px-3"><option value="draft">مسودة</option><option value="published">منشور</option></select></label>
        <div className="space-y-4">{[{ name: "home", text: "إظهار في الرئيسية", value: article?.show_on_home }, { name: "featured", text: "خبر رئيسي مميز", value: article?.is_featured }, { name: "breaking", text: "خبر عاجل", value: article?.is_breaking }].map(x => <label key={x.name} className="flex items-center gap-3"><input name={x.name} type="checkbox" defaultChecked={!!x.value} className="size-4 accent-primary" /><span>{x.text}</span></label>)}</div>
        <Button type="submit" disabled={busy || uploading} className="w-full"><Save />{busy ? "جارٍ الحفظ…" : "حفظ الخبر"}</Button>
      </div>
    </form>
  </section>;
}