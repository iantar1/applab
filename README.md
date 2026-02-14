# applab
healthcare hackathon

## WhatsApp Messages (admin)

Admins can send and receive WhatsApp messages with clients from the **Messages** section (between Appointments and Settings). To use it:

1. Set **WhatsApp sender number** in **Settings** (admin-only "App settings" card).
2. Start the WhatsApp bridge in a separate terminal: `pnpm run whatsapp`. It runs on port 3001 by default (`WHATSAPP_BRIDGE_URL` / `WHATSAPP_BRIDGE_PORT` in `.env`).
3. Open **Messages** in the app, scan the QR code with WhatsApp on your phone to link the account. After that, the session is persisted and you can send/receive messages.

