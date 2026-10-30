import { roundCents, sum, type Cents, type Rate } from "../money";
import { operatingFrom, resolve, type NumberKey, type PropertyRecord } from "../property/model";
import { assessRisk, type RiskReport } from "../risk/engine";
import { hybrid, lenderLoan, sellerFinance, subjectTo } from "./builders";
import { leaseOptionAnalysis } from "./leaseOption";
import { emptyUpfront, evaluateStructure, type StructureInput, type StructureResult } from "./structure";

/**
 * Comparador multiobjetivo de estrategias.
 * No elige por el mayor ROI: pondera liquidez, rentabilidad, riesgo, complejidad,
 * capacidad operativa y posibilidad de salida, y clasifica cada escenario.
 * Las tasas y términos son SUPUESTOS editables, no cotizaciones.
 */

export interface MarketAssumptions {
  conventional: { downPct: Rate; rate: Rate; amortMonths: number; points: Rate };
  dscrLoan: { downPct: Rate; rate: Rate; amortMonths: number; points: Rate };
  hardMoney: { loanToPrice: Rate; repairsFinanced: Rate; rate: Rate; points: Rate; termMonths: number };
  privateLender: { loanToPrice: Rate; rate: Rate; points: Rate; termMonths: number };
  sellerFinance: { downPct: Rate; rate: Rate; amortMonths: number; termMonths: number };
  hybridNote: { sellerCashPct: Rate; rate: Rate; amortMonths: number; termMonths: number };
  partner: { partnerCapitalShare: Rate; investorProfitShare: Rate };
  leaseOption: { optionFeePct: Rate; rentToOwnerPct: Rate; rentCreditPct: Rate; termMonths: number; strikePremium: Rate };
  reservesMonths: number;
}

export const DEFAULT_MARKET: MarketAssumptions = {
  conventional: { downPct: 0.25, rate: 0.0725, amortMonths: 360, points: 0.01 },
  dscrLoan: { downPct: 0.25, rate: 0.0775, amortMonths: 360, points: 0.02 },
  hardMoney: { loanToPrice: 0.9, repairsFinanced: 1, rate: 0.12, points: 0.025, termMonths: 12 },
  privateLender: { loanToPrice: 0.8, rate: 0.1, points: 0.02, termMonths: 36 },
  sellerFinance: { downPct: 0.1, rate: 0.06, amortMonths: 360, termMonths: 60 },
  hybridNote: { sellerCashPct: 0.03, rate: 0, amortMonths: 120, termMonths: 120 },
  partner: { partnerCapitalShare: 1, investorProfitShare: 0.5 },
  leaseOption: { optionFeePct: 0.03, rentToOwnerPct: 0.9, rentCreditPct: 0.1, termMonths: 36, strikePremium: 0.05 },
  reservesMonths: 6,
};

export type Goal = "flujo" | "preservar" | "crecimiento" | "poco_capital";

export const GOAL_LABEL: Record<Goal, string> = {
  flujo: "Flujo de efectivo",
  preservar: "Preservar capital",
  crecimiento: "Crecimiento / equity",
  poco_capital: "Entrar con poco capital",
};

export type Dimension = "liquidez" | "rentabilidad" | "riesgo" | "complejidad" | "salida";

export const DIMENSION_LABEL: Record<Dimension, string> = {
  liquidez: "Liquidez",
  rentabilidad: "Rentabilidad",
  riesgo: "Riesgo (inverso)",
  complejidad: "Simplicidad / capacidad operativa",
  salida: "Posibilidad de salida",
};

export const GOAL_WEIGHTS: Record<Goal, Record<Dimension, number>> = {
  flujo: { liquidez: 0.2, rentabilidad: 0.3, riesgo: 0.25, complejidad: 0.1, salida: 0.15 },
  preservar: { liquidez: 0.25, rentabilidad: 0.1, riesgo: 0.4, complejidad: 0.1, salida: 0.15 },
  crecimiento: { liquidez: 0.15, rentabilidad: 0.35, riesgo: 0.2, complejidad: 0.1, salida: 0.2 },
  poco_capital: { liquidez: 0.4, rentabilidad: 0.2, riesgo: 0.2, complejidad: 0.1, salida: 0.1 },
};

export type Experience = "principiante" | "intermedio" | "avanzado";

export type StrategyId =
  | "cash"
  | "hard_money"
  | "convencional"
  | "dscr"
  | "seller_finance"
  | "subject_to"
  | "hibrido"
  | "socio"
  | "privado"
  | "lease_option";

export type Status =
  | "Favorable bajo supuestos"
  | "Requiere negociación"
  | "Alto riesgo"
  | "Información insuficiente"
  | "No viable bajo las condiciones planteadas";

interface StrategyMeta {
  id: StrategyId;
  name: string;
  /** 0–100: qué tan simple es ejecutarla (más alto = más simple). */
  simplicity: number;
  /** 0–100: flexibilidad de términos. */
  flexibility: number;
  /** 0–100: facilidad base de salida. */
  exitBase: number;
  risks: string[];
  legal: string[];
  requires: NumberKey[];
}

const META: Record<StrategyId, StrategyMeta> = {
  cash: { id: "cash", name: "Compra cash", simplicity: 95, flexibility: 40, exitBase: 90, risks: ["Concentración de capital en un solo activo", "Costo de oportunidad"], legal: ["Título y cierre estándar"], requires: [] },
  hard_money: { id: "hard_money", name: "Hard Money", simplicity: 60, flexibility: 50, exitBase: 55, risks: ["Interés alto y plazo corto", "Necesita refinanciar o vender a tiempo"], legal: ["Garantía personal frecuente"], requires: ["repairs"] },
  convencional: { id: "convencional", name: "Préstamo convencional", simplicity: 85, flexibility: 20, exitBase: 85, risks: ["Requiere calificar por ingresos y crédito", "Límite de préstamos financiados"], legal: ["Requisitos de suscripción del prestamista"], requires: [] },
  dscr: { id: "dscr", name: "Préstamo DSCR", simplicity: 80, flexibility: 30, exitBase: 80, risks: ["El prestamista exige DSCR mínimo", "Penalidad por pago anticipado común"], legal: ["Solo para inversión (no ocupante)"], requires: [] },
  seller_finance: { id: "seller_finance", name: "Seller Financing", simplicity: 70, flexibility: 90, exitBase: 65, risks: ["Balloon al vencimiento", "Depende de la disposición del vendedor"], legal: ["Reglas estatales de seller financing", "Si hay hipoteca subyacente: due-on-sale"], requires: ["currentValue"] },
  subject_to: { id: "subject_to", name: "Subject-To", simplicity: 45, flexibility: 70, exitBase: 60, risks: ["Due-on-sale: aceleración posible", "El crédito del vendedor depende de tus pagos", "Seguro y titularidad mal configurados"], legal: ["Garn–St Germain / cláusula due-on-sale", "Disclosures firmados al vendedor", "Reglas estatales sobre compras a propietarios en ejecución"], requires: ["existingBalance", "existingRate", "existingRemainingMonths", "currentValue"] },
  hibrido: { id: "hibrido", name: "Subject-To híbrido", simplicity: 35, flexibility: 80, exitBase: 55, risks: ["Varias obligaciones simultáneas", "Riesgo de prelación entre deudas", "Due-on-sale sobre la primera hipoteca"], legal: ["Due-on-sale", "Registro del pagaré en segunda posición", "Reglas estatales"], requires: ["existingBalance", "existingRate", "existingRemainingMonths", "currentValue"] },
  socio: { id: "socio", name: "Socio capitalista", simplicity: 55, flexibility: 60, exitBase: 65, risks: ["Reparto de utilidades y control", "Conflictos si no hay acuerdo escrito"], legal: ["Posible oferta de valores (securities)", "Operating agreement"], requires: [] },
  privado: { id: "privado", name: "Prestamista privado", simplicity: 60, flexibility: 70, exitBase: 60, risks: ["Balloon al vencimiento", "Relación personal con el prestamista"], legal: ["Pagaré y garantía registrados", "Usura: límites estatales de interés"], requires: [] },
  lease_option: { id: "lease_option", name: "Lease Option", simplicity: 65, flexibility: 75, exitBase: 50, risks: ["Pierdes la prima si no ejerces", "No controlas el título durante el plazo"], legal: ["Algunos estados lo tratan como contrato a plazos", "Memorándum de opción registrado"], requires: [] },
};

export interface StrategyComparison {
  id: StrategyId;
  name: string;
  status: Status;
  statusReasons: string[];
  structure: StructureResult | null;
  /** Para lease option (no tiene StructureResult). */
  custom?: { capitalRequired: Cents; monthlyPayment: Cents; cashFlowMonthly: Cents; note: string };
  capitalRequired: Cents | null;
  monthlyPayment: Cents | null;
  cashFlowMonthly: Cents | null;
  /** Capital propio expuesto (incluye garantías de deuda a corto plazo). */
  capitalExposed: Cents | null;
  cashOnCash: number | null;
  /** Interés + puntos pagados en 5 años. */
  financingCost5y: Cents | null;
  maturities: string;
  risks: string[];
  legal: string[];
  flexibility: number;
  goalFit: number | null;
  pending: NumberKey[];
  scores: Record<Dimension, number> | null;
  total: number | null;
  risk: RiskReport | null;
}

const clamp = (x: number) => Math.max(0, Math.min(100, x));

function liquidityScore(required: Cents, cashAvailable: number | null, price: number): number {
  if (cashAvailable !== null && cashAvailable > 0) {
    const r = required / cashAvailable;
    return clamp(100 - Math.max(0, r - 0.5) * 100);
  }
  // Sin efectivo disponible: relativo al precio.
  return clamp(100 - (required / Math.max(1, price)) * 250);
}

function profitabilityScore(coc: number | null, cf: number): number {
  if (coc === null) return cf > 0 ? 80 : 10;
  return clamp((coc / 0.2) * 100);
}

export function compareStrategies(
  record: PropertyRecord,
  market: MarketAssumptions = DEFAULT_MARKET,
  goal: Goal = "flujo",
  experience: Experience = "principiante",
  weightsOverride?: Record<Dimension, number>,
): StrategyComparison[] {
  const { values: v } = resolve(record);
  const op = operatingFrom(v);
  const price = v.negotiatedPrice;
  const value = v.currentValue ?? price ?? 0;
  const repairs = v.repairs ?? 0;
  const closing = v.closingCosts ?? 0;
  const cashAvailable = v.cashAvailable;
  const weights = weightsOverride ?? GOAL_WEIGHTS[goal];
  const experiencePenalty = experience === "principiante" ? 1.3 : experience === "intermedio" ? 1 : 0.7;

  const reserves = (debtService: Cents) =>
    roundCents((debtService + op.taxesMonthly + op.insuranceMonthly) * market.reservesMonths);

  const baseMissing: NumberKey[] = (["negotiatedPrice", "projectedRent", "taxesAnnual", "insuranceAnnual"] as NumberKey[]).filter(
    (k) => v[k] === null,
  );

  const build = (id: StrategyId): StructureInput | null => {
    if (price === null) return null;
    const common = { currentValue: value, arv: v.arv ?? undefined, operating: op, cashAvailable: cashAvailable ?? undefined };
    switch (id) {
      case "cash":
        return { name: "Compra cash", purchasePrice: price, ...common, debts: [], upfront: { ...emptyUpfront(), downPayment: price, closingCosts: closing, repairs } };
      case "convencional":
        return lenderLoan({ ...common, price, loanToPrice: 1 - market.conventional.downPct, annualRate: market.conventional.rate, amortizationMonths: market.conventional.amortMonths, points: market.conventional.points, closingCosts: closing, repairs, reserves: 0, kind: "banco", label: "Préstamo convencional" });
      case "dscr":
        return lenderLoan({ ...common, price, loanToPrice: 1 - market.dscrLoan.downPct, annualRate: market.dscrLoan.rate, amortizationMonths: market.dscrLoan.amortMonths, points: market.dscrLoan.points, closingCosts: closing, repairs, reserves: 0, kind: "banco", label: "Préstamo DSCR" });
      case "hard_money":
        return lenderLoan({ ...common, price, loanToPrice: market.hardMoney.loanToPrice, repairsFinanced: market.hardMoney.repairsFinanced, annualRate: market.hardMoney.rate, amortizationMonths: market.hardMoney.termMonths, termMonths: market.hardMoney.termMonths, interestOnly: true, points: market.hardMoney.points, closingCosts: closing, repairs, reserves: 0, kind: "hard_money", label: "Hard Money" });
      case "privado":
        return lenderLoan({ ...common, price, loanToPrice: market.privateLender.loanToPrice, annualRate: market.privateLender.rate, amortizationMonths: market.privateLender.termMonths, termMonths: market.privateLender.termMonths, interestOnly: true, points: market.privateLender.points, closingCosts: closing, repairs, reserves: 0, kind: "privado", label: "Prestamista privado" });
      case "seller_finance":
        return sellerFinance({ ...common, price, downPayment: roundCents(price * market.sellerFinance.downPct), note: { annualRate: market.sellerFinance.rate, amortizationMonths: market.sellerFinance.amortMonths, termMonths: market.sellerFinance.termMonths }, closingCosts: closing, repairs, reserves: 0 });
      case "subject_to": {
        if (v.existingBalance === null || v.existingRate === null || v.existingRemainingMonths === null) return null;
        const arrears = (v.pastDue ?? 0) + (v.penalties ?? 0);
        return subjectTo({ ...common, loan: { balance: v.existingBalance, annualRate: v.existingRate, remainingMonths: v.existingRemainingMonths, monthlyPI: v.existingPayment ?? undefined }, arrears, sellerCash: Math.max(0, price - v.existingBalance - arrears), closingCosts: closing, repairs, reserves: 0 });
      }
      case "hibrido": {
        if (v.existingBalance === null || v.existingRate === null || v.existingRemainingMonths === null) return null;
        const arrears = (v.pastDue ?? 0) + (v.penalties ?? 0);
        return hybrid({ ...common, price, loans: [{ balance: v.existingBalance, annualRate: v.existingRate, remainingMonths: v.existingRemainingMonths, monthlyPI: v.existingPayment ?? undefined }], arrears, sellerCash: roundCents(price * market.hybridNote.sellerCashPct), note: { annualRate: market.hybridNote.rate, amortizationMonths: market.hybridNote.amortMonths, termMonths: market.hybridNote.termMonths }, closingCosts: closing, repairs, reserves: 0 });
      }
      case "socio": {
        const s = build("dscr");
        if (!s) return null;
        return { ...s, name: "Socio capitalista", partnerCapitalShare: market.partner.partnerCapitalShare };
      }
      case "lease_option":
        return null;
    }
  };

  const ids: StrategyId[] = ["cash", "hard_money", "convencional", "dscr", "seller_finance", "subject_to", "hibrido", "socio", "privado", "lease_option"];

  return ids.map((id) => {
    const meta = META[id];
    const pending = [...baseMissing, ...meta.requires.filter((k) => v[k] === null)];
    const base = {
      id,
      name: meta.name,
      risks: meta.risks,
      legal: meta.legal,
      flexibility: meta.flexibility,
      pending,
    };

    if (id === "lease_option") {
      if (price === null || v.projectedRent === null) {
        return { ...base, status: "Información insuficiente" as Status, statusReasons: ["Faltan precio o renta."], structure: null, capitalRequired: null, monthlyPayment: null, cashFlowMonthly: null, capitalExposed: null, cashOnCash: null, financingCost5y: null, maturities: "—", goalFit: null, scores: null, total: null, risk: null };
      }
      const lo = market.leaseOption;
      const contractRent = roundCents(v.projectedRent * lo.rentToOwnerPct);
      const res = leaseOptionAnalysis({
        optionFee: roundCents(price * lo.optionFeePct),
        contractRent,
        rentCreditMonthly: roundCents(contractRent * lo.rentCreditPct),
        optionFeeCredited: true,
        strikePrice: roundCents(price * (1 + lo.strikePremium)),
        termMonths: lo.termMonths,
        upfrontCosts: closing > 0 ? roundCents(closing * 0.25) : 0,
        monthlyCosts: roundCents(v.projectedRent * ((v.maintenanceRate ?? 0) + (v.vacancyRate ?? 0))),
        expectedValueAtExercise: value,
        subtenantRent: v.projectedRent,
        subtenantOptionFee: 0,
        subtenantStrikePrice: 0,
        subtenantRentCredit: 0,
        resaleCostRate: 0.07,
      });
      const capital = res.cashAtStart;
      const coc = capital > 0 ? (res.monthlyCashFlow * 12) / capital : null;
      const scores: Record<Dimension, number> = {
        liquidez: liquidityScore(capital, cashAvailable, price),
        rentabilidad: profitabilityScore(coc, res.monthlyCashFlow),
        riesgo: 55,
        complejidad: clamp(100 - (100 - meta.simplicity) * experiencePenalty),
        salida: meta.exitBase,
      };
      const total = Math.round(sum((Object.keys(weights) as Dimension[]).map((d) => scores[d] * weights[d] * 100)) / 100);
      const status: Status = pending.length > 0 ? "Información insuficiente" : res.monthlyCashFlow < 0 ? "No viable bajo las condiciones planteadas" : "Requiere negociación";
      return {
        ...base,
        status,
        statusReasons: pending.length > 0 ? ["Faltan datos operativos."] : ["Depende de que el dueño acepte prima, renta y precio de ejercicio."],
        structure: null,
        custom: { capitalRequired: capital, monthlyPayment: contractRent, cashFlowMonthly: res.monthlyCashFlow, note: "Sandwich: rentas a un inquilino a renta de mercado." },
        capitalRequired: capital,
        monthlyPayment: contractRent,
        cashFlowMonthly: res.monthlyCashFlow,
        capitalExposed: capital,
        cashOnCash: coc,
        financingCost5y: 0,
        maturities: `Opción vence en ${lo.termMonths} meses`,
        goalFit: total,
        scores,
        total,
        risk: null,
      };
    }

    const input = build(id);
    if (!input) {
      return { ...base, status: "Información insuficiente" as Status, statusReasons: ["Faltan datos para modelar esta estructura."], structure: null, capitalRequired: null, monthlyPayment: null, cashFlowMonthly: null, capitalExposed: null, cashOnCash: null, financingCost5y: null, maturities: "—", goalFit: null, scores: null, total: null, risk: null };
    }
    const first = evaluateStructure(input);
    // Reserva recomendada según el servicio de deuda de la propia estructura.
    const withReserves = evaluateStructure({ ...input, upfront: { ...input.upfront, reserves: reserves(first.debtServiceMonthly) } });
    let s = withReserves;
    let capitalRequired = s.totalCashRequired;
    let cashFlow = s.cashFlowMonthly;
    let coc = s.metrics.cashOnCash;
    if (id === "socio") {
      // El socio aporta el capital; el operador recibe su parte del flujo.
      capitalRequired = roundCents(s.totalCashRequired * (1 - market.partner.partnerCapitalShare));
      cashFlow = roundCents(s.cashFlowMonthly * market.partner.investorProfitShare);
      coc = capitalRequired > 0 ? (cashFlow * 12) / capitalRequired : null;
    }
    const risk = assessRisk(record, s);
    const financingCost5y = sum(
      s.debts.map((d) => d.schedule.rows.filter((r) => r.month <= 60).reduce((acc, r) => acc + r.interest, 0)),
    ) + s.input.upfront.financingCosts;
    const balloon = s.firstBalloon;
    const maturities = balloon ? `Balloon de ${(balloon.amount / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} en el mes ${balloon.month}` : s.debts.length ? "Sin balloon (amortización completa)" : "Sin deuda";

    const scores: Record<Dimension, number> = {
      liquidez: liquidityScore(capitalRequired, cashAvailable, price ?? 1),
      rentabilidad: profitabilityScore(coc, cashFlow),
      riesgo: risk.score === null ? 50 : 100 - risk.score,
      complejidad: clamp(100 - (100 - meta.simplicity) * experiencePenalty),
      salida: clamp(meta.exitBase - (balloon && balloon.month <= 60 ? 30 : 0) - (s.equityNominal < 0 ? 30 : 0)),
    };
    const total = Math.round(sum((Object.keys(weights) as Dimension[]).map((d) => scores[d] * weights[d] * 100)) / 100);

    const reasons: string[] = [];
    let status: Status;
    const liquidityShort = cashAvailable !== null && capitalRequired > cashAvailable;
    if (pending.length > 0) {
      status = "Información insuficiente";
      reasons.push("Faltan datos: los resultados usan ceros donde no hay información.");
    } else if (liquidityShort || (cashFlow < 0 && (s.metrics.dscr ?? 0) < 0.9)) {
      status = "No viable bajo las condiciones planteadas";
      if (liquidityShort) reasons.push("El capital requerido (con reservas) supera tu efectivo disponible.");
      if (cashFlow < 0) reasons.push("El flujo es negativo y el NOI no cubre la deuda.");
    } else if ((risk.score ?? 0) >= 60) {
      status = "Alto riesgo";
      reasons.push(`Risk Score ${risk.score}/100.`);
    } else if (cashFlow > 0 && (s.metrics.dscr === null || s.metrics.dscr >= 1.2) && (risk.score ?? 100) < 45) {
      status = "Favorable bajo supuestos";
      reasons.push("Flujo positivo, DSCR suficiente y riesgo moderado con los supuestos actuales.");
    } else {
      status = "Requiere negociación";
      if (cashFlow <= 0) reasons.push("Ajusta precio, tasa, plazo o enganche para lograr flujo positivo.");
      if (s.metrics.dscr !== null && s.metrics.dscr < 1.2) reasons.push(`DSCR ${s.metrics.dscr.toFixed(2)} (meta ≥ 1.20).`);
      if ((risk.score ?? 0) >= 45) reasons.push(`Riesgo ${risk.level}.`);
    }
    if (id === "convencional") reasons.push("Supone que calificas por ingresos y crédito: pendiente de verificar con un prestamista.");
    if (id === "dscr" && s.metrics.dscr !== null && s.metrics.dscr < 1.0) reasons.push("Muchos prestamistas DSCR exigen DSCR ≥ 1.0–1.25.");

    // Capital expuesto: efectivo + deuda de corto plazo con garantía personal típica.
    const shortTermRecourse = s.debts.filter((d) => d.debt.kind === "hard_money" || d.debt.kind === "privado").reduce((acc, d) => acc + d.balloon, 0);
    s = withReserves;
    return {
      ...base,
      status,
      statusReasons: reasons,
      structure: s,
      capitalRequired,
      monthlyPayment: s.debtServiceMonthly,
      cashFlowMonthly: cashFlow,
      capitalExposed: capitalRequired + shortTermRecourse,
      cashOnCash: coc,
      financingCost5y,
      maturities,
      goalFit: total,
      scores,
      total,
      risk,
    };
  });
}
