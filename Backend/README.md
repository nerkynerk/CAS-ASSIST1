# CAS Assist API

Express 5 + TypeScript gateway for trusted CAS Assist operations. Server credentials must never use an `EXPO_PUBLIC_` prefix.

## Local setup

1. Copy `.env.example` to `.env`.
2. Supply server-only values through the shell or an untracked `.env`.
3. Run `npm ci`, `npm run typecheck`, `npm test`, then `npm run dev`.
4. Check `GET http://localhost:3000/api/health`.

The API validates Supabase bearer tokens, loads the registry profile server-side, and applies role/lifecycle middleware. Request logs redact authorization and credential-like fields.

## Production

Deploy `Backend/` as a Docker service using `render.yaml` or an equivalent HTTPS platform. Configure:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (or map the service-role key to this name)
- `ALLOWED_ORIGINS` as a comma-separated HTTPS allowlist
- optional `OPENAI_API_KEY`
- optional `EXPO_ACCESS_TOKEN`

After deployment, verify `/api/health` over HTTPS and set the frontend’s `EXPO_PUBLIC_API_URL` to that origin. Never expose server keys to the Expo app.

The AI endpoint is a closed-domain Tier-1 retrieval service. It searches only active, role-scoped articles managed in `tier1_knowledge_articles`, records confidence and feedback, and defers low-confidence or open-domain questions instead of guessing. Verified institutional document chunks remain excluded until equivalent audience metadata is available. Queue endpoints require the matching database RPC migrations. Notification delivery remains unavailable until device-token and delivery-log migrations exist.
