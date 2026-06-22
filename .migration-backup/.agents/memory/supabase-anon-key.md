---
name: Supabase anon key fix
description: The Supabase anon key was stored incomplete (128 chars, missing JWT header). Full key required.
---

The issue was the `EXPO_PUBLIC_SUPABASE_ANON_KEY` secret contained only the payload segment of the JWT — the header was missing. A valid Supabase anon key is ~220 characters, with three dot-separated base64url segments: `eyJhbGci...header.eyJpc3MiOiJzdXBhYmFzZSI...payload.signature`.

**Why:** The user had previously pasted only part of the key (starting with `.eyJ` — note the leading dot). Supabase silently accepted the malformed key on initialization but `getSession()` calls failed or hung, leaving `authChecked = false`.

**How to apply:** If the app shows a persistent blank white screen and there are no JS errors in the console, check `artifacts/crewpay/.env` — the anon key should be 220+ chars with exactly two dots. If it's 128 chars or starts with `.eyJ`, the header segment is missing.
