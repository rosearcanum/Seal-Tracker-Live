# 🐟 StalkBobby Setup Guide
## Multi-arena seal tracker

This is the deployment guide for `stalkbobby.com` serving multiple arenas.

---

## 📁 Folder structure

```
stalkbobby.com (your GitHub repo)
├── index.html              ← Landing page (arena picker)
├── style.css               ← Shared styles
├── README.md, etc.         ← Optional docs
├── miami/
│   ├── index.html          ← Miami app shell
│   └── app.js              ← Miami config + logic
└── pines/
    ├── index.html          ← Pines app shell
    └── app.js              ← Pines config + logic
```

When the user visits:
- `stalkbobby.com/` → arena picker
- `stalkbobby.com/miami/` → Miami app
- `stalkbobby.com/pines/` → Pines app

---

## ⚙️ Setup Checklist

### 1. Push files to GitHub
Upload everything to your repo, keeping the folder structure exactly as shown above.

### 2. Update Firebase rules (one time)
The rules need to allow per-arena namespaces. Replace your Firebase rules with this:

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

**Important:** This wipes your existing chat/seals data once. If you have anything from yesterday you want to keep, screenshot it first. Going forward, Miami data lives at `/miami/...` and Pines data lives at `/pines/...` — they will never mix.

### 3. Create the Pines Google Sheet
Make a copy of your Miami sheet (so it has all the same tabs: DATA, Party Seals, HISTORY).
- Update the Seal IDs in column A to match Pines's actual seals
- Open Extensions → Apps Script
- Paste in the SAME Apps Script code as Miami
- Deploy → New deployment → Web app → Execute as Me, Anyone access
- Copy the new Web App URL

### 4. Update Pines `app.js`
Open `pines/app.js` and update these three lines near the top:

```js
const APPS_SCRIPT_URL = 'PASTE_PINES_WEBAPP_URL_HERE';
const STAFF_PASSWORD  = 'YOUR_PINES_PASSWORD_HERE';
```

Also update the seal lists below to match Pines's actual seals:
```js
const REGULAR_SEALS  = [ ...your Pines regular seals... ];
const PARTY_GRID_SEALS = [ ...your Pines party seals... ];
```

(I'll send you those lists once you give me the seal info.)

### 5. Enable GitHub Pages
- In your repo: Settings → Pages
- Source: Deploy from a branch → `main` (or `master`) → `/ (root)`
- Save. GitHub will give you a URL like `username.github.io/repo-name`

### 6. Set up the custom domain `stalkbobby.com`
**Buy the domain** (~$10-12/year) from any registrar:
- **Cloudflare Registrar** (cheapest, at-cost pricing): https://www.cloudflare.com/products/registrar/
- **Namecheap**: https://www.namecheap.com/
- **Porkbun**: also good

**Point it at GitHub Pages:**
1. In your GitHub repo settings → Pages → "Custom domain", enter `stalkbobby.com`, click Save
2. At your domain registrar, add these DNS records:

| Type | Name | Value |
|------|------|-------|
| A    | @    | 185.199.108.153 |
| A    | @    | 185.199.109.153 |
| A    | @    | 185.199.110.153 |
| A    | @    | 185.199.111.153 |
| CNAME | www | `yourusername.github.io` |

3. Back in GitHub Pages settings, check **"Enforce HTTPS"** once the cert is issued (takes 5-60 minutes)

Done — `stalkbobby.com` will load your landing page, `stalkbobby.com/miami/` and `stalkbobby.com/pines/` will load each arena.

---

## 🔑 Notes on isolation

Each arena is completely isolated:
- ✅ Different Google Sheets (different data, different Apps Script URLs)
- ✅ Different staff passwords
- ✅ Different chat threads (Miami staff don't see Pines chat and vice versa)
- ✅ Different seal lists
- ✅ Different login sessions (logging into Miami doesn't log you into Pines)
- ✅ Different histories
- ✅ Independent midnight resets

They share:
- 📦 The same Firebase project (just different paths inside it — cheaper than two projects)
- 📦 The same CSS file (so any visual update applies to both)
- 📦 The same Bobby logo

---

## 🪴 To add a third arena later

1. Copy the `miami/` folder → rename to e.g. `kendall/`
2. In the new `app.js`, change `ARENA_ID` to `'kendall'` and update the other config values
3. Add a new card to the landing page `index.html`
4. Create a third Google Sheet + Apps Script deployment
5. Update the Firebase rules — they already use `$arena` as a wildcard, so any new arena ID is auto-allowed

That's it.
