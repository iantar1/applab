import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

const SYSTEM_PROMPT = `You are a helpful medical AI assistant for AppLab, a healthcare appointment booking platform in Morocco. 
Keep responses concise (2-3 sentences max) since they will be spoken aloud.
You can help with:
- General health questions and symptom guidance
- Information about medical tests and services
- Booking appointments
- Insurance questions (Wafa Assurance, AXA, Sanlam, etc.)

Always recommend consulting a real doctor for serious concerns. Be warm and professional.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getMedicalResponse(input: string): string {
  const lower = input.toLowerCase();
  
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! I'm your medical assistant. How can I help you today?";
  }
  if (lower.includes("blood test")) {
    return "We offer various blood tests including CBC, glucose, and cholesterol panels. Would you like to book one?";
  }
  if (lower.includes("headache")) {
    return "Headaches can have many causes like stress or dehydration. If it's severe or persistent, I recommend seeing a doctor.";
  }
  if (lower.includes("fever")) {
    return "A fever usually means your body is fighting an infection. Rest and stay hydrated. See a doctor if it exceeds 39 degrees Celsius.";
  }
  if (lower.includes("appointment") || lower.includes("book")) {
    return "You can book appointments through the app. Browse our services and select a convenient time.";
  }
  if (lower.includes("insurance")) {
    return "We work with major insurers including Wafa Assurance, AXA, and Sanlam. You can add your insurance in the app settings.";
  }
  if (lower.includes("emergency")) {
    return "If this is an emergency, please call 15 for SAMU or go to the nearest emergency room immediately.";
  }
  if (lower.includes("thank")) {
    return "You're welcome! Take care of your health, and don't hesitate to reach out if you need anything.";
  }
  if (lower.includes("bye") || lower.includes("goodbye")) {
    return "Goodbye! Stay healthy and feel free to come back anytime.";
  }
  
  return "I can help you with health questions, booking appointments, or information about our services. What would you like to know?";
}

async function getAIResponse(message: string, history: ChatMessage[]): Promise<string> {
  // If no Gemini API key, use fallback
  if (!GEMINI_API_KEY) {
    return getMedicalResponse(message);
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
      return getMedicalResponse(message);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || getMedicalResponse(message);
  } catch {
    return getMedicalResponse(message);
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
