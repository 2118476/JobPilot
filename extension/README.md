# JobPilot — "Save Job" browser extension

A tiny Chrome/Edge (Manifest V3) extension to save any job posting straight into
JobPilot, where it's AI-scored against your profile.

## Install (load unpacked)

1. Make sure the JobPilot backend is running (`npm run dev:all`, backend on `:8787`).
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select this `extension/` folder.
5. Pin the extension. On any job page, click it → the title/company/description are
   auto-filled → **Save & AI-score**.

## Settings

Click **Settings** in the popup to set:
- **Backend URL** — defaults to `http://localhost:8787`. Set this to your deployed
  backend URL in production.
- **Access token** — only needed if you've enabled Supabase sign-in. Paste your
  JobPilot session token (in local mode, leave it blank).

## Notes
- For production, narrow `host_permissions` in `manifest.json` to your deployed
  backend's origin instead of the broad `https://*/*`.
- Add `icons` to `manifest.json` if you want a custom toolbar icon.
