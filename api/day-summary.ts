import type { VercelRequest, VercelResponse } from "@vercel/node";

type SummaryRequest = {
  name?: string;
  score?: number;
  completed?: number;
  addedLater?: number;
  water?: number;
  bathroom?: number;
  screenMinutes?: number;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Gemini is not configured" });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const body = (request.body || {}) as SummaryRequest;
  const prompt = [
    "Write one short, warm, goofy end-of-day paragraph for a personal day tracker.",
    "Do not shame the user, mention productivity, or use a score.",
    `Name: ${body.name || "friend"}`,
    `Transparent day rating: ${body.score ?? 0}/100`,
    `Things completed: ${body.completed ?? 0}`,
    `Added later: ${body.addedLater ?? 0}`,
    `Water glasses: ${body.water ?? 0}`,
    `Bathroom visits: ${body.bathroom ?? 0}`,
    `Screen minutes: ${body.screenMinutes ?? 0}`,
    "Keep it under 45 words. Use playful imagery and end with a gentle good-night line.",
  ].join("\n");

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!geminiResponse.ok) {
      console.error("Gemini request failed", { model, status: geminiResponse.status });
      return response.status(502).json({ error: "Gemini summary request failed", model });
    }
    const data = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return response.status(502).json({ error: "Gemini returned an empty summary" });
    return response.status(200).json({ summary: text });
  } catch {
    return response.status(502).json({ error: "Gemini summary request failed" });
  }
}
