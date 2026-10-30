import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const turnsSchema = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
  .max(60);

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Valida el cuerpo y aplica límite de solicitudes. Devuelve una Response de error o los datos. */
export async function guard<T extends z.ZodTypeAny>(req: Request, schema: T, limit = 20): Promise<{ error: Response } | { data: z.infer<T> }> {
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientKey(req)}`, limit);
  if (!rl.ok) return { error: json({ error: `Demasiadas solicitudes. Intenta en ${rl.retryAfter} s.` }, 429) };
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: json({ error: "El cuerpo de la solicitud no es JSON válido." }, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: json({ error: "Datos inválidos.", issues: parsed.error.issues.slice(0, 5) }, 400) };
  return { data: parsed.data };
}
