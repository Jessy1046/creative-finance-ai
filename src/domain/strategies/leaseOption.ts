import { roundCents, type Cents, type Rate } from "../money";

/**
 * Lease Option desde la perspectiva del inversionista que arrienda con opción de compra
 * (opcionalmente subarrendando a un inquilino-comprador: "sandwich lease option").
 */
export interface LeaseOptionInputs {
  optionFee: Cents;
  /** Renta contractual que paga el inversionista al dueño. */
  contractRent: Cents;
  /** Crédito mensual de renta aplicable al precio (si el contrato lo concede). */
  rentCreditMonthly: Cents;
  /** ¿La prima de opción se acredita al precio de ejercicio? */
  optionFeeCredited: boolean;
  strikePrice: Cents;
  termMonths: number;
  /** Reparaciones y costos iniciales del inversionista. */
  upfrontCosts: Cents;
  /** Mantenimiento y otros costos mensuales a cargo del inversionista según contrato. */
  monthlyCosts: Cents;
  /** Valor de mercado esperado al ejercer (supuesto). */
  expectedValueAtExercise: Cents;
  /** Sandwich: renta que cobra el inversionista a su inquilino-comprador (0 si vive/usa él mismo). */
  subtenantRent: Cents;
  subtenantOptionFee: Cents;
  subtenantStrikePrice: Cents;
  subtenantRentCredit: Cents;
  /** Costo de venta si el inversionista revende tras ejercer (fracción). */
  resaleCostRate: Rate;
}

export interface LeaseOptionResult {
  cashAtStart: Cents;
  monthlyCashFlow: Cents;
  cashFlowDuringTerm: Cents;
  creditsEarned: Cents;
  /** Lo que el inversionista debe pagar al ejercer. */
  amountDueAtExercise: Cents;
  exercised: {
    /** Equity inmediata = valor esperado − monto a pagar al ejercer. */
    equityAtExercise: Cents;
    /** Ganancia total si ejerce y revende al valor esperado. */
    profitIfResold: Cents;
    /** Ganancia total en sandwich si el inquilino-comprador ejerce su opción. */
    profitIfSubtenantBuys: Cents | null;
  };
  expired: {
    /** Resultado si la opción vence sin ejercer (se pierde la prima y los créditos). */
    totalResult: Cents;
    lostOptionFee: Cents;
    lostCredits: Cents;
  };
  obligations: string[];
}

export function leaseOptionAnalysis(i: LeaseOptionInputs): LeaseOptionResult {
  const cashAtStart = i.optionFee + i.upfrontCosts - i.subtenantOptionFee;
  const monthlyCashFlow = i.subtenantRent - i.contractRent - i.monthlyCosts;
  const cashFlowDuringTerm = monthlyCashFlow * i.termMonths;
  const creditsEarned = i.rentCreditMonthly * i.termMonths;
  const amountDueAtExercise = Math.max(0, i.strikePrice - creditsEarned - (i.optionFeeCredited ? i.optionFee : 0));

  const equityAtExercise = i.expectedValueAtExercise - amountDueAtExercise;
  const resaleCosts = roundCents(i.expectedValueAtExercise * i.resaleCostRate);
  const profitIfResold = -cashAtStart + cashFlowDuringTerm + equityAtExercise - resaleCosts;

  let profitIfSubtenantBuys: Cents | null = null;
  if (i.subtenantRent > 0 && i.subtenantStrikePrice > 0) {
    // El inquilino-comprador paga su precio menos sus créditos y su prima (si se acreditan).
    const subCredits = i.subtenantRentCredit * i.termMonths;
    const receivedFromSubtenant = i.subtenantStrikePrice - subCredits - i.subtenantOptionFee;
    profitIfSubtenantBuys = -cashAtStart + cashFlowDuringTerm + receivedFromSubtenant - amountDueAtExercise;
  }

  return {
    cashAtStart,
    monthlyCashFlow,
    cashFlowDuringTerm,
    creditsEarned,
    amountDueAtExercise,
    exercised: { equityAtExercise, profitIfResold, profitIfSubtenantBuys },
    expired: {
      totalResult: -cashAtStart + cashFlowDuringTerm,
      lostOptionFee: i.optionFee,
      lostCredits: creditsEarned,
    },
    obligations: [
      "Pagar la renta contractual a tiempo: un incumplimiento puede anular la opción.",
      "Cumplir las obligaciones de mantenimiento que asigne el contrato.",
      "Registrar un memorándum de opción para proteger el derecho de compra.",
      "Confirmar que el contrato permite subarrendar (si haces sandwich).",
      "Verificar las reglas de tu estado: algunos tratan la renta con opción como contrato de venta a plazos (executory contract).",
    ],
  };
}
