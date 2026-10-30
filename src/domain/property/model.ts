import { z } from "zod";
import type { Cents, Rate } from "../money";
import type { OperatingInputs } from "../finance/metrics";

/**
 * Procedencia de cada dato. La app nunca inventa datos de mercado:
 * - verificado: confirmado con documento (estado de cuenta, avalúo, título).
 * - usuario: escrito por el usuario sin verificar.
 * - estimado: supuesto visible aplicado porque faltaba el dato.
 * - simulado: valor de un caso de práctica o escenario.
 */
export const PROVENANCES = ["verificado", "usuario", "estimado", "simulado"] as const;
export type Provenance = (typeof PROVENANCES)[number];

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  verificado: "Verificado",
  usuario: "Introducido por el usuario",
  estimado: "Supuesto estimado",
  simulado: "Simulado",
};

export interface Field {
  /** Monto en centavos, tasa como fracción o conteo; null = pendiente de verificar. */
  value: number | null;
  source: Provenance;
}

export type FieldKind = "money" | "moneyMonthly" | "rate" | "count" | "months";

export interface FieldDef {
  key: NumberKey;
  label: string;
  /** Término en inglés que se conserva. */
  term?: string;
  kind: FieldKind;
  group: "precio" | "ingresos" | "gastos" | "costos" | "deuda" | "inversionista";
  help: string;
  /** Supuesto visible que se puede aplicar si falta el dato (null = no hay supuesto razonable). */
  assumption: number | null;
  assumptionNote?: string;
  critical?: boolean;
}

export const NUMBER_KEYS = [
  "askingPrice",
  "negotiatedPrice",
  "currentValue",
  "arv",
  "repairs",
  "currentRent",
  "projectedRent",
  "otherIncome",
  "taxesAnnual",
  "insuranceAnnual",
  "hoaMonthly",
  "utilitiesMonthly",
  "vacancyRate",
  "maintenanceRate",
  "capexRate",
  "managementRate",
  "closingCosts",
  "financingCosts",
  "existingBalance",
  "existingRate",
  "existingRemainingMonths",
  "existingPayment",
  "pastDue",
  "monthsBehind",
  "penalties",
  "liens",
  "cashAvailable",
] as const;
export type NumberKey = (typeof NUMBER_KEYS)[number];

export const FIELD_DEFS: FieldDef[] = [
  { key: "askingPrice", label: "Precio pedido", term: "Asking price", kind: "money", group: "precio", help: "Lo que pide el vendedor.", assumption: null },
  { key: "negotiatedPrice", label: "Precio negociado", kind: "money", group: "precio", help: "Precio acordado o tu oferta. Si falta, se usa el precio pedido.", assumption: null, critical: true },
  { key: "currentValue", label: "Valor actual", term: "As-is value", kind: "money", group: "precio", help: "Valor en su condición actual. Idealmente de un avalúo o comparables verificados.", assumption: null, critical: true },
  { key: "arv", label: "Valor después de reparaciones", term: "ARV", kind: "money", group: "precio", help: "After Repair Value. Debe sustentarse con comparables reales.", assumption: null },
  { key: "repairs", label: "Reparaciones", term: "Rehab", kind: "money", group: "costos", help: "Presupuesto de reparaciones con contingencia.", assumption: null },
  { key: "currentRent", label: "Renta actual (mensual)", kind: "moneyMonthly", group: "ingresos", help: "Renta total de todas las unidades hoy.", assumption: null },
  { key: "projectedRent", label: "Renta proyectada (mensual)", kind: "moneyMonthly", group: "ingresos", help: "Renta de mercado esperada. Si falta, se usa la actual.", assumption: null, critical: true },
  { key: "otherIncome", label: "Otros ingresos (mensual)", kind: "moneyMonthly", group: "ingresos", help: "Lavandería, estacionamiento, almacenamiento.", assumption: 0, assumptionNote: "Sin otros ingresos." },
  { key: "taxesAnnual", label: "Impuestos anuales", term: "Property taxes", kind: "money", group: "gastos", help: "Del registro del condado. Pueden subir al venderse.", assumption: null, critical: true },
  { key: "insuranceAnnual", label: "Seguro anual", term: "Insurance", kind: "money", group: "gastos", help: "Póliza de arrendador o inversionista.", assumption: null, critical: true },
  { key: "hoaMonthly", label: "HOA (mensual)", term: "HOA", kind: "moneyMonthly", group: "gastos", help: "Cuota de la asociación de propietarios.", assumption: 0, assumptionNote: "Sin HOA." },
  { key: "utilitiesMonthly", label: "Servicios a cargo del dueño (mensual)", term: "Utilities", kind: "moneyMonthly", group: "gastos", help: "Agua, basura, electricidad de áreas comunes.", assumption: 0, assumptionNote: "El inquilino paga los servicios." },
  { key: "vacancyRate", label: "Vacancia", term: "Vacancy", kind: "rate", group: "gastos", help: "Porcentaje del año sin renta.", assumption: 0.08, assumptionNote: "8 % (≈ 1 mes al año)." },
  { key: "maintenanceRate", label: "Mantenimiento", term: "Repairs & maintenance", kind: "rate", group: "gastos", help: "Porcentaje de la renta.", assumption: 0.08, assumptionNote: "8 % de la renta." },
  { key: "capexRate", label: "Reservas de capital", term: "CapEx", kind: "rate", group: "gastos", help: "Techo, HVAC, calentador. Porcentaje de la renta.", assumption: 0.07, assumptionNote: "7 % de la renta." },
  { key: "managementRate", label: "Administración", term: "Property management", kind: "rate", group: "gastos", help: "Porcentaje de la renta cobrada.", assumption: 0.09, assumptionNote: "9 % de la renta cobrada." },
  { key: "closingCosts", label: "Costos de cierre", term: "Closing costs", kind: "money", group: "costos", help: "Título, abogado, registro.", assumption: null },
  { key: "financingCosts", label: "Costos de financiamiento", term: "Points & fees", kind: "money", group: "costos", help: "Puntos y comisiones del préstamo.", assumption: 0, assumptionNote: "Sin costos de financiamiento." },
  { key: "existingBalance", label: "Saldo de la deuda existente", term: "Loan balance", kind: "money", group: "deuda", help: "Del estado de cuenta más reciente.", assumption: null },
  { key: "existingRate", label: "Tasa de interés", term: "Interest rate", kind: "rate", group: "deuda", help: "Tasa anual de la hipoteca existente.", assumption: null },
  { key: "existingRemainingMonths", label: "Plazo restante (meses)", term: "Remaining term", kind: "months", group: "deuda", help: "Meses que faltan para liquidar.", assumption: null },
  { key: "existingPayment", label: "Pago actual P&I (mensual)", term: "P&I payment", kind: "moneyMonthly", group: "deuda", help: "Capital + interés, sin escrow.", assumption: null },
  { key: "pastDue", label: "Saldo vencido", term: "Past due", kind: "money", group: "deuda", help: "Pagos atrasados acumulados.", assumption: 0, assumptionNote: "Al corriente." },
  { key: "monthsBehind", label: "Pagos atrasados (meses)", kind: "count", group: "deuda", help: "Número de pagos sin hacer.", assumption: 0, assumptionNote: "Al corriente." },
  { key: "penalties", label: "Multas y cargos", term: "Late fees", kind: "money", group: "deuda", help: "Cargos por atraso y honorarios.", assumption: 0, assumptionNote: "Sin multas." },
  { key: "liens", label: "Gravámenes y juicios", term: "Liens", kind: "money", group: "deuda", help: "Del reporte de título.", assumption: null },
  { key: "cashAvailable", label: "Efectivo disponible", kind: "money", group: "inversionista", help: "Lo que puedes invertir sin comprometer tus reservas personales.", assumption: null },
];

export const FIELD_BY_KEY = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, f])) as Record<NumberKey, FieldDef>;

export const PROPERTY_TYPES = [
  "Unifamiliar",
  "Dúplex",
  "Tríplex",
  "Cuádruplex",
  "Multifamiliar (5+)",
  "Condominio / Townhouse",
  "Casa móvil con terreno",
  "Terreno",
] as const;

export interface PropertyRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  address: { line: string; city: string; state: string; zip: string };
  propertyType: (typeof PROPERTY_TYPES)[number];
  units: number;
  numbers: Record<NumberKey, Field>;
  /** Respuestas de debida diligencia para el motor de riesgos. */
  checklist: Partial<Record<string, "si" | "no" | "desconocido">>;
  /** Caso de práctica de origen, si aplica. */
  caseId?: string;
  saved?: boolean;
  notes: string;
}

export function emptyNumbers(source: Provenance = "usuario"): Record<NumberKey, Field> {
  return Object.fromEntries(NUMBER_KEYS.map((k) => [k, { value: null, source }])) as Record<NumberKey, Field>;
}

export function newProperty(partial: Partial<PropertyRecord> = {}): PropertyRecord {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? `prop_${Math.random().toString(36).slice(2, 10)}`,
    name: partial.name ?? "Nueva propiedad",
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
    address: partial.address ?? { line: "", city: "", state: "", zip: "" },
    propertyType: partial.propertyType ?? "Unifamiliar",
    units: partial.units ?? 1,
    numbers: partial.numbers ?? emptyNumbers(),
    checklist: partial.checklist ?? {},
    caseId: partial.caseId,
    saved: partial.saved,
    notes: partial.notes ?? "",
  };
}

// Validación de entrada (lo que llega del almacenamiento o de la red).
const fieldSchema = z.object({ value: z.number().finite().nullable(), source: z.enum(PROVENANCES) });
export const propertySchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(120),
  createdAt: z.string(),
  updatedAt: z.string(),
  address: z.object({
    line: z.string().max(200),
    city: z.string().max(100),
    state: z.string().max(40),
    zip: z.string().max(10),
  }),
  propertyType: z.enum(PROPERTY_TYPES),
  units: z.number().int().min(1).max(10000),
  numbers: z.object(Object.fromEntries(NUMBER_KEYS.map((k) => [k, fieldSchema])) as Record<NumberKey, typeof fieldSchema>),
  checklist: z.record(z.enum(["si", "no", "desconocido"])),
  caseId: z.string().optional(),
  saved: z.boolean().optional(),
  notes: z.string().max(5000),
});

/** Valor de un campo (o null). */
export const val = (p: PropertyRecord, k: NumberKey): number | null => p.numbers[k].value;

export interface Resolved {
  /** Valores efectivos usados en los cálculos. */
  values: Record<NumberKey, number | null>;
  /** Campos que faltan y no tienen supuesto aplicado. */
  pending: NumberKey[];
  /** Campos que usan un supuesto estimado. */
  estimated: NumberKey[];
  /** Fallbacks lógicos aplicados (p. ej. precio negociado ← precio pedido). */
  fallbacks: string[];
}

/** Resuelve valores efectivos con fallbacks transparentes (sin inventar datos). */
export function resolve(p: PropertyRecord): Resolved {
  const values = Object.fromEntries(NUMBER_KEYS.map((k) => [k, p.numbers[k].value])) as Record<NumberKey, number | null>;
  const fallbacks: string[] = [];
  if (values.negotiatedPrice === null && values.askingPrice !== null) {
    values.negotiatedPrice = values.askingPrice;
    fallbacks.push("Precio negociado = precio pedido (no hay oferta registrada).");
  }
  if (values.projectedRent === null && values.currentRent !== null) {
    values.projectedRent = values.currentRent;
    fallbacks.push("Renta proyectada = renta actual.");
  }
  if (values.currentValue === null && values.negotiatedPrice !== null) {
    fallbacks.push("Valor actual pendiente: las métricas de equity no se calculan.");
  }
  const pending = NUMBER_KEYS.filter((k) => values[k] === null);
  const estimated = NUMBER_KEYS.filter((k) => p.numbers[k].source === "estimado" && p.numbers[k].value !== null);
  return { values, pending, estimated, fallbacks };
}

/** Aplica el supuesto visible de un campo (queda marcado como "estimado"). */
export function applyAssumption(p: PropertyRecord, key: NumberKey): PropertyRecord {
  const def = FIELD_BY_KEY[key];
  if (def.assumption === null) return p;
  return { ...p, numbers: { ...p.numbers, [key]: { value: def.assumption, source: "estimado" } }, updatedAt: new Date().toISOString() };
}

/** Supuestos operativos para el motor. Los campos sin dato se tratan como 0 y se reportan como pendientes. */
export function operatingFrom(values: Record<NumberKey, number | null>): OperatingInputs {
  const n = (k: NumberKey) => values[k] ?? 0;
  return {
    monthlyRent: n("projectedRent"),
    otherMonthlyIncome: n("otherIncome"),
    vacancyRate: n("vacancyRate"),
    taxesMonthly: Math.round(n("taxesAnnual") / 12),
    insuranceMonthly: Math.round(n("insuranceAnnual") / 12),
    hoaMonthly: n("hoaMonthly"),
    utilitiesMonthly: n("utilitiesMonthly"),
    maintenanceRate: n("maintenanceRate"),
    capexRate: n("capexRate"),
    managementRate: n("managementRate"),
  };
}

/** Campos mínimos para cada análisis. */
export const REQUIRED_FOR = {
  operacion: ["negotiatedPrice", "projectedRent", "taxesAnnual", "insuranceAnnual", "vacancyRate", "maintenanceRate", "capexRate", "managementRate"],
  equity: ["currentValue"],
  deudaExistente: ["existingBalance", "existingRate", "existingRemainingMonths"],
  liquidez: ["cashAvailable", "closingCosts"],
} satisfies Record<string, NumberKey[]>;

export function missingFor(r: Resolved, group: keyof typeof REQUIRED_FOR): NumberKey[] {
  return REQUIRED_FOR[group].filter((k) => r.values[k] === null);
}

export type { Cents, Rate };
