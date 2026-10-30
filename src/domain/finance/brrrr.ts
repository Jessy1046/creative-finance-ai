import { roundCents, type Cents, type Rate } from "../money";
import { amortize, monthlyPayment } from "./amortization";
import { cashOnCash, dscr, operatingStatement, type OperatingInputs } from "./metrics";

/**
 * BRRRR: Buy, Rehab, Rent, Refinance, Repeat.
 * El refinanciamiento NO se asume aprobado: el resultado reporta las condiciones
 * que el prestamista probablemente revisará (DSCR, LTV, seasoning).
 * El efectivo recuperado en el refinanciamiento no es ganancia: es devolución de capital con deuda nueva.
 */
export interface BrrrrInputs {
  purchasePrice: Cents;
  rehabCost: Cents;
  purchaseClosingCosts: Cents;
  /** Préstamo de adquisición (hard money / privado), solo intereses. */
  acquisitionLoan: Cents;
  acquisitionRate: Rate;
  acquisitionPoints: Rate;
  /** Meses desde la compra hasta el refinanciamiento. */
  monthsToRefinance: number;
  /** Gastos mensuales de tenencia mientras no hay renta (impuestos, seguro, servicios). */
  holdingMonthly: Cents;
  /** Meses de la tenencia sin renta (rehabilitación + colocación). */
  monthsWithoutRent: number;
  operating: OperatingInputs;
  arv: Cents;
  refiLtv: Rate;
  refiRate: Rate;
  refiAmortizationMonths: number;
  /** Costos del refinanciamiento como fracción del préstamo nuevo. */
  refiCostRate: Rate;
  /** DSCR mínimo que el prestamista exigiría (supuesto). */
  lenderMinDscr?: number;
}

export interface BrrrrResult {
  steps: {
    buy: { cashAtClosing: Cents; acquisitionLoan: Cents; points: Cents };
    rehab: { rehabCost: Cents; financedByLoan: Cents; paidCash: Cents };
    hold: { interestCarry: Cents; holdingCosts: Cents; rentCollected: Cents };
    refinance: { newLoan: Cents; payoff: Cents; refiCosts: Cents; cashOut: Cents };
  };
  totalCashInvested: Cents;
  capitalRecovered: Cents;
  capitalLeftIn: Cents;
  newMonthlyPayment: Cents;
  noiMonthly: Cents;
  cashFlowAfterRefi: Cents;
  cashOnCashAfterRefi: number | null;
  dscrAfterRefi: number | null;
  /** Condiciones que deben verificarse antes de contar con el refinanciamiento. */
  refiConditions: { label: string; ok: boolean | null; detail: string }[];
}

export function brrrr(i: BrrrrInputs): BrrrrResult {
  const points = roundCents(i.acquisitionLoan * i.acquisitionPoints);
  const totalProjectCost = i.purchasePrice + i.rehabCost;
  const financedRehab = Math.max(0, Math.min(i.rehabCost, i.acquisitionLoan - i.purchasePrice));
  const financedPurchase = i.acquisitionLoan - financedRehab;
  const cashAtClosing = i.purchasePrice - financedPurchase + i.purchaseClosingCosts + points;
  const rehabPaidCash = i.rehabCost - financedRehab;

  const interestCarry = amortize({
    principal: i.acquisitionLoan,
    annualRate: i.acquisitionRate,
    amortizationMonths: i.monthsToRefinance,
    termMonths: i.monthsToRefinance,
    interestOnly: true,
  }).totalInterest;
  const holdingCosts = i.holdingMonthly * i.monthsWithoutRent;
  const op = operatingStatement(i.operating);
  const rentMonths = Math.max(0, i.monthsToRefinance - i.monthsWithoutRent);
  // Durante los meses con renta, el NOI (renta efectiva − gastos operativos, incluidos impuestos y seguro) reduce el capital expuesto.
  const rentCollected = op.noiMonthly * rentMonths;

  const totalCashInvested = cashAtClosing + rehabPaidCash + interestCarry + holdingCosts - rentCollected;

  const newLoan = roundCents(i.arv * i.refiLtv);
  const refiCosts = roundCents(newLoan * i.refiCostRate);
  const payoff = i.acquisitionLoan;
  const cashOut = newLoan - payoff - refiCosts;
  const capitalRecovered = Math.max(0, Math.min(cashOut, totalCashInvested));
  const capitalLeftIn = totalCashInvested - Math.max(0, cashOut);

  const newMonthlyPayment = monthlyPayment(newLoan, i.refiRate, i.refiAmortizationMonths);
  const cashFlowAfterRefi = op.noiMonthly - newMonthlyPayment;
  const dscrAfter = dscr(op.noiAnnual, newMonthlyPayment * 12);
  const minDscr = i.lenderMinDscr ?? 1.2;

  return {
    steps: {
      buy: { cashAtClosing, acquisitionLoan: i.acquisitionLoan, points },
      rehab: { rehabCost: i.rehabCost, financedByLoan: financedRehab, paidCash: rehabPaidCash },
      hold: { interestCarry, holdingCosts, rentCollected },
      refinance: { newLoan, payoff, refiCosts, cashOut },
    },
    totalCashInvested,
    capitalRecovered,
    capitalLeftIn,
    newMonthlyPayment,
    noiMonthly: op.noiMonthly,
    cashFlowAfterRefi,
    cashOnCashAfterRefi: capitalLeftIn > 0 ? cashOnCash(cashFlowAfterRefi * 12, capitalLeftIn) : null,
    dscrAfterRefi: dscrAfter,
    refiConditions: [
      {
        label: `DSCR ≥ ${minDscr.toFixed(2)} con la tasa del refinanciamiento`,
        ok: dscrAfter === null ? null : dscrAfter >= minDscr,
        detail: dscrAfter === null ? "Sin servicio de deuda." : `DSCR estimado ${dscrAfter.toFixed(2)}.`,
      },
      {
        label: "El nuevo préstamo cubre la deuda de adquisición",
        ok: newLoan >= payoff + refiCosts,
        detail: "Si no la cubre, necesitarás efectivo adicional para cerrar el refinanciamiento.",
      },
      {
        label: "ARV sustentado por un avalúo independiente",
        ok: null,
        detail: "Pendiente de verificar: el prestamista valorará la propiedad con su propio avalúo.",
      },
      {
        label: "Período de seasoning del prestamista cumplido",
        ok: null,
        detail: `Pendiente de verificar: muchos prestamistas exigen de 6 a 12 meses de titularidad; aquí se asumen ${i.monthsToRefinance}.`,
      },
      {
        label: "Costo total vs. ARV",
        ok: totalProjectCost <= i.arv,
        detail: "Si la compra + rehabilitación supera el ARV, el refinanciamiento no recuperará el capital.",
      },
    ],
  };
}
