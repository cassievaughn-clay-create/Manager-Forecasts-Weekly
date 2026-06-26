/* ---------- Supabase client ----------
 * Wired from Vite env vars (see .env.example / SETUP.md). Both are safe to ship
 * in client code: the anon key is a public, RLS-gated key — security comes from
 * Row Level Security policies on the database, not from hiding this key.
 *
 * If the env vars are absent, `supabase` is null and App.jsx transparently falls
 * back to localStorage, so `npm run dev` still works with zero configuration. */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional: lock the app to one Google Workspace domain (e.g. "clay.com").
// This is a UX gate only — the real enforcement lives in the RLS policies.
export const ALLOWED_EMAIL_DOMAIN =
  import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || "";

export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigured = !!supabase;

// The single key/value table that mirrors the app's sget/sset model.
export const KV_TABLE = "forecast_kv";
