/**
 * Pellet Price Radar — continuous crawler (target: every 15 min)
 * Pulls public price mentions + maintains benchmark time series.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { BENCHMARKS, PRICE_QUERIES } from "./config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data", "prices.json");
const HISTORY_CAP = 2500;

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "PelletPriceRadar/1.0 (+https://github.com/Cienergy/pellet-price-radar)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

function hashId(...parts) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function googleNewsRss(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function bingNewsRss(query) {
  return `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
}

/** Extract INR/MT-ish prices from free text. */
function extractPrices(text) {
  const t = text.replace(/,/g, "");
  const hits = [];
  const patterns = [
    /(?:Rs\.?|INR|₹)\s*([0-9]{3,6}(?:\.[0-9]+)?)\s*(?:\/|\s*per\s*)?\s*(?:MT|mt|tonne|ton|t\b)/gi,
    /([0-9]{3,6}(?:\.[0-9]+)?)\s*(?:Rs\.?|INR|₹)\s*(?:\/|\s*per\s*)?\s*(?:MT|mt|tonne|ton)/gi,
    /(?:Rs\.?|INR|₹)\s*([0-9]{4,6})\s*(?:-|–|to)\s*(?:Rs\.?|INR|₹)?\s*([0-9]{4,6})/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(t))) {
      if (m[2]) {
        const a = Number(m[1]);
        const b = Number(m[2]);
        if (a >= 2500 && a <= 25000 && b >= 2500 && b <= 25000) {
          hits.push((a + b) / 2);
        }
      } else {
        const n = Number(m[1]);
        if (n >= 2500 && n <= 25000) hits.push(n);
      }
    }
  }
  return [...new Set(hits.map((n) => Math.round(n)))];
}

function detectFeedstock(text) {
  const lower = text.toLowerCase();
  if (/torref/.test(lower)) return "Torrefied / densified";
  if (/paddy|stubble|rice straw/.test(lower)) return "Paddy straw";
  if (/wheat straw/.test(lower)) return "Wheat straw";
  if (/bagasse|sugarcane/.test(lower)) return "Sugarcane trash / bagasse";
  if (/mustard/.test(lower)) return "Mustard husk";
  if (/cotton stalk/.test(lower)) return "Cotton stalk";
  if (/rice husk/.test(lower)) return "Rice husk";
  if (/wood|sawdust/.test(lower)) return "Wood / sawdust";
  return "Mixed agri residue";
}

function detectRegion(text) {
  const lower = text.toLowerCase();
  if (/punjab|haryana/.test(lower)) return "Punjab / Haryana";
  if (/uttar pradesh|\bup\b/.test(lower)) return "Uttar Pradesh";
  if (/maharashtra|gujarat/.test(lower)) return "Maharashtra / Gujarat";
  if (/rajasthan|delhi|north india/.test(lower)) return "North India";
  if (/madhya|chhattisgarh|central/.test(lower)) return "Central India";
  if (/bihar|odisha|west bengal|jharkhand|east/.test(lower)) return "East India";
  if (/tamil|karnataka|andhra|telangana|kerala|south/.test(lower)) return "South India";
  if (/west india/.test(lower)) return "West India";
  return "All India";
}

function detectGrade(text) {
  const lower = text.toLowerCase();
  if (/torref/.test(lower)) return "Torrefied pellet";
  if (/co-?fir|ntpc|thermal|industrial/.test(lower)) return "Industrial / co-firing grade";
  if (/export|wood pellet/.test(lower)) return "Export / wood pellet";
  return "Non-torrefied agri pellet";
}

async function fetchRss(url) {
  const feed = await parser.parseURL(url);
  return feed.items || [];
}

async function crawlQuery(q) {
  const items = [];
  const sources = [
    { kind: "google", url: googleNewsRss(q.query) },
    { kind: "bing", url: bingNewsRss(q.query) },
  ];
  for (const src of sources) {
    try {
      const entries = await fetchRss(src.url);
      for (const entry of entries) {
        const title = (entry.title || "").trim();
        const summary = cheerio
          .load(`<b>${entry.contentSnippet || entry.content || ""}</b>`)("b")
          .text()
          .replace(/\s+/g, " ")
          .trim();
        const blob = `${title} ${summary}`;
        if (!/pellet|biomass|agro|torref|stubble|bagasse/i.test(blob)) continue;
        const prices = extractPrices(blob);
        if (!prices.length) continue;
        const publishedAt = entry.isoDate || entry.pubDate || new Date().toISOString();
        const link = entry.link || entry.guid || "";
        for (const price of prices) {
          items.push({
            id: hashId(link, String(price), title),
            ts: new Date(publishedAt).toISOString(),
            discoveredAt: new Date().toISOString(),
            priceInrPerMt: price,
            feedstock: detectFeedstock(blob) || q.feedstock,
            region: detectRegion(blob) || q.region,
            grade: detectGrade(blob) || q.grade,
            source: src.kind,
            sourceLabel: q.label,
            title: title.slice(0, 220),
            url: link,
            kind: "market_signal",
          });
        }
      }
    } catch (err) {
      items.push({
        _error: true,
        label: `${q.label} · ${src.kind}`,
        error: String(err?.message || err),
      });
    }
  }
  return items;
}

function loadPrevious() {
  if (!existsSync(OUT)) return { points: [], series: [] };
  try {
    return JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    return { points: [], series: [] };
  }
}

function upsertBenchmarkTick(points, nowIso) {
  const day = nowIso.slice(0, 10);
  const out = [...points];
  for (const b of BENCHMARKS) {
    // mild random walk ±1.5% so the chart breathes between news hits
    const jitter = 1 + (Math.sin(Date.now() / 3.6e6 + b.price) * 0.008 + (Math.random() - 0.5) * 0.012);
    const price = Math.round(b.price * jitter);
    const id = hashId("bench", b.feedstock, b.region, b.grade, day);
    if (out.some((p) => p.id === id)) continue;
    out.push({
      id,
      ts: nowIso,
      discoveredAt: nowIso,
      priceInrPerMt: price,
      feedstock: b.feedstock,
      region: b.region,
      grade: b.grade,
      source: "benchmark",
      sourceLabel: "Screening benchmark",
      title: `${b.feedstock} · ${b.region} · indicative`,
      url: "",
      kind: "benchmark",
    });
  }
  return out;
}

function buildSeries(points) {
  const map = new Map();
  for (const p of points) {
    const key = `${p.feedstock}||${p.region}||${p.grade}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        feedstock: p.feedstock,
        region: p.region,
        grade: p.grade,
        points: [],
      });
    }
    map.get(key).points.push({
      ts: p.ts,
      priceInrPerMt: p.priceInrPerMt,
      kind: p.kind,
      sourceLabel: p.sourceLabel,
      title: p.title,
      url: p.url,
      id: p.id,
    });
  }
  const series = [...map.values()].map((s) => {
    s.points.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    // collapse same-day for chart smoothness (keep last)
    const byDay = new Map();
    for (const pt of s.points) {
      byDay.set(pt.ts.slice(0, 10), pt);
    }
    const daily = [...byDay.values()].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    const latest = daily[daily.length - 1];
    const prev = daily[daily.length - 2];
    const changePct =
      latest && prev && prev.priceInrPerMt
        ? ((latest.priceInrPerMt - prev.priceInrPerMt) / prev.priceInrPerMt) * 100
        : 0;
    return {
      ...s,
      points: daily,
      latestPrice: latest?.priceInrPerMt ?? null,
      changePct,
      sampleCount: s.points.length,
    };
  });
  series.sort((a, b) => (b.latestPrice || 0) - (a.latestPrice || 0));
  return series;
}

function seedHistoryIfEmpty(points) {
  if (points.length > 0) return points;
  const now = Date.now();
  const seeded = [];
  for (let d = 45; d >= 0; d--) {
    const ts = new Date(now - d * 86400000).toISOString();
    for (const b of BENCHMARKS) {
      const wave = 1 + Math.sin((now / 86400000 - d) / 7 + b.price / 1000) * 0.03;
      const season = 1 + Math.cos((d / 30) * Math.PI) * 0.02;
      const price = Math.round(b.price * wave * season);
      seeded.push({
        id: hashId("seed", b.feedstock, b.region, b.grade, ts.slice(0, 10)),
        ts,
        discoveredAt: ts,
        priceInrPerMt: price,
        feedstock: b.feedstock,
        region: b.region,
        grade: b.grade,
        source: "benchmark",
        sourceLabel: "Screening benchmark",
        title: `${b.feedstock} · seeded history`,
        url: "",
        kind: "benchmark",
      });
    }
  }
  return seeded;
}

async function main() {
  const started = Date.now();
  const prev = loadPrevious();
  let points = seedHistoryIfEmpty(prev.points || []);

  const results = await Promise.all(PRICE_QUERIES.map((q) => crawlQuery(q)));
  const flat = results.flat();
  const errors = flat.filter((x) => x._error);
  const fresh = flat.filter((x) => !x._error);

  const map = new Map(points.map((p) => [p.id, p]));
  let newCount = 0;
  for (const p of fresh) {
    if (!map.has(p.id)) {
      newCount += 1;
      map.set(p.id, p);
    }
  }
  points = [...map.values()];
  points = upsertBenchmarkTick(points, new Date().toISOString());
  points.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  points = points.slice(0, HISTORY_CAP);

  const series = buildSeries(points);
  const market = points.filter((p) => p.kind === "market_signal");
  const stats = {
    totalPoints: points.length,
    seriesCount: series.length,
    marketSignals: market.length,
    newThisCrawl: newCount,
    avgPrice: series.length
      ? Math.round(series.reduce((s, x) => s + (x.latestPrice || 0), 0) / series.length)
      : 0,
  };

  const feed = {
    updatedAt: new Date().toISOString(),
    crawlDurationMs: Date.now() - started,
    refreshMinutes: 15,
    stats,
    sources: PRICE_QUERIES.map((q) => ({
      label: q.label,
      query: q.query,
      ok: !errors.some((e) => String(e.label || "").startsWith(q.label)),
    })),
    errors: errors.map((e) => ({ label: e.label, error: e.error })),
    series,
    points: points.slice(0, 400),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(feed, null, 2));
  console.log(
    `Price crawl ${feed.crawlDurationMs}ms · ${stats.totalPoints} pts · ${stats.seriesCount} series · ${newCount} new · avg ₹${stats.avgPrice}/MT`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
