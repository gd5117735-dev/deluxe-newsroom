import { useEffect, useState } from "react";
import { formatDate, timeAgo } from "@/lib/types";

/** Relative time that refreshes itself every 30 seconds. */
export function LiveTime({ ts, withDate }: { ts: number; withDate?: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <time dateTime={new Date(ts).toISOString()} title={formatDate(ts)} suppressHydrationWarning>
      {withDate ? `${formatDate(ts)} · ${timeAgo(ts)}` : timeAgo(ts)}
    </time>
  );
}
