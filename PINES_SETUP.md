# 🌲 Pines Setup Checklist

Pines is configured to use **only the DATA tab** in the Google Sheet — no separate Party Seals tab needed.

What's already done in `pines/app.js`:
- Seals 1–64 as regular
- Seals 65–84 as party seals (hidden from grid until activated)
- `PARTY_SHEET_NAME = 'DATA'` — party seals go in the DATA tab alongside regulars
- `ARENA_ID = 'pines'` — Firebase data stays isolated from Miami

---

## 1. Add party seals to the DATA tab

Open the Pines sheet: https://docs.google.com/spreadsheets/d/1592f1OvzcoFvXFLva0HcYulJ-0p4SXI4y9SboS58Rfk/

Currently the DATA tab goes from seal 1 to 84 — that's perfect. If you want, you can add a visual marker:
- **Optional:** highlight rows 65-84 in a light orange to indicate they're party seals (just for human reference — the app already knows which seals are party seals based on the IDs).

You can also keep it as-is. The app will treat 65-84 as party seals automatically.

---

## 2. Set up the Apps Script

1. In the Pines sheet, click **Extensions → Apps Script**
2. Delete anything that's already there
3. Open `pines/appsscript.gs` from your repo (I've made a Pines-specific version that works without the Party Seals tab) and paste the **entire** contents
4. Click **Save** (💾 icon)
5. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** → copy the long Web App URL

---

## 3. Add the midnight reset trigger

1. In Apps Script editor, click the **⏰ Triggers** icon (left sidebar)
2. Click **+ Add Trigger** (bottom right)
3. Set:
   - Function: `clearHistoryDaily`
   - Event source: **Time-driven**
   - Type: **Day timer**
   - Time: **Midnight to 1am**
4. Save

---

## 4. Update `pines/app.js`

Open `pines/app.js` in your repo and fill in **two values** near the top:

```js
// Line 18 — paste the Web App URL from step 2
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_PINES_URL/exec';

// Line 20 — set the Pines staff password
const STAFF_PASSWORD = 'YourPinesPasswordHere';
```

Commit and push to GitHub.

---

## 5. Update Firebase rules (one time, if you haven't)

In Firebase → Realtime Database → Rules → paste this and Publish:

```json
{
  "rules": {
    "$arena": {
      "messages": {
        ".read": true,
        ".write": true,
        "$msgId": {
          ".validate": "newData.hasChildren(['name', 'text', 'timestamp']) && newData.child('text').isString() && newData.child('text').val().length < 500"
        }
      },
      "seals":   { ".read": true, ".write": true },
      "rentals": { ".read": true, ".write": true },
      "meta":    { ".read": true, ".write": true }
    }
  }
}
```

---

## ✅ How it works

When a Pines staff member activates a party seal (e.g. seal 70):
- The web app shows it on the orange party section of the grid
- The Google Sheet logs it in the **DATA tab** (row for seal 70) with status `Active`
- The party room number is stored in the **Notes column** as `Party Room: X`
- Expiry is set based on the current party window (12pm / 5pm / 11:30pm)

Everything else works exactly like Miami — chat, history, midnight reset, etc.

---

## To add a Party Seals tab later (optional)

If you ever decide you want a separate tab:
1. Add a "Party Seals" tab to the Pines sheet (with columns A: Seal ID, B: Status, C: Start Time, D: Expiration Time, E: Additional Time, F: Party Room)
2. In `pines/app.js`, change:
   ```js
   const PARTY_SHEET_NAME = 'DATA';
   ```
   to:
   ```js
   const PARTY_SHEET_NAME = 'Party Seals';
   ```
3. Re-deploy. The Apps Script code handles both modes automatically.
