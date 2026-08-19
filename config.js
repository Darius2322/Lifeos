/* Life OS — config.js
   =========================================================================
   DEVELOPER CONFIGURATION ONLY. This file is never shown or editable in the
   app's Settings screen — it's meant to be edited directly by whoever
   deploys this install, before publishing it, then left alone.

   Fill in whichever optional features you want enabled on this deployment.
   Leave any value as "" to keep that feature off — the app checks for an
   empty string and hides/disables the corresponding option automatically
   (e.g. the Online AI toggle in Settings only becomes selectable once
   anthropicKey is set here).

   IMPORTANT — read before filling anything in:
   This is a fully static, client-side app with no server of its own. Any
   value placed here ships inside the JavaScript that every visitor's
   browser downloads, so it is NOT a secret — anyone who opens browser
   dev tools or views page source can read it back out.

   - supabaseUrl / supabaseKey: safe to put here. Supabase's anon key is
     designed to be public; real protection comes from Row Level Security
     policies on your Supabase tables (see the SQL shown in-app under
     Money → Shared goals).
   - googleClientId: safe to put here. OAuth "Client ID" values for
     browser-based apps are meant to be public; Google restricts what it
     can do based on the authorized origins you configure in Cloud Console,
     not secrecy of the ID itself.
   - anthropicKey: this one is a REAL secret — unlike the two above, it is
     not designed to be public, and anyone who extracts it from this file
     can spend against your account. Only put a key here if you've set a
     spending limit on it, and treat this as a known, accepted risk of a
     no-backend architecture. The only way to fully protect this key is a
     server-side proxy (a small serverless function that holds the key and
     forwards requests) instead of calling Anthropic directly from the
     browser — ask the developer/maintainer if you want that built instead.
   ========================================================================= */
window.LIFEOS_CONFIG = {
  anthropicKey: "",      // Anthropic API key — see the warning above before setting this
  supabaseUrl: "",       // e.g. "https://xxxxx.supabase.co"
  supabaseKey: "",       // Supabase anon (public) key
  googleClientId: ""     // Google OAuth Client ID, Web application type
};
