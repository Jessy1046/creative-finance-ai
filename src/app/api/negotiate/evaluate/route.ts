import { z } from "zod";
import { PERSONA_BY_ID } from "@/domain/negotiation/personas";
import { heuristicEvaluation } from "@/domain/negotiation/evaluation";
import { getProvider } from "@/lib/ai/provider";
import { evaluatorSystemPrompt } from "@/lib/ai/prompts";
import { guard, json, turnsSchema } from "../../_shared";

const schema = z.object({ personaId: z.string().max(40), turns: turnsSchema.min(2) });

export async function POST(req: Request) {
  const g = await guard(req, schema, 10);
  if ("error" in g) return g.error;
  const persona = PERSONA_BY_ID[g.data.personaId];
  if (!persona) return json({ error: "Perfil de vendedor desconocido." }, 404);

  const provider = await getProvider();
  if (!provider) return json({ mode: "demo", evaluation: heuristicEvaluation(persona, g.data.turns) });

  const transcript = g.data.turns
    .map((t) => `${t.role === "user" ? "ESTUDIANTE" : persona.name.toUpperCase()}: ${t.content}`)
    .join("\n");
  try {
    const evaluation = await provider.evaluateNegotiation({ system: evaluatorSystemPrompt(persona), transcript });
    return json({ mode: "ia", evaluation });
  } catch {
    // Si la IA falla, se entrega la evaluación heurística y se indica claramente.
    return json({ mode: "demo", evaluation: heuristicEvaluation(persona, g.data.turns), notice: "La IA no respondió; se muestra la evaluación automática." });
  }
}
