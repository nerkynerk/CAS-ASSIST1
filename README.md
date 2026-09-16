# CAS Assist

CAS Assist is a cross-platform academic information and helpdesk system for the New Era University College of Arts and Sciences.

## Project structure

- `Frontend/` — Expo Router application for web, Android, and iOS
- `Backend/` — TypeScript API, Supabase migrations, tests, and verification scripts

## Local development

```powershell
cd Frontend
npm install
npm run web
```

```powershell
cd Backend
npm install
npm run dev
```

Copy each `.env.example` to `.env` and provide the required local configuration before starting the services.

## Production website

https://cas-assist.vercel.app
