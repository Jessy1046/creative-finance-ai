import { roundCents, type Cents, type Rate } from "../money";

/**
 * Pago mensual de capital + interés (P&I) de un préstamo totalmente amortizable.
 * Fórmula estándar: P · r / (1 − (1 + r)^−n), con r = tasa anual / 12.
 * Con tasa 0 %, el pago es P / n.
 */
export function monthlyPayment(principal: Cents, annualRate: Rate, months: number): Cents {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return roundCents(principal / months);
  return roundCents((principal * r) / (1 - Math.pow(1 + r, -months)));
}

export interface RateChange {
  /** Mes (1-indexado) a partir del cual aplica la nueva tasa. */
  startMonth: number;
  annualRate: Rate;
}

export interface LoanTerms {
  principal: Cents;
  annualRate: Rate;
  /** Meses de amortización (p. ej. 360 = 30 años). */
  amortizationMonths: number;
  /** Vencimiento (balloon). Si se omite, coincide con la amortización. */
  termMonths?: number;
  /** Solo intereses durante todo el plazo (típico en hard money / private money). */
  interestOnly?: boolean;
  /** Cambios de tasa (préstamos variables). El pago se recalcula sobre los meses restantes. */
  rateChanges?: RateChange[];
  /** Abonos extra a capital: un monto fijo cada mes o un mapa mes → monto. */
  extraPrincipal?: Cents | Readonly<Record<number, Cents>>;
  /** Pago P&I real (p. ej. del estado de cuenta). Si se indica, se usa en lugar del calculado. */
  paymentOverride?: Cents;
}

export interface AmortizationRow {
  month: number;
  annualRate: Rate;
  payment: Cents;
  interest: Cents;
  principal: Cents;
  extra: Cents;
  balance: Cents;
}

export interface Schedule {
  rows: AmortizationRow[];
  /** Pago P&I del primer mes. */
  initialPayment: Cents;
  totalInterest: Cents;
  totalPrincipal: Cents;
  /** Saldo que vence en `termMonths` (pago balloon). 0 si se liquida antes. */
  balloon: Cents;
  /** Mes en que vence el préstamo (o en que se liquida, si es antes). */
  endMonth: number;
  /** Mes en que el saldo llegó a 0 por pagos/abonos; null si queda saldo. */
  paidOffMonth: number | null;
}

function extraFor(extra: LoanTerms["extraPrincipal"], month: number): Cents {
  if (extra === undefined) return 0;
  if (typeof extra === "number") return extra;
  return extra[month] ?? 0;
}

function rateAt(terms: LoanTerms, month: number): Rate {
  let rate = terms.annualRate;
  for (const change of [...(terms.rateChanges ?? [])].sort((a, b) => a.startMonth - b.startMonth)) {
    if (month >= change.startMonth) rate = change.annualRate;
  }
  return rate;
}

/**
 * Tabla de amortización mes a mes.
 * Convenciones de redondeo: el interés del mes se redondea a centavos; el capital es
 * pago − interés; en el último mes el pago se ajusta para liquidar el saldo exacto.
 */
export function amortize(terms: LoanTerms): Schedule {
  const term = Math.max(0, Math.round(terms.termMonths ?? terms.amortizationMonths));
  const amort = Math.max(0, Math.round(terms.amortizationMonths));
  const rows: AmortizationRow[] = [];
  let balance = Math.max(0, terms.principal);
  let currentRate = terms.annualRate;
  let payment = terms.interestOnly
    ? 0
    : terms.paymentOverride ?? monthlyPayment(balance, currentRate, amort);
  let totalInterest = 0;
  let totalPrincipal = 0;
  let paidOffMonth: number | null = balance === 0 ? 0 : null;

  for (let month = 1; month <= term && balance > 0; month++) {
    const rate = rateAt(terms, month);
    if (rate !== currentRate && !terms.interestOnly) {
      // Recalcular el pago sobre los meses restantes de amortización (ARM).
      payment = monthlyPayment(balance, rate, Math.max(1, amort - month + 1));
    }
    currentRate = rate;
    const interest = roundCents((balance * rate) / 12);
    let scheduledPrincipal = terms.interestOnly ? 0 : payment - interest;
    if (scheduledPrincipal < 0) scheduledPrincipal = 0; // amortización negativa no soportada: se paga al menos el interés
    let principal = Math.min(balance, scheduledPrincipal);
    if (!terms.interestOnly && month === amort) principal = balance; // último pago liquida el saldo
    const extra = Math.min(balance - principal, Math.max(0, extraFor(terms.extraPrincipal, month)));
    balance = balance - principal - extra;
    totalInterest += interest;
    totalPrincipal += principal + extra;
    rows.push({ month, annualRate: rate, payment: interest + principal, interest, principal, extra, balance });
    if (balance === 0) paidOffMonth = month;
  }

  const endMonth = rows.length === 0 ? 0 : rows[rows.length - 1]!.month;
  return {
    rows,
    initialPayment: rows[0]?.payment ?? 0,
    totalInterest,
    totalPrincipal,
    balloon: balance,
    endMonth,
    paidOffMonth,
  };
}

/** Saldo después de `month` pagos. */
export function balanceAfter(terms: LoanTerms, month: number): Cents {
  if (month <= 0) return terms.principal;
  const schedule = amortize({ ...terms, termMonths: Math.min(month, terms.termMonths ?? terms.amortizationMonths) });
  return schedule.balloon;
}

/** Capital amortizado entre dos meses (exclusivo/inclusivo): (from, to]. */
export function principalPaidBetween(schedule: Schedule, fromMonth: number, toMonth: number): Cents {
  return schedule.rows
    .filter((r) => r.month > fromMonth && r.month <= toMonth)
    .reduce((acc, r) => acc + r.principal + r.extra, 0);
}

/** Saldo al final de un mes según una tabla ya calculada. */
export function balanceAt(schedule: Schedule, principal: Cents, month: number): Cents {
  if (month <= 0) return principal;
  const row = schedule.rows.find((r) => r.month === month);
  if (row) return row.balance;
  const last = schedule.rows[schedule.rows.length - 1];
  return last && month > last.month ? last.balance : principal;
}
