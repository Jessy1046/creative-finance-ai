import { sum, type Cents, type Rate } from "../money";
import { amortize, balanceAt, type LoanTerms } from "../finance/amortization";

/**
 * Wraparound Mortgage desde la perspectiva del titular del wrap (el inversionista que vende).
 * - Deuda subyacente: lo que el titular sigue pagando (puede estar a nombre de un tercero).
 * - Pagaré wrap: lo que el comprador paga al titular.
 * Son obligaciones distintas y relacionadas: el flujo del titular = pago wrap − pagos subyacentes.
 * Impuestos y seguro se manejan en escrow y se trasladan al comprador: no se cuentan como ingreso ni gasto.
 */
export interface WrapInputs {
  salePrice: Cents;
  buyerDownPayment: Cents;
  wrapRate: Rate;
  wrapAmortizationMonths: number;
  /** Vencimiento del wrap (balloon del comprador). */
  wrapTermMonths?: number;
  underlying: LoanTerms[];
  /** Costos del titular al cerrar la venta (título, abogado, originador con licencia). */
  sellerClosingCosts: Cents;
  /** Comisión mensual del servicer. */
  servicingFeeMonthly: Cents;
  /** Lo que el titular invirtió para controlar la propiedad (base para retornos). */
  holderCashInvested: Cents;
}

export interface WrapResult {
  wrapPrincipal: Cents;
  buyerPayment: Cents;
  underlyingPayments: Cents;
  servicingFee: Cents;
  monthlySpread: Cents;
  /** Margen de tasa entre wrap y subyacente ponderada. */
  rateSpread: number;
  weightedUnderlyingRate: number;
  /** Resultado si el comprador refinancia o paga el wrap al final del mes k. */
  payoffAt: (month: number) => { spreadToDate: Cents; wrapBalance: Cents; underlyingBalance: Cents; netAtPayoff: Cents; totalProfit: Cents };
  /** Riesgo: si el comprador deja de pagar, el titular sigue debiendo esto cada mes. */
  exposureIfBuyerDefaults: Cents;
  /** Mes en que vence un subyacente antes que el wrap (descalce de vencimientos). */
  maturityMismatch: boolean;
  alerts: string[];
}

export function wrapAnalysis(i: WrapInputs): WrapResult {
  const wrapPrincipal = Math.max(0, i.salePrice - i.buyerDownPayment);
  const wrapTerms: LoanTerms = {
    principal: wrapPrincipal,
    annualRate: i.wrapRate,
    amortizationMonths: i.wrapAmortizationMonths,
    termMonths: i.wrapTermMonths,
  };
  const wrapSchedule = amortize(wrapTerms);
  const underSchedules = i.underlying.map((t) => ({ terms: t, schedule: amortize(t) }));
  const underlyingPayments = sum(underSchedules.map((u) => u.schedule.initialPayment));
  const buyerPayment = wrapSchedule.initialPayment;
  const monthlySpread = buyerPayment - underlyingPayments - i.servicingFeeMonthly;
  const underTotal = sum(i.underlying.map((t) => t.principal));
  const weightedUnderlyingRate =
    underTotal > 0 ? i.underlying.reduce((s, t) => s + t.annualRate * t.principal, 0) / underTotal : 0;

  const payoffAt = (month: number) => {
    let spreadToDate = 0;
    for (let m = 1; m <= month; m++) {
      const wrapPay = wrapSchedule.rows.find((r) => r.month === m)?.payment ?? 0;
      const underPay = sum(underSchedules.map((u) => u.schedule.rows.find((r) => r.month === m)?.payment ?? 0));
      spreadToDate += wrapPay - underPay - i.servicingFeeMonthly;
    }
    const wrapBalance = balanceAt(wrapSchedule, wrapPrincipal, month);
    const underlyingBalance = sum(underSchedules.map((u) => balanceAt(u.schedule, u.terms.principal, month)));
    const netAtPayoff = wrapBalance - underlyingBalance;
    const totalProfit = i.buyerDownPayment - i.sellerClosingCosts - i.holderCashInvested + spreadToDate + netAtPayoff;
    return { spreadToDate, wrapBalance, underlyingBalance, netAtPayoff, totalProfit };
  };

  const wrapMaturity = wrapSchedule.endMonth;
  const maturityMismatch = underSchedules.some((u) => u.schedule.balloon > 0 && u.schedule.endMonth < wrapMaturity);

  const alerts = [
    "Si el comprador vivirá en la casa, el financiamiento puede estar sujeto a Regulation Z (TILA), Dodd-Frank y al SAFE Act: verifica si necesitas un originador con licencia (RMLO).",
    "Usa un servicer independiente que cobre al comprador y pague primero la deuda subyacente; ambas partes deben poder verificar cada pago.",
    "La deuda subyacente puede tener cláusula due-on-sale: si el prestamista acelera, el titular debe pagar el saldo completo.",
  ];
  if (monthlySpread <= 0) alerts.unshift("El pago del comprador no cubre los pagos subyacentes: el wrap tiene flujo negativo.");
  if (maturityMismatch) alerts.unshift("Una deuda subyacente vence antes que el wrap: necesitarás refinanciarla o pagarla.");
  if (i.wrapRate - weightedUnderlyingRate < 0.01)
    alerts.push("El margen de tasa es menor a 1 punto: hay poco colchón para costos e impagos.");

  return {
    wrapPrincipal,
    buyerPayment,
    underlyingPayments,
    servicingFee: i.servicingFeeMonthly,
    monthlySpread,
    rateSpread: i.wrapRate - weightedUnderlyingRate,
    weightedUnderlyingRate,
    payoffAt,
    exposureIfBuyerDefaults: underlyingPayments + i.servicingFeeMonthly,
    maturityMismatch,
    alerts,
  };
}
