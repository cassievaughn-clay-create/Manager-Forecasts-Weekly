/* Vercel serverless function: POST /api/invite
 *
 * Invite-only access. An authenticated @clay.com user invites another @clay.com
 * user. Inviting requires the Supabase service_role key, which must NEVER be in
 * the browser — it lives only here, as a server-side Vercel env var.
 *
 * Flow:
 *   1. Read the caller's Supabase access token (Authorization: Bearer …) and
 *      verify it; require an allowed-domain email.
 *   2. Validate the target email is on the allowed domain.
 *   3. service_role → inviteUserByEmail (sends the Supabase invite email from
 *      your custom SMTP sender, e.g. no-reply@forecasting.chris-apis.xyz).
 *
 * Required server env (Vercel → Settings → Environment Variables, NOT VITE_*):
 *   SUPABASE_URL                e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   the service_role secret (server-only)
 *   ALLOWED_EMAIL_DOMAIN        e.g. clay.com
 *   APP_URL (optional)          e.g. https://forecasting.chris-apis.xyz
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "").toLowerCase();
const APP_URL = process.env.APP_URL;

const onDomain = (email) => !ALLOWED_DOMAIN || email.endsWith("@" + ALLOWED_DOMAIN);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (!SUPABASE_URL || !SERVICE_ROLE) return res.status(500).json({ error: "server not configured" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Authenticate the caller.
  const authz = req.headers.authorization || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: "not authenticated" });
  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
  const callerEmail = (callerData?.user?.email || "").toLowerCase();
  if (callerErr || !callerEmail) return res.status(401).json({ error: "invalid session" });
  if (!onDomain(callerEmail)) return res.status(403).json({ error: "not allowed" });

  // 2. Validate the target.
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const target = (body?.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) return res.status(400).json({ error: "invalid email" });
  if (!onDomain(target)) return res.status(400).json({ error: `only @${ALLOWED_DOMAIN} addresses can be invited` });

  // 3. Invite.
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    target, APP_URL ? { redirectTo: APP_URL } : undefined
  );
  if (inviteErr) {
    if (/already|registered|exists/i.test(inviteErr.message)) {
      return res.status(200).json({ ok: true, note: "already invited" });
    }
    return res.status(400).json({ error: inviteErr.message });
  }
  return res.status(200).json({ ok: true });
}
