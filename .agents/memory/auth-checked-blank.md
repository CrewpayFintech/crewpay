---
name: authChecked blank screen
description: App shows blank white screen when authChecked stays false (Supabase session restore hangs).
---

The app in `artifacts/crewpay/App.tsx` renders a plain white `<View>` when `authChecked = false` (line ~1470). `setAuthChecked(true)` is called inside `restoreSession()` which runs `supabase.auth.getSession()`. If Supabase auth hangs (e.g. due to bad credentials), the app stays blank forever with no visible error.

**Fix applied:** Added an 8-second fallback `setTimeout` in the `useEffect` that runs `restoreSession` — if Supabase hasn't responded in 8 seconds, `setAuthChecked(true)` fires anyway so the user sees the onboarding screen instead of a blank page.

**Why:** `supabase.auth.getSession()` can silently hang with malformed credentials. The `.catch()` on `restoreSession()` only catches thrown errors, not hangs.

**How to apply:** The timeout is already in place. If blank screen returns, check Supabase credentials first (see supabase-anon-key.md).
