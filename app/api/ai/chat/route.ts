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
        console.log("Calling OpenRouter API...");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "AppLab Medical Assistant"
          },
          body: JSON.stringify({
            model: "liquid/lfm-2.5-1.2b-instruct:free",
            messages,
            max_tokens: 512,
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        console.log("OpenRouter response status:", response.status);
        console.log("OpenRouter response data:", JSON.stringify(data).substring(0, 500));

        if (response.ok && data?.choices?.[0]?.message?.content) {
          const reply = data.choices[0].message.content;
          return NextResponse.json({ reply });
        } else if (data?.error) {
          console.error("OpenRouter API error:", data.error);
        }
      } catch (e) {
        console.error("OpenRouter API exception:", e);
      }
    } else {
      console.log("No OpenRouter API key found");
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

    // Final fallback - only for appointment context or errors
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
  // Only handle appointment-related queries with context, everything else returns generic error
  if (appointmentContext && isAskingAboutAppointments(message)) {
    if (appointmentContext.includes("not logged in")) {
      return "To view your appointments, please log in to your account first. Once logged in, I can tell you about your upcoming reservations! 🔐";
    }
    if (appointmentContext.includes("no appointments")) {
      return "You don't have any appointments booked yet. Would you like to browse our services and book one? 📅";
    }
    // Parse and return appointment info
    const lines = appointmentContext.split('\n').filter(l => l.match(/^\d+\./));
    if (lines.length > 0) {
      return `Here are your upcoming appointments:\n\n${lines.join('\n')}\n\nIs there anything else you'd like to know?`;
    }
  }

  // Generic fallback when AI APIs are unavailable
  return "I'm having trouble connecting to the AI service right now. Please try again in a moment. If this persists, you can browse our services directly from the sidebar.";
}
