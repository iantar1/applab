import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VOICE_ID = "hzLyDn3IrvrdH83BdqUu";

const REFUSAL_MESSAGE = "I am here only to help you use the hospital appointment app.";

const APP_NAVIGATION_GUIDE = `Use this to guide users in the app: To book an appointment, go to the Appointments tab in the left menu, then click Book Now on a service and follow the steps. To view appointments, use the History tab. To change profile, use Settings.`;

const SYSTEM_PROMPT = `You are an AI assistant for a hospital appointment web application (AppointLab).

Your ONLY role is to guide users on how to use this application: creating an account, booking an appointment, viewing or cancelling appointments, updating profile.

You MUST refuse medical advice, health diagnosis, general knowledge, and any question unrelated to the app. If the question is outside app usage context, reply only: "I am here only to help you use the hospital appointment app."

When users ask where or how to book an appointment, guide them: open the Appointments tab in the left menu, choose a service and click Book Now, then pick date and time.

Keep responses very short (2-3 sentences max) since they will be spoken aloud.
${APP_NAVIGATION_GUIDE}`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function isOffTopic(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const offTopicPatterns = [
    /\bcapital\b/, /\bcountry\b/, /\bcity\b/, /\bpopulation\b/, /\bweather\b/,
    /\bhistory\b/, /\bwho is\b/, /\bwhere is\b/, /\bwhen did\b/, /\bhow many\b/,
    /\brecipe\b/, /\bsport\b/, /\bmovie\b/, /\btrivia\b/,
    /\bmedical\b/, /\bsymptom\b/, /\bdiagnos/, /\bdisease\b/, /\bmedication\b/,
    /\bwhat is\b.*\b(morocco|france|usa|world|earth|country|capital)\b/,
  ];
  if (offTopicPatterns.some((p) => p.test(lower))) return true;
  const appKeywords = [
    "account", "register", "login", "profile", "appointment", "book", "booking",
    "cancel", "view", "help", "app", "rdv", "réservation", "where", "how do i", "how to",
  ];
  return !appKeywords.some((k) => lower.includes(k));
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
  if (!isAppRelated(input)) {
    return REFUSAL_MESSAGE;
  }
  const lower = input.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I'm here to help you use the appointment app. You can book, view, or cancel appointments. What would you like to do?";
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
  return "I can help you with booking, viewing, or cancelling appointments, or with your account. What do you need?";
}

async function getAIResponse(message: string, history: ChatMessage[]): Promise<string> {
  if (isOffTopic(message)) {
    return REFUSAL_MESSAGE;
  }
  if (!GEMINI_API_KEY) {
    return getAppFallbackResponse(message);
  }

  try {
    const contents = [
      ...history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150, // Keep responses short for voice
          },
        }),
      }
    );

    if (!response.ok) {
      return getAppFallbackResponse(message);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || getAppFallbackResponse(message);
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
