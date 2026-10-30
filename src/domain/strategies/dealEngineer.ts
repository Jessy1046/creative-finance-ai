import { formatPct, formatUSD, roundCents, type Cents, type Rate } from "../money";
import { operatingFrom, resolve, type PropertyRecord } from "../property/model";
import { assessRisk, type RiskReport } from "../risk/engine";
import { runStressTests, type StressOutcome } from "../risk/stress";
import { hybrid, sellerFinance, subjectTo } from "./builders";
import { evaluateStructure, type StructureInput, type StructureResult } from "./structure";

/**
 * Ingeniero de Tratos: propone estructuras para una propiedad, calcula sus efectos y explica
 * qué negociar, qué obligaciones se asumen, el peor escenario y las salidas posibles.
 * Las explicaciones se generan desde los resultados del motor (el asistente de IA solo las amplía).
 */

export type ProposalKind = "subject_to" | "seller_finance" | "hibrido";

export const PROPOSAL_LABEL: Record<ProposalKind, string> = {
  subject_to: "Subject-To",
  seller_finance: "Seller Financing",
  hibrido: "Híbrido (Subject-To + pagaré al vendedor)",
};

export interface ProposalParams {
  kind: ProposalKind;
  price: Cents;
  /** Efectivo al vendedor (Subject-To / híbrido) o enganche (Seller Financing). */
  cashToSeller: Cents;
  noteRate: Rate;
  noteAmortMonths: number;
  noteTermMonths: number;
  closingCosts: Cents;
  repairs: Cents;
  reserves: Cents;
}

export interface ProposalResult {
  params: ProposalParams;
  input: StructureInput;
  result: StructureResult;
  risk: RiskReport;
  stress: StressOutcome[];
  worst: StressOutcome | null;
  viable: boolean;
  viabilityReasons: string[];
  negotiate: string[];
  obligations: string[];
  exits: string[];
  explanation: string[];
}

export function availableKinds(record: PropertyRecord): { kind: ProposalKind; available: boolean; reason?: string }[] {
  const { values: v } = resolve(record);
  const hasDebt = v.existingBalance !== null && v.existingBalance > 0 && v.existingRate !== null && v.existingRemainingMonths !== null;
  return [
    { kind: "subject_to", available: hasDebt, reason: hasDebt ? undefined : "Requiere saldo, tasa y plazo de la hipoteca existente." },
    { kind: "seller_finance", available: v.negotiatedPrice !== null, reason: v.negotiatedPrice !== null ? undefined : "Requiere precio." },
    { kind: "hibrido", available: hasDebt, reason: hasDebt ? undefined : "Requiere una hipoteca existente." },
  ];
}

export function defaultParams(record: PropertyRecord, kind: ProposalKind): ProposalParams {
  const { values: v } = resolve(record);
  const price = v.negotiatedPrice ?? v.currentValue ?? 0;
  const arrears = (v.pastDue ?? 0) + (v.penalties ?? 0);
  const balance = v.existingBalance ?? 0;
  const taxIns = Math.round(((v.taxesAnnual ?? 0) + (v.insuranceAnnual ?? 0)) / 12);
  const pi = v.existingPayment ?? 0;
  const base = { price, closingCosts: v.closingCosts ?? 0, repairs: v.repairs ?? 0, reserves: Math.round(((pi + taxIns) * 6) / 100) * 100 }; // 6 meses, redondeado a dólares
  switch (kind) {
    case "subject_to":
      return { ...base, kind, cashToSeller: Math.max(0, price - balance - arrears), noteRate: 0, noteAmortMonths: 0, noteTermMonths: 0 };
    case "seller_finance":
      return { ...base, kind, cashToSeller: roundCents(price * 0.1), noteRate: 0.06, noteAmortMonths: 360, noteTermMonths: 60 };
    case "hibrido":
      return { ...base, kind, cashToSeller: roundCents(Math.max(0, price - balance - arrears) * 0.1), noteRate: 0, noteAmortMonths: 120, noteTermMonths: 120 };
  }
}

export function buildProposal(record: PropertyRecord, p: ProposalParams): StructureInput {
  const { values: v } = resolve(record);
  const op = operatingFrom(v);
  const common = {
    currentValue: v.currentValue ?? p.price,
    arv: v.arv ?? undefined,
    operating: op,
    closingCosts: p.closingCosts,
    repairs: p.repairs,
    reserves: p.reserves,
    cashAvailable: v.cashAvailable ?? undefined,
  };
  const arrears = (v.pastDue ?? 0) + (v.penalties ?? 0);
  const loan = {
    balance: v.existingBalance ?? 0,
    annualRate: v.existingRate ?? 0,
    remainingMonths: v.existingRemainingMonths ?? 360,
    monthlyPI: v.existingPayment ?? undefined,
  };
  switch (p.kind) {
    case "subject_to": {
      const s = subjectTo({ ...common, loan, arrears, sellerCash: p.cashToSeller });
      return { ...s, purchasePrice: p.price };
    }
    case "seller_finance":
      return sellerFinance({
        ...common,
        price: p.price,
        downPayment: p.cashToSeller,
        note: { annualRate: p.noteRate, amortizationMonths: p.noteAmortMonths, termMonths: p.noteTermMonths },
      });
    case "hibrido":
      return hybrid({
        ...common,
        price: p.price,
        loans: [loan],
        arrears,
        sellerCash: p.cashToSeller,
        note: { annualRate: p.noteRate, amortizationMonths: p.noteAmortMonths, termMonths: p.noteTermMonths },
      });
  }
}

export function evaluateProposal(record: PropertyRecord, params: ProposalParams): ProposalResult {
  const input = buildProposal(record, params);
  const result = evaluateStructure(input);
  const risk = assessRisk(record, result);
  const stress = runStressTests(input);
  const breaking = stress.filter((s) => s.breaks);
  const worst =
    breaking.sort((a, b) => a.cashFlowMonthly - b.cashFlowMonthly || b.extraCashNeeded - a.extraCashNeeded)[0] ??
    [...stress].sort((a, b) => a.cashFlowMonthly - b.cashFlowMonthly)[0] ??
    null;

  const { values: v } = resolve(record);
  const viabilityReasons: string[] = [];
  if (result.cashFlowMonthly < 0) viabilityReasons.push(`Flujo negativo de ${formatUSD(result.cashFlowMonthly)} al mes.`);
  if (result.liquidityGap !== null && result.liquidityGap < 0)
    viabilityReasons.push(`Necesitas ${formatUSD(-result.liquidityGap)} más de lo que tienes disponible.`);
  if (result.equityNominal < 0) viabilityReasons.push("La deuda total supera el valor actual: equity negativa.");
  if (params.kind !== "seller_finance" && (v.existingBalance ?? 0) === 0) viabilityReasons.push("No hay hipoteca existente que tomar.");
  if (params.kind === "seller_finance" && (v.existingBalance ?? 0) > 0)
    viabilityReasons.push("El vendedor tiene hipoteca: un seller financing puro requiere liquidarla al cierre o se convierte en wrap/híbrido.");
  const viable = viabilityReasons.length === 0;

  const negotiate: string[] = [];
  const obligations: string[] = [];
  const exits: string[] = ["Rentar a largo plazo (buy and hold)."];
  const explanation: string[] = [];

  explanation.push(
    `Con esta estructura necesitas ${formatUSD(result.totalCashRequired)} (incluida una reserva de ${formatUSD(params.reserves)}). ` +
      `El flujo estimado es ${formatUSD(result.cashFlowMonthly)} al mes con un DSCR de ${result.metrics.dscr?.toFixed(2) ?? "—"}.`,
  );
  if (result.equityNominal !== 0) explanation.push(`Equity nominal inicial: ${formatUSD(result.equityNominal)} (valor − deuda total).`);

  if (params.kind === "subject_to" || params.kind === "hibrido") {
    negotiate.push(
      "Cuánto efectivo recibe el vendedor y cuándo.",
      "Quién paga los atrasos y cargos hasta el cierre.",
      "Acceso del vendedor para verificar cada pago (servicer).",
      "Plan si el prestamista acelera la deuda.",
    );
    obligations.push(
      `Pagar ${formatUSD(result.debts[0]?.monthlyPayment ?? 0)} al mes de la hipoteca que sigue a nombre del vendedor.`,
      "Mantener seguro adecuado y los impuestos al día.",
      "Responder ante el vendedor: su crédito depende de tus pagos.",
    );
    exits.push("Refinanciar a tu nombre más adelante.", "Vender con financiamiento del dueño (wrap) cumpliendo la regulación aplicable.");
    explanation.push(
      "Subject-To no es una asunción aprobada: el préstamo sigue siendo obligación personal del vendedor y el prestamista puede exigir el saldo por la cláusula due-on-sale.",
    );
  }
  if (params.kind === "seller_finance" || params.kind === "hibrido") {
    const note = result.debts.find((d) => d.debt.kind === "vendedor");
    if (note) {
      negotiate.push(
        `Tasa del pagaré (${formatPct(params.noteRate)}) y plazo de amortización (${params.noteAmortMonths} meses).`,
        `Vencimiento: ${params.noteTermMonths} meses${note.balloon > 0 ? ` (balloon de ${formatUSD(note.balloon)})` : ""}.`,
        "Opción de extender el balloon si el mercado no permite refinanciar.",
        "Penalidad por pago anticipado (idealmente ninguna).",
      );
      obligations.push(`Pagar ${formatUSD(note.monthlyPayment)} al mes al vendedor.`);
      if (note.balloon > 0) {
        obligations.push(`Pagar ${formatUSD(note.balloon)} en el mes ${note.maturityMonth}.`);
        exits.push(`Refinanciar o vender antes del mes ${note.maturityMonth} para cubrir el balloon.`);
      }
    }
  }
  if (params.kind === "seller_finance") negotiate.unshift(`Enganche: ${formatUSD(params.cashToSeller)}.`);
  exits.push("Vender en el mercado tradicional.");

  if (worst) {
    explanation.push(
      worst.breaks
        ? `Peor escenario probado: "${worst.label}". ${worst.reasons.join(" ")}${worst.extraCashNeeded > 0 ? ` Exigiría ${formatUSD(worst.extraCashNeeded)} adicionales.` : ""}`
        : `Ninguna prueba de estrés rompe la inversión; la más dura es "${worst.label}" con flujo de ${formatUSD(worst.cashFlowMonthly)}.`,
    );
  }
  if (!viable) explanation.push(`Por qué podría no ser viable: ${viabilityReasons.join(" ")}`);

  return { params, input, result, risk, stress, worst, viable, viabilityReasons, negotiate, obligations, exits, explanation };
}
