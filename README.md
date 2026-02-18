# applab

A healthcare booking web app built during a 2-day hackathon. This project provides appointment booking, payments, and WhatsApp-based notifications and messaging for admins and clients.

Watch a short demo of the app below:

<video controls width="640">
   <source src="/Add%20a%20subheading.mp4" type="video/mp4">
   Your browser does not support the video tag. You can download it <a href="/Add%20a%20subheading.mp4">here</a>.
</video>

## Quick hackathon note

This repository was created and iterated on during a 2-day hackathon. The goal was to build a minimally viable booking flow with payment and WhatsApp integrations that can be extended after the event.

## Features

- Appointment booking and management
- Stripe checkout integration for payments
- WhatsApp messaging and reminders (via Twilio and a WhatsApp bridge)
- Admin dashboard with bookings, messages, and settings
- PDF generation for appointment confirmations

## Tech stack

- Next.js (App Router)
- TypeScript
- Prisma (MySQL) for the database
- Stripe for payments
- Twilio for WhatsApp messaging
- Tailwind CSS for styling

## Repository layout (important files)

- `app/` — Next.js app pages and API routes
- `components/` — UI components
- `lib/` — helpers (e.g., `twilio.ts`, `stripe.ts`, `pdf.ts`)
- `prisma/` — Prisma schema and seed/migrations
- `whatsapp/` — WhatsApp bridge helper script

## Environment variables

Set the following environment variables (example names found in the code):

- `DATABASE_URL` — your Prisma database URL (MySQL)
- `NEXT_PUBLIC_APP_URL` — public URL for callback links (used by Stripe)
- `STRIPE_SECRET_KEY` — Stripe secret key
- `TWILIO_ACCOUNT_SID` — Twilio account SID
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` — the Twilio WhatsApp-enabled sender number (e.g. +1XXXXXXXXXX)
- Optionally: `WHATSAPP_BRIDGE_URL`, `WHATSAPP_BRIDGE_PORT` — used by the local WhatsApp bridge runner

Create a `.env` file at the project root and populate these values before running the app.

## Local development (quick start)

1. Install dependencies:

   pnpm install

2. Set up your `.env` with the variables above.

3. Run Prisma migrations (if you change the schema):

   pnpm prisma migrate dev --name init

4. Start the WhatsApp bridge (used for scanning & persisting a WhatsApp session):

   pnpm run whatsapp

   The bridge typically runs on port `3001` by default — see `WHATSAPP_BRIDGE_URL`/`WHATSAPP_BRIDGE_PORT`.

5. Start the Next.js app:

   pnpm dev

6. Open your browser at `http://localhost:3000`.

Notes:
- To send WhatsApp messages in production you can use the Twilio integration configured in `lib/twilio.ts`.
- Payments are created via `lib/stripe.ts` and use `NEXT_PUBLIC_APP_URL` to construct success/cancel URLs.

## WhatsApp admin messaging

Admins can link a WhatsApp session via the Messages section in the app. Typical steps:

1. Provide a WhatsApp sender number in App Settings (admin-only).
2. Start the WhatsApp bridge (`pnpm run whatsapp`) and scan the displayed QR code from your phone.
3. After scanning the session is persisted by the bridge; messages can be sent/received from the admin UI.

## Deployment

- Configure the environment variables in your hosting platform (Vercel, etc.).
- Run Prisma migrations and ensure the database is available to the deployed instance.
- Ensure the Twilio credentials and Twilio WhatsApp sender number are configured for sending messages in production.

## Tests and validation

There are no automated tests included by default. After making changes, run TypeScript checks and validate locally:

  pnpm tsc --noEmit

## Contributing

This repo was a fast hackathon build; contributions that improve stability, security, and documentation are welcome. Please file issues or pull requests with clear descriptions.

## License

See `LICENSE` if present. If not present, assume this code is for demonstration and learning purposes from the hackathon.

---

If you want, I can also add a `.env.example` with the variables above, or a short deploy checklist for Vercel. Which would you prefer next?
# applab
healthcare hackathon

## WhatsApp Messages (admin)

Admins can send and receive WhatsApp messages with clients from the **Messages** section (between Appointments and Settings). To use it:

1. Set **WhatsApp sender number** in **Settings** (admin-only "App settings" card).
2. Start the WhatsApp bridge in a separate terminal: `pnpm run whatsapp`. It runs on port 3001 by default (`WHATSAPP_BRIDGE_URL` / `WHATSAPP_BRIDGE_PORT` in `.env`).
3. Open **Messages** in the app, scan the QR code with WhatsApp on your phone to link the account. After that, the session is persisted and you can send/receive messages.

