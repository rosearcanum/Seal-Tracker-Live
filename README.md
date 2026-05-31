# 🦭 Seal Tracker — Miami Ice Arena
## Setup Guide

---

## Files in this project
| File | Purpose |
|------|---------|
| `index.html` | Main web app |
| `style.css` | All styles |
| `app.js` | App logic + password config + seal list |
| `appsscript.gs` | Google Apps Script — paste into your Sheet |

---

## Step 1 — Set your staff password

Open `app.js` and find line 14:
```js
const STAFF_PASSWORD = 'icearena'; // ← CHANGE THIS
```
Change `'icearena'` to whatever word or phrase you want. Don't share this with skateguards.

---

## Step 2 — Update your seal list in app.js

Find the `ALL_SEALS` array and edit it to match every seal ID in your DATA sheet exactly (numbers, letters, symbols):
```js
const ALL_SEALS = [
  '1','2','3', ... '60',
  'A','B','M','X',
  '★','🛑','🦭'
  // add every seal you have
];
```

---

## Step 3 — Set up the Google Apps Script

> ⚠️ Your existing Apps Script already has `onEdit` logic and 3 triggers.
> The new `appsscript.gs` **includes your original code untouched** — it just adds
> the `doGet` web app handler on top. You are replacing, not losing, anything.

1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. **Select All** (Ctrl+A / Cmd+A) and **Delete** everything
4. Open `appsscript.gs` from this folder and paste the entire contents
5. Click **Save** (💾 icon)
6. Your 3 existing triggers (`updateCurrentTime`, `updatePartySealsTime`, `clearHistoryDaily`) are already set up — **do not delete them**, they stay exactly as they were

---

## Step 4 — Deploy as a Web App

1. Click **Deploy → New deployment**
2. Set:
   - **Type:** Web app
   - **Execute as:** Me
   - **Who has access:** Anyone
3. Click **Deploy** → copy the long Web App URL

---

## Step 5 — Paste the URL into app.js

Open `app.js` and replace the placeholder on line 7:
```js
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
// becomes:
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
```

---

## Step 6 — Deploy to GitHub Pages

1. Create a new GitHub repository (or use an existing one)
2. Upload `index.html`, `style.css`, and `app.js`
3. Go to **Settings → Pages**
4. Source: **Deploy from a branch → main → / (root)**
5. Save — your app will be live at `https://yourusername.github.io/repo-name/`

Share this URL with everyone. Skateguards use the Skateguard tab freely. Staff log in with the password for the Staff and Party tabs.

---

## How the password works

| Who | What they can do |
|-----|-----------------|
| Anyone (no login) | View Skateguard tab — all active seals, countdowns, expiry times |
| Staff (logged in) | Activate, Return, and Extend seals on all tabs |
| After locking | Click 🔒 LOCK in the header to lock it back |

---

## How the Sheet and web app stay in sync

- The web app **reads from and writes to your Google Sheet** via the Apps Script
- Every activation and return from the web app goes into the Sheet AND the HISTORY tab, formatted exactly the same way as manual edits
- Your existing `onEdit` logic still works if anyone edits the Sheet directly
- Your midnight reset (`clearHistoryDaily`) still runs automatically
- The Sheet is always the source of truth — if the web app goes down, staff can fall back to the Sheet as normal

---

## Re-deploying after changes

Any time you edit `appsscript.gs`, you must re-deploy:
**Deploy → Manage deployments → Edit (pencil icon) → Deploy**

You do NOT need to re-deploy for changes to `app.js`, `style.css`, or `index.html` — just push to GitHub and Pages updates automatically.

---

## Column reference

**DATA sheet:**
| Col | Field |
|-----|-------|
| A | Seal ID |
| B | Status (`Active` / `Returned`) |
| C | Start Time |
| D | Expiration Time |
| E | Additional Time (minutes) |
| F | Notes |
| G | Time Remaining (formula) |

**Party Seals sheet:**
| Col | Field |
|-----|-------|
| A | Seal ID |
| B | Status (`Rented`) |
| C | Start Time |
| D | Expiration Time (5:00 PM) |
| E | Additional Time (minutes) |
| F | Party Room ← triggers activation |
