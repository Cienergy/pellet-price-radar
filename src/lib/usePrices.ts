import { useCallback, useEffect, useState } from "react";
import type { PriceFeed } from "./types";

const URL = `${import.meta.env.BASE_URL}data/prices.json`;

export function usePrices(pollMs = 60_000) {
  const [feed, setFeed] = useState<PriceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(`${URL}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as PriceFeed;
      setFeed(next);
      setCheckedAt(new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const id = window.setInterval(() => void refresh(false), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return { feed, loading, refreshing, checkedAt, error, refresh };
}

export function fmt(n: number, d = 0) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
}
