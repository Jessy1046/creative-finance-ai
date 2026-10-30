import { roundCents, sum, type Cents, type Rate } from "../money";
import { amortize, balanceAt, principalPaidBetween, type LoanTerms, type Schedule } from "../finance/amortization";
import {
  breakEvenOccupancy,
  capRate,
  cashOnCash,
  debtYield,
  dscr,
  ltc,
  ltv,
  operatingStatement,
  paybackMonths,
  rentToCost,
  type OperatingInputs,
  type OperatingResult,
} from "../finance/metrics";
import { equityMultiple, irr, annualizeMonthly } from "../finance/cashflows";

/**
 * Motor genérico de estructuras de financiamiento.
 * Una "estructura" = precio + fuentes de deuda + efectivo inicial + supuestos operativos.
 * Subject-To, Seller Financing, Híbrido, préstamos bancarios, hard money y privados se modelan aquí
 * para que todos los simuladores y el comparador usen exactamente las mismas fórmulas.
 */

export type DebtKind =
  | "existente" // hipoteca del vendedor que sigue vigente (Subject-To)
  | "vendedor" // pagaré al vendedor (Seller Financing / Seller Carryback)
  | "banco" // convencional / DSCR
  | "hard_money"
  | "privado"
  | "socio"; // préstamo de un socio capitalista

export const DEBT_KIND_LABEL: Record<DebtKind, string> = {
  existente: "Hipoteca existente (Subject-To)",
  vendedor: "Pagaré al vendedor",
  banco: "Préstamo bancario",
  hard_money: "Hard Money",
  privado: "Prestamista privado",
  socio: "Préstamo de socio",
};

export interface DebtInput {
  id: string;
  label: string;
  kind: DebtKind;
  /** Prelación: 1 = primera posición. */
  position: number;
  terms: LoanTerms;
  /** La deuda queda a nombre del vendedor (Subject-To): riesgo de aceleración por due-on-sale. */
  inSellersName?: boolean;
  variableRate?: boolean;
}

export interface UpfrontCosts {
  downPayment: Cents;
  /** Efectivo entregado al vendedor aparte del enganche (Subject-To). */
  sellerCash: Cents;
  /** Pagos atrasados, multas y cargos para poner el préstamo al corriente. */
  arrears: Cents;
  closingCosts: Cents;
  /** Puntos y comisiones de originación. */
  financingCosts: Cents;
  repairs: Cents;
  /** Reserva de efectivo que el inversionista aparta (no es gasto, sí es capital comprometido). */
  reserves: Cents;
}

export const emptyUpfront = (): UpfrontCosts => ({
  downPayment: 0,
  sellerCash: 0,
  arrears: 0,
  closingCosts: 0,
  financingCosts: 0,
  repairs: 0,
  reserves: 0,
});

export interface StructureInput {
  name: string;
  purchasePrice: Cents;
  /** Valor actual "as-is". */
  currentValue: Cents;
  /** Valor después de reparaciones (ARV), si aplica. */
  arv?: Cents;
  operating: OperatingInputs;
  debts: DebtInput[];
  upfront: UpfrontCosts;
  /** Efectivo disponible del inversionista (para medir liquidez). */
  cashAvailable?: Cents;
  /** Socio capitalista: fracción del capital inicial que aporta un tercero. */
  partnerCapitalShare?: Rate;
}

export interface DebtResult {
  debt: DebtInput;
  schedule: Schedule;
  monthlyPayment: Cents;
  balloon: Cents;
  maturityMonth: number;
  totalInterest: Cents;
}

export interface StructureResult {
  input: StructureInput;
  operating: OperatingResult;
  debts: DebtResult[];
  /** Efectivo requerido al cierre (sin la reserva). */
  cashToClose: Cents;
  /** Inversión total = cierre + reparaciones + reserva. */
  totalCashRequired: Cents;
  cashBreakdown: { label: string; amount: Cents }[];
  totalDebt: Cents;
  debtServiceMonthly: Cents;
  cashFlowMonthly: Cents;
  cashFlowAnnual: Cents;
  equityNominal: Cents;
  equityAfterRepair: Cents | null;
  metrics: {
    cashOnCash: number | null;
    capRate: number | null;
    dscr: number | null;
    ltv: number | null;
    ltc: number | null;
    debtYield: number | null;
    breakEvenOccupancy: number | null;
    rentToCost: number | null;
    paybackMonths: number | null;
  };
  /** Mes del primer balloon (vencimiento con saldo pendiente), si existe. */
  firstBalloon: { month: number; amount: Cents; debtLabel: string } | null;
  reservesMonthsOfPayments: number | null;
  liquidityGap: Cents | null;
  warnings: string[];
}

export function evaluateStructure(input: StructureInput): StructureResult {
  const operating = operatingStatement(input.operating);
  const debts: DebtResult[] = input.debts.map((debt) => {
    const schedule = amortize(debt.terms);
    return {
      debt,
      schedule,
      monthlyPayment: schedule.initialPayment,
      balloon: schedule.balloon,
      maturityMonth: schedule.endMonth,
      totalInterest: schedule.totalInterest,
    };
  });

  const u = input.upfront;
  const cashBreakdown = [
    { label: "Enganche", amount: u.downPayment },
    { label: "Efectivo al vendedor", amount: u.sellerCash },
    { label: "Atrasos y cargos", amount: u.arrears },
    { label: "Costos de cierre", amount: u.closingCosts },
    { label: "Costos de financiamiento", amount: u.financingCosts },
    { label: "Reparaciones", amount: u.repairs },
    { label: "Reserva de efectivo", amount: u.reserves },
  ].filter((x) => x.amount !== 0);

  const cashToClose = u.downPayment + u.sellerCash + u.arrears + u.closingCosts + u.financingCosts;
  const totalCashRequired = cashToClose + u.repairs + u.reserves;
  const totalDebt = sum(input.debts.map((d) => d.terms.principal));
  const debtServiceMonthly = sum(debts.map((d) => d.monthlyPayment));
  const cashFlowMonthly = operating.noiMonthly - debtServiceMonthly;
  const cashFlowAnnual = cashFlowMonthly * 12;
  // El capital "trabajando" excluye la reserva (no se gasta), pero sí la incluye la liquidez requerida.
  const cashInvested = cashToClose + u.repairs;
  const projectCost = input.purchasePrice + u.repairs + u.closingCosts + u.financingCosts;

  const balloons = debts
    .filter((d) => d.balloon > 0)
    .sort((a, b) => a.maturityMonth - b.maturityMonth);
  const firstBalloon = balloons[0]
    ? { month: balloons[0].maturityMonth, amount: balloons[0].balloon, debtLabel: balloons[0].debt.label }
    : null;

  const fixedMonthlyObligations = debtServiceMonthly + operating.expenses.taxes + operating.expenses.insurance;
  const reservesMonthsOfPayments = fixedMonthlyObligations > 0 ? u.reserves / fixedMonthlyObligations : null;

  const warnings: string[] = [];
  if (cashFlowMonthly < 0) warnings.push("El flujo de efectivo mensual es negativo con estos supuestos.");
  if (firstBalloon && firstBalloon.month <= 60)
    warnings.push(`Pago balloon de ${firstBalloon.debtLabel} en el mes ${firstBalloon.month}.`);
  if (input.debts.some((d) => d.inSellersName))
    warnings.push("Hay deuda que sigue a nombre del vendedor: aplica el riesgo de cláusula due-on-sale.");
  if (input.debts.some((d) => d.variableRate)) warnings.push("Hay deuda con tasa variable.");
  for (const d of debts) {
    if (d.debt.terms.paymentOverride !== undefined) {
      const computed = amortize({ ...d.debt.terms, paymentOverride: undefined }).initialPayment;
      if (computed > 0 && Math.abs(computed - d.debt.terms.paymentOverride) / computed > 0.02)
        warnings.push(
          `${d.debt.label}: el pago indicado difiere más de 2 % del calculado con saldo, tasa y plazo. Verifica el estado de cuenta.`,
        );
    }
  }

  return {
    input,
    operating,
    debts,
    cashToClose,
    totalCashRequired,
    cashBreakdown,
    totalDebt,
    debtServiceMonthly,
    cashFlowMonthly,
    cashFlowAnnual,
    equityNominal: input.currentValue - totalDebt,
    equityAfterRepair: input.arv ? input.arv - totalDebt : null,
    metrics: {
      cashOnCash: cashOnCash(cashFlowAnnual, cashInvested),
      capRate: capRate(operating.noiAnnual, input.purchasePrice),
      dscr: dscr(operating.noiAnnual, debtServiceMonthly * 12),
      ltv: ltv(totalDebt, input.arv ?? input.currentValue),
      ltc: ltc(totalDebt, projectCost),
      debtYield: debtYield(operating.noiAnnual, totalDebt),
      breakEvenOccupancy: breakEvenOccupancy(
        operating.operatingExpensesMonthly,
        debtServiceMonthly,
        operating.grossScheduledMonthly,
      ),
      rentToCost: rentToCost(input.operating.monthlyRent, input.purchasePrice, u.repairs),
      paybackMonths: paybackMonths(cashInvested, cashFlowMonthly),
    },
    firstBalloon,
    reservesMonthsOfPayments,
    liquidityGap: input.cashAvailable === undefined ? null : input.cashAvailable - totalCashRequired,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Proyección de retorno total (5, 10, 15, 30 años)
// ---------------------------------------------------------------------------

export interface ProjectionAssumptions {
  rentGrowth: Rate;
  expenseGrowth: Rate;
  /** Apreciación hipotética anual. */
  appreciation: Rate;
  /** Costo de venta como fracción del valor (comisiones + cierre). */
  sellingCostRate: Rate;
  /** Beneficio fiscal estimado: tasa marginal × depreciación. 0 = no incluido. */
  marginalTaxRate: Rate;
  /** Fracción del valor atribuible a la construcción (depreciable a 27.5 años). */
  buildingShare: Rate;
}

export const DEFAULT_PROJECTION: ProjectionAssumptions = {
  rentGrowth: 0.025,
  expenseGrowth: 0.03,
  appreciation: 0.03,
  sellingCostRate: 0.07,
  marginalTaxRate: 0,
  buildingShare: 0.8,
};

export interface HorizonResult {
  years: number;
  /** Flujo de efectivo operativo acumulado (sin amortización). */
  cumulativeCashFlow: Cents;
  /** Capital amortizado de todas las deudas. */
  principalPaydown: Cents;
  /** Apreciación hipotética del valor. */
  appreciation: Cents;
  /** Beneficios fiscales estimados (0 si no se configuró tasa marginal). */
  taxBenefits: Cents;
  total: Cents;
  /** Ganancia neta si se vendiera al final del horizonte (con costos de venta y saldos pagados). */
  saleProceeds: Cents;
  irr: number | null;
  irrWarning: string | null;
  equityMultiple: number | null;
  /** Balloons que vencen dentro del horizonte; la proyección asume que se refinancian al mismo costo (supuesto visible). */
  balloonsInside: number;
}

/**
 * Separa retorno operativo, amortización de principal, apreciación y beneficios fiscales.
 * No mezcla flujo de efectivo con amortización y no cuenta refinanciamientos como ganancia.
 */
export function projectReturns(
  result: StructureResult,
  a: ProjectionAssumptions = DEFAULT_PROJECTION,
  horizons: number[] = [5, 10, 15, 30],
): HorizonResult[] {
  const invested = result.cashToClose + result.input.upfront.repairs;
  const baseValue = result.input.arv ?? result.input.currentValue;
  const op = result.operating;
  const depreciationAnnual = roundCents((result.input.purchasePrice * a.buildingShare) / 27.5);
  // Supuesto explícito: un balloon dentro del horizonte se refinancia al mismo costo y plazo de amortización
  // (la deuda sigue amortizándose). No se cuenta como ganancia ni como flujo.
  const maxMonths = Math.max(...horizons) * 12;
  const projected = result.debts.map((d) => {
    const terms = d.debt.terms.interestOnly
      ? { ...d.debt.terms, termMonths: maxMonths, amortizationMonths: maxMonths }
      : { ...d.debt.terms, termMonths: undefined };
    return { principal: d.debt.terms.principal, maturityMonth: d.maturityMonth, balloon: d.balloon, schedule: amortize(terms) };
  });

  return horizons.map((years) => {
    const yearlyFlows: number[] = [-invested];
    let cumulativeCashFlow = 0;
    for (let y = 1; y <= years; y++) {
      const egi = op.effectiveGrossMonthly * 12 * Math.pow(1 + a.rentGrowth, y - 1);
      const opex = op.operatingExpensesMonthly * 12 * Math.pow(1 + a.expenseGrowth, y - 1);
      const debtService = sum(
        projected.map((d) =>
          d.schedule.rows.filter((r) => r.month > (y - 1) * 12 && r.month <= y * 12).reduce((s, r) => s + r.payment, 0),
        ),
      );
      const cf = roundCents(egi - opex - debtService);
      cumulativeCashFlow += cf;
      yearlyFlows.push(cf);
    }
    const months = years * 12;
    const principalPaydown = sum(projected.map((d) => principalPaidBetween(d.schedule, 0, months)));
    const remainingDebt = sum(projected.map((d) => balanceAt(d.schedule, d.principal, months)));
    const futureValue = roundCents(baseValue * Math.pow(1 + a.appreciation, years));
    const appreciation = futureValue - baseValue;
    const taxBenefits = roundCents(depreciationAnnual * Math.min(years, 27.5) * a.marginalTaxRate);
    const saleProceeds = roundCents(futureValue * (1 - a.sellingCostRate)) - remainingDebt;
    yearlyFlows[yearlyFlows.length - 1] = (yearlyFlows[yearlyFlows.length - 1] ?? 0) + saleProceeds;
    const irrRes = irr(yearlyFlows);
    const distributions = yearlyFlows.slice(1).reduce((s, v) => s + v, 0);
    return {
      years,
      cumulativeCashFlow,
      principalPaydown,
      appreciation,
      taxBenefits,
      total: cumulativeCashFlow + principalPaydown + appreciation + taxBenefits,
      saleProceeds,
      irr: irrRes.rate,
      irrWarning: irrRes.warning,
      equityMultiple: equityMultiple(distributions, invested),
      balloonsInside: projected.filter((d) => d.balloon > 0 && d.maturityMonth <= months).length,
    };
  });
}

/** TIR mensual anualizada de una serie mensual (utilidad para simuladores). */
export function monthlyIrrAnnualized(flows: number[]): number | null {
  const r = irr(flows).rate;
  return r === null ? null : annualizeMonthly(r);
}
