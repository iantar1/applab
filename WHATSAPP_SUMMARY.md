# WhatsApp Integration Summary

Your application already has comprehensive WhatsApp integration in place! Here's what's ready:

## ✅ Already Implemented

### 1. **WhatsApp Bridge** (`/whatsapp/index.js`)
- Uses `whatsapp-web.js` + Puppeteer for Web WhatsApp automation
- Persistent session storage (LocalAuth)
- Bidirectional messaging (send & receive)
- Runs on separate port (3001 by default)

**Start the bridge**:
```bash
pnpm run whatsapp
```

### 2. **Admin Dashboard** (`/app/home/page.tsx`)
- WhatsApp connection status
- QR code scanning for first-time setup
- Send/receive messages interface
- Message history
- Configure sender phone number

### 3. **WhatsApp Notifications API** (`/app/api/notifications/whatsapp/route.ts`)
- **POST**: Send WhatsApp messages
- **GET**: Send reminders with appointment details

### 4. **Twilio Integration** (`/lib/twilio.ts`)
- Alternative: Twilio WhatsApp API
- Phone number formatting for Morocco (+212)
- Fallback option if web.js doesn't work

### 5. **Notification Service** (`/lib/notification-service.ts`)
- `sendConfirmationWhatsApp()` - Send booking confirmation
- `sendReminderWhatsApp()` - Send appointment reminder
- `sendAllNotifications()` - Send email + WhatsApp together

### 6. **Booking Integration** 
- Sends confirmation WhatsApp when booking is created
- Stores messages in database (`Message` table)

---

## 🆕 Now Added: Automatic Reminder Scheduler

### New Endpoint: `/api/scheduler/appointment-reminders`

**Automatically sends WhatsApp + Email reminders 30 minutes before appointments!**

#### Features:
- ✅ Runs every 5 minutes (configurable)
- ✅ Sends to both WhatsApp and Email
- ✅ Only sends reminders for confirmed appointments
- ✅ Works with guest bookings
- ✅ Security: Optional API key protection
- ✅ Error handling: Logs failures, continues with others

#### How to Use:

**1. For Vercel (Production):**
Already configured in `vercel.json` - reminders run automatically!

**2. For Local Testing:**
```bash
# Manual check for reminders
curl -X GET "http://localhost:3000/api/scheduler/appointment-reminders"

# Send reminder for specific appointment
curl -X POST "http://localhost:3000/api/scheduler/appointment-reminders" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": 123}'
```

**3. For Self-Hosted Servers:**
Create `scripts/scheduler.js` with node-cron (see APPOINTMENT_REMINDERS.md)

---

## 📱 WhatsApp Message Flow

### On Booking Confirmation:
```
User creates booking
    ↓
✅ Confirmation email sent
✅ Confirmation WhatsApp sent (if phone provided)
```

### 30 Minutes Before Appointment:
```
Scheduler runs every 5 minutes
    ↓
Finds upcoming appointments (30-min window)
    ↓
✅ Reminder email sent
✅ Reminder WhatsApp sent
```

---

## 🔧 Configuration

### Required Environment Variables:

```env
# Twilio (if using Twilio instead of web.js)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+1234567890

# Optional: Scheduler security
SCHEDULER_SECRET=your-secret-key

# Optional: WhatsApp bridge
WHATSAPP_BRIDGE_URL=http://localhost:3001
WHATSAPP_BRIDGE_PORT=3001

# Database (already configured)
DATABASE_URL=mysql://...
```

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `/whatsapp/index.js` | WhatsApp bridge (web.js) |
| `/app/api/notifications/whatsapp/route.ts` | WhatsApp notification endpoints |
| `/app/api/scheduler/appointment-reminders/route.ts` | 🆕 Reminder scheduler |
| `/lib/notification-service.ts` | Notification functions |
| `/lib/twilio.ts` | Twilio WhatsApp API |
| `/app/home/page.tsx` | Admin dashboard UI |
| `/vercel.json` | 🆕 Cron configuration |
| `/APPOINTMENT_REMINDERS.md` | 🆕 Scheduler documentation |

---

## ✨ Quick Start

### 1. Start the WhatsApp Bridge
```bash
pnpm run whatsapp
```

### 2. Run the App
```bash
pnpm dev
```

### 3. Connect WhatsApp (Admin)
- Go to **Home** → **Messages** tab
- Scan QR code with WhatsApp on your phone
- Connection persists automatically

### 4. Test Reminders
```bash
# Create a test booking with appointment in ~30 minutes
# Then manually check:
curl -X GET "http://localhost:3000/api/scheduler/appointment-reminders"

# Or directly send reminder to an appointment:
curl -X POST "http://localhost:3000/api/scheduler/appointment-reminders" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": 1}'
```

---

## 🚀 Deployment Notes

### Vercel
- Cron jobs automatically run via `vercel.json`
- WhatsApp bridge must run in a separate process/service
- Consider using **Twilio** for production (more reliable)

### Self-Hosted
- Run `pnpm run whatsapp` in separate terminal
- Use node-cron for scheduler (see docs)
- Ensure database URL is configured

### Production Recommendation
Use **Twilio WhatsApp API** instead of web.js for:
- Better reliability
- Official WhatsApp Business Account
- Higher message limits
- Professional support

---

## 📝 Next Steps (Optional)

1. **Switch to Twilio** for production reliability
2. **Add message templates** for better formatting
3. **Implement message scheduling** for specific times
4. **Add media support** (images, documents)
5. **Create user dashboard** to manage preferences
6. **Add webhook handling** for incoming messages

For more details, see `/APPOINTMENT_REMINDERS.md`
