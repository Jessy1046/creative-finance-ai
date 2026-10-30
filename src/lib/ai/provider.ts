import type { Evaluation, ChatTurn } from "@/domain/negotiation/evaluation";

/**
 * Adaptador de proveedores de IA. Las claves viven solo en el servidor.
 * Si no hay proveedor configurado, las rutas responden en "modo demostración" y lo indican.
 */
export interface AIProvider {
  readonly name: string;
  /** Respuesta conversacional (vendedor virtual o tutor). */
  reply(args: { system: string; turns: ChatTurn[]; effort?: "low" | "medium" | "high" }): Promise<AIReply>;
  /** Evaluación estructurada de una negociación. */
  evaluateNegotiation(args: { system: string; transcript: string }): Promise<Evaluation>;
}

export type AIReply = { ok: true; text: string } | { ok: false; reason: "refusal" | "error"; message: string };

let cached: AIProvider | null | undefined;

export async function getProvider(): Promise<AIProvider | null> {
  if (cached !== undefined) return cached;
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    cached = null;
    return cached;
  }
  const { AnthropicProvider } = await import("./anthropic");
  cached = new AnthropicProvider();
  return cached;
}
