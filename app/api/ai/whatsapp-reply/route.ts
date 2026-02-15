import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBlockedNumbers, isBlocked } from "@/lib/blocked-numbers";

const REFUSAL_MESSAGE =
  "I am here only to help you use the hospital appointment app.";

const APP_NAVIGATION_GUIDE = `
APP STRUCTURE (use this to guide users):
- Home/dashboard: left sidebar has tabs — History, Insurance, Appointments, Settings (and Messages for admins).
- To BOOK an appointment: Tell the user to go to the "Appointments" tab in the left menu. There they see "Book an Appointment" and a list of services. They should click "Book Now" on the service they want, then follow the steps (choose date, time, confirm).
- To VIEW appointments: The "History" tab shows "Appointment History" with all their booked appointments.
- To CANCEL or reschedule: They can do this from the History tab.
- Profile/settings: The "Settings" tab. Sign up / log in from the main landing page.
When the user asks "where can I book" or "how do I book", give them these exact steps.`;

const SYSTEM_PROMPT = `You are an AI assistant for a hospital appointment web application (AppointLab). You are replying to a client via WhatsApp.

STRICT RULE: You ONLY answer questions about USING this app. You do NOT give medical advice, health diagnosis, or unrelated topics.

Allowed topics: creating an account, booking an appointment, viewing or cancelling appointments, updating profile, how to use the app.

For ANY question outside the above, reply with exactly: "${REFUSAL_MESSAGE}"

When the question IS about the app: be helpful, friendly, and concise. Keep responses short (suitable for WhatsApp, under 200 words).
${APP_NAVIGATION_GUIDE}`;

/** Normalize phone for DB comparison (digits only, optional strip leading 0) */
function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "").trim();
}

/** Get appointments for a client by phone (guest or user) */
async function getAppointmentsByPhone(phone: string) {
  const digits = normalizePhone(phone);
  if (!digits) return [];

  const user = await prisma.user.findFirst({
    where: {
      phone: { contains: digits.slice(-9) },
    },
    select: { id: true },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [
        ...(user ? [{ userId: user.id }] : []),
        { guestPhone: { contains: digits.slice(-9) } },
      ],
    },
    orderBy: { appointmentDate: "asc" },
    include: { service: true },
  });

  return appointments;
}

function formatAppointmentsForAI(appointments: any[]): string {
  if (appointments.length === 0) {
    return "The client has no appointments booked.";
  }

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.appointmentDate) >= now
  );
  let info = "CLIENT'S APPOINTMENTS:\n";

  if (upcoming.length > 0) {
    info += "\nUpcoming appointments:\n";
    upcoming.forEach((a, i) => {
      const date = new Date(a.appointmentDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      info += `${i + 1}. ${a.service?.name || "Service"} on ${date} at ${a.appointmentTime} - Status: ${a.status}\n`;
    });
  } else {
    info += "\nNo upcoming appointments.\n";
  }

  return info;
}

function isOffTopic(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const offTopicPatterns = [
    /\bcapital\b/,
    /\bcountry\b/,
    /\bweather\b/,
    /\bmedical\b/,
    /\bsymptom\b/,
    /\bdiagnos/,
    /\bdisease\b/,
    /\bmedication\b/,
  ];
  if (offTopicPatterns.some((p) => p.test(lower))) return true;
  const appKeywords = [
    "account",
    "register",
    "sign up",
    "login",
    "profile",
    "appointment",
    "book",
    "booking",
    "cancel",
    "reschedule",
    "view",
    "help",
    "app",
    "rdv",
    "réservation",
    "موعد",
    "حجز",
  ];
  return !appKeywords.some((k) => lower.includes(k));
}

async function getAIReply(message: string, appointmentContext: string): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const userContent = appointmentContext
    ? `${message}\n\n[CONTEXT - Client's appointment data]:\n${appointmentContext}`
    : message;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  if (openrouterKey) {
    const models = [
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
    ];
    for (const model of models) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            HTTP_Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "AppLab WhatsApp Reply",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 512,
            temperature: 0.7,
          }),
        });
        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      } catch (e) {
        console.error("OpenRouter whatsapp-reply error:", e);
      }
    }
  }

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userContent }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
          }),
        }
      );
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) return reply;
    } catch (e) {
      console.error("Gemini whatsapp-reply error:", e);
    }
  }

  return "Thanks for your message. For booking or managing appointments, please use our app: open the Appointments tab to book and the History tab to view or cancel. If you have a specific question, reply here and I'll help.";
}

/**
 * POST: Generate an AI reply to a client's WhatsApp message.
 * Body: { fromPhone: string, body: string }
 * Optional: Authorization: Bearer <AI_WHATSAPP_REPLY_SECRET> when set in env (for bridge).
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.AI_WHATSAPP_REPLY_SECRET;
    if (secret) {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const fromPhone = body?.fromPhone != null ? String(body.fromPhone).trim() : "";
    const text = body?.body != null ? String(body.body).trim() : "";

    if (!fromPhone || !text) {
      return NextResponse.json(
        { error: "fromPhone and body are required" },
        { status: 400 }
      );
    }

    const blockedList = await getBlockedNumbers();
    if (isBlocked(fromPhone, blockedList)) {
      return NextResponse.json({ reply: "" });
    }

    if (isOffTopic(text)) {
      return NextResponse.json({ reply: REFUSAL_MESSAGE });
    }

    const appointments = await getAppointmentsByPhone(fromPhone);
    const appointmentContext = formatAppointmentsForAI(appointments);
    const reply = await getAIReply(text, appointmentContext);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("WhatsApp AI reply error:", error);
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}
