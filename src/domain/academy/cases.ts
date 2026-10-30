import { toCents } from "../money";
import { monthlyPayment } from "../finance/amortization";
import { emptyNumbers, newProperty, type NumberKey, type PropertyRecord } from "../property/model";

/**
 * Biblioteca de casos de práctica editables. Todos los valores son SIMULADOS
 * (no representan propiedades reales ni datos de mercado).
 */

export interface PracticeCase {
  id: string;
  title: string;
  summary: string;
  focus: string[];
  suggestedStrategy: string;
  record: () => PropertyRecord;
}

type Input = Partial<Record<NumberKey, number>>;

/** Montos en dólares, tasas en fracción. */
function build(id: string, name: string, kind: PropertyRecord["propertyType"], units: number, input: Input, checklist: PropertyRecord["checklist"], city: string, state: string): PropertyRecord {
  const numbers = emptyNumbers("simulado");
  const moneyKeys: NumberKey[] = ["askingPrice", "negotiatedPrice", "currentValue", "arv", "repairs", "currentRent", "projectedRent", "otherIncome", "taxesAnnual", "insuranceAnnual", "hoaMonthly", "utilitiesMonthly", "closingCosts", "financingCosts", "existingBalance", "existingPayment", "pastDue", "penalties", "liens", "cashAvailable"];
  for (const [k, v] of Object.entries(input) as [NumberKey, number][]) {
    numbers[k] = { value: moneyKeys.includes(k) ? toCents(v) : v, source: "simulado" };
  }
  if (input.existingBalance && input.existingRate !== undefined && input.existingRemainingMonths && input.existingPayment === undefined) {
    numbers.existingPayment = {
      value: monthlyPayment(toCents(input.existingBalance), input.existingRate, input.existingRemainingMonths),
      source: "simulado",
    };
  }
  return newProperty({
    id: `case_${id}`,
    name,
    propertyType: kind,
    units,
    numbers,
    checklist,
    caseId: id,
    address: { line: "Dirección de ejemplo", city, state, zip: "" },
    notes: "Caso de práctica con datos simulados.",
  });
}

const opex = { vacancyRate: 0.06, maintenanceRate: 0.06, capexRate: 0.05, managementRate: 0 } satisfies Input;

export const CASES: PracticeCase[] = [
  {
    id: "caso-a",
    title: "Caso A — Hipoteca baja y dueño que necesita vender",
    summary: "Traslado de trabajo, dos pagos atrasados, hipoteca al 3.25 %.",
    focus: ["Subject-To", "Atrasos", "Due-on-sale"],
    suggestedStrategy: "Subject-To",
    record: () =>
      build("caso-a", "Caso A · Casa con hipoteca al 3.25 %", "Unifamiliar", 1, {
        askingPrice: 195_000, negotiatedPrice: 188_000, currentValue: 240_000, repairs: 0, currentRent: 1_900, projectedRent: 1_900,
        taxesAnnual: 2_400, insuranceAnnual: 1_200, hoaMonthly: 0, utilitiesMonthly: 0, ...opex, closingCosts: 2_000, financingCosts: 0,
        existingBalance: 180_000, existingRate: 0.0325, existingRemainingMonths: 300, pastDue: 2_600, monthsBehind: 2, penalties: 400, liens: 0, cashAvailable: 25_000, otherIncome: 0,
      }, { estado_cuenta: "si", busqueda_titulo: "si", juicios_vendedor: "no", comprador_ocupante: "no", servicer: "si" }, "San Antonio", "TX"),
  },
  {
    id: "caso-b",
    title: "Caso B — Casa pagada; el vendedor busca pagos mensuales",
    summary: "Pareja jubilada sin hipoteca que quiere ingreso estable.",
    focus: ["Seller Financing", "Balloon", "Ventajas fiscales del vendedor"],
    suggestedStrategy: "Seller Financing",
    record: () =>
      build("caso-b", "Caso B · Casa pagada de $250,000", "Unifamiliar", 1, {
        askingPrice: 255_000, negotiatedPrice: 250_000, currentValue: 255_000, repairs: 0, currentRent: 2_300, projectedRent: 2_300,
        taxesAnnual: 3_000, insuranceAnnual: 1_200, hoaMonthly: 0, utilitiesMonthly: 0, ...opex, closingCosts: 3_000, financingCosts: 0,
        existingBalance: 0, pastDue: 0, monthsBehind: 0, penalties: 0, liens: 0, cashAvailable: 40_000, otherIncome: 0,
      }, { busqueda_titulo: "si", juicios_vendedor: "no" }, "Phoenix", "AZ"),
  },
  {
    id: "caso-c",
    title: "Caso C — Necesita reparaciones: Subject-To + Seller Financing",
    summary: "Hipoteca al 3 %, $25,000 de reparaciones y un vendedor que quiere su equity.",
    focus: ["Híbrido", "Reparaciones", "Prelación de deudas"],
    suggestedStrategy: "Híbrido",
    record: () =>
      build("caso-c", "Caso C · Casa para reparar con hipoteca al 3 %", "Unifamiliar", 1, {
        askingPrice: 200_000, negotiatedPrice: 190_000, currentValue: 210_000, arv: 265_000, repairs: 25_000, currentRent: 1_400, projectedRent: 2_100,
        taxesAnnual: 2_700, insuranceAnnual: 1_500, hoaMonthly: 0, utilitiesMonthly: 0, ...opex, closingCosts: 2_500, financingCosts: 0,
        existingBalance: 150_000, existingRate: 0.03, existingRemainingMonths: 330, pastDue: 0, monthsBehind: 0, penalties: 0, liens: 0, cashAvailable: 45_000, otherIncome: 0,
      }, { busqueda_titulo: "si", contingencia_reparaciones: "no", contratista_confirmado: "desconocido" }, "Houston", "TX"),
  },
  {
    id: "caso-d",
    title: "Caso D — Tríplex con flujo positivo y refinanciamiento futuro",
    summary: "Tres unidades, mejoras ligeras y plan de refinanciar en 12 meses.",
    focus: ["Multifamiliar pequeño", "BRRRR", "DSCR"],
    suggestedStrategy: "Préstamo DSCR o BRRRR",
    record: () =>
      build("caso-d", "Caso D · Tríplex", "Tríplex", 3, {
        askingPrice: 375_000, negotiatedPrice: 360_000, currentValue: 370_000, arv: 400_000, repairs: 15_000, currentRent: 3_900, projectedRent: 4_200,
        taxesAnnual: 6_000, insuranceAnnual: 2_400, hoaMonthly: 0, utilitiesMonthly: 150, vacancyRate: 0.07, maintenanceRate: 0.07, capexRate: 0.06, managementRate: 0.08,
        closingCosts: 6_000, financingCosts: 0, existingBalance: 0, pastDue: 0, monthsBehind: 0, penalties: 0, liens: 0, cashAvailable: 110_000, otherIncome: 0,
      }, { plan_administracion: "si", inspeccion: "si" }, "Cleveland", "OH"),
  },
  {
    id: "caso-e",
    title: "Caso E — Multifamiliar con socio capitalista",
    summary: "Ocho unidades: el socio aporta el enganche y el operador administra.",
    focus: ["Socios", "Preferred return", "Waterfall"],
    suggestedStrategy: "Socio capitalista",
    record: () =>
      build("caso-e", "Caso E · Multifamiliar de 8 unidades", "Multifamiliar (5+)", 8, {
        askingPrice: 950_000, negotiatedPrice: 900_000, currentValue: 920_000, repairs: 40_000, currentRent: 9_200, projectedRent: 9_800,
        taxesAnnual: 14_000, insuranceAnnual: 7_200, hoaMonthly: 0, utilitiesMonthly: 600, vacancyRate: 0.07, maintenanceRate: 0.07, capexRate: 0.06, managementRate: 0.08,
        closingCosts: 15_000, financingCosts: 0, existingBalance: 0, pastDue: 0, monthsBehind: 0, penalties: 0, liens: 0, cashAvailable: 50_000, otherIncome: 200,
      }, { plan_administracion: "si" }, "Atlanta", "GA"),
  },
  {
    id: "caso-f",
    title: "Caso F — Balloon importante en cinco años",
    summary: "Seller financing con balloon de 60 meses y poco margen.",
    focus: ["Balloon", "Refinanciamiento", "Plan de salida"],
    suggestedStrategy: "Seller Financing",
    record: () =>
      build("caso-f", "Caso F · Seller financing con balloon", "Unifamiliar", 1, {
        askingPrice: 330_000, negotiatedPrice: 320_000, currentValue: 330_000, repairs: 0, currentRent: 2_500, projectedRent: 2_550,
        taxesAnnual: 4_200, insuranceAnnual: 1_800, hoaMonthly: 0, utilitiesMonthly: 0, ...opex, closingCosts: 3_500, financingCosts: 0,
        existingBalance: 0, pastDue: 0, monthsBehind: 0, penalties: 0, liens: 0, cashAvailable: 45_000, otherIncome: 0,
      }, {}, "Orlando", "FL"),
  },
  {
    id: "caso-g",
    title: "Caso G — Flujo positivo que se vuelve negativo",
    summary: "Funciona con los supuestos base, pero pierde dinero al subir gastos y vacancia.",
    focus: ["Pruebas de estrés", "Reservas", "Supuestos optimistas"],
    suggestedStrategy: "Subject-To (con cautela)",
    record: () =>
      build("caso-g", "Caso G · Margen delgado", "Unifamiliar", 1, {
        askingPrice: 205_000, negotiatedPrice: 200_000, currentValue: 210_000, repairs: 0, currentRent: 1_850, projectedRent: 1_850,
        taxesAnnual: 3_600, insuranceAnnual: 1_800, hoaMonthly: 0, utilitiesMonthly: 0, vacancyRate: 0.03, maintenanceRate: 0.04, capexRate: 0.03, managementRate: 0,
        closingCosts: 2_000, financingCosts: 0, existingBalance: 165_000, existingRate: 0.045, existingRemainingMonths: 340, pastDue: 0, monthsBehind: 0, penalties: 0, liens: 0, cashAvailable: 15_000, otherIncome: 0,
      }, {}, "Memphis", "TN"),
  },
  {
    id: "caso-h",
    title: "Caso H — El vendedor rechaza la primera oferta",
    summary: "Solo vende a precio completo, pero acepta un plazo de pagos o una opción.",
    focus: ["Negociación", "Lease Option", "Seller Financing"],
    suggestedStrategy: "Lease Option o Seller Financing",
    record: () =>
      build("caso-h", "Caso H · Vendedor firme en el precio", "Unifamiliar", 1, {
        askingPrice: 280_000, negotiatedPrice: 280_000, currentValue: 275_000, repairs: 0, currentRent: 2_200, projectedRent: 2_250,
        taxesAnnual: 3_900, insuranceAnnual: 1_500, hoaMonthly: 0, utilitiesMonthly: 0, ...opex, closingCosts: 3_000, financingCosts: 0,
        existingBalance: 0, pastDue: 0, monthsBehind: 0, penalties: 0, liens: 0, cashAvailable: 15_000, otherIncome: 0,
      }, {}, "Denver", "CO"),
  },
];

export const CASE_BY_ID = Object.fromEntries(CASES.map((c) => [c.id, c]));
