import { useCallback, useEffect, useState } from "react";
import type { PriceFeed } from "./types";

const URL = `${import.meta.env.BASE_URL}data/prices.json`;

export function usePrices(pollMs = 60_000) {
  const [feed, setFeed] = useState<PriceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${URL}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeed((await res.json()) as PriceFeed);
      setError(null);
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return { feed, loading, error, refresh };
}

export function fmt(n: number, d = 0) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
}
