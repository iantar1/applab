import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const VOICE_ID = "hzLyDn3IrvrdH83BdqUu";

const REFUSAL_MESSAGE = "I am here only to help you use the hospital appointment app.";

const APP_NAVIGATION_GUIDE = `Use this to guide users in the app: To book an appointment, go to the Appointments tab in the left menu, then click Book Now on a service and follow the steps. To view appointments, use the History tab. To change profile, use Settings.`;

const SYSTEM_PROMPT = `You are a friendly AI assistant for a hospital appointment web application (AppointLab).

You are here to help users with:
- Creating an account, booking appointments, viewing or cancelling appointments
- Updating profile, how to use the app, general greetings and questions

Be friendly and helpful. Keep responses very short (2-3 sentences max) since they will be spoken aloud.

IMPORTANT: When users greet you with "hi", "hello", "hey", or similar, respond with:
"Hi there! I'm here to assist you with everything you need—whether it's about health, appointments, or just having a friendly chat. Just let me know what you'd like to do!"

${APP_NAVIGATION_GUIDE}

For medical questions, redirect to booking appropriate services in the app.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
    "account", "register", "login", "profile", "appointment", "book", "booking",
    "cancel", "view", "help", "app", "rdv", "réservation", "where", "how do i", "how to",
    "time", "date", "schedule", "service", "doctor", "hospital", "clinic",
    "health", "medical", "patient", "visit", "consultation",
  ];
  
  // If message contains app-related keywords or is a general question, allow it
  if (allowedTopics.some((k) => lower.includes(k)) || lower.length < 50) {
    return false;
  }

  return false; // Be permissive - allow most questions
}

function isAppRelated(input: string): boolean {
  const lower = input.toLowerCase();
  const appKeywords = [
    "account", "register", "login", "profile", "appointment", "book", "booking",
    "cancel", "view", "help", "use the app", "rdv", "réservation", "where", "how do i", "how to",
  ];
  return appKeywords.some((k) => lower.includes(k));
}

function getAppFallbackResponse(input: string): string {
  const lower = input.toLowerCase();
  
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hi there! I'm here to assist you with everything you need—whether it's about health, appointments, or just having a friendly chat. Just let me know what you'd like to do!";
  }
  if (lower.includes("appointment") || lower.includes("book") || lower.includes("where")) {
    return "To book an appointment, open the Appointments tab in the left menu. Then click Book Now on the service you want and follow the steps to pick a date and time.";
  }
  if (lower.includes("cancel")) {
    return "To cancel an appointment, go to your appointments in the app and use the cancel option.";
  }
  if (lower.includes("thank") || lower.includes("bye")) {
    return "You're welcome. If you need more help with the app, just ask.";
  }
  
  // General helpful response
  return "I can help you with booking, viewing, or cancelling appointments, or with your account. What do you need?";
}

async function getAIResponse(message: string, history: ChatMessage[]): Promise<string> {
  if (isOffTopic(message)) {
    return REFUSAL_MESSAGE;
  }
  if (!OPENROUTER_API_KEY) {
    return getAppFallbackResponse(message);
  }

  try {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "AppLab Voice Assistant",
      },
      body: JSON.stringify({
        model: "liquid/lfm-2.5-1.2b-instruct:free",
        messages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return getAppFallbackResponse(message);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (reply) {
      // Clean the response - remove any reasoning content that might be mixed in
      let cleanReply = reply.trim();
      if (cleanReply.includes('\n\n') && cleanReply.toLowerCase().includes('rule')) {
        const lines = cleanReply.split('\n\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine && lastLine.length > 10) {
          cleanReply = lastLine;
        }
      }
      cleanReply = cleanReply.replace(/^.*?(I am here only to help|Hello|Hi|To book|You don't have)/i, '$1');
      
      return cleanReply && cleanReply.length > 5 ? cleanReply : getAppFallbackResponse(message);
    }
    return getAppFallbackResponse(message);
  } catch {
    return getAppFallbackResponse(message);
  }
}

async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  if (!ELEVENLABS_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Get AI text response
    const reply = await getAIResponse(message, history);

    // Convert to speech
    const audioBuffer = await textToSpeech(reply);

    if (audioBuffer) {
      // Return audio with text in header
      return new NextResponse(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "X-AI-Reply": encodeURIComponent(reply),
        },
      });
    } else {
      // Fallback: return just text if TTS fails
      return NextResponse.json({ reply, audioError: true });
    }
  } catch (error) {
    console.error("Voice API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
