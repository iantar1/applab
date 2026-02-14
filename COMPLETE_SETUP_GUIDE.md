# Complete Setup - Admin WhatsApp Messaging

## 🎯 Goal
Enable admins to send WhatsApp messages to clients

## 📋 What's Ready (Already Built)

✅ **Code:** All endpoints and UI created
✅ **Database:** Tables exist and linked properly  
✅ **API Endpoints:**
   - `POST /api/messages/send` - Send message as admin
   - `GET /api/messages` - Get message history
   - `POST /whatsapp/send` - Bridge endpoint

✅ **Frontend:** Messages tab in admin panel with:
   - Phone number input
   - Message text box
   - Send button
   - Message history display
   - QR code scanner for setup

## 🚀 What You Need to Do

Start **3 terminal windows** in this exact order:

### Terminal 1: WhatsApp Bridge (MUST START FIRST)
```bash
cd /home/omar/Desktop/applab
pnpm run whatsapp
```

**Expected output:**
```
WhatsApp bridge listening on http://localhost:3001
(waiting for WhatsApp client to connect...)
```

**Next step:** Go to your phone and scan QR code
- App admin page will show a QR code
- Open WhatsApp on your phone
- Settings → Linked Devices → Link a Device
- Point phone camera at QR code
- Wait for terminal to show: "WhatsApp client is ready"

### Terminal 2: Next.js Application
```bash
cd /home/omar/Desktop/applab
pnpm dev
```

**Expected output:**
```
▲ Next.js 16.1.6 (Turbopack)
- Local:         http://localhost:3000
- Ready in XXXms
```

### Terminal 3: Database Monitor (Optional)
```bash
cd /home/omar/Desktop/applab
mysql -u iantar -p1234 -h 127.0.0.1 lab
```

Then you can monitor messages:
```sql
SELECT * FROM Message ORDER BY createdAt DESC;
```

## ✨ Now Test It

1. **Open browser:** http://localhost:3000
2. **Login as admin** (user with isAdmin=1)
3. **Go to Messages tab**
4. **Check status:**
   - If QR code shows → Scan it with WhatsApp
   - If "Ready" button shows → Bridge is connected ✅
5. **Send test message:**
   - Phone: `+212612345678` (your number)
   - Message: "Test message from admin"
   - Click "Send Message"
6. **Check your WhatsApp** → Message should arrive!

## 🔧 Troubleshooting

### Terminal 1 shows errors about Chrome/Chromium?
```bash
# Install Chrome on Linux
sudo apt install chromium-browser

# Or tell system where it is
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
pnpm run whatsapp
```

### Terminal 1 shows "ERR_CONNECTION_REFUSED"?
- Make sure database is running:
  ```bash
  # Check MySQL
  mysql -u iantar -p1234 -h 127.0.0.1 lab -e "SELECT 1;"
  ```

### Can't find Messages tab?
- Only admins see Messages tab
- Check: `SELECT isAdmin FROM User WHERE email='YOUR_EMAIL';`
- If 0, update: `UPDATE User SET isAdmin=1 WHERE email='YOUR_EMAIL';`

### Message not sending?
1. Check Terminal 1 shows "WhatsApp client is ready"
2. Check phone number includes country code
3. Check error in browser console (F12)
4. Check bridge logs in Terminal 1

## 📊 Full Flow Diagram

```
Browser (Admin Panel)
    ↓
Click "Send Message"
    ↓
POST /api/messages/send
    ↓
Verify user is admin
    ↓
Call Bridge: http://localhost:3001/send
    ↓
WhatsApp Bridge (whatsapp/index.js)
    ↓
Use whatsapp-web.js to send
    ↓
Save to Database
    ↓
Client receives on WhatsApp ✅
```

## 🛠️ Quick Commands

```bash
# Start WhatsApp bridge
pnpm run whatsapp

# Start Next.js app (separate terminal)
pnpm dev

# Check bridge is running
ps aux | grep whatsapp

# Test bridge directly
curl http://localhost:3001/status

# Check database connection
mysql -u iantar -p1234 -h 127.0.0.1 lab -e "SELECT 1;"

# See all messages
mysql -u iantar -p1234 -h 127.0.0.1 lab -e "SELECT * FROM Message;"

# Run diagnostic script
bash check-whatsapp.sh
```

## 📝 Phone Number Format

**Important:** WhatsApp requires international format

**Morocco (Example):**
- ✅ `+212612345678` (with +)
- ✅ `212612345678` (without +)
- ❌ `0612345678` (wrong - missing country code)

**Other countries:**
- France: `+33` prefix
- USA: `+1` prefix
- UK: `+44` prefix

## ⚠️ Important Notes

1. **WhatsApp bridge must always be running**
   - If you close Terminal 1, bridge stops
   - Messages can't be sent
   - Re-start with `pnpm run whatsapp`

2. **QR code needs to be scanned every time you restart bridge**
   - First scan: Device registration
   - Subsequent scans: Re-authentication
   - Device stays logged in if not disconnected

3. **Only one admin can send at a time**
   - Bridge uses one WhatsApp account
   - Multiple admins → same phone number
   - Messages appear as from that one account

4. **Browser stays logged in**
   - Keep cookies enabled
   - Session lasts until logout

## 🚀 Production Deployment

When deploying to production:

1. **Run bridge on separate server:**
   ```bash
   # On VPS or separate machine
   git clone your-repo
   cd applab
   pnpm install
   pnpm run whatsapp
   
   # Keep it running with PM2
   pm2 start whatsapp/index.js --name bridge
   pm2 startup
   pm2 save
   ```

2. **Update Next.js to point to remote bridge:**
   ```env
   # In .env on Vercel/production
   WHATSAPP_BRIDGE_URL=https://bridge.yourdomain.com:3001
   ```

3. **Scan QR on remote server:**
   ```bash
   # SSH into bridge server
   ssh user@bridge.yourdomain.com
   
   # Check logs
   pm2 logs bridge
   
   # View QR by accessing bridge from admin panel
   ```

## 📚 Related Files

- `/whatsapp/index.js` - Bridge service code
- `/app/api/messages/send/route.ts` - Send endpoint
- `/app/api/messages/route.ts` - Get messages
- `/app/home/page.tsx` - Admin UI (Messages tab)
- `ADMIN_WHATSAPP_MESSAGING_FIX.md` - Detailed troubleshooting
- `check-whatsapp.sh` - Diagnostic script

---

**Ready?** Start Terminal 1: `pnpm run whatsapp` 🚀
