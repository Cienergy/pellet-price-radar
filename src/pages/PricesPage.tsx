import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PriceSeries } from "../lib/types";
import { formatStamp } from "../lib/time";
import { fmt, usePrices } from "../lib/usePrices";

const COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#be123c", "#7c3aed", "#0891b2", "#65a30d", "#c2410c"];

export function PricesPage() {
  const { feed, loading, refreshing, checkedAt, error, refresh } = usePrices();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [feedstock, setFeedstock] = useState("");
  const [region, setRegion] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (!feed) return [];
    return feed.series.filter((s) => {
      if (feedstock && s.feedstock !== feedstock) return false;
      if (region && s.region !== region) return false;
      if (grade && s.grade !== grade) return false;
      return true;
    });
  }, [feed, feedstock, region, grade]);

  const active: PriceSeries | null =
    filtered.find((s) => s.key === selectedKey) || filtered[0] || null;

  const chartRows = useMemo(() => {
    const keys = filtered.slice(0, 5);
    const dates = new Set<string>();
    for (const s of keys) for (const p of s.points) dates.add(p.ts.slice(0, 10));
    return [...dates]
      .sort()
      .map((day) => {
        const row: Record<string, string | number | null> = { day };
        for (const s of keys) {
          const hit = [...s.points].reverse().find((p) => p.ts.slice(0, 10) <= day);
          row[s.key] = hit?.priceInrPerMt ?? null;
        }
        return row;
      });
  }, [filtered]);

  if (loading && !feed) return <div className="loading">Loading price series…</div>;
  if (error && !feed) return <div className="error">{error}</div>;
  if (!feed) return <div className="error">No price feed — run npm run crawl</div>;

  const feedstocks = [...new Set(feed.series.map((s) => s.feedstock))].sort();
  const regions = [...new Set(feed.series.map((s) => s.region))].sort();
  const grades = [...new Set(feed.series.map((s) => s.grade))].sort();

  return (
    <div className="page">
      <div className="kpi-row">
        <div className="kpi-card tone-teal">
          <div className="kpi-label">Series</div>
          <div className="kpi-value">{feed.stats.seriesCount}</div>
        </div>
        <div className="kpi-card tone-blue">
          <div className="kpi-label">Avg latest</div>
          <div className="kpi-value">₹{fmt(feed.stats.avgPrice)}<span>/MT</span></div>
        </div>
        <div className="kpi-card tone-amber">
          <div className="kpi-label">Market signals</div>
          <div className="kpi-value">{feed.stats.marketSignals}</div>
        </div>
        <div className="kpi-card tone-rose">
          <div className="kpi-label">Refresh</div>
          <div className="kpi-value sm">{feed.refreshMinutes}m</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={feedstock} onChange={(e) => setFeedstock(e.target.value)}>
          <option value="">All RM / feedstock</option>
          {feedstocks.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn primary"
          disabled={refreshing}
          onClick={() => void refresh(true)}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
        <span className="live-pill" title={feed.updatedAt}>
          <span className="pulse" />
          Crawl {formatStamp(feed.updatedAt, nowMs)}
          {checkedAt ? ` · checked ${formatStamp(checkedAt, nowMs)}` : ""}
        </span>
        {error ? <span className="toolbar-error">{error}</span> : null}
      </div>

      <div className="panel chart-panel">
        <div className="panel-head">
          <h2>Price time series · ₹ / MT</h2>
          <span className="muted">Top {Math.min(5, filtered.length)} filtered series</span>
        </div>
        <div className="panel-body chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis
                width={56}
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                formatter={(v) => [`₹${fmt(Number(v))}/MT`, ""]}
                labelFormatter={(l) => String(l)}
              />
              <Legend />
              {filtered.slice(0, 5).map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={`${s.feedstock} · ${s.region}`}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="feed-layout">
        <aside className="series-list">
          {filtered.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`series-card ${active?.key === s.key ? "active" : ""}`}
              onClick={() => setSelectedKey(s.key)}
            >
              <div className="series-top">
                <span className="rm">{s.feedstock}</span>
                <span className={`chg ${s.changePct >= 0 ? "up" : "down"}`}>
                  {s.changePct >= 0 ? "+" : ""}
                  {s.changePct.toFixed(1)}%
                </span>
              </div>
              <div className="price">₹{fmt(s.latestPrice || 0)}<span>/MT</span></div>
              <p className="meta">{s.region} · {s.grade}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="muted empty">No series match filters.</p>}
        </aside>

        <section className="panel detail">
          {active ? (
            <>
              <div className="panel-head">
                <h2>{active.feedstock}</h2>
                <span className="muted">{active.sampleCount} samples</span>
              </div>
              <div className="panel-body">
                <div className="detail-kpis">
                  <div>
                    <span>Latest</span>
                    <strong>₹{fmt(active.latestPrice || 0)}</strong>
                  </div>
                  <div>
                    <span>Region</span>
                    <strong className="sm">{active.region}</strong>
                  </div>
                  <div>
                    <span>Grade</span>
                    <strong className="sm">{active.grade}</strong>
                  </div>
                </div>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>₹/MT</th>
                        <th>Kind</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...active.points].reverse().slice(0, 30).map((p) => (
                        <tr key={p.id}>
                          <td>{p.ts.slice(0, 10)}</td>
                          <td>{fmt(p.priceInrPerMt)}</td>
                          <td>{p.kind}</td>
                          <td className="wrap">
                            {p.url ? (
                              <a href={p.url} target="_blank" rel="noreferrer">{p.sourceLabel || "link"}</a>
                            ) : (
                              p.sourceLabel || "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="panel-body"><p className="muted">Select a series.</p></div>
          )}
        </section>
      </div>
    </div>
  );
}
