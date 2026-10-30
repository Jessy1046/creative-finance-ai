import { z } from "zod";
import { PERSONA_BY_ID } from "@/domain/negotiation/personas";
import { demoSellerReply } from "@/domain/negotiation/evaluation";
import { getProvider } from "@/lib/ai/provider";
import { sellerSystemPrompt } from "@/lib/ai/prompts";
import { guard, json, turnsSchema } from "../_shared";

const schema = z.object({ personaId: z.string().max(40), turns: turnsSchema.min(1) });

export async function POST(req: Request) {
  const g = await guard(req, schema, 30);
  if ("error" in g) return g.error;
  const persona = PERSONA_BY_ID[g.data.personaId];
  if (!persona) return json({ error: "Perfil de vendedor desconocido." }, 404);

  const provider = await getProvider();
  if (!provider) return json({ mode: "demo", reply: demoSellerReply(persona, g.data.turns) });

  const r = await provider.reply({ system: sellerSystemPrompt(persona), turns: g.data.turns, effort: "low" });
  if (!r.ok) return json({ mode: "ia", error: r.message }, r.reason === "refusal" ? 422 : 502);
  return json({ mode: "ia", reply: r.text });
}
