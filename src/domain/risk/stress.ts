import { formatUSD, scale, type Cents } from "../money";
import { monthlyPayment } from "../finance/amortization";
import { evaluateStructure, type StructureInput, type StructureResult } from "../strategies/structure";

/**
 * Pruebas de estrés y escenarios sobre una estructura.
 * Cada prueba reporta si "rompe" la inversión: flujo negativo, DSCR < 1 o falta de liquidez.
 */

export interface StressOutcome {
  id: string;
  label: string;
  description: string;
  cashFlowMonthly: Cents;
  dscr: number | null;
  /** Efectivo adicional que exigiría el evento. */
  extraCashNeeded: Cents;
  /** Liquidez restante después del cierre y del evento (null si no se conoce el efectivo disponible). */
  liquidityAfter: Cents | null;
  breaks: boolean;
  reasons: string[];
}

function mutate(input: StructureInput, f: (draft: StructureInput) => void): StructureInput {
  const draft: StructureInput = structuredClone(input);
  f(draft);
  return draft;
}

function scaleExpenses(d: StructureInput, factor: number) {
  const o = d.operating;
  o.taxesMonthly = scale(o.taxesMonthly, factor);
  o.insuranceMonthly = scale(o.insuranceMonthly, factor);
  o.hoaMonthly = scale(o.hoaMonthly ?? 0, factor);
  o.utilitiesMonthly = scale(o.utilitiesMonthly ?? 0, factor);
  o.maintenanceRate = (o.maintenanceRate ?? 0) * factor;
  o.capexRate = (o.capexRate ?? 0) * factor;
}

function outcome(
  id: string,
  label: string,
  description: string,
  base: StructureResult,
  result: StructureResult,
  extraCashNeeded: Cents,
): StressOutcome {
  const cashAvailable = base.input.cashAvailable;
  const liquidityAfter =
    cashAvailable === undefined ? null : cashAvailable - result.totalCashRequired - extraCashNeeded;
  const reasons: string[] = [];
  if (result.cashFlowMonthly < 0) reasons.push("Flujo mensual negativo.");
  if (result.metrics.dscr !== null && result.metrics.dscr < 1) reasons.push("DSCR menor a 1: el NOI no cubre la deuda.");
  if (liquidityAfter !== null && liquidityAfter < 0) reasons.push("Falta de liquidez: el efectivo disponible no alcanza.");
  return {
    id,
    label,
    description,
    cashFlowMonthly: result.cashFlowMonthly,
    dscr: result.metrics.dscr,
    extraCashNeeded,
    liquidityAfter,
    breaks: reasons.length > 0,
    reasons,
  };
}

export interface StressOptions {
  /** Tasa a la que se refinanciaría un balloon (supuesto). */
  refinanceRate?: number;
}

export function runStressTests(input: StructureInput, opts: StressOptions = {}): StressOutcome[] {
  const base = evaluateStructure(input);
  const tests: StressOutcome[] = [];
  const run = (id: string, label: string, description: string, f: (d: StructureInput) => void, extra: (r: StructureResult) => Cents = () => 0) => {
    const r = evaluateStructure(mutate(input, f));
    tests.push(outcome(id, label, description, base, r, extra(r)));
  };

  for (const pct of [0.1, 0.15, 0.2]) {
    run(`renta-${pct}`, `Renta baja ${pct * 100}%`, "La renta de mercado resulta menor a la proyectada.", (d) => {
      d.operating.monthlyRent = scale(d.operating.monthlyRent, 1 - pct);
    });
  }
  run("vacancia", "Vacancia +5 puntos", "Más meses sin inquilino.", (d) => {
    d.operating.vacancyRate = d.operating.vacancyRate + 0.05;
  });
  run("gastos", "Gastos +15%", "Impuestos, seguro, mantenimiento y CapEx suben.", (d) => scaleExpenses(d, 1.15));
  run("reparaciones", "Reparaciones +25%", "Sobrecosto de la remodelación.", (d) => {
    d.upfront.repairs = scale(d.upfront.repairs, 1.25);
  });
  for (const pct of [0.1, 0.2]) {
    run(`valor-${pct}`, `ARV / valor −${pct * 100}%`, "El valor resulta menor: menos equity y refinanciamiento más difícil.", (d) => {
      d.currentValue = scale(d.currentValue, 1 - pct);
      if (d.arv) d.arv = scale(d.arv, 1 - pct);
    });
  }

  // Retrasos: meses sin renta pagando deuda, impuestos, seguro y servicios.
  const carry = base.debtServiceMonthly + base.operating.expenses.taxes + base.operating.expenses.insurance +
    base.operating.expenses.hoa + base.operating.expenses.utilities;
  for (const months of [6, 12]) {
    tests.push(
      outcome(`retraso-${months}`, `Retraso de ${months} meses`, "La rehabilitación o la colocación del inquilino se retrasa sin renta.", base, base, carry * months),
    );
  }

  // Refinanciamiento del balloon a tasa superior.
  const b = base.firstBalloon;
  if (b) {
    const rate = opts.refinanceRate ?? 0.0925;
    const newPayment = monthlyPayment(b.amount, rate, 360);
    const balloonDebt = base.debts.find((d) => d.debt.label === b.debtLabel);
    const cfAfter = base.cashFlowMonthly + (balloonDebt?.monthlyPayment ?? 0) - newPayment;
    const t = outcome(
      "refi-tasa",
      `Refinanciar el balloon al ${(rate * 100).toFixed(2)}%`,
      `En el mes ${b.month} se refinancia el saldo de ${formatUSD(b.amount)} a 30 años.`,
      base,
      base,
      0,
    );
    t.cashFlowMonthly = cfAfter;
    t.breaks = cfAfter < 0;
    t.reasons = cfAfter < 0 ? ["El nuevo pago deja el flujo negativo."] : [];
    tests.push(t);
    tests.push(
      outcome("balloon", "Balloon no refinanciable", `Debes pagar ${b.debtLabel} completo en el mes ${b.month}.`, base, base, b.amount),
    );
  }

  // Aceleración de la deuda existente (due-on-sale).
  const inSeller = base.debts.filter((d) => d.debt.inSellersName);
  if (inSeller.length > 0) {
    const balance = inSeller.reduce((s, d) => s + d.debt.terms.principal, 0);
    tests.push(
      outcome("aceleracion", "Aceleración de la deuda existente", "El prestamista ejerce la cláusula due-on-sale y exige el saldo.", base, base, balance),
    );
  }
  return tests;
}

export type ScenarioId = "conservador" | "base" | "optimista" | "crisis";

export const SCENARIOS: { id: ScenarioId; label: string; description: string; apply: (d: StructureInput) => void }[] = [
  {
    id: "conservador",
    label: "Conservador",
    description: "Renta −5 %, vacancia +3 pts, gastos +10 %, reparaciones +15 %.",
    apply: (d) => {
      d.operating.monthlyRent = scale(d.operating.monthlyRent, 0.95);
      d.operating.vacancyRate += 0.03;
      scaleExpenses(d, 1.1);
      d.upfront.repairs = scale(d.upfront.repairs, 1.15);
    },
  },
  { id: "base", label: "Base", description: "Tus supuestos tal como los escribiste.", apply: () => {} },
  {
    id: "optimista",
    label: "Optimista",
    description: "Renta +5 %, vacancia −2 pts (mínimo 3 %).",
    apply: (d) => {
      d.operating.monthlyRent = scale(d.operating.monthlyRent, 1.05);
      d.operating.vacancyRate = Math.max(0.03, d.operating.vacancyRate - 0.02);
    },
  },
  {
    id: "crisis",
    label: "Crisis",
    description: "Renta −20 %, vacancia +10 pts, gastos +20 %, reparaciones +25 %, valor −20 %.",
    apply: (d) => {
      d.operating.monthlyRent = scale(d.operating.monthlyRent, 0.8);
      d.operating.vacancyRate += 0.1;
      scaleExpenses(d, 1.2);
      d.upfront.repairs = scale(d.upfront.repairs, 1.25);
      d.currentValue = scale(d.currentValue, 0.8);
      if (d.arv) d.arv = scale(d.arv, 0.8);
    },
  },
];

export function runScenarios(input: StructureInput) {
  return SCENARIOS.map((s) => ({ ...s, result: evaluateStructure(mutate(input, s.apply)) }));
}
