import { ratio, roundCents, type Cents, type Rate } from "../money";

/**
 * Métricas de inversión inmobiliaria. Todas son funciones puras:
 * los montos llegan en centavos y los resultados porcentuales como fracción (0.08 = 8 %).
 * Devuelven null cuando la métrica no está definida (p. ej. denominador 0).
 */

export interface OperatingInputs {
  /** Renta mensual total programada (todas las unidades). */
  monthlyRent: Cents;
  otherMonthlyIncome?: Cents;
  vacancyRate: Rate;
  taxesMonthly: Cents;
  insuranceMonthly: Cents;
  hoaMonthly?: Cents;
  utilitiesMonthly?: Cents;
  /** Porcentajes sobre la renta programada. */
  maintenanceRate?: Rate;
  capexRate?: Rate;
  managementRate?: Rate;
}

export interface OperatingResult {
  grossScheduledMonthly: Cents;
  vacancyLossMonthly: Cents;
  effectiveGrossMonthly: Cents;
  expenses: {
    taxes: Cents;
    insurance: Cents;
    hoa: Cents;
    utilities: Cents;
    maintenance: Cents;
    capex: Cents;
    management: Cents;
  };
  operatingExpensesMonthly: Cents;
  noiMonthly: Cents;
  noiAnnual: Cents;
}

/** Ingreso bruto, ingreso efectivo, gastos operativos y NOI (sin deuda). */
export function operatingStatement(op: OperatingInputs): OperatingResult {
  const grossScheduledMonthly = op.monthlyRent + (op.otherMonthlyIncome ?? 0);
  const vacancyLossMonthly = roundCents(grossScheduledMonthly * op.vacancyRate);
  const effectiveGrossMonthly = grossScheduledMonthly - vacancyLossMonthly;
  // La administración se cobra sobre la renta efectivamente cobrada.
  const expenses = {
    taxes: op.taxesMonthly,
    insurance: op.insuranceMonthly,
    hoa: op.hoaMonthly ?? 0,
    utilities: op.utilitiesMonthly ?? 0,
    maintenance: roundCents(op.monthlyRent * (op.maintenanceRate ?? 0)),
    capex: roundCents(op.monthlyRent * (op.capexRate ?? 0)),
    management: roundCents(effectiveGrossMonthly * (op.managementRate ?? 0)),
  };
  const operatingExpensesMonthly = Object.values(expenses).reduce((a, b) => a + b, 0);
  const noiMonthly = effectiveGrossMonthly - operatingExpensesMonthly;
  return {
    grossScheduledMonthly,
    vacancyLossMonthly,
    effectiveGrossMonthly,
    expenses,
    operatingExpensesMonthly,
    noiMonthly,
    noiAnnual: noiMonthly * 12,
  };
}

/** Cap Rate = NOI anual / valor (o precio). */
export const capRate = (noiAnnual: Cents, value: Cents) => ratio(noiAnnual, value);

/** Cash-on-Cash = flujo de caja anual antes de impuestos / efectivo invertido. */
export const cashOnCash = (annualCashFlow: Cents, cashInvested: Cents) =>
  cashInvested > 0 ? ratio(annualCashFlow, cashInvested) : null;

/** ROI simple = ganancia total / capital invertido. */
export const roi = (totalGain: Cents, cashInvested: Cents) => (cashInvested > 0 ? ratio(totalGain, cashInvested) : null);

/** DSCR = NOI / servicio de deuda anual. Sin deuda → null (no aplica). */
export const dscr = (noiAnnual: Cents, annualDebtService: Cents) =>
  annualDebtService > 0 ? ratio(noiAnnual, annualDebtService) : null;

/** LTV = deuda total / valor. */
export const ltv = (totalDebt: Cents, value: Cents) => ratio(totalDebt, value);

/** LTC = deuda total / costo total del proyecto (precio + reparaciones + cierre). */
export const ltc = (totalDebt: Cents, totalCost: Cents) => ratio(totalDebt, totalCost);

/** Debt Yield = NOI / deuda total. */
export const debtYield = (noiAnnual: Cents, totalDebt: Cents) => (totalDebt > 0 ? ratio(noiAnnual, totalDebt) : null);

/** Ocupación de equilibrio = (gastos operativos + servicio de deuda) / ingreso bruto programado. */
export const breakEvenOccupancy = (opexMonthly: Cents, debtServiceMonthly: Cents, grossScheduledMonthly: Cents) =>
  ratio(opexMonthly + debtServiceMonthly, grossScheduledMonthly);

/** Rent-to-Cost = renta mensual / (precio + reparaciones). */
export const rentToCost = (monthlyRent: Cents, price: Cents, repairs: Cents) => ratio(monthlyRent, price + repairs);

/** Meses para recuperar el efectivo invertido con el flujo mensual actual. */
export function paybackMonths(cashInvested: Cents, monthlyCashFlow: Cents): number | null {
  if (cashInvested <= 0) return 0;
  if (monthlyCashFlow <= 0) return null;
  return Math.ceil(cashInvested / monthlyCashFlow);
}

export interface RuleOneAndHalfResult {
  /** Renta / (precio + reparaciones). */
  ratio: number | null;
  target: Rate;
  meets: boolean;
  /** Renta mensual necesaria para llegar a la meta. */
  requiredRent: Cents;
  /** Precio máximo compatible con la renta actual (ya restadas las reparaciones). */
  maxPrice: Cents;
  /** Diferencia de renta respecto a la meta (positivo = sobra). */
  rentGap: Cents;
}

/**
 * Regla del 1.5 %: renta mensual / (precio + reparaciones) × 100.
 * Filtro educativo rápido; nunca una aprobación de compra.
 */
export function ruleOneAndHalf(monthlyRent: Cents, price: Cents, repairs: Cents, target: Rate = 0.015): RuleOneAndHalfResult {
  const cost = price + repairs;
  const r = ratio(monthlyRent, cost);
  const requiredRent = roundCents(cost * target);
  return {
    ratio: r,
    target,
    meets: r !== null && r >= target,
    requiredRent,
    maxPrice: Math.max(0, roundCents(monthlyRent / target) - repairs),
    rentGap: monthlyRent - requiredRent,
  };
}

export interface FlipInputs {
  arv: Cents;
  purchasePrice: Cents;
  repairs: Cents;
  /** Porcentaje del ARV de la regla (configurable; 0.5 por defecto, 0.7 es la variante común). */
  rulePercent?: Rate;
  purchaseClosingCosts: Cents;
  /** Costos de financiamiento: puntos + intereses durante la tenencia. */
  financingCosts: Cents;
  /** Gastos mensuales de tenencia (impuestos, seguro, servicios). */
  holdingMonthly: Cents;
  holdingMonths: number;
  marketingCosts: Cents;
  /** Costo de venta como fracción del ARV (comisiones + cierre). */
  sellingCostRate: Rate;
}

export interface FlipResult {
  rulePercent: Rate;
  /** ARV × % − reparaciones. Qué incluye: solo reparaciones; el resto se analiza abajo. */
  maxAllowableOffer: Cents;
  meetsRule: boolean;
  holdingCosts: Cents;
  sellingCosts: Cents;
  totalCosts: Cents;
  netProfit: Cents;
  /** Ganancia neta / costo total. */
  returnOnCost: number | null;
}

/** Regla del 50 % (o el % configurado) + análisis completo de beneficio neto del Fix and Flip. */
export function flipAnalysis(i: FlipInputs): FlipResult {
  const rulePercent = i.rulePercent ?? 0.5;
  const maxAllowableOffer = roundCents(i.arv * rulePercent) - i.repairs;
  const holdingCosts = i.holdingMonthly * i.holdingMonths;
  const sellingCosts = roundCents(i.arv * i.sellingCostRate);
  const totalCosts =
    i.purchasePrice + i.repairs + i.purchaseClosingCosts + i.financingCosts + holdingCosts + i.marketingCosts + sellingCosts;
  const netProfit = i.arv - totalCosts;
  return {
    rulePercent,
    maxAllowableOffer,
    meetsRule: i.purchasePrice <= maxAllowableOffer,
    holdingCosts,
    sellingCosts,
    totalCosts,
    netProfit,
    returnOnCost: ratio(netProfit, totalCosts),
  };
}
