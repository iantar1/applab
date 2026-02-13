import twilio from "twilio";

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("Twilio credentials are not set in environment variables");
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${toPhoneNumber}`,
      body: message,
    });
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
}

export function formatPhoneForWhatsApp(phone: string): string {
  // Remove spaces and hyphens
  let cleaned = phone.replace(/[\s-]/g, "");

  // Add +212 if it starts with 0 (Moroccan number)
  if (cleaned.startsWith("0")) {
    cleaned = "+212" + cleaned.slice(1);
  }

  // Add +212 if it doesn't have a country code
  if (!cleaned.startsWith("+")) {
    cleaned = "+212" + cleaned;
  }

  return cleaned;
}
