import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";

const REFUSAL_MESSAGE = "I am here only to help you use the hospital appointment app.";

const APP_NAVIGATION_GUIDE = `
APP STRUCTURE (use this to guide users):
- Home/dashboard: left sidebar has tabs — History, Insurance, Appointments, Settings (and Messages for admins).
- To BOOK an appointment: Tell the user to go to the "Appointments" tab in the left menu. There they see "Book an Appointment" and a list of services. They should click "Book Now" on the service they want, then follow the steps (choose date, time, confirm).
- To VIEW appointments: The "History" tab shows "Appointment History" with all their booked appointments.
- To CANCEL or manage an appointment: They can do this from the History tab where their appointments are listed.
- Profile/settings: The "Settings" tab lets them update their name, email, phone, and password.
- Sign up / log in: From the main landing page; they need an account to book and see appointments.
When the user asks "where can I book" or "how do I book", give them these exact steps in the app.`;

const SYSTEM_PROMPT = `You are a friendly AI assistant for a hospital appointment web application (AppointLab).

You are here to help users with:
- Creating an account / sign up / register
- Booking an appointment
- Viewing or listing appointments
- Cancelling or rescheduling appointments
- Updating profile information
- How to use the app (navigation, menu, features)
- General questions and guidance

Be friendly, helpful, and conversational. Keep responses under 200 words.

IMPORTANT: When users greet you with "hi", "hello", "hey", or similar, respond with exactly:
"Hi there! 😊 I'm here to assist you with everything you need—whether it's about health, appointments, or just having a friendly chat. Just let me know what you'd like to do!"

${APP_NAVIGATION_GUIDE}

For medical questions, politely redirect to booking appropriate services in the app.`;

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

// Detect off-topic questions - only refuse truly inappropriate content
function isOffTopic(message: string): boolean {
  const lower = message.toLowerCase().trim();
  
  // Allow greetings and common conversational phrases
  const conversationalPatterns = [
    /^(hi|hello|hey|bonjour|salut|salam|مرحبا)/i,
    /^(thanks|thank you|merci|شكرا)/i,
    /^(bye|goodbye|au revoir|مع السلامة)/i,
    /^(ok|okay|yes|no|sure|alright)/i,
    /^(what|how|where|when|can|do|is|are)/i,
    /\?$/, // Questions should be answered
  ];
  if (conversationalPatterns.some((p) => p.test(lower))) return false;

  // Only refuse clearly inappropriate content
  const inappropriatePatterns = [
    /\bporn\b/, /\bsex\b/, /\bdrugs\b/, /\bviolence\b/, /\bhate\b/,
    /\bdiscriminat/i, /\bracist\b/, /\bsexist\b/, /\bharass/i,
    /\billegal\b/, /\bcriminal\b/, /\bterrorist\b/,
  ];
  if (inappropriatePatterns.some((p) => p.test(lower))) return true;

  // Allow general questions and app-related topics
  const allowedTopics = [
    "account", "register", "sign up", "login", "profile", "appointment", "book",
    "booking", "reservation", "cancel", "reschedule", "view", "help", "app",
    "rdv", "réservation", "compte", "profil", "موعد", "حجز", "تطبيق",
    "time", "date", "schedule", "service", "doctor", "hospital", "clinic",
    "health", "medical", "patient", "visit", "consultation",
  ];
  
  // If message contains app-related keywords or is a general question, allow it
  if (allowedTopics.some((k) => lower.includes(k)) || lower.length < 50) {
    return false;
  }

  return false; // Be permissive - allow most questions
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

    // Only refuse truly inappropriate content
    if (isOffTopic(message)) {
      return NextResponse.json({ reply: "I'm here to help you with the AppointLab app and general questions. What can I assist you with today?" });
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

    // Try OpenRouter API first with multiple free models
    if (openrouterKey) {
      const freeModels = [
        "liquid/lfm-2.5-1.2b-instruct:free",
        "arcee-ai/trinity-large-preview:free",
        "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        "nvidia/nemotron-nano-9b-v2:free",
      ];
      
      for (const model of freeModels) {
        try {
          console.log(`Trying OpenRouter model: ${model}...`);
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openrouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
              "X-Title": "AppLab Appointment Assistant"
            },
            body: JSON.stringify({
              model,
              messages,
              max_tokens: 512,
              temperature: 0.7,
            }),
          });

          const data = await response.json();
          console.log("OpenRouter response status:", response.status);
          console.log("OpenRouter response data:", JSON.stringify(data).substring(0, 500));

          if (response.ok && data?.choices?.[0]?.message?.content) {
            let reply = data.choices[0].message.content.trim();
            
            // Clean the response - remove any reasoning content that might be mixed in
            // Some models include internal reasoning in the content, we want to extract only the final answer
            if (reply.includes('\n\n') && reply.toLowerCase().includes('rule')) {
              // If it contains reasoning about rules, extract only the final response
              const lines = reply.split('\n\n');
              const lastLine = lines[lines.length - 1];
              if (lastLine && lastLine.length > 10) {
                reply = lastLine;
              }
            }
            
            // Remove any remaining reasoning prefixes
            reply = reply.replace(/^.*?(I am here only to help|Hello|Hi|To book|You don't have)/i, '$1');
            
            if (reply && reply.length > 5) {
              return NextResponse.json({ reply });
            }
          } else if (data?.error) {
            console.error(`OpenRouter API error with ${model}:`, data.error);
            // Continue to next model
          }
        } catch (e) {
          console.error(`OpenRouter API exception with ${model}:`, e);
          // Continue to next model
        }
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

function isAppRelated(message: string): boolean {
  const lower = message.toLowerCase();
  const appKeywords = [
    "account", "register", "sign up", "login", "log in", "profile",
    "appointment", "book", "booking", "reservation", "cancel", "reschedule",
    "view", "my appointment", "upcoming", "how to", "help", "use the app",
    "rendez-vous", "rdv", "réservation", "compte", "profil",
    "موعد", "حجز", "تطبيق",
  ];
  return appKeywords.some((k) => lower.includes(k));
}

function getFallbackResponse(message: string, appointmentContext?: string): string {
  // Be helpful for all questions
  const lower = message.toLowerCase();
  
  // Handle appointment-related queries when we have context
  if (appointmentContext && isAskingAboutAppointments(message)) {
    if (appointmentContext.includes("not logged in")) {
      return "To view your appointments, please log in to your account first. Once logged in, I can tell you about your upcoming reservations.";
    }
    if (appointmentContext.includes("no appointments")) {
      return "You don't have any appointments booked yet. Would you like to browse our services and book one?";
    }
    const lines = appointmentContext.split("\n").filter((l) => l.match(/^\d+\./));
    if (lines.length > 0) {
      return `Here are your upcoming appointments:\n\n${lines.join("\n")}\n\nIs there anything else you'd like to know about the app?`;
    }
  }
  
  // Specific guidance when they ask where/how to book
  if (message.toLowerCase().includes("where") && (message.toLowerCase().includes("book") || message.toLowerCase().includes("appointment"))) {
    return "To book an appointment in the app: open the **Appointments** tab in the left menu (calendar icon). You'll see our services—click **Book Now** on the one you want, then choose a date and time and complete the booking.";
  }
  
  // General helpful responses
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hi there! � I'm here to assist you with everything you need—whether it's about health, appointments, or just having a friendly chat. Just let me know what you'd like to do!";
  }
  
  if (lower.includes("thank")) {
    return "You're welcome! 😊 Is there anything else I can help you with regarding the app?";
  }
  
  if (lower.includes("bye") || lower.includes("goodbye")) {
    return "Goodbye! 👋 Feel free to come back anytime if you need help with AppointLab.";
  }
  
  // API unavailable but question is general
  return "I'm here to help you with AppointLab! You can ask me about booking appointments, viewing your schedule, managing your account, or any questions about using the app. What would you like to know?";
}
