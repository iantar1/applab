import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";

const SYSTEM_PROMPT = `You are a helpful medical AI assistant for AppLab, a healthcare appointment booking platform. 
Your role is to:
- Answer general medical questions and provide health information
- Help users understand medical tests and procedures (blood tests, imaging, etc.)
- Explain common symptoms and when to see a doctor
- Provide general wellness and prevention advice
- Help users understand their lab results in general terms
- Suggest which medical service they might need to book
- Tell users about their upcoming appointments when they ask

IMPORTANT RULES:
- Always remind users that you are an AI and NOT a replacement for professional medical advice
- Never diagnose conditions - suggest they book an appointment with a professional
- For emergencies, always tell users to call emergency services immediately
- Be compassionate, clear, and concise
- If asked about something non-medical, politely redirect to medical topics
- Answer in the same language the user writes in (French, Arabic, English, etc.)
- Keep responses concise (under 200 words when possible)
- When sharing appointment info, be friendly and helpful`;

// Helper to get user from request
async function getUserFromRequest(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
    const token = match ? match.split('=')[1] : null;
    if (!token) return null;
    
    const payload = verifyJwt<{ userId: string }>(token);
    if (!payload?.userId) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, fullName: true, email: true, phone: true },
    });
    return user;
  } catch {
    return null;
  }
}

// Helper to get user appointments
async function getUserAppointments(userId: string, email?: string | null, phone?: string | null) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { userId },
          ...(email ? [{ guestEmail: email }] : []),
          ...(phone ? [{ guestPhone: phone }] : []),
        ],
      },
      orderBy: { appointmentDate: 'asc' },
      include: {
        service: true,
      },
    });
    return appointments;
  } catch {
    return [];
  }
}

// Format appointments for AI context
function formatAppointmentsForAI(appointments: any[]) {
  if (appointments.length === 0) {
    return "The user has no appointments booked.";
  }
  
  const now = new Date();
  const upcoming = appointments.filter(a => new Date(a.appointmentDate) >= now);
  const past = appointments.filter(a => new Date(a.appointmentDate) < now);
  
  let info = "USER'S APPOINTMENTS:\n";
  
  if (upcoming.length > 0) {
    info += "\nUpcoming appointments:\n";
    upcoming.forEach((a, i) => {
      const date = new Date(a.appointmentDate).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
      info += `${i + 1}. ${a.service?.name || 'Service'} on ${date} at ${a.appointmentTime} - Status: ${a.status}\n`;
    });
  } else {
    info += "\nNo upcoming appointments.\n";
  }
  
  if (past.length > 0) {
    info += `\nPast appointments: ${past.length} completed\n`;
  }
  
  return info;
}

// Check if message is asking about appointments
function isAskingAboutAppointments(message: string): boolean {
  const lower = message.toLowerCase();
  const keywords = [
    'appointment', 'reservation', 'booking', 'booked', 
    'rendez-vous', 'rdv', 'réservation',
    'when', 'what time', 'my appointment', 'my booking',
    'scheduled', 'upcoming', 'next appointment',
    'موعد', 'حجز', // Arabic
  ];
  return keywords.some(k => lower.includes(k));
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if user is asking about appointments
    let appointmentContext = "";
    if (isAskingAboutAppointments(message)) {
      const user = await getUserFromRequest(req);
      if (user) {
        const appointments = await getUserAppointments(user.id, user.email, user.phone);
        appointmentContext = formatAppointmentsForAI(appointments);
      } else {
        appointmentContext = "User is not logged in. Tell them to log in to see their appointments.";
      }
    }

    // Try OpenRouter first, then Gemini, then fallback
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!openrouterKey && !geminiKey) {
      return NextResponse.json({
        reply: getFallbackResponse(message, appointmentContext),
      });
    }

    // Build messages for chat
    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    // Add history
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Build the current message with appointment context if available
    let currentMessage = message;
    if (appointmentContext) {
      currentMessage = `${message}\n\n[CONTEXT - User's appointment data]:\n${appointmentContext}`;
    }
    messages.push({ role: "user", content: currentMessage });

    // Try OpenRouter API first
    if (openrouterKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "AppLab Medical Assistant"
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.1-8b-instruct:free",
            messages,
            max_tokens: 512,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data?.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ reply });
          }
        }
      } catch (e) {
        console.error("OpenRouter API error:", e);
      }
    }

    // Fallback to Gemini if OpenRouter fails
    if (geminiKey) {
      try {
        const contents = messages.slice(1).map(m => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        }));

        const response = await fetch(
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

        if (response.ok) {
          const data = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return NextResponse.json({ reply });
          }
        }
      } catch (e) {
        console.error("Gemini API error:", e);
      }
    }

    // Final fallback
    return NextResponse.json({
      reply: getFallbackResponse(message, appointmentContext),
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "Failed to process your message" },
      { status: 500 }
    );
  }
}

function getFallbackResponse(message: string, appointmentContext?: string): string {
  const lower = message.toLowerCase();

  // If asking about appointments and we have context
  if (appointmentContext && isAskingAboutAppointments(message)) {
    if (appointmentContext.includes("not logged in")) {
      return "To view your appointments, please log in to your account first. Once logged in, I can tell you about your upcoming reservations! 🔐";
    }
    if (appointmentContext.includes("no appointments")) {
      return "You don't have any appointments booked yet. Would you like me to help you find a service and book an appointment? 📅";
    }
    // Parse and return appointment info
    const lines = appointmentContext.split('\n').filter(l => l.match(/^\d+\./));
    if (lines.length > 0) {
      return `Here are your upcoming appointments:\n\n${lines.join('\n')}\n\nIs there anything else you'd like to know about your reservations?`;
    }
  }

  if (
    lower.includes("emergency") ||
    lower.includes("urgence") ||
    lower.includes("dying") ||
    lower.includes("heart attack")
  ) {
    return "🚨 If you are experiencing a medical emergency, please call emergency services (15 in Morocco, 112 in Europe, 911 in the US) immediately! Do not wait.";
  }

  if (
    lower.includes("blood test") ||
    lower.includes("analyse de sang") ||
    lower.includes("blood work")
  ) {
    return "Blood tests are common diagnostic tools that can check for many conditions including cholesterol levels, blood sugar, liver/kidney function, and more. They usually take about 10-15 minutes. You can book a blood test appointment through our services. Would you like to know more about a specific blood test?";
  }

  if (
    lower.includes("symptom") ||
    lower.includes("symptôme") ||
    lower.includes("feel sick") ||
    lower.includes("pain")
  ) {
    return "I understand you're not feeling well. While I can provide general information, I strongly recommend booking an appointment with a healthcare professional for a proper evaluation. You can browse our available services and book an appointment right from this app. Is there a specific symptom you'd like to know more about?";
  }

  if (
    lower.includes("appointment") ||
    lower.includes("rendez-vous") ||
    lower.includes("book")
  ) {
    return "To book an appointment, go to the 'Appointments' tab in the sidebar, browse our available medical services, and click 'Book Now' on the service you need. You can select your preferred date and time. Need help choosing the right service?";
  }

  if (
    lower.includes("insurance") ||
    lower.includes("assurance") ||
    lower.includes("mutuelle")
  ) {
    return "You can manage your insurance information in the 'Insurance' tab in the sidebar. We support major Moroccan insurance companies including Wafa Assurance, AXA, Sanlam, and more. Having your insurance details saved makes the booking process faster.";
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("bonjour") || lower.includes("salut")) {
    return "Hello! 👋 I'm your medical AI assistant. I can help you with general health questions, explain medical tests, or help you find the right service to book. How can I help you today?";
  }

  return "I'm your medical AI assistant and I'm here to help with health-related questions. I can help you understand medical tests, explain symptoms, provide wellness advice, or help you book the right appointment. What would you like to know? \n\n⚠️ Remember: I'm an AI assistant and not a substitute for professional medical advice.";
}
