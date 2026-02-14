# Appointment Reminder Scheduler

This system automatically sends WhatsApp and email reminders to users 30 minutes before their appointment.

## How It Works

1. **Automatic Scheduler**: Runs every 5 minutes (can be configured)
2. **Checks appointments**: Looks for all confirmed appointments happening in the next 30 minutes
3. **Sends reminders**: Automatically sends WhatsApp + Email notifications with:
   - Service name
   - Appointment date
   - Appointment time
   - Booking ID

## Setup Instructions

### Option 1: Using Vercel Cron Jobs (Recommended for Production)

The `vercel.json` file is already configured to run the scheduler every 5 minutes:

```json
{
  "crons": [
    {
      "path": "/api/scheduler/appointment-reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This is automatically deployed when you deploy to Vercel.

### Option 2: Manual Testing / Local Development

You can manually trigger the reminder check by calling:

```bash
# Check for reminders
curl -X GET "http://localhost:3000/api/scheduler/appointment-reminders"

# With optional scheduler secret (if set in .env)
curl -X GET "http://localhost:3000/api/scheduler/appointment-reminders" \
  -H "Authorization: Bearer YOUR_SCHEDULER_SECRET"

# Manually send reminder for specific appointment
curl -X POST "http://localhost:3000/api/scheduler/appointment-reminders" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": 123}'
```

### Option 3: Node.js Cron (For self-hosted servers)

If you're running on a self-hosted server, you can add a cron job using `node-cron`:

```bash
npm install node-cron
```

Create `scripts/scheduler.js`:

```javascript
const cron = require('node-cron');
const fetch = require('node-fetch');

const SCHEDULER_URL = process.env.APP_URL || 'http://localhost:3000';
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || '';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const response = await fetch(`${SCHEDULER_URL}/api/scheduler/appointment-reminders`, {
      method: 'GET',
      headers: SCHEDULER_SECRET ? {
        'Authorization': `Bearer ${SCHEDULER_SECRET}`
      } : {}
    });
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] Scheduler run:`, data);
  } catch (error) {
    console.error('Scheduler error:', error);
  }
});

console.log('Appointment reminder scheduler started. Running every 5 minutes.');
```

Then run with:
```bash
node scripts/scheduler.js
```

Or add to `package.json`:
```json
{
  "scripts": {
    "scheduler": "node scripts/scheduler.js",
    "dev": "next dev",
    "dev:with-scheduler": "concurrently \"next dev\" \"node scripts/scheduler.js\""
  }
}
```

## Environment Variables

Optional - Add to `.env`:

```env
# Optional: Scheduler secret key for security
SCHEDULER_SECRET=your-secret-key-here

# App URL for self-hosted scheduler
APP_URL=http://localhost:3000
```

## API Endpoints

### GET /api/scheduler/appointment-reminders

**Purpose**: Check for upcoming appointments and send reminders

**Query Parameters**: None

**Headers** (Optional):
```
Authorization: Bearer YOUR_SCHEDULER_SECRET
```

**Response**:
```json
{
  "success": true,
  "message": "Checked 15 appointments. Sent 3 reminders.",
  "reminders": [
    {
      "success": true,
      "type": "whatsapp",
      "appointmentId": 123,
      "phone": "+212XXXXXXXXX",
      "result": {...}
    },
    {
      "success": true,
      "type": "email",
      "appointmentId": 123,
      "email": "user@example.com",
      "result": {...}
    }
  ],
  "checkedAt": "2026-02-14T10:30:00.000Z"
}
```

### POST /api/scheduler/appointment-reminders

**Purpose**: Manually send reminder for a specific appointment

**Body**:
```json
{
  "appointmentId": 123
}
```

**Response**:
```json
{
  "success": true,
  "results": {
    "whatsapp": {...},
    "email": {...},
    "errors": []
  },
  "appointmentId": 123
}
```

## Features

✅ **Automatic**: Runs on a schedule (every 5 minutes by default)
✅ **WhatsApp + Email**: Sends both notification types
✅ **Smart timing**: Only sends 30 minutes before appointment
✅ **Error handling**: Logs failures but continues with other reminders
✅ **No duplicates**: Only sends to confirmed appointments
✅ **Guest support**: Works with both registered users and guest bookings
✅ **Security**: Optional API key protection via `SCHEDULER_SECRET`

## Troubleshooting

### Reminders not sending?

1. Check if appointments are **confirmed** (status: "confirmed")
2. Verify phone numbers are in E.164 format (e.g., `+212XXXXXXXXX`)
3. Ensure WhatsApp bridge is running: `pnpm run whatsapp`
4. Check email service is configured
5. Review logs for errors

### Too many reminders?

Change the schedule in `vercel.json`:
- `*/5 * * * *` = every 5 minutes (default)
- `0 * * * *` = every hour
- `0 9,17 * * *` = at 9 AM and 5 PM daily

### Want to test?

Create a test appointment and call:
```bash
curl -X POST "http://localhost:3000/api/scheduler/appointment-reminders" \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": YOUR_APPOINTMENT_ID}'
```
