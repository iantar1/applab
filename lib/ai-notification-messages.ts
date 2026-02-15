/**
 * AI-generated appointment notification messages (confirmation, reminders).
 * Same purpose as fixed texts: remind and alert the client. Uses AI for variety and tone.
 */

export type NotificationMessageKind = "confirmation" | "reminder_1day" | "reminder_1hour";

export interface NotificationMessagePayload {
  name: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  /** Optional: human-readable date e.g. "Monday, 15 February 2025" */
  dayDate?: string;
}

const KIND_INSTRUCTIONS: Record<
  NotificationMessageKind,
  string
> = {
  confirmation:
    "Write a short, friendly WhatsApp message confirming that the client has just booked an appointment. Thank them and remind them of the key details. Purpose: confirm booking and set expectations. Keep to 2-4 sentences.",
  reminder_1day:
    "Write a short, friendly WhatsApp reminder that the client has an appointment TOMORROW. Mention the time and that we look forward to seeing them. Purpose: remind and alert so they don't forget. Keep to 2-3 sentences.",
  reminder_1hour:
    "Write a short WhatsApp reminder that the client has an appointment in about one hour. Mention service and time. Purpose: alert them so they can get ready. Keep to 1-2 sentences.",
};

function buildUserPrompt(
  kind: NotificationMessageKind,
  payload: NotificationMessagePayload
): string {
  const lines = [
    `Client name: ${payload.name}`,
    `Service: ${payload.serviceName}`,
    `Date: ${payload.appointmentDate}${payload.dayDate ? ` (${payload.dayDate})` : ""}`,
    `Time: ${payload.appointmentTime}`,
  ];
  return `Generate the ${kind} message with these details:\n${lines.join("\n")}`;
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

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
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          HTTP_Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "AppLab Notifications",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 256,
          temperature: 0.6,
        }),
      });

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch (e) {
      console.error("OpenRouter notification message error:", e);
    }
  }
  return null;
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 256 },
        }),
      }
    );

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (e) {
    console.error("Gemini notification message error:", e);
    return null;
  }
}

const SYSTEM_PROMPT = `You are writing short WhatsApp messages for a lab/appointment booking app (AppointLab).
Rules:
- Output ONLY the message text. No quotes, no "Message:", no explanation.
- Same purpose every time: remind and alert the client about their appointment.
- Friendly, professional, concise. You may use simple emojis if it fits.
- Write in the same language as the client name if it looks non-English (e.g. Arabic, French); otherwise English is fine.`;

/**
 * Generate a single notification message via AI (confirmation or reminder).
 * Returns null if no API key or AI fails; caller should use fixed text fallback.
 */
export async function generateNotificationMessage(
  kind: NotificationMessageKind,
  payload: NotificationMessagePayload
): Promise<string | null> {
  const instruction = KIND_INSTRUCTIONS[kind];
  const userPrompt = buildUserPrompt(kind, payload);

  const openRouter = await callOpenRouter(SYSTEM_PROMPT, `${instruction}\n\n${userPrompt}`);
  if (openRouter) return openRouter;

  const gemini = await callGemini(SYSTEM_PROMPT, `${instruction}\n\n${userPrompt}`);
  if (gemini) return gemini;

  return null;
}
