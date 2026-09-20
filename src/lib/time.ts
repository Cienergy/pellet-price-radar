/** Format crawl timestamps with clock time + relative age (avoids "stale" confusion). */
export function formatStamp(iso?: string | null, nowMs = Date.now()): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const abs = new Date(t).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const mins = Math.max(0, Math.round((nowMs - t) / 60_000));
  let rel: string;
  if (mins < 1) rel = "just now";
  else if (mins < 60) rel = `${mins}m ago`;
  else if (mins < 60 * 48) rel = `${Math.round(mins / 60)}h ago`;
  else rel = `${Math.round(mins / (60 * 24))}d ago`;
  return `${abs} · ${rel}`;
}
