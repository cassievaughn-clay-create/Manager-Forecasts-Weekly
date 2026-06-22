import React, { useState, useEffect, useMemo, useRef } from "react";
import Papa from "papaparse";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, Users, ArrowUpDown, Megaphone, Lightbulb, TrendingDown,
  FileText, Settings as SettingsIcon, Plus, Trash2, Check, X, Copy, Sparkles,
  ChevronUp, ChevronDown, AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Weekly Forecast Cockpit
 * A live console for the weekly forecast meeting: manager calls,
 * swings, headlines, pipeline tips, and trending-behind accounts —
 * all snapshotted week over week.
 * ------------------------------------------------------------------ */

const T = {
  ink: "#0E1116", panel: "#161B22", panel2: "#1C232D", line: "#2A323D",
  text: "#E6EDF3", muted: "#8B98A5", faint: "#5B6673",
  accent: "#4CC2FF", up: "#3FB950", down: "#F85149", warn: "#D6A126",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
.wfm, .wfm * { font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.wfm .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.wfm {
  background:${T.ink}; color:${T.text}; min-height:100vh; width:100%;
  display:flex; flex-direction:column; -webkit-font-smoothing:antialiased;
}
.wfm button { font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wfm input, .wfm textarea, .wfm select {
  font-family:inherit; background:${T.ink}; color:${T.text};
  border:1px solid ${T.line}; border-radius:7px; padding:7px 9px; font-size:13px; outline:none;
  transition:border-color .15s, box-shadow .15s;
}
.wfm input:focus, .wfm textarea:focus, .wfm select:focus {
  border-color:${T.accent}; box-shadow:0 0 0 3px rgba(76,194,255,.13);
}
.wfm input::placeholder, .wfm textarea::placeholder { color:${T.faint}; }

/* topbar */
.wfm .top { display:flex; align-items:center; gap:18px; padding:13px 22px;
  border-bottom:1px solid ${T.line}; background:linear-gradient(180deg,#171D25,${T.panel}); }
.wfm .brand { display:flex; flex-direction:column; line-height:1.1; }
.wfm .brand b { font-size:15px; font-weight:700; letter-spacing:-.2px; }
.wfm .brand span { font-size:10.5px; color:${T.muted}; letter-spacing:.5px; text-transform:uppercase; }
.wfm .gauge { flex:1; max-width:420px; }
.wfm .gauge .gl { display:flex; justify-content:space-between; font-size:11px; color:${T.muted}; margin-bottom:5px; }
.wfm .bar { height:8px; background:${T.panel2}; border-radius:99px; overflow:hidden; position:relative; }
.wfm .bar i { display:block; height:100%; border-radius:99px; transition:width .5s cubic-bezier(.2,.8,.2,1); }
.wfm .tpill { display:flex; flex-direction:column; align-items:flex-end; }
.wfm .tpill small { font-size:10px; color:${T.muted}; text-transform:uppercase; letter-spacing:.5px; }
.wfm .tpill b { font-size:18px; font-weight:600; }
.wfm .wk { display:flex; align-items:center; gap:8px; }

/* shell */
.wfm .shell { display:flex; flex:1; min-height:0; }
.wfm .nav { width:208px; border-right:1px solid ${T.line}; padding:14px 10px; background:${T.panel};
  display:flex; flex-direction:column; gap:2px; flex-shrink:0; }
.wfm .nav button { display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:8px;
  font-size:13px; color:${T.muted}; text-align:left; transition:background .12s,color .12s; width:100%; }
.wfm .nav button:hover { background:${T.panel2}; color:${T.text}; }
.wfm .nav button.on { background:rgba(76,194,255,.12); color:${T.accent}; }
.wfm .nav button.on svg { color:${T.accent}; }
.wfm .nav .navtag { margin-left:auto; font-size:10px; padding:1px 6px; border-radius:99px;
  background:${T.down}; color:#fff; font-weight:600; }
.wfm .main { flex:1; overflow:auto; padding:24px 28px 60px; }
.wfm .main { animation:fade .35s ease; }
@keyframes fade { from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;} }

.wfm h2 { font-size:19px; font-weight:600; margin:0 0 3px; letter-spacing:-.3px; }
.wfm .sub { font-size:12.5px; color:${T.muted}; margin:0 0 18px; max-width:640px; line-height:1.5; }

/* cards */
.wfm .card { background:${T.panel}; border:1px solid ${T.line}; border-radius:12px; padding:16px 18px; }
.wfm .grid { display:grid; gap:14px; }
.wfm .tape { display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:12px; }
.wfm .mcard { background:${T.panel}; border:1px solid ${T.line}; border-radius:11px; padding:13px 14px; }
.wfm .mcard .mn { font-size:12px; color:${T.muted}; margin-bottom:7px; }
.wfm .mcard .mv { font-size:23px; font-weight:600; letter-spacing:-.5px; }
.wfm .delta { font-size:12px; display:inline-flex; align-items:center; gap:2px; margin-top:4px; }

/* table */
.wfm table { width:100%; border-collapse:collapse; }
.wfm th { text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.6px;
  color:${T.muted}; font-weight:600; padding:8px 10px; border-bottom:1px solid ${T.line}; }
.wfm td { padding:7px 10px; border-bottom:1px solid ${T.panel2}; font-size:13px; vertical-align:middle; }
.wfm tr:last-child td { border-bottom:none; }
.wfm td input, .wfm td select { width:100%; }
.wfm .cellnum input { text-align:right; font-family:'JetBrains Mono',monospace; font-variant-numeric:tabular-nums; }

/* buttons */
.wfm .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 13px; border-radius:8px;
  font-size:13px; font-weight:500; transition:filter .12s,background .12s,border-color .12s; }
.wfm .btn.pri { background:${T.accent}; color:#06141d; font-weight:600; }
.wfm .btn.pri:hover { filter:brightness(1.08); }
.wfm .btn.gho { border:1px solid ${T.line}; color:${T.text}; }
.wfm .btn.gho:hover { border-color:${T.accent}; color:${T.accent}; }
.wfm .btn.sm { padding:5px 9px; font-size:12px; }
.wfm .ico { padding:6px; border-radius:7px; color:${T.faint}; transition:color .12s,background .12s; }
.wfm .ico:hover { color:${T.down}; background:${T.panel2}; }

.wfm .row { display:flex; align-items:center; gap:10px; }
.wfm .between { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.wfm .tag { font-size:10.5px; padding:2px 8px; border-radius:99px; font-weight:600; letter-spacing:.3px; }
.wfm .empty { border:1px dashed ${T.line}; border-radius:11px; padding:26px; text-align:center; color:${T.muted}; font-size:13px; }
.wfm .empty b { color:${T.text}; display:block; margin-bottom:4px; font-size:14px; }

/* tips */
.wfm .tip { display:flex; gap:12px; align-items:flex-start; padding:13px 14px; border:1px solid ${T.line};
  border-radius:11px; transition:border-color .12s; }
.wfm .tip.inc { border-color:rgba(63,185,80,.5); background:rgba(63,185,80,.05); }
.wfm .chk { width:21px; height:21px; border-radius:6px; border:1.5px solid ${T.line}; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; margin-top:1px; transition:all .12s; }
.wfm .chk.on { background:${T.up}; border-color:${T.up}; color:#06141d; }
.wfm .src { font-size:10px; padding:1px 7px; border-radius:99px; border:1px solid ${T.line}; color:${T.muted}; }

.wfm .out { background:${T.ink}; border:1px solid ${T.line}; border-radius:10px; padding:16px; font-size:13px;
  line-height:1.6; white-space:pre-wrap; max-height:440px; overflow:auto; }
.wfm .out .mono { font-size:12.5px; }
.wfm .notice { font-size:11.5px; color:${T.warn}; display:flex; gap:7px; align-items:flex-start;
  background:rgba(214,161,38,.08); border:1px solid rgba(214,161,38,.28); border-radius:9px; padding:9px 12px; }
.wfm label.fld { display:flex; flex-direction:column; gap:5px; font-size:11.5px; color:${T.muted}; }
.wfm .seg { display:inline-flex; border:1px solid ${T.line}; border-radius:8px; overflow:hidden; }
.wfm .seg button { padding:6px 12px; font-size:12px; color:${T.muted}; }
.wfm .seg button.on { background:${T.accent}; color:#06141d; font-weight:600; }
.wfm .drop { border:1.5px dashed ${T.line}; border-radius:11px; padding:32px 20px; text-align:center;
  cursor:pointer; transition:border-color .15s, background .15s, color .15s; color:${T.muted}; outline:none; }
.wfm .drop:hover, .wfm .drop:focus-visible { border-color:${T.accent}; color:${T.text}; }
.wfm .drop.over { border-color:${T.accent}; background:rgba(76,194,255,.07); color:${T.text}; }
.wfm .drop b { display:block; color:${T.text}; font-size:14px; margin-bottom:4px; }
.wfm .drop .di { color:${T.accent}; margin-bottom:8px; }
.wfm .map { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:14px 0; }
.wfm .map label { font-size:11px; color:${T.muted}; display:flex; flex-direction:column; gap:5px; }
.wfm .map select.bad { border-color:${T.down}; }
.wfm .prev th, .wfm .prev td { padding:5px 9px; font-size:12px; }
.wfm .prev td { color:${T.text}; }
@media (prefers-reduced-motion: reduce){ .wfm *{ animation:none!important; transition:none!important; } }
`;

/* ---------- storage helpers ----------
 * Inside Claude, window.storage persists across sessions.
 * Standalone (this repo), we fall back to localStorage so data still persists
 * in the browser. For multi-user / multi-device persistence, point these at a
 * real backend (see README). */
const hasStore = typeof window !== "undefined" && window.storage;
const LS = typeof window !== "undefined" ? window.localStorage : null;
async function sget(k) {
  try {
    if (hasStore) { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; }
    if (LS) { const v = LS.getItem("wfm:" + k); return v ? JSON.parse(v) : null; }
    return null;
  } catch { return null; }
}
async function sset(k, v) {
  try {
    if (hasStore) { await window.storage.set(k, JSON.stringify(v)); return; }
    if (LS) LS.setItem("wfm:" + k, JSON.stringify(v));
  } catch { /* ignore quota / serialization errors */ }
}

/* ---------- AI suggestions endpoint ----------
 * Inside Claude, the bare Anthropic endpoint works (the host injects auth).
 * Standalone, calling it from the browser will fail (no key / CORS) — point
 * this at your own backend proxy that holds the API key. Until then, the
 * "Suggest tips" button degrades gracefully and manual entry still works. */
const AI_ENDPOINT = "https://api.anthropic.com/v1/messages";

/* ---------- utils ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n) => (n == null || n === "" || isNaN(n)) ? "—"
  : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n));
const pct = (n) => (n == null || n === "" || isNaN(n)) ? "—" : `${Number(n).toFixed(0)}%`;
const num = (v) => v === "" || v == null ? null : Number(v);
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

function thisMonday() {
  const d = new Date(); const day = d.getDay(); const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff); return d.toISOString().slice(0, 10);
}

const NAV = [
  ["overview", "Overview", LayoutDashboard],
  ["calls", "Manager Calls", Users],
  ["swings", "Swings", ArrowUpDown],
  ["headlines", "Headlines", Megaphone],
  ["tips", "Pipeline Tips", Lightbulb],
  ["trending", "Trending Behind", TrendingDown],
  ["update", "Weekly Update", FileText],
  ["settings", "Settings", SettingsIcon],
];

function blankWeek(date, managers, prev) {
  const calls = {};
  managers.forEach((m) => {
    const p = prev?.calls?.[m];
    calls[m] = { call: p?.call ?? null, commit: p?.commit ?? null, best: p?.best ?? null, note: "", prior: p?.call ?? null };
  });
  return {
    id: date, date,
    plan: prev?.plan ?? null,
    calls,
    swings: [],
    headlines: (prev?.headlines || []).map((h) => ({ ...h, id: uid() })),
    tips: [],
    trending: (prev?.trending || []).map((t) => ({ ...t, id: uid() })),
  };
}

export default function App() {
  const [meta, setMeta] = useState(null);
  const [weeks, setWeeks] = useState({});
  const [tab, setTab] = useState("overview");
  const [loaded, setLoaded] = useState(false);

  // boot
  useEffect(() => {
    (async () => {
      let m = await sget("meta");
      if (!m) {
        const managers = ["Alvarez", "Chen", "Okafor", "Petrova"];
        const d = thisMonday();
        m = { activeWeek: d, weeks: [d], managers,
          thresholds: { d180: 50, d270: 90, mode: "and" } };
        const wk = blankWeek(d, managers, null);
        wk.plan = 4200000;
        wk.calls["Alvarez"] = { call: 980000, commit: 820000, best: 1100000, note: "Renewals tracking; one logo at risk", prior: 940000 };
        wk.calls["Chen"] = { call: 1150000, commit: 1000000, best: 1240000, note: "Strong new-biz pull-in", prior: 1090000 };
        wk.calls["Okafor"] = { call: 870000, commit: 760000, best: 980000, note: "Two deals slipping to next qtr", prior: 905000 };
        wk.calls["Petrova"] = { call: 1010000, commit: 900000, best: 1120000, note: "", prior: 1010000 };
        wk.headlines = [
          { id: uid(), account: "Northwind", owner: "Chen", note: "Expansion to 3 new teams after pilot win" },
          { id: uid(), account: "Helio Corp", owner: "Okafor", note: "Champion left — re-establishing exec sponsor" },
        ];
        wk.swings = [
          { id: uid(), account: "Vertex", owner: "Alvarez", dir: "up", amount: 140000, note: "Legal cleared, signature expected Thu" },
          { id: uid(), account: "Helio Corp", owner: "Okafor", dir: "down", amount: 90000, note: "Budget freeze risk" },
        ];
        wk.trending = [
          { id: uid(), account: "Helio Corp", owner: "Okafor", day180: 42, day270: 78 },
          { id: uid(), account: "Quill Labs", owner: "Petrova", day180: 61, day270: 85 },
        ];
        await sset("meta", m); await sset("week:" + d, wk);
        setWeeks({ [d]: wk });
      } else {
        const all = {};
        for (const id of m.weeks) { const w = await sget("week:" + id); if (w) all[id] = w; }
        setWeeks(all);
      }
      setMeta(m); setLoaded(true);
    })();
  }, []);

  const week = meta ? weeks[meta.activeWeek] : null;

  function saveMeta(nm) { setMeta(nm); sset("meta", nm); }
  function updateWeek(fn) {
    const w = weeks[meta.activeWeek]; if (!w) return;
    const nw = fn(structuredClone(w));
    setWeeks({ ...weeks, [meta.activeWeek]: nw }); sset("week:" + nw.id, nw);
  }

  function newWeek() {
    const def = thisMonday();
    const d = prompt("Meeting date for the new week (YYYY-MM-DD):", def);
    if (!d) return;
    if (meta.weeks.includes(d)) { setMeta({ ...meta, activeWeek: d }); return; }
    const prev = weeks[meta.activeWeek];
    const wk = blankWeek(d, meta.managers, prev);
    const order = [...meta.weeks, d].sort();
    setWeeks({ ...weeks, [d]: wk }); sset("week:" + d, wk);
    saveMeta({ ...meta, weeks: order, activeWeek: d });
    setTab("calls");
  }

  if (!loaded || !meta || !week) {
    return (<><style>{CSS}</style><div className="wfm"><div className="main">Loading the cockpit…</div></div></>);
  }

  const totalCall = meta.managers.reduce((s, m) => s + (week.calls[m]?.call || 0), 0);
  const totalCommit = meta.managers.reduce((s, m) => s + (week.calls[m]?.commit || 0), 0);
  const planPct = week.plan ? (totalCall / week.plan) * 100 : 0;
  const netSwing = week.swings.reduce((s, x) => s + (x.dir === "up" ? 1 : -1) * (x.amount || 0), 0);
  const gColor = planPct >= 100 ? T.up : planPct >= 92 ? T.warn : T.down;

  const flagged = week.trending.filter((r) => flag(r, meta.thresholds));

  const sortedWeeks = [...meta.weeks].sort();
  const idx = sortedWeeks.indexOf(meta.activeWeek);
  const prevWeek = idx > 0 ? weeks[sortedWeeks[idx - 1]] : null;

  return (
    <>
      <style>{CSS}</style>
      <div className="wfm">
        {/* TOP */}
        <div className="top">
          <div className="brand"><b>Forecast Cockpit</b><span>Weekly Manager Review</span></div>
          <div className="gauge">
            <div className="gl"><span>Call vs Plan</span><span className="mono">{money(totalCall)} / {money(week.plan)}</span></div>
            <div className="bar"><i style={{ width: Math.min(100, planPct) + "%", background: gColor }} /></div>
          </div>
          <div className="tpill"><small>Net Swing</small>
            <b className="mono" style={{ color: netSwing >= 0 ? T.up : T.down }}>{netSwing >= 0 ? "+" : "−"}{money(Math.abs(netSwing))}</b>
          </div>
          <div className="wk">
            <select value={meta.activeWeek} onChange={(e) => saveMeta({ ...meta, activeWeek: e.target.value })}>
              {sortedWeeks.slice().reverse().map((d) => <option key={d} value={d}>Wk of {fmtDate(d)}</option>)}
            </select>
            <button className="btn pri sm" onClick={newWeek}><Plus size={15} />New week</button>
          </div>
        </div>

        <div className="shell">
          {/* NAV */}
          <div className="nav">
            {NAV.map(([key, label, Icon]) => (
              <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>
                <Icon size={16} />{label}
                {key === "trending" && flagged.length > 0 && <span className="navtag">{flagged.length}</span>}
                {key === "tips" && week.tips.filter((t) => t.included).length > 0 &&
                  <span className="navtag" style={{ background: T.up }}>{week.tips.filter((t) => t.included).length}</span>}
              </button>
            ))}
          </div>

          {/* MAIN */}
          <div className="main" key={tab + meta.activeWeek}>
            {tab === "overview" && <Overview {...{ meta, weeks, week, prevWeek, totalCall, totalCommit, netSwing, flagged }} />}
            {tab === "calls" && <Calls {...{ meta, week, prevWeek, updateWeek, saveMeta, totalCall }} />}
            {tab === "swings" && <Swings {...{ week, meta, updateWeek }} />}
            {tab === "headlines" && <Headlines {...{ week, meta, updateWeek }} />}
            {tab === "tips" && <Tips {...{ week, updateWeek }} />}
            {tab === "trending" && <Trending {...{ week, meta, updateWeek, flagged }} />}
            {tab === "update" && <Update {...{ meta, week, totalCall, totalCommit, netSwing, flagged }} />}
            {tab === "settings" && <SettingsTab {...{ meta, saveMeta, updateWeek, week }} />}
          </div>
        </div>
      </div>
    </>
  );
}

function flag(r, t) {
  const checks = [];
  if (r.day180 != null) checks.push(r.day180 < t.d180);
  if (r.day270 != null) checks.push(r.day270 < t.d270);
  if (!checks.length) return false; // not yet measured at any milestone
  return t.mode === "and" ? checks.every(Boolean) : checks.some(Boolean);
}

/* ============================== OVERVIEW ============================== */
function Overview({ meta, weeks, week, prevWeek, totalCall, totalCommit, netSwing, flagged }) {
  const series = [...meta.weeks].sort().map((d) => {
    const w = weeks[d]; if (!w) return null;
    const call = meta.managers.reduce((s, m) => s + (w.calls[m]?.call || 0), 0);
    return { wk: fmtDate(d), call, plan: w.plan || null };
  }).filter(Boolean);

  return (
    <>
      <h2>This week at a glance</h2>
      <p className="sub">Live snapshot for the meeting on {fmtDate(week.date)}. Everything here is captured against this week and kept as you move forward.</p>

      <div className="tape" style={{ marginBottom: 18 }}>
        {meta.managers.map((m) => {
          const c = week.calls[m] || {};
          const prior = prevWeek?.calls?.[m]?.call ?? c.prior;
          const d = c.call != null && prior != null ? c.call - prior : null;
          return (
            <div className="mcard" key={m}>
              <div className="mn">{m}</div>
              <div className="mv mono">{money(c.call)}</div>
              {d != null && d !== 0 && (
                <div className="delta mono" style={{ color: d > 0 ? T.up : T.down }}>
                  {d > 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{money(Math.abs(d))} WoW
                </div>
              )}
              {d === 0 && <div className="delta mono" style={{ color: T.muted }}>flat WoW</div>}
            </div>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="between" style={{ marginBottom: 12 }}>
            <b style={{ fontSize: 14 }}>Total call vs plan</b>
            <span className="mono" style={{ fontSize: 12, color: T.muted }}>{meta.weeks.length} week{meta.weeks.length > 1 ? "s" : ""} tracked</span>
          </div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 6, right: 10, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={T.panel2} vertical={false} />
                <XAxis dataKey="wk" tick={{ fill: T.muted, fontSize: 11 }} stroke={T.line} />
                <YAxis tick={{ fill: T.muted, fontSize: 11 }} stroke={T.line}
                  tickFormatter={(v) => "$" + (v / 1e6).toFixed(1) + "M"} />
                <Tooltip contentStyle={{ background: T.panel2, border: "1px solid " + T.line, borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => money(v)} labelStyle={{ color: T.text }} />
                <Line type="monotone" dataKey="plan" stroke={T.faint} strokeDasharray="4 4" dot={false} strokeWidth={1.5} name="Plan" />
                <Line type="monotone" dataKey="call" stroke={T.accent} strokeWidth={2.5} dot={{ r: 3, fill: T.accent }} name="Call" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div className="mn" style={{ color: T.muted, fontSize: 12, marginBottom: 6 }}>Commit floor</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 600 }}>{money(totalCommit)}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>across {meta.managers.length} managers</div>
          </div>
          <div className="card">
            <div className="between" style={{ marginBottom: 8 }}>
              <b style={{ fontSize: 14 }}>Trending behind</b>
              {flagged.length > 0 && <span className="tag" style={{ background: "rgba(248,81,73,.15)", color: T.down }}>{flagged.length} flagged</span>}
            </div>
            {flagged.length === 0 ? <div style={{ fontSize: 12.5, color: T.muted }}>No accounts breaching thresholds.</div>
              : flagged.slice(0, 4).map((r) => (
                <div key={r.id} className="row between" style={{ fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid " + T.panel2 }}>
                  <span>{r.account} <span style={{ color: T.faint }}>· {r.owner}</span></span>
                  <span className="mono" style={{ color: T.down }}>{pct(r.day180)}/{pct(r.day270)}</span>
                </div>))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================== CALLS ============================== */
function Calls({ meta, week, prevWeek, updateWeek, saveMeta, totalCall }) {
  const set = (m, field, v) => updateWeek((w) => { w.calls[m] = { ...w.calls[m], [field]: field === "note" ? v : num(v) }; return w; });
  return (
    <>
      <h2>Manager calls</h2>
      <p className="sub">Each manager's call on where they'll land. Edit weekly — the prior week's call is carried in automatically so you can see movement. Commit is the floor, Best is the ceiling. Or drop this week's forecast export to fill the whole table at once.</p>

      <ForecastImporter meta={meta} updateWeek={updateWeek} saveMeta={saveMeta} />

      <div className="card" style={{ padding: 0, marginTop: 16 }}>
        <table>
          <thead><tr>
            <th>Manager</th><th style={{ textAlign: "right" }}>Commit</th><th style={{ textAlign: "right" }}>Call</th>
            <th style={{ textAlign: "right" }}>Best</th><th style={{ textAlign: "right" }}>WoW</th><th>Note</th>
          </tr></thead>
          <tbody>
            {meta.managers.map((m) => {
              const c = week.calls[m] || {};
              const prior = prevWeek?.calls?.[m]?.call ?? c.prior;
              const d = c.call != null && prior != null ? c.call - prior : null;
              return (
                <tr key={m}>
                  <td style={{ fontWeight: 500 }}>{m}</td>
                  <td className="cellnum"><input type="number" value={c.commit ?? ""} placeholder="—" onChange={(e) => set(m, "commit", e.target.value)} /></td>
                  <td className="cellnum"><input type="number" value={c.call ?? ""} placeholder="—" onChange={(e) => set(m, "call", e.target.value)} /></td>
                  <td className="cellnum"><input type="number" value={c.best ?? ""} placeholder="—" onChange={(e) => set(m, "best", e.target.value)} /></td>
                  <td className="mono" style={{ textAlign: "right", color: d > 0 ? T.up : d < 0 ? T.down : T.muted }}>
                    {d == null ? "—" : (d === 0 ? "flat" : (d > 0 ? "+" : "−") + money(Math.abs(d)))}
                  </td>
                  <td><input value={c.note || ""} placeholder="add context…" onChange={(e) => set(m, "note", e.target.value)} /></td>
                </tr>);
            })}
          </tbody>
          <tfoot><tr>
            <td style={{ fontWeight: 600 }}>Total</td><td></td>
            <td className="mono" style={{ textAlign: "right", fontWeight: 600, color: T.accent, paddingRight: 19 }}>{money(totalCall)}</td>
            <td colSpan={3}></td>
          </tr></tfoot>
        </table>
      </div>
      <p className="sub" style={{ marginTop: 12 }}>Add or remove managers in Settings — names stay stable so the trend chart stays continuous.</p>
    </>
  );
}

/* ---------- forecast CSV importer ---------- */
function ForecastImporter({ meta, updateWeek, saveMeta }) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const inputRef = useRef(null);

  const isIndented = (s) => s !== s.replace(/^[\s\u2003\u2002\u00a0]+/, "");
  const moneyNum = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isNaN(n) ? null : Math.round(n); };

  function handleFile(file) {
    setErr(""); setDone("");
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") { setErr("That's not a .csv — export the forecast as CSV and try again."); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const fields = (res.meta.fields || []).filter(Boolean);
        const find = (re) => fields.find((f) => re.test(f)) || "";
        const cMgr = find(/manager|name/i);
        const cCall = find(/most likely/i) || find(/forecast|call/i);
        const cCommit = find(/^commit/i) || find(/commit/i);
        const cBest = find(/best/i);
        const cGoal = fields.find((f) => /goal/i.test(f) && !/attain/i.test(f)) || "";
        if (!cMgr || !cCall) { setErr("Couldn't find Manager and Most Likely columns — is this the forecast export?"); return; }

        const data = res.data;
        const managers = [];
        const calls = {};
        let planTotal = null;
        data.forEach((r) => {
          const raw = String(r[cMgr] ?? "");
          const name = raw.trim();
          if (!name) return;
          if (/^total$/i.test(name)) { planTotal = cGoal ? moneyNum(r[cGoal]) : null; return; }
          if (isIndented(raw)) return;          // skip rep rows, keep manager rollups
          managers.push(name);
          calls[name] = {
            call: moneyNum(r[cCall]), commit: cCommit ? moneyNum(r[cCommit]) : null,
            best: cBest ? moneyNum(r[cBest]) : null, note: "", prior: null,
          };
        });
        if (!managers.length) { setErr("No manager rows detected in that file."); return; }

        updateWeek((w) => {
          managers.forEach((m) => { const ex = w.calls[m]; calls[m].prior = ex?.call ?? null; if (ex?.note) calls[m].note = ex.note; });
          w.calls = calls;
          if (planTotal != null) w.plan = planTotal;
          return w;
        });
        saveMeta({ ...meta, managers });
        setDone(`Loaded ${managers.length} managers${planTotal != null ? " · plan " + money(planTotal) : ""}.`);
      },
      error: () => setErr("Couldn't read that file."),
    });
  }
  const onDrop = (e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files?.[0]); };

  return (
    <div className={"drop" + (over ? " over" : "")} role="button" tabIndex={0}
      style={{ padding: "18px 20px" }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <div className="row" style={{ justifyContent: "center", gap: 9 }}>
        <FileText size={18} style={{ color: T.accent }} />
        <b style={{ fontSize: 13.5 }}>Drop the forecast export</b>
        <span style={{ fontSize: 12, color: T.muted }}>— fills calls from Most Likely, Commit, Best Case; sets plan from the Total goal</span>
      </div>
      {done && <div style={{ fontSize: 12, color: T.up, marginTop: 7 }}>{done}</div>}
      {err && <div style={{ fontSize: 12, color: T.down, marginTop: 7 }}>{err}</div>}
      <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

/* ============================== SWINGS ============================== */
function Swings({ week, meta, updateWeek }) {
  const add = () => updateWeek((w) => { w.swings.push({ id: uid(), account: "", owner: meta.managers[0] || "", dir: "up", amount: null, note: "" }); return w; });
  const upd = (id, f, v) => updateWeek((w) => { w.swings = w.swings.map((s) => s.id === id ? { ...s, [f]: f === "amount" ? num(v) : v } : s); return w; });
  const del = (id) => updateWeek((w) => { w.swings = w.swings.filter((s) => s.id !== id); return w; });
  const up = week.swings.filter((s) => s.dir === "up").reduce((a, s) => a + (s.amount || 0), 0);
  const dn = week.swings.filter((s) => s.dir === "down").reduce((a, s) => a + (s.amount || 0), 0);
  return (
    <>
      <h2>Swing factors</h2>
      <p className="sub">Deals or accounts that could move the number up or down before quarter close. Net swing rolls up to the top bar.</p>
      <div className="row" style={{ gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, padding: "12px 16px" }}><div className="mn">Potential upside</div><div className="mono" style={{ fontSize: 22, fontWeight: 600, color: T.up }}>+{money(up)}</div></div>
        <div className="card" style={{ flex: 1, padding: "12px 16px" }}><div className="mn">Potential downside</div><div className="mono" style={{ fontSize: 22, fontWeight: 600, color: T.down }}>−{money(dn)}</div></div>
        <div className="card" style={{ flex: 1, padding: "12px 16px" }}><div className="mn">Net</div><div className="mono" style={{ fontSize: 22, fontWeight: 600, color: up - dn >= 0 ? T.up : T.down }}>{up - dn >= 0 ? "+" : "−"}{money(Math.abs(up - dn))}</div></div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {week.swings.length === 0 ? <div style={{ padding: 18 }}><div className="empty"><b>No swings logged</b>Track the deals most likely to move your call this week.</div></div> :
          <table>
            <thead><tr><th>Account</th><th>Owner</th><th>Direction</th><th style={{ textAlign: "right" }}>Amount</th><th>Why</th><th></th></tr></thead>
            <tbody>{week.swings.map((s) => (
              <tr key={s.id}>
                <td><input value={s.account} placeholder="account" onChange={(e) => upd(s.id, "account", e.target.value)} /></td>
                <td><select value={s.owner} onChange={(e) => upd(s.id, "owner", e.target.value)}>{meta.managers.map((m) => <option key={m}>{m}</option>)}</select></td>
                <td><div className="seg">
                  <button className={s.dir === "up" ? "on" : ""} onClick={() => upd(s.id, "dir", "up")}>Up</button>
                  <button className={s.dir === "down" ? "on" : ""} onClick={() => upd(s.id, "dir", "down")}>Down</button>
                </div></td>
                <td className="cellnum"><input type="number" value={s.amount ?? ""} placeholder="0" onChange={(e) => upd(s.id, "amount", e.target.value)} /></td>
                <td><input value={s.note} placeholder="context…" onChange={(e) => upd(s.id, "note", e.target.value)} /></td>
                <td><button className="ico" onClick={() => del(s.id)}><Trash2 size={15} /></button></td>
              </tr>))}</tbody>
          </table>}
      </div>
      <button className="btn gho sm" style={{ marginTop: 12 }} onClick={add}><Plus size={14} />Add swing</button>
    </>
  );
}

/* ============================== HEADLINES ============================== */
function Headlines({ week, meta, updateWeek }) {
  const add = () => updateWeek((w) => { w.headlines.push({ id: uid(), account: "", owner: meta.managers[0] || "", note: "" }); return w; });
  const upd = (id, f, v) => updateWeek((w) => { w.headlines = w.headlines.map((h) => h.id === id ? { ...h, [f]: v } : h); return w; });
  const del = (id) => updateWeek((w) => { w.headlines = w.headlines.filter((h) => h.id !== id); return w; });
  return (
    <>
      <h2>Rep & customer headlines</h2>
      <p className="sub">The notable stories from the week — expansions, risks, champion changes. These carry forward week over week so you can keep editing the running narrative.</p>
      {week.headlines.length === 0 && <div className="empty" style={{ marginBottom: 14 }}><b>No headlines yet</b>Capture what your managers are calling out this week.</div>}
      <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
        {week.headlines.map((h) => (
          <div className="card" key={h.id} style={{ padding: "12px 14px" }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <input style={{ flex: "0 0 200px" }} value={h.account} placeholder="Account / rep" onChange={(e) => upd(h.id, "account", e.target.value)} />
              <select style={{ flex: "0 0 140px" }} value={h.owner} onChange={(e) => upd(h.id, "owner", e.target.value)}>{meta.managers.map((m) => <option key={m}>{m}</option>)}</select>
              <button className="ico" style={{ marginLeft: "auto" }} onClick={() => del(h.id)}><Trash2 size={15} /></button>
            </div>
            <textarea style={{ width: "100%", minHeight: 52, resize: "vertical" }} value={h.note} placeholder="What's the story?" onChange={(e) => upd(h.id, "note", e.target.value)} />
          </div>))}
      </div>
      <button className="btn gho sm" style={{ marginTop: 12 }} onClick={add}><Plus size={14} />Add headline</button>
    </>
  );
}

/* ============================== TIPS ============================== */
function Tips({ week, updateWeek }) {
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (id) => updateWeek((w) => { w.tips = w.tips.map((t) => t.id === id ? { ...t, included: !t.included } : t); return w; });
  const del = (id) => updateWeek((w) => { w.tips = w.tips.filter((t) => t.id !== id); return w; });
  const addManual = () => updateWeek((w) => { w.tips.push({ id: uid(), source: "Other", text: "", included: false }); return w; });
  const editText = (id, v) => updateWeek((w) => { w.tips = w.tips.map((t) => t.id === id ? { ...t, text: v } : t); return w; });

  async function suggest() {
    if (!paste.trim()) { setErr("Paste some Slack wins or Gong notes first."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          messages: [{
            role: "user", content:
              `You help a sales leader prep the weekly forecast meeting. From the Slack wins and Gong call notes below, extract 1-3 concrete, repeatable pipeline-generation tips the team can reuse next week — e.g. a talk track that opened a door, or a win worth modeling. Be specific and actionable.\n\nReturn ONLY a JSON array, no markdown, each item {"source":"Slack"|"Gong"|"Other","text":"..."}.\n\nINPUT:\n${paste}`
          }],
        }),
      });
      const data = await res.json();
      const txt = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const clean = txt.replace(/```json|```/g, "").trim();
      const arr = JSON.parse(clean);
      updateWeek((w) => { arr.slice(0, 3).forEach((t) => w.tips.push({ id: uid(), source: t.source || "Other", text: t.text, included: false })); return w; });
      setPaste("");
    } catch (e) { setErr("Couldn't generate suggestions. In Claude this works out of the box; running standalone, set AI_ENDPOINT to your API proxy (see README). Manual add still works."); }
    setBusy(false);
  }

  const incCount = week.tips.filter((t) => t.included).length;
  return (
    <>
      <h2>Pipeline generation tips</h2>
      <p className="sub">Suggested wins and talk tracks to share with the team. Check the ones to include in this week's update; uncheck or delete the rest. Until Gong and Slack are connected live, paste recent wins or call notes and let the assistant draft suggestions.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 10 }}><Sparkles size={16} style={{ color: T.accent }} /><b style={{ fontSize: 14 }}>Draft from Slack / Gong</b></div>
        <textarea style={{ width: "100%", minHeight: 96, resize: "vertical", marginBottom: 10 }}
          value={paste} placeholder="Paste recent Slack wins, closed-won notes, or Gong call snippets here…"
          onChange={(e) => setPaste(e.target.value)} />
        <div className="row">
          <button className="btn pri sm" onClick={suggest} disabled={busy}><Sparkles size={14} />{busy ? "Drafting…" : "Suggest tips"}</button>
          <button className="btn gho sm" onClick={addManual}><Plus size={14} />Add manually</button>
          {err && <span style={{ fontSize: 12, color: T.down }}>{err}</span>}
        </div>
      </div>

      <div className="between" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 13, color: T.muted }}>{week.tips.length} suggestion{week.tips.length !== 1 ? "s" : ""}</b>
        <span className="tag" style={{ background: "rgba(63,185,80,.15)", color: T.up }}>{incCount} selected for update</span>
      </div>

      {week.tips.length === 0 ? <div className="empty"><b>No tips yet</b>Draft some from your wins above, or add one manually.</div> :
        <div className="grid" style={{ gap: 9 }}>
          {week.tips.map((t) => (
            <div className={"tip" + (t.included ? " inc" : "")} key={t.id}>
              <button className={"chk" + (t.included ? " on" : "")} onClick={() => toggle(t.id)}>{t.included && <Check size={14} />}</button>
              <div style={{ flex: 1 }}>
                <textarea style={{ width: "100%", minHeight: 38, resize: "vertical", border: "none", padding: 0, background: "transparent" }}
                  value={t.text} onChange={(e) => editText(t.id, e.target.value)} />
              </div>
              <span className="src">{t.source}</span>
              <button className="ico" onClick={() => del(t.id)}><X size={15} /></button>
            </div>))}
        </div>}
    </>
  );
}

/* ============================== TRENDING ============================== */
function Trending({ week, meta, updateWeek, flagged }) {
  const t = meta.thresholds;
  const [view, setView] = useState("flagged");
  const add = () => updateWeek((w) => { w.trending.push({ id: uid(), account: "", owner: meta.managers[0] || "", day180: null, day270: null }); return w; });
  const upd = (id, f, v) => updateWeek((w) => { w.trending = w.trending.map((r) => r.id === id ? { ...r, [f]: f === "day180" || f === "day270" ? num(v) : v } : r); return w; });
  const del = (id) => updateWeek((w) => { w.trending = w.trending.filter((r) => r.id !== id); return w; });

  const hasD270 = week.trending.some((r) => r.day270 != null);
  const shown = view === "flagged" ? week.trending.filter((r) => flag(r, t)) : week.trending;
  const ownerOpts = (o) => (meta.managers.includes(o) || !o ? meta.managers : [o, ...meta.managers]);

  return (
    <>
      <h2>Trending behind</h2>
      <p className="sub">Accounts pacing behind plan. An account is flagged when it's behind <b style={{ color: T.text }}>{t.d180}%</b> at Day 180 {hasD270 ? <><b style={{ color: T.text }}>{t.mode === "and" ? "and" : "or"}</b> behind <b style={{ color: T.text }}>{t.d270}%</b> at Day 270</> : "(no Day 270 data loaded yet — see note below)"}. Values are attainment vs. expected pace, so 42 means at 42% of where the account should be. Accounts not yet at a milestone stay unflagged. Adjust the rule in Settings.</p>

      {!hasD270 && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>This week's file is the <b>Day 180</b> export only, so the rule is running on the Day 180 line alone. Drop the matching <b>Day 270</b> export too and accounts present in both will be evaluated against the full both-milestones rule.</span>
        </div>
      )}

      <div className="between" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 13, color: T.muted }}>{week.trending.length} tracked · {flagged.length} flagged</b>
        <div className="seg">
          <button className={view === "flagged" ? "on" : ""} onClick={() => setView("flagged")}>Flagged ({flagged.length})</button>
          <button className={view === "all" ? "on" : ""} onClick={() => setView("all")}>All ({week.trending.length})</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 14 }}>
        {shown.length === 0 ? <div style={{ padding: 18 }}><div className="empty"><b>{view === "flagged" ? "Nothing flagged" : "No accounts yet"}</b>{view === "flagged" ? "No accounts breach the rule this week." : "Drop your CSV export below to populate the segment."}</div></div> :
        <table>
          <thead><tr><th>Account</th><th>Owner</th><th style={{ textAlign: "right" }}>Day 180</th><th style={{ textAlign: "right" }}>Day 270</th><th>Status</th><th></th></tr></thead>
          <tbody>{shown.map((r) => {
            const f = flag(r, t);
            return (
              <tr key={r.id} style={{ background: f ? "rgba(248,81,73,.06)" : "transparent" }}>
                <td><input value={r.account} placeholder="account" onChange={(e) => upd(r.id, "account", e.target.value)} /></td>
                <td><select value={r.owner} onChange={(e) => upd(r.id, "owner", e.target.value)}>{ownerOpts(r.owner).map((m) => <option key={m}>{m}</option>)}</select></td>
                <td className="cellnum"><input type="number" value={r.day180 ?? ""} placeholder="—" onChange={(e) => upd(r.id, "day180", e.target.value)} /></td>
                <td className="cellnum"><input type="number" value={r.day270 ?? ""} placeholder="—" onChange={(e) => upd(r.id, "day270", e.target.value)} /></td>
                <td>{f ? <span className="tag" style={{ background: "rgba(248,81,73,.15)", color: T.down }}>Behind</span>
                  : <span className="tag" style={{ background: T.panel2, color: T.muted }}>On pace</span>}</td>
                <td><button className="ico" onClick={() => del(r.id)}><Trash2 size={15} /></button></td>
              </tr>);
          })}</tbody>
        </table>}
      </div>

      <button className="btn gho sm" onClick={add}><Plus size={14} />Add account</button>

      <Importer meta={meta} updateWeek={updateWeek} />
    </>
  );
}

/* ============================== IMPORTER ============================== */
function Importer({ meta, updateWeek }) {
  const [rows, setRows] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [map, setMap] = useState({ account: "", owner: "", day180: "", day270: "" });
  const [scale, setScale] = useState("percent");
  const [mode, setMode] = useState("replace");
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const [fileName, setFileName] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [bulk, setBulk] = useState("");
  const inputRef = useRef(null);

  const pctNum = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isNaN(n) ? null : n; };

  function autoMap(fields) {
    const find = (re) => fields.find((f) => re.test(f)) || "";
    const milestone = (day) => {
      const metric = (f) => /ratio|attain|percent|pct|%|pacing|index|score/i.test(f) && !/cutoff|date|day\)|expected|purchased|used/i.test(f);
      return fields.find((f) => new RegExp(day).test(f) && metric(f)) || fields.find((f) => new RegExp(day).test(f) && !/cutoff|date/i.test(f)) || "";
    };
    return {
      account: find(/account|customer|company|client|logo/i) || find(/name/i),
      owner: find(/manager/i) || find(/owner/i) || find(/\brep\b|\bae\b|csm|exec/i),
      day180: milestone("180"),
      day270: milestone("270"),
    };
  }

  // ratios (0–1) vs percentages (0–100): if the day columns top out near 1–3, they're ratios
  function guessScale(data, m) {
    const vals = [];
    [m.day180, m.day270].filter(Boolean).forEach((c) => data.forEach((r) => { const n = pctNum(r[c]); if (n != null) vals.push(Math.abs(n)); }));
    if (!vals.length) return "percent";
    return Math.max(...vals) <= 3 ? "ratio" : "percent";
  }

  function handleFile(file) {
    setErr("");
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") { setErr("That's not a .csv — export the dashboard as CSV and try again."); return; }
    setFileName(file.name);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const fields = (res.meta.fields || []).filter(Boolean);
        const data = (res.data || []).filter((r) => Object.values(r).some((v) => String(v).trim()));
        if (!fields.length || !data.length) { setErr("The file opened but had no rows. Check the export and try again."); return; }
        const m = autoMap(fields);
        setHeaders(fields); setRows(data); setMap(m); setScale(guessScale(data, m));
      },
      error: () => setErr("Couldn't read that file. Make sure it's a valid CSV."),
    });
  }

  const onDrop = (e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files?.[0]); };

  function build() {
    const f = scale === "ratio" ? 100 : 1;
    const conv = (v) => { const n = pctNum(v); return n == null ? null : Math.round(n * f * 10) / 10; };
    return rows.map((r) => ({
      id: uid(),
      account: String(r[map.account] ?? "").trim(),
      owner: String(r[map.owner] ?? "").trim() || (meta.managers[0] || ""),
      day180: map.day180 ? conv(r[map.day180]) : null,
      day270: map.day270 ? conv(r[map.day270]) : null,
    })).filter((x) => x.account);
  }

  function doImport() {
    if (!map.account) { setErr("Tell me which column is the account name first."); return; }
    const built = build();
    if (!built.length) { setErr("No rows landed — double-check the account column."); return; }
    updateWeek((w) => { w.trending = mode === "replace" ? built : [...w.trending, ...built]; return w; });
    reset();
  }
  function reset() { setRows(null); setHeaders([]); setFileName(""); setErr(""); }

  function importPaste() {
    const lines = bulk.trim().split("\n").map((l) => l.split(/[\t,]/).map((x) => x.trim())).filter((r) => r[0]);
    if (!lines.length) { setErr("Nothing to import."); return; }
    const built = lines.map((r) => ({ id: uid(), account: r[0], owner: r[1] || meta.managers[0] || "", day180: pctNum(r[2]), day270: pctNum(r[3]) }));
    updateWeek((w) => { w.trending = mode === "replace" ? built : [...w.trending, ...built]; return w; });
    setBulk(""); setErr("");
  }

  const TARGETS = [["account", "Account"], ["owner", "Owner"], ["day180", "Day 180 %"], ["day270", "Day 270 %"]];

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <b style={{ fontSize: 14 }}>Import this week's export</b>
        <button className="btn gho sm" onClick={() => { setShowPaste(!showPaste); reset(); }}>
          {showPaste ? "Use file upload" : "Paste rows instead"}
        </button>
      </div>

      {!showPaste && !rows && (
        <div className={"drop" + (over ? " over" : "")} role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)} onDrop={onDrop}>
          <div className="di"><FileText size={26} /></div>
          <b>Drop your CSV here</b>
          <span style={{ fontSize: 12.5 }}>or click to browse · columns map automatically</span>
          <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      )}

      {!showPaste && rows && (
        <>
          <div className="row between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 12.5, color: T.muted }}>
              <span className="mono" style={{ color: T.text }}>{fileName}</span> · {rows.length} row{rows.length !== 1 ? "s" : ""} · matched columns shown below
            </span>
            <button className="btn gho sm" onClick={reset}>Choose another file</button>
          </div>
          <div className="map">
            {TARGETS.map(([k, label]) => (
              <label key={k}>{label}{k === "account" && " *"}
                <select className={k === "account" && !map[k] ? "bad" : ""} value={map[k]}
                  onChange={(e) => setMap({ ...map, [k]: e.target.value })}>
                  <option value="">— none —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div className="row" style={{ gap: 10, marginBottom: 12, fontSize: 12, color: T.muted }}>
            <span>Pacing values are</span>
            <div className="seg">
              <button className={scale === "percent" ? "on" : ""} onClick={() => setScale("percent")}>Percent (0–100)</button>
              <button className={scale === "ratio" ? "on" : ""} onClick={() => setScale("ratio")}>Ratio (0–1)</button>
            </div>
            {scale === "ratio" && <span style={{ color: T.faint }}>× 100 on import — e.g. 0.43 → 43%</span>}
          </div>

          <div style={{ border: "1px solid " + T.line, borderRadius: 9, overflow: "hidden", marginBottom: 12 }}>
            <table className="prev">
              <thead><tr>{TARGETS.map(([k, l]) => <th key={k}>{l}</th>)}</tr></thead>
              <tbody>
                {build().slice(0, 5).map((r) => (
                  <tr key={r.id}>
                    <td>{r.account || <span style={{ color: T.faint }}>—</span>}</td>
                    <td>{r.owner}</td>
                    <td className="mono">{r.day180 == null ? "—" : r.day180 + "%"}</td>
                    <td className="mono">{r.day270 == null ? "—" : r.day270 + "%"}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
            <div className="seg">
              <button className={mode === "replace" ? "on" : ""} onClick={() => setMode("replace")}>Replace list</button>
              <button className={mode === "add" ? "on" : ""} onClick={() => setMode("add")}>Add to list</button>
            </div>
            <button className="btn pri sm" onClick={doImport}><Check size={14} />Import {build().length} account{build().length !== 1 ? "s" : ""}</button>
          </div>
          <p className="sub" style={{ margin: "10px 0 0", fontSize: 11.5 }}>
            “Replace” swaps the whole segment for this week — the right choice for a fresh weekly export. “Add” appends without clearing what's there.
          </p>
        </>
      )}

      {showPaste && (
        <>
          <p className="sub" style={{ margin: "0 0 9px" }}>One per line: <span className="mono" style={{ color: T.text }}>Account, Owner, Day180%, Day270%</span> (comma or tab separated)</p>
          <textarea style={{ width: "100%", minHeight: 70, resize: "vertical", marginBottom: 10 }} value={bulk}
            placeholder={"Helio Corp, Okafor, 42, 78\nQuill Labs, Petrova, 61, 85"} onChange={(e) => setBulk(e.target.value)} />
          <div className="row">
            <div className="seg">
              <button className={mode === "replace" ? "on" : ""} onClick={() => setMode("replace")}>Replace list</button>
              <button className={mode === "add" ? "on" : ""} onClick={() => setMode("add")}>Add to list</button>
            </div>
            <button className="btn gho sm" onClick={importPaste}>Import rows</button>
          </div>
        </>
      )}

      {err && <p style={{ fontSize: 12, color: T.down, margin: "10px 0 0" }}>{err}</p>}
    </div>
  );
}

/* ============================== UPDATE ============================== */
function Update({ meta, week, totalCall, totalCommit, netSwing, flagged }) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => {
    const L = [];
    L.push(`📊 Weekly Forecast Update — Wk of ${fmtDate(week.date)}`);
    L.push(``);
    L.push(`TOP LINE`);
    L.push(`• Call: ${money(totalCall)}${week.plan ? `  (${((totalCall / week.plan) * 100).toFixed(0)}% to plan ${money(week.plan)})` : ""}`);
    L.push(`• Commit floor: ${money(totalCommit)}`);
    L.push(`• Net swing in play: ${netSwing >= 0 ? "+" : "−"}${money(Math.abs(netSwing))}`);
    L.push(``);
    L.push(`MANAGER CALLS`);
    meta.managers.forEach((m) => { const c = week.calls[m] || {}; L.push(`• ${m}: ${money(c.call)}${c.note ? ` — ${c.note}` : ""}`); });
    if (week.swings.length) {
      L.push(``); L.push(`SWING FACTORS`);
      week.swings.forEach((s) => L.push(`• ${s.dir === "up" ? "▲" : "▼"} ${s.account} (${s.owner}) ${s.dir === "up" ? "+" : "−"}${money(s.amount)}${s.note ? ` — ${s.note}` : ""}`));
    }
    if (week.headlines.length) {
      L.push(``); L.push(`HEADLINES`);
      week.headlines.forEach((h) => L.push(`• ${h.account} (${h.owner}): ${h.note}`));
    }
    const tips = week.tips.filter((t) => t.included);
    if (tips.length) {
      L.push(``); L.push(`PIPELINE GENERATION TIPS`);
      tips.forEach((t) => L.push(`• [${t.source}] ${t.text}`));
    }
    if (flagged.length) {
      L.push(``); L.push(`TRENDING BEHIND`);
      flagged.forEach((r) => L.push(`• ${r.account} (${r.owner}) — ${pct(r.day180)} @ D180, ${pct(r.day270)} @ D270`));
    }
    return L.join("\n");
  }, [meta, week, totalCall, totalCommit, netSwing, flagged]);

  function copy() { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); }

  return (
    <>
      <div className="between">
        <div><h2>Weekly update</h2><p className="sub">Auto-assembled from this week — including only the pipeline tips you selected. Copy and drop it into Slack or email.</p></div>
        <button className="btn pri" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy update"}</button>
      </div>
      <div className="out mono">{text}</div>
    </>
  );
}

/* ============================== SETTINGS ============================== */
function SettingsTab({ meta, saveMeta, updateWeek, week }) {
  const [nm, setNm] = useState("");
  const t = meta.thresholds;
  function addMgr() {
    const name = nm.trim(); if (!name || meta.managers.includes(name)) return;
    saveMeta({ ...meta, managers: [...meta.managers, name] });
    updateWeek((w) => { w.calls[name] = { call: null, commit: null, best: null, note: "", prior: null }; return w; });
    setNm("");
  }
  function delMgr(m) {
    if (!confirm(`Remove ${m}? Their calls stay in past weeks but they won't appear going forward.`)) return;
    saveMeta({ ...meta, managers: meta.managers.filter((x) => x !== m) });
  }
  const setT = (patch) => saveMeta({ ...meta, thresholds: { ...t, ...patch } });
  const setPlan = (v) => updateWeek((w) => { w.plan = num(v); return w; });

  return (
    <>
      <h2>Settings</h2>
      <p className="sub">Managers and the trending-behind rule. Changes to the rule re-evaluate every account immediately.</p>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        <div className="card">
          <b style={{ fontSize: 14 }}>Managers</b>
          <div className="grid" style={{ gap: 7, margin: "12px 0" }}>
            {meta.managers.map((m) => (
              <div className="row between" key={m} style={{ padding: "7px 10px", background: T.panel2, borderRadius: 8 }}>
                <span style={{ fontSize: 13 }}>{m}</span>
                <button className="ico" onClick={() => delMgr(m)}><Trash2 size={14} /></button>
              </div>))}
          </div>
          <div className="row"><input style={{ flex: 1 }} value={nm} placeholder="Add manager…" onChange={(e) => setNm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMgr()} />
            <button className="btn gho sm" onClick={addMgr}><Plus size={14} />Add</button></div>
        </div>

        <div className="card">
          <b style={{ fontSize: 14 }}>Trending-behind rule</b>
          <div className="grid" style={{ gap: 12, marginTop: 12 }}>
            <label className="fld">Behind threshold at Day 180 (%)
              <input type="number" value={t.d180} onChange={(e) => setT({ d180: Number(e.target.value) })} /></label>
            <label className="fld">Behind threshold at Day 270 (%)
              <input type="number" value={t.d270} onChange={(e) => setT({ d270: Number(e.target.value) })} /></label>
            <label className="fld">Combine conditions with
              <div className="seg">
                <button className={t.mode === "and" ? "on" : ""} onClick={() => setT({ mode: "and" })}>AND (both)</button>
                <button className={t.mode === "or" ? "on" : ""} onClick={() => setT({ mode: "or" })}>OR (either)</button>
              </div></label>
          </div>
        </div>

        <div className="card">
          <b style={{ fontSize: 14 }}>Plan for this week</b>
          <p className="sub" style={{ margin: "5px 0 10px" }}>Target the call is measured against on {fmtDate(week.date)}.</p>
          <input type="number" className="mono" style={{ width: "100%" }} value={week.plan ?? ""} placeholder="e.g. 4200000" onChange={(e) => setPlan(e.target.value)} />
        </div>
      </div>
    </>
  );
}
