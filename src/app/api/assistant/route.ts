import { z } from "zod";
import { propertySchema, type PropertyRecord } from "@/domain/property/model";
import { summarizeForAI } from "@/domain/property/summary";
import { formatKnowledge, retrieve } from "@/domain/academy/retrieve";
import { getProvider } from "@/lib/ai/provider";
import { tutorSystemPrompt } from "@/lib/ai/prompts";
import { guard, json, turnsSchema } from "../_shared";

const schema = z.object({ turns: turnsSchema.min(1), property: propertySchema.nullable().optional() });

export async function POST(req: Request) {
  const g = await guard(req, schema, 20);
  if ("error" in g) return g.error;
  const { turns, property } = g.data;
  const question = turns.filter((t) => t.role === "user").at(-1)?.content ?? "";
  const chunks = retrieve(question, 4);
  const sources = chunks.map((c) => ({ title: c.title, updatedAt: c.updatedAt, lesson: c.lesson, links: c.sources }));
  // Las cifras se recalculan en el servidor con el motor: el cliente no puede inyectar resultados.
  const context = property ? summarizeForAI(property as PropertyRecord) : "No hay una propiedad abierta.";

  const provider = await getProvider();
  if (!provider) {
    return json({
      mode: "demo",
      answer:
        chunks.length > 0
          ? "Modo demostración (sin IA): estos son los fragmentos de la academia más relevantes para tu pregunta. Conecta una clave de IA para recibir una explicación personalizada de tus números."
          : "Modo demostración (sin IA): no encontré contenido de la academia para esa pregunta. Intenta con términos como Subject-To, balloon, wrap o DSCR.",
      excerpts: chunks.map((c) => ({ title: c.title, text: c.text })),
      sources,
    });
  }
  const r = await provider.reply({ system: tutorSystemPrompt(context, formatKnowledge(chunks)), turns, effort: "medium" });
  if (!r.ok) return json({ mode: "ia", error: r.message }, r.reason === "refusal" ? 422 : 502);
  return json({ mode: "ia", answer: r.text, sources });
}
