import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { evaluationSchema, type ChatTurn, type Evaluation } from "@/domain/negotiation/evaluation";
import type { AIProvider, AIReply } from "./provider";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
// Si el modelo declina una solicitud por política, la API la reintenta con un modelo de respaldo.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

function toMessages(turns: ChatTurn[]): Anthropic.Beta.BetaMessageParam[] {
  // La API exige que el primer mensaje sea del usuario.
  const firstUser = turns.findIndex((t) => t.role === "user");
  return turns.slice(firstUser < 0 ? turns.length : firstUser).map((t) => ({ role: t.role, content: t.content }));
}

export class AnthropicProvider implements AIProvider {
  readonly name = "Claude";
  private client = new Anthropic();

  async reply({ system, turns, effort = "medium" }: { system: string; turns: ChatTurn[]; effort?: "low" | "medium" | "high" }): Promise<AIReply> {
    try {
      const response = await this.client.beta.messages.create({
        ...FALLBACK,
        model: MODEL,
        max_tokens: 16000,
        output_config: { effort },
        system,
        messages: toMessages(turns),
      });
      if (response.stop_reason === "refusal") {
        return { ok: false, reason: "refusal", message: "El modelo no pudo responder a esta solicitud. Reformula la pregunta." };
      }
      const text = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { ok: true, text };
    } catch (error) {
      return { ok: false, reason: "error", message: describeError(error) };
    }
  }

  async evaluateNegotiation({ system, transcript }: { system: string; transcript: string }): Promise<Evaluation> {
    const response = await this.client.beta.messages.parse({
      ...FALLBACK,
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(evaluationSchema) },
      system,
      messages: [{ role: "user", content: transcript }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new Error("La evaluación no pudo generarse.");
    }
    return response.parsed_output;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "La clave de la API no es válida.";
  if (error instanceof Anthropic.RateLimitError) return "Demasiadas solicitudes. Intenta de nuevo en un momento.";
  if (error instanceof Anthropic.APIConnectionError) return "No se pudo conectar con el servicio de IA.";
  if (error instanceof Anthropic.APIError) return `Error del servicio de IA (${error.status ?? "sin código"}).`;
  return "Error inesperado del servicio de IA.";
}
