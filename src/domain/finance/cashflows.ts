/**
 * Valor presente neto, TIR y múltiplo de capital.
 * Los flujos se expresan en cualquier unidad consistente (centavos o dólares);
 * flows[0] ocurre en t = 0.
 */

export function npv(ratePerPeriod: number, flows: readonly number[]): number {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + ratePerPeriod, t), 0);
}

function countSignChanges(flows: readonly number[]): number {
  let changes = 0;
  let prev = 0;
  for (const cf of flows) {
    if (cf === 0) continue;
    const s = Math.sign(cf);
    if (prev !== 0 && s !== prev) changes++;
    prev = s;
  }
  return changes;
}

export interface IrrResult {
  /** Tasa por período; null si no existe solución. */
  rate: number | null;
  signChanges: number;
  /** Advertencias: sin solución o posibles TIR múltiples. */
  warning: string | null;
}

/**
 * TIR por bisección robusta sobre (−99.99 %, 1000 %].
 * - Sin cambio de signo → no existe TIR.
 * - Más de un cambio de signo → puede haber varias TIR; se reporta la menor encontrada y se advierte.
 */
export function irr(flows: readonly number[]): IrrResult {
  const signChanges = countSignChanges(flows);
  if (signChanges === 0) {
    return { rate: null, signChanges, warning: "Los flujos no cambian de signo: la TIR no existe." };
  }

  // Buscar el primer intervalo con cambio de signo del VPN en una malla.
  const grid: number[] = [];
  for (let r = -0.9999; r < 10; r += r < 1 ? 0.01 : 0.1) grid.push(r);
  let lo: number | null = null;
  let hi: number | null = null;
  for (let i = 0; i < grid.length - 1; i++) {
    const a = grid[i]!;
    const b = grid[i + 1]!;
    const fa = npv(a, flows);
    const fb = npv(b, flows);
    if (fa === 0) return { rate: a, signChanges, warning: multipleWarning(signChanges) };
    if (Math.sign(fa) !== Math.sign(fb)) {
      lo = a;
      hi = b;
      break;
    }
  }
  if (lo === null || hi === null) {
    return { rate: null, signChanges, warning: "No se encontró una TIR en el rango −99.99 % a 1000 %." };
  }

  let a: number = lo;
  let b: number = hi;
  let fLo = npv(a, flows);
  for (let i = 0; i < 200; i++) {
    const mid: number = (a + b) / 2;
    const fMid = npv(mid, flows);
    if (Math.abs(fMid) < 1e-9 || b - a < 1e-12) {
      a = b = mid;
      break;
    }
    if (Math.sign(fMid) === Math.sign(fLo)) {
      a = mid;
      fLo = fMid;
    } else {
      b = mid;
    }
  }
  return { rate: (a + b) / 2, signChanges, warning: multipleWarning(signChanges) };
}

function multipleWarning(signChanges: number): string | null {
  return signChanges > 1
    ? "Los flujos cambian de signo más de una vez: puede existir más de una TIR. Interprétala con cuidado."
    : null;
}

/** Convierte una tasa mensual en efectiva anual: (1 + r)^12 − 1. */
export function annualizeMonthly(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}

/** Múltiplo de capital: total recibido / total invertido. */
export function equityMultiple(totalDistributions: number, totalInvested: number): number | null {
  if (totalInvested <= 0) return null;
  return totalDistributions / totalInvested;
}
