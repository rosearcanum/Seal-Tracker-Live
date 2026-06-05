# 💬 Firebase Chat Setup — Step by Step

Firebase Realtime Database is **free** for what we need (no credit card required). Setup takes about 5 minutes.

---

## Step 1 — Create a Firebase project

1. Go to https://console.firebase.google.com/
2. Sign in with your Google account
3. Click **"Add project"**
4. Name it something like **"miami-ice-seal-chat"**
5. **Disable Google Analytics** (uncheck the box) — you don't need it
6. Click **Create project** → wait ~30 seconds → click **Continue**

---

## Step 2 — Create a Realtime Database

1. In the left sidebar, click **Build → Realtime Database**
2. Click **Create Database**
3. Choose a location: **United States (us-central1)** is fine
4. Choose **"Start in test mode"** (we'll lock it down in Step 4)
5. Click **Enable**

---

## Step 3 — Add a web app to the project

1. Back on the project home page, click the **`</>`** icon ("Add app" → Web)
2. App nickname: **"Seal Tracker"**
3. Do **NOT** check "Firebase Hosting"
4. Click **Register app**
5. Firebase will show you a code snippet — **copy the `firebaseConfig` object**, it looks like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "miami-ice-seal-chat.firebaseapp.com",
  databaseURL: "https://miami-ice-seal-chat-default-rtdb.firebaseio.com",
  projectId: "miami-ice-seal-chat",
  storageBucket: "miami-ice-seal-chat.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

6. Click **Continue to console**

---

## Step 4 — Lock down the database (security rules)

In test mode, anyone with your config can read/write for 30 days. Let's restrict it to just chat:

1. Go to **Realtime Database** → click the **Rules** tab
2. Replace the rules with this:

```json
{
  "rules": {
    "messages": {
      ".read": true,
      ".write": true,
      "$msgId": {
        ".validate": "newData.hasChildren(['name', 'text', 'timestamp']) && newData.child('text').isString() && newData.child('text').val().length < 500"
      }
    }
  }
}
```

3. Click **Publish**

This allows anyone to read and post messages, but only in the `messages` path, with valid structure and max 500 chars per message. Good enough for an internal tool — nobody is going to find this URL.

---

## Step 5 — Paste your config into app.js

Open `app.js` and find this block near the top (~line 26):

```js
const FIREBASE_CONFIG = {
  apiKey:        "YOUR_API_KEY_HERE",
  ...
};
```

Replace the **entire object** with the one you copied in Step 3. Save the file and push to GitHub.

---

## Step 6 — Add your GitHub Pages URL to the allowed domains

1. Back in Firebase Console, click the **⚙️ gear icon → Project settings**
2. Scroll down to **Your apps** → find your "Seal Tracker" web app
3. (No action needed — Realtime Database has no domain restriction by default, you're done!)

---

## You're done! 🎉

Open your GitHub Pages URL on two different devices (or two browser tabs). On one, pick a name like "Office". On the other, pick "Skateguard 1". Send a message — it should appear instantly on both with a ping sound.

---

## Troubleshooting

- **"Chat offline" status** → Your `FIREBASE_CONFIG` still has `YOUR_API_KEY_HERE`. Replace it with the real one.
- **Messages don't send** → Check the browser console (F12 → Console tab). If you see "PERMISSION_DENIED", re-check the rules in Step 4.
- **No browser notification** → The first time you send a message, your browser will ask permission. Click "Allow". You can change this later in browser site settings.
- **No ping sound** → Browsers block audio until you interact with the page. Click anywhere on the page once, and pings will work.

---

## Notes on cost

The free Firebase "Spark Plan" includes:
- 1 GB stored data (you'd need ~250,000 chat messages to fill this)
- 10 GB/month downloaded (you'd need hundreds of thousands of message reads)

You will never hit these limits with an internal arena chat. No billing is enabled, so it can't accidentally charge you.
