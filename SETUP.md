# Deploying on Vercel + Supabase (GitHub-driven)

The app is a static Vite SPA. This setup wires it to:

- **Supabase** — the database (one `forecast_kv` table) **and** auth. Login is a
  passwordless **email one-time code**, restricted to **`@clay.com`**.
- **Vercel** — hosts the built SPA on a global CDN.
- **GitHub** — the connective tissue: Vercel watches the repo and gives you
  **controlled deployments** — every push to `main` ships to production, every
  branch/PR gets its own preview URL.

No backend server of your own: the browser talks to Supabase directly with the
public **anon key**, and **Row Level Security** is what actually enforces the
`@clay.com` restriction (the anon key is safe to ship — RLS does the gating).

---

## 1. Create the Supabase project

1. <https://supabase.com> → sign in with GitHub → **New project**.
2. Name it (e.g. `manager-forecasts`), choose a region, set a DB password.
3. Wait ~2 min to provision.

## 2. Create the table + RLS policies

**SQL Editor → New query**, paste, **Run**:

```sql
create table public.forecast_kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.forecast_kv enable row level security;

-- Only a signed-in user whose email is on @clay.com can touch the data.
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

> Even if someone lifts the anon key out of the JS bundle, they get **zero rows**
> without a valid Supabase session whose JWT email ends in `@clay.com` — and they
> can't mint one.

## 3. Configure email one-time-code login

1. **Authentication → Providers → Email**: make sure it's enabled.
2. **Make the email contain the code.** Supabase's default email sends a magic
   *link*; to show the 6-digit code the app asks for, go to **Authentication →
   Emails → Magic Link** template and ensure it includes the token, e.g.:

   ```
   Your sign-in code is: {{ .Token }}
   ```

   (Clicking the link still works too — the app picks up either.)
3. **Lock signups to your domain (defense in depth).** RLS already blocks
   non-Clay data access, but to stop non-Clay addresses from creating accounts at
   all, add a **Before User Created** Auth Hook, or keep it simple and rely on
   RLS + the in-app check. The app only *requests* a code for `@clay.com`
   addresses.
4. **Deliverability (important for real use).** Supabase's built-in email sender
   is rate-limited (a few per hour) and meant for testing. For reliable codes to
   `@clay.com` inboxes, set a **custom SMTP** under **Authentication → Emails →
   SMTP Settings** (Resend's free tier works well).
5. **URL configuration.** Under **Authentication → URL Configuration**, set
   **Site URL** to your Vercel production URL and add your preview URLs +
   `http://localhost:5173` under **Redirect URLs** (needed if anyone clicks the
   magic link rather than typing the code). You'll fill the Vercel URLs in after
   step 5.

## 4. Push the repo to GitHub

This branch is ready to go. Push it to a GitHub repo (the one Vercel will watch):

```bash
git push -u origin feat/vercel-supabase   # then open a PR / merge to main
```

## 5. Connect Vercel to GitHub

1. <https://vercel.com> → **Add New… → Project** → import the GitHub repo.
2. Framework preset auto-detects **Vite** (build `npm run build`, output `dist`
   — already pinned in [`vercel.json`](vercel.json)).
3. **Environment Variables** — add these for **both Production and Preview**
   (Project → Settings → Environment Variables). Values from Supabase →
   **Project Settings → API**:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<project>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the **anon public** key (not `service_role`) |
   | `VITE_ALLOWED_EMAIL_DOMAIN` | `clay.com` |

4. **Deploy.** From now on: push to `main` → production deploy; any branch/PR →
   its own preview URL. That's your controlled-deployment pipeline.

## 6. Close the loop on auth URLs

Copy your Vercel production URL (and the preview pattern, e.g.
`https://*-<your-team>.vercel.app`) back into Supabase →
**Authentication → URL Configuration** (Site URL + Redirect URLs).

## 7. Import the rescued data

Generate INSERTs from your backup and run them in Supabase:

```bash
node scripts/backup-to-sql.mjs ~/Downloads/forecast-backup.json seed.sql
```

Open `seed.sql`, copy it into **Supabase → SQL Editor**, and run. (Or paste the
`meta` / `week:<date>` rows directly in the **Table Editor**.) `seed.sql` is
gitignored — it holds real data, so it never lands in the repo.

---

## Local development

```bash
cp .env.example .env.local      # fill in the three VITE_ vars
npm install
npm run dev                     # http://localhost:5173 → email-code sign-in
```

With **no** `.env.local`, the app runs on `localStorage` (no sign-in) — handy for
pure UI work.

## How the backend is chosen

| Condition | Backend | Auth |
|---|---|---|
| `VITE_SUPABASE_*` set (Vercel, or local `.env.local`) | **Supabase** | email one-time code, `@clay.com` only |
| Running inside Claude | `window.storage` | none |
| Neither | `localStorage` | none |

`sget`/`sset` in `src/App.jsx` switch automatically — no code edits to move
between them.

## Cost

Supabase free tier: 500 MB DB + 50k monthly auth users. Vercel Hobby: plenty for
a static SPA. This dataset is a few KB.
