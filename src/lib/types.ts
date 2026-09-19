export type PricePoint = {
  id: string;
  ts: string;
  priceInrPerMt: number;
  kind: string;
  sourceLabel?: string;
  title?: string;
  url?: string;
};

export type PriceSeries = {
  key: string;
  feedstock: string;
  region: string;
  grade: string;
  points: PricePoint[];
  latestPrice: number | null;
  changePct: number;
  sampleCount: number;
};

export type PriceFeed = {
  updatedAt: string;
  crawlDurationMs: number;
  refreshMinutes: number;
  stats: {
    totalPoints: number;
    seriesCount: number;
    marketSignals: number;
    newThisCrawl: number;
    avgPrice: number;
  };
  sources: Array<{ label: string; query: string; ok: boolean }>;
  errors: Array<{ label: string; error: string }>;
  series: PriceSeries[];
  points: Array<PricePoint & {
    feedstock: string;
    region: string;
    grade: string;
    source: string;
    kind: string;
    title: string;
    url: string;
  }>;
};
