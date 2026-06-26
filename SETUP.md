# Secure database setup (Supabase)

This app stores everything through a tiny key/value layer (`sget`/`sset` in
[`src/App.jsx`](src/App.jsx)). Out of the box it falls back to `localStorage` —
data lives in one browser only. Point it at **Supabase** (free tier) and the same
data becomes shared, durable, and recallable from any device — gated to your team.

It's free, the data is kilobytes, and the public "anon" key is safe to ship in
the client **because Row Level Security (RLS) does the enforcing** — the steps
below turn RLS on and restrict access to `@clay.com` Google accounts.

Total time: ~10 minutes.

---

## 1. Create the project

1. Go to <https://supabase.com> → sign in with GitHub → **New project**.
2. Name it (e.g. `manager-forecasts`), pick a region near you, set a database
   password (you won't need it for this app — store it somewhere safe anyway).
3. Wait ~2 min for it to provision.

## 2. Create the table + security policies

Open **SQL Editor** → **New query**, paste this, and **Run**:

```sql
-- One key/value table that mirrors the app's sget/sset model.
create table public.forecast_kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Lock the table down: nothing is readable/writable until a policy allows it.
alter table public.forecast_kv enable row level security;

-- Allow ONLY signed-in users whose Google email is on the @clay.com domain.
-- This is the real security boundary — it holds even though the anon key ships
-- in the client. Change 'clay.com' if your domain differs, or relax the
-- `email like` check to `auth.role() = 'authenticated'` to allow any signed-in
-- user (e.g. invited guests).
create policy "clay read"   on public.forecast_kv for select
  using      ( (auth.jwt() ->> 'email') ilike '%@clay.com' );
create policy "clay insert" on public.forecast_kv for insert
  with check ( (auth.jwt() ->> 'email') ilike '%@clay.com' );
create policy "clay update" on public.forecast_kv for update
  using      ( (auth.jwt() ->> 'email') ilike '%@clay.com' )
  with check ( (auth.jwt() ->> 'email') ilike '%@clay.com' );
create policy "clay delete" on public.forecast_kv for delete
  using      ( (auth.jwt() ->> 'email') ilike '%@clay.com' );
```

> Why this is secure: with RLS on and these policies, even someone who copies the
> anon key out of your JS bundle still gets **zero rows** unless they hold a valid
> Supabase session whose JWT email ends in `@clay.com`. They can't mint that
> themselves.

## 3. Turn on Google sign-in

1. **Authentication → Providers → Google → Enable.**
2. You need a Google OAuth client ID + secret. In the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   create an **OAuth 2.0 Client ID** (type: *Web application*). For the strongest
   restriction, set the OAuth **consent screen to "Internal"** so only your
   Google Workspace org can sign in at all.
   - **Authorized redirect URI**: copy the callback URL Supabase shows on the
     Google provider page (looks like
     `https://<project>.supabase.co/auth/v1/callback`).
3. Paste the Google **Client ID** and **Client Secret** back into Supabase and
   save.
4. **Authentication → URL Configuration → Site URL**: set it to where you'll run
   the app (for local dev, `http://localhost:5173`). Add any other URLs you'll
   use (e.g. your deployed/preview URL) under **Redirect URLs**.

> The `@clay.com` RLS check is the hard gate. Setting the Google app to
> "Internal" is belt-and-suspenders: it stops non-Clay accounts from even
> completing sign-in.

## 4. Wire the keys into the app

1. **Project Settings → API**, copy the **Project URL** and the **anon public**
   key (NOT `service_role`).
2. In the repo:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in `.env.local`:

   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your anon public key>
   VITE_ALLOWED_EMAIL_DOMAIN=clay.com
   ```

   `.env.local` is gitignored — it never gets committed.

## 5. Run it

```bash
npm install
npm run dev
```

Open the printed URL. You'll get a **Continue with Google** screen → sign in with
your `@clay.com` account → the cockpit loads. Edits now save to Supabase and
recall on any device/browser where a teammate signs in.

To confirm it's working: make an edit, then check **Table Editor → forecast_kv**
in Supabase — you'll see `meta` and `week:<date>` rows with JSON values.

---

## How the app chooses a backend

`src/App.jsx` picks a storage backend in this order (no code changes needed):

| Condition | Backend | Behavior |
|---|---|---|
| `VITE_SUPABASE_*` set | **Supabase** | Shared, durable, auth-gated. Sign-in required. |
| Running inside Claude | `window.storage` | Host-managed. |
| Neither | `localStorage` | One-browser only. No sign-in. |

So with no env vars the app still runs (localStorage) — handy for quick local
hacking — and the moment you add the env vars it becomes the secure shared
version.

## Deploying

For a hosted version (Vercel, Netlify, Cloudflare Pages — all have free tiers),
set the same three `VITE_*` variables in the host's environment settings and add
the deployed URL to Supabase's **Redirect URLs**. The single-file build
(`npm run build:standalone`) bakes the env vars in at build time, which is fine —
they're public by design.

## Migrating existing localStorage data (optional)

If you already entered data in localStorage and want to carry it into Supabase,
run this in the browser console **before** switching env vars on, to dump it:

```js
Object.keys(localStorage).filter(k => k.startsWith('wfm:'))
  .forEach(k => console.log(k.slice(4), localStorage.getItem(k)));
```

Then re-enter (or paste via the Table Editor) the `meta` / `week:*` rows. For a
handful of weeks it's quickest to just re-import your CSVs after signing in.

## Cost

Supabase free tier: 500 MB database + 50,000 monthly active auth users. This
dataset is a few KB per week, so you'll never approach the limits.
