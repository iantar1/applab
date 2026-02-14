# Quick Reference - Admin WhatsApp Messaging

## The Problem
Admin messages not being sent to clients.

## The Solution
WhatsApp bridge service needs to be running.

## Quick Fix - 2 Steps

### Step 1: Start Bridge (Terminal 1)
```bash
cd /home/omar/Desktop/applab
pnpm run whatsapp
```
Wait for: `WhatsApp bridge listening on http://localhost:3001`
Then scan QR code with WhatsApp on phone.

### Step 2: Start App (Terminal 2)
```bash
cd /home/omar/Desktop/applab
pnpm dev
```
Wait for: `Ready in XXXms`

### Step 3: Send Message
1. Open http://localhost:3000
2. Login as admin
3. Go to **Messages** tab
4. Enter phone with country code: **+212612345678**
5. Type message
6. Click **Send Message**
7. Check WhatsApp ✅

## Important
- Phone format: `+212...` (WITH country code)
- Bridge MUST run in Terminal 1
- App MUST run in Terminal 2
- QR code must be scanned first time

## Check Status
```bash
# Check if bridge is running
ps aux | grep whatsapp

# Check if port 3001 is open
nc -z localhost 3001

# Test bridge
curl http://localhost:3001/status

# Run diagnostic
bash check-whatsapp.sh
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Bridge not running" | Run `pnpm run whatsapp` |
| "WhatsApp not ready" | Scan QR code |
| "Phone format error" | Use +212... format |
| "Not admin" | Check `isAdmin=1` in DB |
| Chrome not found | `sudo apt install chromium-browser` |

## Key Files
- Bridge: `/whatsapp/index.js`
- API: `/app/api/messages/send/route.ts`
- UI: `/app/home/page.tsx` (Messages tab)
- Guide: `COMPLETE_SETUP_GUIDE.md`

## Database
```sql
-- Check admin users
SELECT email, isAdmin FROM User;

-- See all messages
SELECT * FROM Message;

-- Make someone admin
UPDATE User SET isAdmin=1 WHERE email='user@example.com';
```

---
**Status:** Code ready - Just need to run the bridge!
