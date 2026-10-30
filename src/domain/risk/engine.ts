import { formatPct, formatUSD } from "../money";
import type { PropertyRecord } from "../property/model";
import { resolve } from "../property/model";
import type { StructureResult } from "../strategies/structure";
import type { Answer } from "./checklist";

/**
 * Risk Engine — metodología transparente.
 * - Cada factor produce un riesgo de 0 (bajo) a 100 (alto) con la evidencia que lo justifica.
 * - Score = promedio ponderado de los factores EVALUADOS. Pesos configurables.
 * - Confianza = peso evaluado / peso aplicable. Los datos faltantes bajan la confianza;
 *   nunca se convierten en riesgo cero.
 * - Ningún score sustituye la revisión legal, financiera o técnica.
 */

export type RiskCategory = "financiero" | "inmobiliario" | "legal" | "ejecucion";

export const CATEGORY_LABEL: Record<RiskCategory, string> = {
  financiero: "Riesgo financiero",
  inmobiliario: "Riesgo inmobiliario",
  legal: "Riesgo legal",
  ejecucion: "Riesgo de ejecución",
};

export interface FactorEvaluation {
  risk: number;
  evidence: string;
}

export interface FactorResult {
  id: string;
  category: RiskCategory;
  label: string;
  weight: number;
  /** null = sin datos suficientes (baja la confianza). */
  evaluation: FactorEvaluation | null;
  /** Qué dato o respuesta falta. */
  missing?: string;
  applicable: boolean;
}

export interface RiskReport {
  score: number | null;
  confidence: number;
  level: "bajo" | "moderado" | "alto" | "muy alto" | "sin datos";
  categories: Record<RiskCategory, { score: number | null; confidence: number }>;
  factors: FactorResult[];
  disclaimer: string;
}

interface Ctx {
  record: PropertyRecord;
  structure: StructureResult | null;
  v: ReturnType<typeof resolve>["values"];
  answer: (id: string) => Answer;
  verifiedArv: boolean;
}

interface FactorDef {
  id: string;
  category: RiskCategory;
  label: string;
  weight: number;
  applies?: (c: Ctx) => boolean;
  evaluate: (c: Ctx) => FactorEvaluation | { missing: string };
}

const band = (x: number, steps: [number, number][], fallback: number) => {
  for (const [limit, risk] of steps) if (x <= limit) return risk;
  return fallback;
};

const fromAnswer = (c: Ctx, id: string, good: "si" | "no", goodRisk: number, badRisk: number, goodText: string, badText: string, missing: string) => {
  const a = c.answer(id);
  if (a === "desconocido") return { missing };
  return a === good ? { risk: goodRisk, evidence: goodText } : { risk: badRisk, evidence: badText };
};

const hasRepairs = (c: Ctx) => (c.v.repairs ?? 0) > 0;
const hasNotes = (c: Ctx) => !!c.structure?.debts.some((d) => d.debt.kind === "vendedor" || d.debt.kind === "existente");

export const FACTORS: FactorDef[] = [
  // --- Financiero ---
  {
    id: "flujo_negativo",
    category: "financiero",
    label: "Flujo de efectivo negativo o débil",
    weight: 3,
    evaluate: (c) => {
      if (!c.structure) return { missing: "Selecciona una estructura de financiamiento." };
      const egi = c.structure.operating.effectiveGrossMonthly;
      if (egi <= 0) return { missing: "Falta la renta." };
      const margin = c.structure.cashFlowMonthly / egi;
      return {
        risk: band(margin, [[-0.1, 95], [0, 80], [0.05, 55], [0.1, 35]], 15),
        evidence: `Flujo ${formatUSD(c.structure.cashFlowMonthly)}/mes = ${formatPct(margin)} del ingreso efectivo.`,
      };
    },
  },
  {
    id: "reservas",
    category: "financiero",
    label: "Falta de reservas",
    weight: 2.5,
    evaluate: (c) => {
      const months = c.structure?.reservesMonthsOfPayments;
      if (months === null || months === undefined) return { missing: "Indica la reserva y la estructura." };
      return {
        risk: band(months, [[0.99, 90], [2.99, 70], [5.99, 40]], 10),
        evidence: `La reserva cubre ${months.toFixed(1)} meses de deuda, impuestos y seguro.`,
      };
    },
  },
  {
    id: "apalancamiento",
    category: "financiero",
    label: "Alto apalancamiento (LTV)",
    weight: 2,
    evaluate: (c) => {
      const l = c.structure?.metrics.ltv;
      if (l === null || l === undefined) return { missing: "Falta el valor actual o la estructura." };
      return { risk: band(l, [[0.7, 15], [0.8, 35], [0.9, 60], [1, 80]], 95), evidence: `LTV ${formatPct(l)}.` };
    },
  },
  {
    id: "tasa_variable",
    category: "financiero",
    label: "Interés variable",
    weight: 1.5,
    evaluate: (c) => {
      if (!c.structure) return { missing: "Selecciona una estructura." };
      const variable = c.structure.input.debts.some((d) => d.variableRate);
      return variable
        ? { risk: 70, evidence: "Al menos una deuda tiene tasa variable: el pago puede subir." }
        : { risk: 10, evidence: "Todas las deudas tienen tasa fija." };
    },
  },
  {
    id: "balloon",
    category: "financiero",
    label: "Pago balloon",
    weight: 2.5,
    evaluate: (c) => {
      if (!c.structure) return { missing: "Selecciona una estructura." };
      const b = c.structure.firstBalloon;
      if (!b) return { risk: 5, evidence: "No hay pagos balloon." };
      return {
        risk: band(b.month, [[36, 90], [60, 70], [120, 45]], 25),
        evidence: `${b.debtLabel}: balloon de ${formatUSD(b.amount)} en el mes ${b.month}.`,
      };
    },
  },
  {
    id: "atrasos",
    category: "financiero",
    label: "Atrasos en la hipoteca existente",
    weight: 2,
    applies: (c) => (c.v.existingBalance ?? 0) > 0,
    evaluate: (c) => {
      const m = c.v.monthsBehind;
      if (m === null) return { missing: "Indica cuántos pagos están atrasados." };
      return {
        risk: band(m, [[0, 10], [2, 45]], 80),
        evidence: m === 0 ? "El préstamo está al corriente." : `${m} pagos atrasados: puede haber un proceso de ejecución en curso.`,
      };
    },
  },
  // --- Inmobiliario ---
  {
    id: "vacancia",
    category: "inmobiliario",
    label: "Supuesto de vacancia",
    weight: 1.5,
    evaluate: (c) => {
      const vr = c.v.vacancyRate;
      if (vr === null) return { missing: "Falta el supuesto de vacancia." };
      if (vr < 0.05) return { risk: 55, evidence: `Vacancia de ${formatPct(vr)}: supuesto optimista.` };
      if (vr <= 0.1) return { risk: 25, evidence: `Vacancia de ${formatPct(vr)}: supuesto prudente.` };
      return { risk: 50, evidence: `Vacancia de ${formatPct(vr)}: mercado con baja demanda.` };
    },
  },
  {
    id: "reparaciones",
    category: "inmobiliario",
    label: "Magnitud de reparaciones",
    weight: 1.5,
    evaluate: (c) => {
      if (c.v.repairs === null || !c.v.negotiatedPrice) return { missing: "Falta el presupuesto de reparaciones." };
      const r = c.v.repairs / c.v.negotiatedPrice;
      return { risk: band(r, [[0, 10], [0.1, 25], [0.25, 50]], 75), evidence: `Reparaciones = ${formatPct(r)} del precio.` };
    },
  },
  {
    id: "sobrevaloracion",
    category: "inmobiliario",
    label: "Sobrevaloración del precio",
    weight: 2,
    evaluate: (c) => {
      if (!c.v.currentValue || !c.v.negotiatedPrice) return { missing: "Falta el valor actual." };
      const r = c.v.negotiatedPrice / c.v.currentValue;
      return { risk: band(r, [[0.85, 10], [1, 30], [1.1, 65]], 90), evidence: `Precio = ${formatPct(r, 0)} del valor actual.` };
    },
  },
  {
    id: "arv",
    category: "inmobiliario",
    label: "ARV sin sustento",
    weight: 1.5,
    applies: (c) => c.v.arv !== null,
    evaluate: (c) => {
      if (c.verifiedArv) return { risk: 15, evidence: "ARV marcado como verificado." };
      const base = c.v.currentValue;
      if (!base) return { risk: 60, evidence: "ARV no verificado y sin valor actual para compararlo." };
      const r = c.v.arv! / base;
      return r > 1.3
        ? { risk: 80, evidence: `ARV no verificado y ${formatPct(r - 1, 0)} por encima del valor actual.` }
        : { risk: 50, evidence: "ARV introducido por el usuario: pendiente de comparables verificados." };
    },
  },
  {
    id: "impuestos",
    category: "inmobiliario",
    label: "Impuestos crecientes",
    weight: 1,
    evaluate: (c) =>
      fromAnswer(c, "reavaluo_impuestos", "si", 20, 60, "Se consideró el reavalúo de impuestos.", "No se consideró el reavalúo tras la venta.", "Responde la pregunta sobre reavalúo."),
  },
  {
    id: "asegurabilidad",
    category: "inmobiliario",
    label: "Problemas de asegurabilidad",
    weight: 1.5,
    evaluate: (c) =>
      fromAnswer(c, "seguro_cotizado", "si", 15, 70, "Hay cotización de seguro.", "Sin cotización: la propiedad o la estructura podrían no ser asegurables al costo supuesto.", "Responde la pregunta sobre seguro."),
  },
  // --- Legal ---
  {
    id: "due_on_sale",
    category: "legal",
    label: "Cláusula due-on-sale",
    weight: 3,
    applies: (c) => !!c.structure,
    evaluate: (c) =>
      c.structure!.input.debts.some((d) => d.inSellersName)
        ? {
            risk: 75,
            evidence:
              "La deuda queda a nombre del vendedor. El prestamista puede exigir el saldo completo al transferirse el título (Garn–St Germain permite la cláusula salvo excepciones). Mitigable con reservas y plan de refinanciamiento, no eliminable.",
          }
        : { risk: 5, evidence: "La estructura no deja deuda a nombre del vendedor." },
  },
  {
    id: "titulo",
    category: "legal",
    label: "Defectos de título",
    weight: 2.5,
    evaluate: (c) =>
      fromAnswer(c, "busqueda_titulo", "si", 15, 85, "Búsqueda de título realizada.", "Sin búsqueda de título: riesgo de gravámenes y defectos ocultos.", "Responde si hubo búsqueda de título."),
  },
  {
    id: "gravamenes",
    category: "legal",
    label: "Gravámenes (liens)",
    weight: 2,
    evaluate: (c) => {
      if (c.v.liens === null) return { missing: "Indica los gravámenes del reporte de título." };
      return c.v.liens === 0
        ? { risk: 10, evidence: "Sin gravámenes reportados." }
        : { risk: 70, evidence: `Gravámenes por ${formatUSD(c.v.liens)} que deben resolverse al cierre.` };
    },
  },
  {
    id: "juicios",
    category: "legal",
    label: "Juicios contra el vendedor",
    weight: 1.5,
    evaluate: (c) =>
      fromAnswer(c, "juicios_vendedor", "no", 10, 80, "Sin juicios conocidos.", "Hay juicios o embargos contra el vendedor.", "Responde sobre juicios contra el vendedor."),
  },
  {
    id: "regulacion_estatal",
    category: "legal",
    label: "Regulación estatal",
    weight: 2,
    evaluate: (c) =>
      fromAnswer(c, "revision_estatal", "si", 20, 75, "Se revisaron las reglas del estado.", "No se han revisado las reglas del estado para esta estructura.", "Responde sobre la revisión estatal."),
  },
  {
    id: "consumidor",
    category: "legal",
    label: "Financiamiento al consumidor (Reg Z / SAFE Act)",
    weight: 2,
    evaluate: (c) => {
      const occ = c.answer("comprador_ocupante");
      if (occ === "desconocido") return { missing: "Indica si financiarás a un comprador ocupante." };
      if (occ === "no") return { risk: 10, evidence: "No se financiará a un comprador ocupante." };
      const rmlo = c.answer("originador_licencia");
      if (rmlo === "si") return { risk: 30, evidence: "Comprador ocupante con originador con licencia." };
      return { risk: 80, evidence: "Comprador ocupante sin originador con licencia confirmado: posible incumplimiento de Reg Z / SAFE Act." };
    },
  },
  {
    id: "documentacion",
    category: "legal",
    label: "Documentación y disclosures",
    weight: 2,
    evaluate: (c) =>
      fromAnswer(c, "abogado_revisa", "si", 15, 80, "Un abogado revisará contratos y disclosures.", "Sin revisión legal de contratos y disclosures.", "Responde sobre la revisión legal."),
  },
  // --- Ejecución ---
  {
    id: "remodelacion",
    category: "ejecucion",
    label: "Remodelación tardía",
    weight: 1.5,
    applies: hasRepairs,
    evaluate: (c) =>
      fromAnswer(c, "cronograma_obra", "si", 30, 70, "Hay cronograma de obra.", "Sin cronograma: alto riesgo de retraso.", "Responde sobre el cronograma."),
  },
  {
    id: "sobrecosto",
    category: "ejecucion",
    label: "Sobrecosto",
    weight: 1.5,
    applies: hasRepairs,
    evaluate: (c) =>
      fromAnswer(c, "contingencia_reparaciones", "si", 25, 70, "El presupuesto incluye contingencia.", "Sin contingencia en el presupuesto.", "Responde sobre la contingencia."),
  },
  {
    id: "contratistas",
    category: "ejecucion",
    label: "Falta de contratistas",
    weight: 1,
    applies: hasRepairs,
    evaluate: (c) =>
      fromAnswer(c, "contratista_confirmado", "si", 20, 70, "Contratista confirmado por escrito.", "Sin contratista confirmado.", "Responde sobre el contratista."),
  },
  {
    id: "administracion",
    category: "ejecucion",
    label: "Administración deficiente",
    weight: 1,
    evaluate: (c) =>
      fromAnswer(c, "plan_administracion", "si", 20, 60, "Hay plan de administración.", "Sin plan de administración.", "Responde sobre la administración."),
  },
  {
    id: "terceros",
    category: "ejecucion",
    label: "Incumplimiento de terceros / servicing",
    weight: 1.5,
    applies: hasNotes,
    evaluate: (c) =>
      fromAnswer(c, "servicer", "si", 15, 70, "Un servicer independiente registrará los pagos.", "Sin servicer: pagos sin registro independiente.", "Responde sobre el servicer."),
  },
];

export type WeightOverrides = Partial<Record<string, number>>;

export function riskLevel(score: number | null): RiskReport["level"] {
  if (score === null) return "sin datos";
  if (score < 25) return "bajo";
  if (score < 45) return "moderado";
  if (score < 65) return "alto";
  return "muy alto";
}

export function assessRisk(record: PropertyRecord, structure: StructureResult | null, weights: WeightOverrides = {}): RiskReport {
  const { values } = resolve(record);
  const ctx: Ctx = {
    record,
    structure,
    v: values,
    answer: (id) => record.checklist[id] ?? "desconocido",
    verifiedArv: record.numbers.arv.source === "verificado",
  };

  const factors: FactorResult[] = FACTORS.map((f) => {
    const weight = weights[f.id] ?? f.weight;
    const applicable = f.applies ? f.applies(ctx) : true;
    if (!applicable) return { id: f.id, category: f.category, label: f.label, weight, evaluation: null, applicable };
    const r = f.evaluate(ctx);
    return "missing" in r
      ? { id: f.id, category: f.category, label: f.label, weight, evaluation: null, missing: r.missing, applicable }
      : { id: f.id, category: f.category, label: f.label, weight, evaluation: r, applicable };
  });

  const aggregate = (list: FactorResult[]) => {
    const applicable = list.filter((f) => f.applicable && f.weight > 0);
    const evaluated = applicable.filter((f) => f.evaluation);
    const wTotal = applicable.reduce((s, f) => s + f.weight, 0);
    const wEval = evaluated.reduce((s, f) => s + f.weight, 0);
    const score = wEval > 0 ? evaluated.reduce((s, f) => s + f.weight * f.evaluation!.risk, 0) / wEval : null;
    return { score: score === null ? null : Math.round(score), confidence: wTotal > 0 ? wEval / wTotal : 0 };
  };

  const total = aggregate(factors);
  const categories = Object.fromEntries(
    (["financiero", "inmobiliario", "legal", "ejecucion"] as RiskCategory[]).map((cat) => [cat, aggregate(factors.filter((f) => f.category === cat))]),
  ) as RiskReport["categories"];

  return {
    score: total.score,
    confidence: total.confidence,
    level: riskLevel(total.score),
    categories,
    factors,
    disclaimer:
      "Puntaje educativo: 0 = menor riesgo, 100 = mayor riesgo. No sustituye la revisión de un abogado, un contador, un inspector o un prestamista.",
  };
}
