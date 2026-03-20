# Security checklist — Quiniela Mundial

## Secrets & deploy (Vercel)

1. **Never commit** `.env`, `.env.local`, or any file containing real keys. They are gitignored; keep it that way.
2. In **Vercel** → Project → Settings → Environment Variables, set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` **or** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (match what you use locally)
3. **Never** put `service_role` / **secret** keys in `NEXT_PUBLIC_*` or in client-side code. Those bypass RLS and must only run on a trusted server (Edge Functions / backend), not in the Next.js browser bundle.

## Supabase anon key is “public” by design

- The **anon** (or publishable) key is shipped to the browser. Security relies on **Row Level Security (RLS)** and Auth, not on hiding that key.
- Review `supabase/02-policies.sql` when you change tables; avoid `USING (true)` on sensitive data.

## If a key was exposed

1. Supabase Dashboard → **Settings → API** → rotate **anon** (and **service_role** if it was leaked).
2. Update Vercel env vars and local `.env.local`.
3. If `service_role` ever hit a public repo, treat it as compromised and rotate immediately.

## App hygiene

- Prefer **strong passwords** for user accounts; consider enabling **email confirmation** / MFA in Supabase Auth if you need extra hardening.
- Do not log full session tokens or passwords in client `console.log` in production builds.

## Dependency updates

- Run `npm audit` periodically and update dependencies for known CVEs.
