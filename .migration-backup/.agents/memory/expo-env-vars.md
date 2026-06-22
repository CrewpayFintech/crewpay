---
name: Expo EXPO_PUBLIC env vars on Replit
description: How to make Replit secrets available to the Expo Metro bundler as EXPO_PUBLIC_* vars.
---

# Expo EXPO_PUBLIC vars on Replit

## The Rule
Replit secrets are injected into the *process* environment but Metro bundler only inlines `EXPO_PUBLIC_*` vars if they are present in a `.env` file at bundle time. The process env alone is not enough.

**Why:** Metro reads `.env` at startup via `expo-env` — it does not scan `process.env` directly.

## How to Apply
Add a pre-start Node.js snippet to the `dev` script in `package.json` that writes `.env` from `process.env` before launching Expo:

```json
"dev": "node -e \"const fs=require('fs');const lines=[];['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_ANON_KEY'].forEach(k=>{if(process.env[k])lines.push(k+'='+process.env[k])});fs.writeFileSync('.env',lines.join('\\n')+'\\n')\" && ... pnpm exec expo start ..."
```

Add any additional `EXPO_PUBLIC_*` keys to the array as needed.

Also make the Supabase client resilient — use a lazy singleton via `getSupabase()` and a `Proxy` so it only throws when actually called, not at module load time. This gives the bundler a chance to load all modules before env vars are accessed.
