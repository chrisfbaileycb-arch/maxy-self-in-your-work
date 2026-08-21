// Lovable AI Gateway helper — server-only.
// Uses the OpenAI-compatible endpoint at https://ai.gateway.lovable.dev/v1.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export class AIError extends Error {}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export async function chat(
  messages: ChatMsg[],
  opts: { temperature?: number; json?: boolean; model?: string } = {},
): Promise<string> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!lovableKey && !geminiKey) {
    throw new AIError(
      "AI service is not configured on this environment (set GEMINI_API_KEY or LOVABLE_API_KEY).",
    );
  }

  const { temperature = 0, json = true, model = DEFAULT_MODEL } = opts;

  if (lovableKey) {
    let res: Response;
    try {
      res = await fetch(`${GATEWAY_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (e) {
      throw new AIError(`Could not reach the AI service. (${(e as Error).message})`);
    }

    if (res.status === 429) throw new AIError("Rate limit reached. Try again in a minute.");
    if (res.status === 402) throw new AIError("AI credits exhausted for this workspace.");
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIError(`AI service returned ${res.status}. ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data?.choices?.[0]?.message?.content ?? "";
  } else if (geminiKey) {
    const systemMsg = messages.find((m) => m.role === "system")?.content;
    const userMsgs = messages.filter((m) => m.role !== "system");
    const contents = userMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
            contents,
            generationConfig: {
              temperature,
              ...(json ? { responseMimeType: "application/json" } : {}),
            },
          }),
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new AIError(`Gemini API returned ${res.status}. ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (e) {
      if (e instanceof AIError) throw e;
      throw new AIError(`Could not reach Gemini API. (${(e as Error).message})`);
    }
  }

  throw new AIError("AI service not configured.");
}

export const CATEGORY_PERSONAL = "personal" as const;
export const CATEGORY_WORK = "work" as const;

function buildClassifySystem(existingProjects: string[]): string {
  const hint = existingProjects.length
    ? `\nThe user already has these WORK projects — reuse the exact name when a memory clearly belongs to one:\n${existingProjects.map((p) => `- ${p}`).join("\n")}\nIf a work memory doesn't fit any of those, invent a short, descriptive project name (2–4 words, Title Case) that names the underlying subject/initiative — never generic ("Work", "General", "Misc").`
    : `\nFor each work memory, invent a short, descriptive project name (2–4 words, Title Case) that names the underlying subject/initiative — never generic ("Work", "General", "Misc").`;
  return `You sort conversation snippets into a person's long-term memory.
Read the input and extract only the meaningful, durable facts worth remembering later.
Sort each fact into exactly one of two categories:
- "personal": personal life, family, friends, health, feelings, hobbies, home, plans with loved ones.
- "work": work, business, projects, clients, deadlines, technical tasks, professional goals.
Ignore small talk, filler, and anything not worth remembering.
Rewrite each kept item as a concise, self-contained first-person memory (one sentence, no fluff).
For EVERY work memory, also identify which specific project/subject it belongs to.${hint}
Personal memories do not need a subject (omit or null).
Also assign a salience rank to each memory. You MUST spread ranks across all three levels — do NOT label everything the same.
- 2 = CRITICAL — identity-defining, durable facts: who the person is, their business model or pricing, core people (family, partners), firm launch commitments, health conditions, non-negotiable values. True for months or more. Use SPARINGLY — typically 0–3 per sort.
- 1 = HIGH — active decisions, current goals, architecture choices, and strategy that are in play right now.
- 0 = NORMAL — transient task steps, to-dos, config values, one-off implementation notes (e.g. "I need to set VITE_API_URL", "deploy the frontend to Netlify", "run npm install"). Most implementation to-dos are 0.
Reserve 2 for a handful of defining facts. If in doubt between 1 and 0, prefer 0 for anything that reads like a task or config detail.
Return STRICT JSON: {"memories":[{"category":"personal"|"work","content":"...","subject":"Project Name"|null,"salience":0|1|2}]}.
If nothing is worth keeping, return {"memories":[]}.`;
}

export type ClassifiedMemory = {
  category: "personal" | "work";
  content: string;
  subject: string | null;
  salience: 0 | 1 | 2;
};

export function parseClassifier(raw: string): ClassifiedMemory[] {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    throw new AIError("The AI returned invalid JSON. Try again.");
  }
  const list = (obj as { memories?: unknown[] })?.memories;
  if (!Array.isArray(list)) return [];
  const out: ClassifiedMemory[] = [];
  for (const m of list) {
    const item = m as {
      category?: string;
      content?: string;
      subject?: string | null;
      salience?: unknown;
    };
    const category =
      item?.category === "work" ? "work" : item?.category === "personal" ? "personal" : null;
    const content = typeof item?.content === "string" ? item.content.trim() : "";
    const subject =
      category === "work" && typeof item?.subject === "string" && item.subject.trim()
        ? item.subject.trim()
        : null;
    const rawSal = typeof item?.salience === "number" ? item.salience : Number(item?.salience);
    const salience: 0 | 1 | 2 = rawSal === 0 || rawSal === 2 ? (rawSal as 0 | 2) : 1;
    if (category && content) out.push({ category, content, subject, salience });
  }

  return out;
}

const CHUNK_CHARS = 8000;
const MAX_CHUNKS = 12;

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_CHARS) return [text];
  const paras = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > CHUNK_CHARS && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
    if (chunks.length >= MAX_CHUNKS) break;
  }
  if (cur && chunks.length < MAX_CHUNKS) chunks.push(cur);
  return chunks;
}

export async function classifyLargeInput(
  text: string,
  existingProjects: string[] = [],
): Promise<{
  memories: ClassifiedMemory[];
  chunksProcessed: number;
  truncated: boolean;
}> {
  const chunks = splitIntoChunks(text);
  const truncated = chunks.length >= MAX_CHUNKS && text.length > chunks.join("\n\n").length;
  const system = buildClassifySystem(existingProjects);
  const results = await Promise.all(
    chunks.map(async (c) => {
      const raw = await chat([
        { role: "system", content: system },
        { role: "user", content: c },
      ]);
      return parseClassifier(raw);
    }),
  );
  const merged: ClassifiedMemory[] = [];
  const seen = new Set<string>();
  for (const arr of results) {
    for (const m of arr) {
      const key = m.category + "|" + (m.subject ?? "") + "|" + m.content.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(m);
      }
    }
  }
  return { memories: merged, chunksProcessed: chunks.length, truncated };
}
