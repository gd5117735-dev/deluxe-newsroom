/** Compresses an image in the browser before upload (any input size). GIFs are kept as-is. */
export async function compressImage(file: File, maxSide = 2000, quality = 0.82): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  let q = quality;
  let blob: Blob | null = null;
  // Shrink quality until under ~1.5 MB.
  for (let i = 0; i < 6; i++) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", q));
    if (!blob || blob.size < 1.5 * 1024 * 1024) break;
    q -= 0.12;
  }
  if (!blob || (blob.size >= file.size && scale === 1 && file.size < 10 * 1024 * 1024)) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
}
