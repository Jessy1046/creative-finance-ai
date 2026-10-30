import { formatPct, formatRatio, formatUSD } from "../money";
import { FIELD_BY_KEY, PROVENANCE_LABEL, type PropertyRecord } from "./model";
import { analyzeProperty } from "./analyze";
import { compareStrategies } from "../strategies/comparator";

/**
 * Resumen textual de los resultados del motor para el asistente de IA.
 * El asistente explica estas cifras; nunca las calcula ni las inventa.
 */
export function summarizeForAI(record: PropertyRecord): string {
  const a = analyzeProperty(record);
  const lines: string[] = [];
  lines.push(`Propiedad: ${record.name} (${record.propertyType}, ${record.units} unidad(es)), ${record.address.city || "ciudad pendiente"} ${record.address.state}.`);
  lines.push("Datos y su procedencia:");
  for (const [key, field] of Object.entries(record.numbers)) {
    const def = FIELD_BY_KEY[key as keyof typeof FIELD_BY_KEY];
    if (!def) continue;
    const value =
      field.value === null
        ? "Pendiente de verificar"
        : def.kind === "rate"
          ? formatPct(field.value)
          : def.kind === "count" || def.kind === "months"
            ? String(field.value)
            : formatUSD(field.value);
    lines.push(`- ${def.label}${def.term ? ` (${def.term})` : ""}: ${value}${field.value === null ? "" : ` [${PROVENANCE_LABEL[field.source]}]`}`);
  }
  if (a.resolved.fallbacks.length) lines.push(`Supuestos lógicos aplicados: ${a.resolved.fallbacks.join(" ")}`);
  lines.push("Resultados operativos (mensuales salvo que se indique):");
  lines.push(`- Ingreso bruto programado: ${formatUSD(a.operating.grossScheduledMonthly)}; vacancia: ${formatUSD(a.operating.vacancyLossMonthly)}; ingreso efectivo: ${formatUSD(a.operating.effectiveGrossMonthly)}`);
  lines.push(`- Gastos operativos: ${formatUSD(a.operating.operatingExpensesMonthly)}; NOI mensual: ${formatUSD(a.operating.noiMonthly)}; NOI anual: ${formatUSD(a.operating.noiAnnual)}`);
  lines.push(`- Cap rate sobre precio: ${formatPct(a.capRate, 2)}; rent-to-cost: ${formatPct(a.rentToCost, 2)}`);
  if (a.rule15) lines.push(`- Regla del 1.5 %: ${formatPct(a.rule15.ratio, 2)} (${a.rule15.meets ? "cumple" : "no cumple"}); renta requerida ${formatUSD(a.rule15.requiredRent)}; precio máximo compatible ${formatUSD(a.rule15.maxPrice)}`);
  if (a.equityNominal !== null) lines.push(`- Equity nominal (valor − deuda existente − gravámenes): ${formatUSD(a.equityNominal)}`);
  if (a.missing.operacion.length) lines.push(`- Datos operativos pendientes: ${a.missing.operacion.map((k) => FIELD_BY_KEY[k].label).join(", ")}`);

  const comparison = compareStrategies(record);
  lines.push("Comparación de estrategias (supuestos de mercado editables por el usuario, no cotizaciones):");
  for (const c of comparison) {
    lines.push(
      `- ${c.name}: ${c.status}. Capital requerido ${formatUSD(c.capitalRequired)}, pago mensual ${formatUSD(c.monthlyPayment)}, flujo ${formatUSD(c.cashFlowMonthly)}/mes, cash-on-cash ${formatPct(c.cashOnCash)}, DSCR ${formatRatio(c.structure?.metrics.dscr)}, vencimientos: ${c.maturities}, Risk Score ${c.risk?.score ?? "—"}/100 (confianza ${c.risk ? formatPct(c.risk.confidence, 0) : "—"}). ${c.statusReasons.join(" ")}`,
    );
  }
  return lines.join("\n");
}
