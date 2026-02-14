# Admin WhatsApp Messaging - Troubleshooting Guide

## Problem
Admin can't send messages to clients via WhatsApp.

## Root Causes & Solutions

### 1. ❌ WhatsApp Bridge Not Running
**Most Common Issue**

#### Check if bridge is running:
```bash
# Check running processes
ps aux | grep whatsapp

# You should see something like:
# node /home/omar/Desktop/applab/whatsapp/index.js
```

#### Start the WhatsApp bridge:
```bash
# Terminal 1: Start WhatsApp bridge
cd /home/omar/Desktop/applab
pnpm run whatsapp

# OR
node whatsapp/index.js
```

**Expected output:**
```
WhatsApp bridge listening on http://localhost:3001
```

---

### 2. ⚠️ WhatsApp Client Not Connected (Needs QR Scan)

After starting the bridge, you need to connect WhatsApp:

**Steps:**
1. Go to http://localhost:3000 (your app)
2. Login as admin
3. Go to **Messages** tab
4. Scan the **QR Code** with your WhatsApp mobile app
5. Wait for "WhatsApp client is ready" in terminal
6. Now you can send messages

**Check in admin panel:**
- If you see a QR code → bridge running but NOT scanned
- If you see "Ready" button → WhatsApp is connected ✅

---

### 3. 🔌 Bridge URL Misconfigured

**Check your .env file:**
```env
# Should point to WhatsApp bridge running on port 3001
WHATSAPP_BRIDGE_URL=http://localhost:3001
```

If you're running on different machine:
```env
# For remote server
WHATSAPP_BRIDGE_URL=http://your-server-ip:3001
```

---

### 4. 📱 Phone Number Format

WhatsApp requires international format:
- ✅ Correct: `+212612345678` or `212612345678`
- ❌ Wrong: `0612345678` (missing country code)

**Morocco examples:**
- Orange: `+212600000000`
- Maroc Telecom: `+212700000000`
- Inwi: `+212500000000`

---

### 5. 🔐 Admin Check Failing

**Verify admin status:**
```bash
# In your database terminal:
mysql -u iantar -p1234 -h 127.0.0.1 lab

# Then run:
SELECT id, fullName, email, isAdmin FROM User;

# Should show: isAdmin = 1 (or true)
```

If not admin, update:
```sql
UPDATE User SET isAdmin = 1 WHERE email = 'your-admin-email@example.com';
```

---

## Quick Start (All Steps)

### Terminal 1: WhatsApp Bridge
```bash
cd /home/omar/Desktop/applab
pnpm run whatsapp
```

Wait for: `WhatsApp bridge listening on http://localhost:3001`

### Terminal 2: Next.js App
```bash
cd /home/omar/Desktop/applab
pnpm dev
```

Wait for: `Ready in XXXms`

### Browser
1. Open http://localhost:3000
2. Login as admin
3. Go to **Messages** tab
4. Scan QR code with WhatsApp on phone
5. Wait ~5 seconds for "WhatsApp client is ready"
6. Enter phone number (international format)
7. Type message
8. Click **Send Message**

---

## Testing the Full Flow

### Test 1: Check Bridge Health
```bash
curl http://localhost:3001/status
# Should return: {"ready":true} or {"ready":false}
```

### Test 2: Check QR Code
```bash
curl http://localhost:3001/qr
# Should return QR image as data URL or null
```

### Test 3: Send Message Directly
```bash
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{"to":"212612345678","body":"Test from bridge"}'
# Should return: {"ok":true}
```

### Test 4: Send via App API
```bash
# First get auth token by logging in via browser
# Then test:
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_TOKEN" \
  -d '{"toPhone":"+212612345678","body":"Test from API"}'
```

---

## Error Messages & Solutions

### ❌ "WhatsApp bridge is not running"
**Fix:** Start bridge in Terminal 1: `pnpm run whatsapp`

### ❌ "WhatsApp client not ready"
**Fix:** Scan QR code in admin panel → Messages tab

### ❌ "Phone number format incorrect"
**Fix:** Use international format: `+212...` not `0...`

### ❌ "Unauthorized" or "Forbidden"
**Fix:** Verify you're logged in as admin
- Check: `isAdmin = 1` in database

### ❌ "Failed to send message"
**Causes:**
- Bridge crashed → Restart: `pnpm run whatsapp`
- Phone number not connected → Check WhatsApp is active on phone
- Network issue → Check `WHATSAPP_BRIDGE_URL` in .env

---

## File Locations

- **WhatsApp Bridge:** `/whatsapp/index.js`
- **Send Endpoint:** `/app/api/messages/send/route.ts`
- **Admin Auth:** `/lib/admin-auth.ts`
- **Frontend:** `/app/home/page.tsx` (Messages tab)

---

## Logs to Check

### WhatsApp Bridge Terminal
```
WhatsApp bridge listening on http://localhost:3001
QR received, scan with WhatsApp
WhatsApp client is ready          ← Success!
```

### Next.js App Terminal
```
GET /api/messages/send 200        ← Success!
GET /api/messages/send 503        ← Bridge not running
GET /api/messages/send 401        ← Not authenticated
GET /api/messages/send 403        ← Not admin
```

---

## Common Issues Checklist

- [ ] WhatsApp bridge running on port 3001?
- [ ] QR code scanned on phone?
- [ ] Phone number in international format?
- [ ] Logged in as admin?
- [ ] `.env` has correct `WHATSAPP_BRIDGE_URL`?
- [ ] Browser shows "Ready" button (not QR code)?
- [ ] No errors in terminal logs?

---

## Production Deployment

If running on Vercel/remote server:

1. **Run WhatsApp bridge separately:**
   ```bash
   # On a separate VPS or machine
   node whatsapp/index.js
   
   # Or use PM2:
   pm2 start whatsapp/index.js --name whatsapp-bridge
   ```

2. **Update .env with remote URL:**
   ```env
   WHATSAPP_BRIDGE_URL=https://whatsapp-bridge.yourserver.com
   ```

3. **Ensure bridge is always running:**
   ```bash
   pm2 startup
   pm2 save
   ```

---

**Status:** Ready for testing
**Last Updated:** February 14, 2026
