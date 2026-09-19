# Pellet Price Radar

Live **₹/MT** time series for Indian biomass / agri pellets by:

- **RM / feedstock** (paddy straw, bagasse, mustard husk, …)
- **Region**
- **Grade** (non-torrefied, torrefied, co-firing, export)

## Crawl

```bash
npm run crawl   # writes public/data/prices.json
npm run dev
```

GitHub Action runs **every 15 minutes**, commits updated prices, and Pages redeploys on push.

## Note

Market signals are scraped from public news when an explicit price appears. Screening benchmarks fill RM × region × grade gaps. Not an exchange feed.
