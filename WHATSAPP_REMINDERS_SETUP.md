# 🤖 WhatsApp Reminder Bot - Quick Setup Guide

## What's New?

Your app now has an **automated WhatsApp reminder bot** that sends appointment reminders 30 minutes before each booking!

---

## ⚡ Quick Start (5 minutes)

### 1. Start the WhatsApp Bridge
```bash
pnpm run whatsapp
```
(Keep this running in a separate terminal)

### 2. Start the App
```bash
pnpm dev
```

### 3. Start the Reminder Scheduler (Optional for local testing)
```bash
# In another terminal
pnpm run scheduler
```
This shows you reminder checks happening every 5 minutes.

### 4. Connect WhatsApp (One-time setup)
- Open http://localhost:3000 in your browser
- Go to **Home** → **Messages** tab
- Scan the QR code with WhatsApp on your phone
- Done! Connection is saved.

### 5. Test It!
```bash
# Manually trigger a reminder check
curl -X GET "http://localhost:3000/api/scheduler/appointment-reminders"
```

---

## 📱 How It Works

```
📅 Customer books an appointment
   ↓
✅ Confirmation WhatsApp sent immediately
✅ Confirmation Email sent immediately
   ↓
⏰ 29 minutes before appointment
   ↓
🔔 Reminder WhatsApp sent
📧 Reminder Email sent
```

---

## 🎯 Complete Setup Commands

```bash
# Terminal 1: WhatsApp bridge
pnpm run whatsapp

# Terminal 2: Next.js app
pnpm dev

# Terminal 3: Local scheduler (optional - for testing)
pnpm run scheduler
```

Or run everything in one terminal:
```bash
pnpm run dev:full
```
(You'll still need WhatsApp bridge in another terminal)

---

## 📂 What's New in Your Project

### New Files:
- ✅ `/app/api/scheduler/appointment-reminders/route.ts` - Reminder scheduler API
- ✅ `/scripts/scheduler.js` - Local scheduler for testing
- ✅ `/APPOINTMENT_REMINDERS.md` - Full documentation
- ✅ `/WHATSAPP_SUMMARY.md` - WhatsApp integration overview
- ✅ `/vercel.json` - Cron configuration for Vercel

### Updated Files:
- 📝 `/package.json` - Added `scheduler` and `dev:full` scripts

---

## 🚀 For Production (Vercel)

1. Push code to your Vercel-connected repo
2. Reminders run **automatically every 5 minutes** via cron jobs
3. WhatsApp bridge should run as a separate service (Heroku, Railway, etc.)

---

## 🔐 Security (Optional)

Add a secret key to prevent unauthorized scheduler calls:

```env
# .env
SCHEDULER_SECRET=your-super-secret-key-here
```

Then calls must include:
```bash
curl -X GET "http://localhost:3000/api/scheduler/appointment-reminders" \
  -H "Authorization: Bearer your-super-secret-key-here"
```

---

## 🐛 Troubleshooting

### Reminders not sending?
1. ✅ WhatsApp bridge running? (`pnpm run whatsapp`)
2. ✅ Appointment is "confirmed" status?
3. ✅ Phone number in E.164 format? (e.g., `+212612345678`)
4. ✅ Scheduler running? (check logs)

### WhatsApp not connecting?
1. Kill and restart: `pnpm run whatsapp`
2. Delete session: `rm -rf whatsapp/.wwebjs_auth`
3. Scan QR code again

### Need to change reminder timing?
Edit `/vercel.json` for production or `/scripts/scheduler.js` for local:
```json
"schedule": "*/5 * * * *"  // Change 5 to any minutes
```

---

## 📖 Full Documentation

- 📄 **APPOINTMENT_REMINDERS.md** - Complete API reference
- 📄 **WHATSAPP_SUMMARY.md** - Integration overview
- 📄 **README.md** - General project info

---

## ✅ Features

✨ **Automatic reminders** - No manual intervention needed
✨ **WhatsApp + Email** - Multi-channel notifications
✨ **Smart timing** - Only sends 30 mins before
✨ **Error handling** - Continues if one fails
✨ **Guest support** - Works for guest bookings too
✨ **Secure** - Optional API key protection
✨ **Production ready** - Works on Vercel + self-hosted

---

## 💡 Example Flow

### Creating a Booking:
```javascript
// Customer makes appointment for Feb 14, 3:00 PM
POST /api/bookings
{
  guestPhone: "+212612345678",
  guestEmail: "customer@example.com",
  appointmentDate: "2026-02-14",
  appointmentTime: "15:00"
}

// Response:
✅ Confirmation WhatsApp sent
✅ Confirmation Email sent
```

### 30 Minutes Before (2:30 PM):
```bash
# Scheduler automatically sends:
✅ Reminder WhatsApp: "Hi! Reminder: Your lab appointment..."
✅ Reminder Email: "Appointment reminder..."
```

---

**That's it! Your WhatsApp reminder bot is ready to use!** 🎉

Have questions? Check the full docs or contact support.
