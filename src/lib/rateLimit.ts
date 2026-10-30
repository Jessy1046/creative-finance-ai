/**
 * Límite de solicitudes por IP en memoria (ventana deslizante).
 * Suficiente para una instancia; en producción con varias instancias, sustituir por un almacén compartido (p. ej. Redis).
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0]!)) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear();
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
