# CAS Assist Frontend

Expo SDK 57 application for CAS Assist. Routes live in `src/app`, while reusable components, hooks, context, constants, and API clients live under `src` beside the route tree.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env`, then set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL`.
3. Start with Expo Go by running `npm start`.

Other available commands are `npm run android`, `npm run ios`, `npm run web`, and `npm run check`. The complete check runs TypeScript, ESLint, and a production web export.

Public Expo environment values must never contain Supabase service-role credentials or other server secrets.
