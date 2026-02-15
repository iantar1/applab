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

You ONLY answer questions about USING this app. You do NOT give medical advice, health diagnosis, or unrelated topics.

Allowed topics: creating an account, booking an appointment, viewing or cancelling appointments, updating profile, how to use the app, general greetings.

For questions clearly outside the app (e.g., weather, capitals, medical symptoms), reply: "${REFUSAL_MESSAGE}"

Guidelines:
- Be helpful, friendly, and conversational
- Keep responses short (suitable for WhatsApp, under 150 words)
- Remember the conversation context - don't repeat yourself
- If user says hi/hello, greet them warmly and offer help
- If user says thanks/bye, respond appropriately
- Answer follow-up questions naturally based on conversation history
${APP_NAVIGATION_GUIDE}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Normalize phone for DB comparison (digits only, optional strip leading 0) */
function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "").trim();
}

/** Get conversation history for a phone number (last N messages) */
async function getConversationHistory(phone: string, limit = 10): Promise<ChatMessage[]> {
  const digits = normalizePhone(phone);
  if (!digits) return [];

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromPhone: { contains: digits.slice(-9) } },
          { toPhone: { contains: digits.slice(-9) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Reverse to chronological order and convert to chat format
    return messages.reverse().map((msg) => ({
      role: msg.direction === "inbound" ? "user" as const : "assistant" as const,
      content: msg.body,
    }));
  } catch (e) {
    console.error("Error fetching conversation history:", e);
    return [];
  }
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
  
  // Allow greetings and common conversational phrases
  const conversationalPatterns = [
    /^(hi|hello|hey|bonjour|salut|salam|مرحبا|السلام)/i,
    /^(thanks|thank you|merci|شكرا)/i,
    /^(bye|goodbye|au revoir|مع السلامة)/i,
    /^(ok|okay|yes|no|sure|alright)/i,
    /^(what|how|where|when|can|do|is|are)/i,
    /\?$/, // Questions should be answered
  ];
  if (conversationalPatterns.some((p) => p.test(lower))) return false;

  // Clearly off-topic patterns
  const offTopicPatterns = [
    /\bcapital\b/,
    /\bcountry\b/,
    /\bweather\b/,
    /\bmedical advice\b/,
    /\bsymptom\b/,
    /\bdiagnos/,
    /\bdisease\b/,
    /\bmedication\b/,
    /\bprescri/,
  ];
  if (offTopicPatterns.some((p) => p.test(lower))) return true;

  // App-related keywords
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
    "service",
    "price",
    "cost",
    "time",
    "date",
    "available",
    "schedule",
  ];
  
  // If it's a short message or contains app keywords, allow it
  if (lower.length < 30 || appKeywords.some((k) => lower.includes(k))) {
    return false;
  }

  return true;
}

async function getAIReply(
  message: string,
  appointmentContext: string,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // Build messages array with system prompt and history
  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Add conversation history (skip the current message if it's at the end)
  const historyToAdd = conversationHistory.slice(-8); // Keep last 8 messages for context
  for (const msg of historyToAdd) {
    // Skip if this is the current incoming message (already at the end)
    if (msg.role === "user" && msg.content === message) continue;
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // Add current message with appointment context if available
  const userContent = appointmentContext
    ? `${message}\n\n[CONTEXT - Client's appointment data]:\n${appointmentContext}`
    : message;
  messages.push({ role: "user", content: userContent });

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
      // Convert messages to Gemini format (skip system, it goes separately)
      const contents = messages.slice(1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
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

  return "Thanks for your message! How can I help you with the AppointLab app today? I can assist with booking appointments, checking your reservations, or navigating the app.";
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

    // Get conversation history for context
    const conversationHistory = await getConversationHistory(fromPhone);

    // Only refuse clearly off-topic messages if there's no conversation context
    // This allows follow-up questions like "ok" or "thanks" to work naturally
    if (isOffTopic(text) && conversationHistory.length === 0) {
      return NextResponse.json({ reply: REFUSAL_MESSAGE });
    }

    const appointments = await getAppointmentsByPhone(fromPhone);
    const appointmentContext = formatAppointmentsForAI(appointments);
    const reply = await getAIReply(text, appointmentContext, conversationHistory);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("WhatsApp AI reply error:", error);
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}
