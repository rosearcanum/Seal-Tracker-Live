# 🔥 Firebase Rules Update Needed

Your app now uses Firebase for live seal sync + chat + history + midnight cleanup. You need to update your security rules to allow all the paths.

## Steps:

1. Go to https://console.firebase.google.com/ → your project
2. Click **Realtime Database** in the left sidebar
3. Click the **Rules** tab
4. **Replace your existing rules** with these:

```json
{
  "rules": {
    "messages": {
      ".read": true,
      ".write": true,
      "$msgId": {
        ".validate": "newData.hasChildren(['name', 'text', 'timestamp']) && newData.child('text').isString() && newData.child('text').val().length < 500"
      }
    },
    "seals": {
      ".read": true,
      ".write": true
    },
    "rentals": {
      ".read": true,
      ".write": true
    },
    "meta": {
      ".read": true,
      ".write": true
    }
  }
}
```

5. Click **Publish**

That's it — your live seal sync and midnight cleanup will work immediately after publishing.
