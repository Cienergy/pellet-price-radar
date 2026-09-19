import { formatDistanceToNow } from "date-fns";
import { usePrices } from "../lib/usePrices";

export function SourcesPage() {
  const { feed, loading, error } = usePrices();
  if (loading && !feed) return <div className="loading">Loading…</div>;
  if (error && !feed) return <div className="error">{error}</div>;
  if (!feed) return null;

  return (
    <div className="page">
      <div className="scan-hero">
        <h1>Sources</h1>
        <p>
          Public news price mentions + screening benchmarks. Crawler target: every{" "}
          {feed.refreshMinutes} minutes (GitHub Actions). Last run{" "}
          {formatDistanceToNow(Date.parse(feed.updatedAt), { addSuffix: true })} ·{" "}
          {(feed.crawlDurationMs / 1000).toFixed(1)}s
        </p>
      </div>
      <div className="panel">
        <div className="panel-head"><h2>Query pack</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Status</th>
                <th>Label</th>
                <th>Query</th>
              </tr>
            </thead>
            <tbody>
              {feed.sources.map((s) => (
                <tr key={s.label}>
                  <td>
                    <span className={`level ${s.ok ? "strong" : "weak"}`}>
                      {s.ok ? "ok" : "fail"}
                    </span>
                  </td>
                  <td>{s.label}</td>
                  <td className="wrap">{s.query}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {feed.errors?.length > 0 && (
        <div className="panel" style={{ marginTop: "0.85rem" }}>
          <div className="panel-head"><h2>Crawl errors</h2></div>
          <div className="table-wrap">
            <table className="data">
              <tbody>
                {feed.errors.map((e) => (
                  <tr key={e.label}>
                    <td>{e.label}</td>
                    <td className="wrap">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="footnote">
        Market signals are extracted from public articles when an explicit ₹/MT (or Rs/tonne)
        figure appears. Benchmarks fill gaps for RM × region × grade screening.
      </p>
    </div>
  );
}
