# Manager Forecasts — Weekly

A cockpit for the weekly forecast meeting: manager calls, swing factors, rep/customer
headlines, pipeline-generation tips, and a trending-behind account segment — all
snapshotted week over week.

## Run it

This is a Vite app, so **opening `index.html` directly from disk shows a blank page** —
browsers block its module script over `file://`. You have to serve it over HTTP:

```bash
npm install
npm run dev      # development, hot reload — open the http://localhost URL it prints
```

To view a production build:

```bash
npm run build
npm run preview  # serves dist/ over HTTP
```

### Want a file you can just double-click?

Build a single self-contained HTML with everything inlined — it opens straight from the
filesystem, no server needed:

```bash
npm run build:standalone   # writes standalone/index.html
```

Then double-click `standalone/index.html`. (A prebuilt copy, `Forecast-Cockpit.html`, is
included at the repo root so you can open it immediately without building.)

## What's in here

- **Overview** — top-line call vs plan, per-manager week-over-week movement, a trend chart, and the flagged trending-behind list.
- **Manager Calls** — each manager's commit / call / best, with the prior week carried in. Drop the forecast CSV export to fill the whole table at once.
- **Swings** — deals that could move the number up or down; nets to a single figure.
- **Headlines** — the week's notable rep/customer stories; carry forward and stay editable.
- **Pipeline Tips** — draft 1–3 reusable tips from pasted Slack/Gong notes, check the ones to share.
- **Trending Behind** — accounts pacing behind plan, evaluated against a configurable Day 180 / Day 270 rule. Drag the adoption CSV export to populate; the importer auto-maps columns and handles 0–1 ratios vs 0–100 percentages.
- **Weekly Update** — assembles everything (including only the tips you selected) into a copy-ready summary.
- **Settings** — manager roster, the trending-behind thresholds and AND/OR rule, and the weekly plan.

## CSV import formats

**Forecast export** (Manager Calls tab): a row per manager with the reps indented beneath
them and a `Total` row. The importer keeps the manager rollup rows and maps
`Most Likely → call`, `Commit → commit`, `Best Case → best`, and the Total `Goal → plan`.

**Adoption / trending export** (Trending Behind tab): one row per account with an
account name, an owner/manager, and a Day 180 pacing column (Day 270 optional). Pacing
values may be ratios (0–1) or percentages (0–100) — the importer detects which and you
can override with a toggle.

## Two things to know about persistence and AI (important)

This started life as a Claude artifact, where the host provides two conveniences that
**do not exist when you run this repo on your own**:

1. **Persistence.** In Claude, data is saved via `window.storage`. Standalone, the app
   falls back to **`localStorage`**, so your data persists in that browser only — not
   across devices or teammates. For shared, durable storage, replace the `sget`/`sset`
   helpers in `src/App.jsx` with calls to a real backend (Postgres, Supabase, etc.).

2. **AI pipeline tips.** In Claude, the "Suggest tips" button calls the Anthropic API
   with auth injected by the host. Standalone, a browser can't call the API directly
   (no key, and you should never ship a key in client code). Point the `AI_ENDPOINT`
   constant in `src/App.jsx` at your own backend proxy that holds the key. Until then,
   manual tip entry works fine; only the auto-suggest is disabled.

## Roadmap / not yet wired

- **Live Snowflake feeds** for the forecast (`GSINCREV0FCST01`) and adoption pacing
  (`GS_REPORTING_Q2`) dashboards, to replace the weekly CSV drop.
- **Day 270 join** — the current adoption export is Day 180 only; loading the matching
  Day 270 export lets the rule evaluate both milestones per account.
- **Gong + Slack inputs** feeding the pipeline-tips drafter automatically.

## Stack

Vite · React 18 · Recharts · lucide-react · PapaParse. No CSS framework — styling is
self-contained in the component.
