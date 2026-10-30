import { roundCents, type Cents, type Rate } from "../money";
import { equityMultiple, irr } from "../finance/cashflows";

/**
 * Socios capitalistas y prestamistas privados.
 * Modela una distribución tipo "waterfall" anual:
 *   1) Retorno preferente (preferred return) acumulable al inversionista.
 *   2) Devolución de capital al vender.
 *   3) Reparto del excedente según el split acordado.
 * Ningún retorno es garantizado: depende del flujo y del precio de venta supuestos.
 */
export interface EquityPartnershipInputs {
  investorCapital: Cents;
  operatorCapital: Cents;
  preferredReturn: Rate;
  /** Fracción del excedente para el inversionista después del preferente. */
  investorSplit: Rate;
  /** Flujo distribuible proyectado por año (antes del waterfall). */
  annualCashFlows: Cents[];
  /** Producto neto de la venta al final (después de deuda y costos). */
  saleProceeds: Cents;
}

export interface PartyReport {
  contributed: Cents;
  distributions: Cents[];
  total: Cents;
  irr: number | null;
  equityMultiple: number | null;
}

export interface EquityPartnershipResult {
  investor: PartyReport;
  operator: PartyReport;
  unpaidPreferredAtExit: Cents;
  capitalLossRisk: Cents;
  notes: string[];
}

export function equityPartnership(i: EquityPartnershipInputs): EquityPartnershipResult {
  const years = i.annualCashFlows.length;
  const invDist: Cents[] = [];
  const opDist: Cents[] = [];
  let accruedPref = 0;
  let investorCapitalOutstanding = i.investorCapital;
  let operatorCapitalOutstanding = i.operatorCapital;

  for (let y = 0; y < years; y++) {
    let cash = Math.max(0, i.annualCashFlows[y] ?? 0);
    accruedPref += roundCents(investorCapitalOutstanding * i.preferredReturn);
    const prefPaid = Math.min(cash, accruedPref);
    accruedPref -= prefPaid;
    cash -= prefPaid;
    const invShare = roundCents(cash * i.investorSplit);
    invDist.push(prefPaid + invShare);
    opDist.push(cash - invShare);
  }

  // Venta: preferente pendiente → capital del inversionista → capital del operador → split.
  let proceeds = Math.max(0, i.saleProceeds);
  const prefAtExit = Math.min(proceeds, accruedPref);
  proceeds -= prefAtExit;
  const invCapBack = Math.min(proceeds, investorCapitalOutstanding);
  proceeds -= invCapBack;
  investorCapitalOutstanding -= invCapBack;
  const opCapBack = Math.min(proceeds, operatorCapitalOutstanding);
  proceeds -= opCapBack;
  operatorCapitalOutstanding -= opCapBack;
  const invUpside = roundCents(proceeds * i.investorSplit);
  const lastIdx = years - 1;
  if (lastIdx >= 0) {
    invDist[lastIdx] = (invDist[lastIdx] ?? 0) + prefAtExit + invCapBack + invUpside;
    opDist[lastIdx] = (opDist[lastIdx] ?? 0) + opCapBack + (proceeds - invUpside);
  }

  const report = (contributed: Cents, dist: Cents[]): PartyReport => {
    const total = dist.reduce((s, v) => s + v, 0);
    return {
      contributed,
      distributions: dist,
      total,
      irr: contributed > 0 ? irr([-contributed, ...dist]).rate : null,
      equityMultiple: equityMultiple(total, contributed),
    };
  };

  return {
    investor: report(i.investorCapital, invDist),
    operator: report(i.operatorCapital, opDist),
    unpaidPreferredAtExit: accruedPref - prefAtExit,
    capitalLossRisk: investorCapitalOutstanding,
    notes: [
      "Los retornos son proyecciones con supuestos; no son garantizados.",
      "Ofrecer participaciones a inversionistas puede constituir una oferta de valores (securities): consulta a un abogado antes de levantar capital.",
      "Documenta el acuerdo (operating agreement) con derechos, obligaciones, decisiones mayores y salida.",
    ],
  };
}

export interface PrivateLoanInputs {
  principal: Cents;
  annualRate: Rate;
  termMonths: number;
  points: Rate;
  /** Solo intereses (lo más común) o amortizable. */
  interestOnly: boolean;
}

export function privateLoanSummary(i: PrivateLoanInputs) {
  const monthlyInterest = roundCents((i.principal * i.annualRate) / 12);
  const pointsAmount = roundCents(i.principal * i.points);
  const totalInterest = monthlyInterest * i.termMonths;
  return {
    monthlyPayment: monthlyInterest,
    pointsAmount,
    totalCostToBorrower: totalInterest + pointsAmount,
    lenderTotalReturn: totalInterest + pointsAmount,
    balloonAtMaturity: i.principal,
    lenderYield: i.principal > 0 ? (totalInterest + pointsAmount) / i.principal / (i.termMonths / 12) : null,
  };
}
