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
  let model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
    let geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!geminiResponse.ok && (geminiResponse.status === 404 || geminiResponse.status === 400)) {
      const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json() as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
        const available = modelsData.models
          ?.filter((item) => item.name?.startsWith("models/") && item.supportedGenerationMethods?.includes("generateContent"))
          .sort((a, b) => Number(b.name?.includes("flash") || false) - Number(a.name?.includes("flash") || false))[0];
        if (available?.name) {
          model = available.name.replace(/^models\//, "");
          geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            },
          );
        }
      }
    }
    if (!geminiResponse.ok) {
      const upstream = await geminiResponse.text();
      console.error("Gemini request failed", { model, status: geminiResponse.status, upstream: upstream.slice(0, 500) });
      const error = geminiResponse.status === 401 || geminiResponse.status === 403 ? "Gemini key is invalid or does not have API access" : geminiResponse.status === 404 ? "No available Gemini model supports this API key" : "Gemini summary request failed";
      return response.status(502).json({ error, model, hint: "Set GEMINI_MODEL to a model returned by the Gemini ListModels API, then redeploy." });
    }
    const data = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return response.status(502).json({ error: "Gemini returned an empty summary" });
    return response.status(200).json({ summary: text });
  } catch {
    return response.status(502).json({ error: "Gemini summary request failed" });
  }
}
