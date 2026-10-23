import { createFileRoute } from "@tanstack/react-router";

// Public image delivery for uploaded news photos (read-only, keys are random UUIDs).
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat ?? "";
        if (!/^uploads\/[\w/.-]+$/.test(key) || key.includes("..")) {
          return new Response("Not found", { status: 404 });
        }
        const { getMedia } = await import("@/server/repo.server");
        const obj = await getMedia(key);
        if (!obj) return new Response("Not found", { status: 404 });
        return new Response(obj.bytes, {
          headers: { "content-type": obj.type, "cache-control": "public, max-age=31536000, immutable" },
        });
      },
    },
  },
});
