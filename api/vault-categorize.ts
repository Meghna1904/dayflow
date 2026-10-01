import type { VercelRequest, VercelResponse } from "@vercel/node";

const categories = ["Thoughts", "Movies", "Music", "Books", "Places", "Instagram links", "Docs links", "Jobs"];

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  const text = String((request.body as { text?: string } | undefined)?.text || "").trim();
  if (!text || text.length > 4000) return response.status(400).json({ error: "Text is required and must be under 4000 characters" });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Gemini is not configured" });
  const prompt = `Classify this saved note into exactly one category: ${categories.join(", ")}. Return only the exact category name.\n\n${text}`;
  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    if (!result.ok) return response.status(502).json({ error: "Gemini categorization failed" });
    const data = await result.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const category = categories.find((item) => answer?.toLowerCase() === item.toLowerCase());
    return response.status(200).json({ category: category || "Thoughts" });
  } catch {
    return response.status(502).json({ error: "Gemini categorization failed" });
  }
}
