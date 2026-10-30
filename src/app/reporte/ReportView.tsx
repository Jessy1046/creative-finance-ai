"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { analyzeProperty } from "@/domain/property/analyze";
import { FIELD_DEFS, PROVENANCE_LABEL } from "@/domain/property/model";
import { compareStrategies } from "@/domain/strategies/comparator";
import { availableKinds, defaultParams, evaluateProposal, PROPOSAL_LABEL } from "@/domain/strategies/dealEngineer";
import { formatPct, formatRatio, formatUSD } from "@/domain/money";
import { CHECKLIST } from "@/domain/risk/checklist";
import { useStore } from "@/store";
import { downloadCsv, RiskSummary } from "@/components/finance/views";
import { Badge, Button, Card, Disclaimer, EmptyState, PageHeader, Row } from "@/components/ui";

const fmtField = (kind: string, v: number) => (kind === "rate" ? formatPct(v) : kind === "count" || kind === "months" ? String(v) : formatUSD(v));

export function ReportView() {
  const id = useSearchParams().get("id");
  const { properties } = useStore();
  const p = properties.find((x) => x.id === id) ?? null;
  const a = useMemo(() => (p ? analyzeProperty(p) : null), [p]);
  const comparison = useMemo(() => (p ? compareStrategies(p) : []), [p]);
  const proposals = useMemo(() => (p ? availableKinds(p).filter((k) => k.available).map((k) => evaluateProposal(p, defaultParams(p, k.kind))) : []), [p]);
  if (!p || !a) return <EmptyState title="Reporte no encontrado">Abre el reporte desde el analizador o desde Mis Propiedades.</EmptyState>;
  const main = proposals[0];

  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Reporte de inversión"
        title={p.name}
        description={`${p.propertyType} · ${p.units} unidad(es) · ${[p.address.line, p.address.city, p.address.state, p.address.zip].filter(Boolean).join(", ")} · generado ${new Date().toLocaleDateString("es-US")}`}
        actions={
          <div className="no-print flex gap-2">
            <Button variant="secondary" onClick={() => downloadCsv(`comparacion-${p.id}.csv`, [["Estrategia", "Clasificación", "Capital requerido", "Pago mensual", "Flujo mensual", "Cash-on-Cash", "Risk Score", "Puntaje"], ...comparison.map((c) => [c.name, c.status, ((c.capitalRequired ?? 0) / 100).toFixed(2), ((c.monthlyPayment ?? 0) / 100).toFixed(2), ((c.cashFlowMonthly ?? 0) / 100).toFixed(2), c.cashOnCash === null ? "" : (c.cashOnCash * 100).toFixed(2), c.risk?.score ?? "", c.total ?? ""])])}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / PDF</Button>
          </div>
        }
      />
      <Card title="Datos y procedencia" subtitle="Cada dato indica si está verificado, fue introducido por el usuario, es un supuesto estimado o es simulado.">
        <div className="grid gap-x-8 md:grid-cols-2">
          {FIELD_DEFS.map((f) => {
            const field = p.numbers[f.key];
            return (
              <div key={f.key} className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 text-[13px]">
                <span>{f.label}</span>
                <span className="flex items-center gap-2">
                  <span className="num">{field.value === null ? "Pendiente de verificar" : fmtField(f.kind, field.value)}</span>
                  {field.value !== null && <Badge tone={field.source === "verificado" ? "positive" : field.source === "estimado" ? "warning" : field.source === "simulado" ? "info" : "neutral"}>{PROVENANCE_LABEL[field.source]}</Badge>}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Análisis de cash flow (sin financiamiento)">
          <Row label="Ingreso efectivo" value={formatUSD(a.operating.effectiveGrossMonthly)} />
          <Row label="Gastos operativos" value={formatUSD(-a.operating.operatingExpensesMonthly)} sub />
          <Row label="NOI mensual" value={formatUSD(a.operating.noiMonthly)} strong />
          <Row label="Cap Rate" value={formatPct(a.capRate, 2)} />
          <Row label="Regla del 1.5 %" value={a.rule15 ? `${formatPct(a.rule15.ratio, 2)} · ${a.rule15.meets ? "cumple" : "no cumple"}` : "—"} />
          <Row label="Equity nominal" value={formatUSD(a.equityNominal)} />
        </Card>
        {main && (
          <Card title={`Estructura sugerida: ${PROPOSAL_LABEL[main.params.kind]}`}>
            <Row label="Efectivo requerido" value={formatUSD(main.result.totalCashRequired)} />
            <Row label="Flujo mensual" value={formatUSD(main.result.cashFlowMonthly)} tone={main.result.cashFlowMonthly < 0 ? "danger" : "positive"} />
            <Row label="DSCR" value={formatRatio(main.result.metrics.dscr)} />
            <Row label="Cash-on-Cash" value={formatPct(main.result.metrics.cashOnCash)} />
            <Row label="Peor escenario" value={main.worst?.label ?? "—"} />
          </Card>
        )}
      </div>
      <Card title="Comparación de estrategias">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="text-left text-[12px] text-muted"><tr><th className="py-2 font-medium">Estrategia</th><th className="font-medium">Clasificación</th><th className="text-right font-medium">Capital</th><th className="text-right font-medium">Flujo</th><th className="text-right font-medium">Riesgo</th></tr></thead>
            <tbody>
              {comparison.map((c) => (
                <tr key={c.id} className="border-t border-border"><td className="py-1.5">{c.name}</td><td>{c.status}</td><td className="num text-right">{formatUSD(c.capitalRequired)}</td><td className="num text-right">{formatUSD(c.cashFlowMonthly)}</td><td className="num text-right">{c.risk?.score ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {main && (
        <>
          <h2 className="mt-2 text-lg font-semibold">Análisis de riesgos</h2>
          <RiskSummary report={main.risk} />
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Plan de salida"><ul className="list-disc space-y-1 pl-5 text-sm">{main.exits.map((e) => <li key={e}>{e}</li>)}</ul></Card>
            <Card title="Resumen educativo para el vendedor">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {main.negotiate.map((n) => <li key={n}>{n}</li>)}
                <li>Le recomendamos revisar esta propuesta con su propio abogado antes de firmar.</li>
              </ul>
            </Card>
          </div>
        </>
      )}
      <Card title="Checklist de cierre">
        <ul className="grid gap-1 text-sm md:grid-cols-2">
          {CHECKLIST.map((q) => <li key={q.id} className="flex gap-2"><span className="num w-16 shrink-0 text-muted">{p.checklist[q.id] === "si" ? "Sí" : p.checklist[q.id] === "no" ? "No" : "Pendiente"}</span>{q.question}</li>)}
        </ul>
      </Card>
      <Disclaimer>Reporte educativo generado con supuestos visibles. No es un contrato, una oferta, una valoración ni asesoría legal, fiscal o financiera. No se generan contratos legales definitivos sin intervención de profesionales autorizados.</Disclaimer>
    </div>
  );
}
