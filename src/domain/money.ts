/**
 * Representación monetaria del dominio.
 *
 * - Todo monto se guarda en CENTAVOS ENTEROS (`Cents`).
 * - Toda tasa se guarda como FRACCIÓN DECIMAL anual (`Rate`): 6.5 % => 0.065.
 * - Regla de redondeo: medio-centavo se aleja del cero ("half away from zero"),
 *   aplicada cada vez que un cálculo produce un monto (pago, interés, etc.).
 */

export type Cents = number;
export type Rate = number;

export function roundCents(value: number): Cents {
  if (!Number.isFinite(value)) throw new RangeError(`Monto no finito: ${value}`);
  const rounded = Math.sign(value) * Math.round(Math.abs(value));
  return rounded === 0 ? 0 : rounded; // evita -0
}

export function toCents(dollars: number): Cents {
  return roundCents(dollars * 100);
}

export function fromCents(cents: Cents): number {
  return cents / 100;
}

export function sum(values: readonly Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Multiplica un monto por un factor y redondea a centavos. */
export function scale(cents: Cents, factor: number): Cents {
  return roundCents(cents * factor);
}

/** División segura: devuelve null cuando el denominador es 0 o no finito. */
export function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export function formatUSD(cents: Cents | null | undefined, opts: { decimals?: boolean } = {}): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  const f = opts.decimals ? usd2 : usd0;
  return f.format(cents / 100).replace("-", "−");
}

export function formatPct(rate: number | null | undefined, digits = 1): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(digits).replace("-", "−")}%`;
}

export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}
