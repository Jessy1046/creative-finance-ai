"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, FileText, Star } from "lucide-react";
import { analyzeProperty } from "@/domain/property/analyze";
import { FIELD_BY_KEY, PROVENANCE_LABEL, type NumberKey } from "@/domain/property/model";
import { formatPct, formatUSD } from "@/domain/money";
import { repo, useCurrentProperty } from "@/store";
import { PropertyForm } from "@/components/property/PropertyForm";
import { NoProperty, PropertyPicker } from "@/components/property/PropertyPicker";
import { StructureSummary } from "@/components/finance/views";
import { Badge, Button, Card, Disclaimer, Notice, PageHeader, Row, Stat } from "@/components/ui";

function PendingList({ keys }: { keys: NumberKey[] }) {
  return <>{keys.map((k) => FIELD_BY_KEY[k].label).join(", ")}</>;
}

export default function AnalizarPage() {
  const property = useCurrentProperty();
  const a = useMemo(() => (property ? analyzeProperty(property) : null), [property]);

  return (
    <>
      <PageHeader
        eyebrow="Analizar Propiedad"
        title="Analizador inteligente de propiedades"
        description="Introduce los datos manualmente. Cada dato muestra su procedencia: verificado, introducido por ti, supuesto estimado o simulado. Lo que falta aparece como «Pendiente de verificar»."
        actions={
          property && (
            <>
              <Button variant="secondary" onClick={() => repo.save({ ...property, saved: !property.saved })}>
                <Star className="h-4 w-4" fill={property.saved ? "currentColor" : "none"} /> {property.saved ? "Guardada" : "Guardar oportunidad"}
              </Button>
              <Link href={`/reporte?id=${property.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg hover:brightness-110">
                <FileText className="h-4 w-4" /> Reporte
              </Link>
            </>
          )
        }
      />
      <PropertyPicker />
      <div className="mt-6">
        {!property || !a ? (
          <NoProperty what="El analizador" />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <PropertyForm value={property} onChange={(p) => repo.save(p)} />
            <div className="grid content-start gap-4 xl:sticky xl:top-20">
              <Card title="Resultados inmediatos" subtitle="Compra sin financiamiento (base de comparación)">
                {!a.operationalComplete && (
                  <div className="mb-3">
                    <Notice tone="warning" title="Información insuficiente">
                      Faltan datos operativos: <PendingList keys={a.missing.operacion} />. Los cálculos usan 0 en esos campos.
                    </Notice>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="NOI mensual" value={formatUSD(a.operating.noiMonthly)} tone={a.operating.noiMonthly < 0 ? "danger" : undefined} help="Ingreso efectivo − gastos operativos, sin deuda." />
                  <Stat label="Cap Rate" value={formatPct(a.capRate, 2)} help="NOI anual ÷ precio." />
                  <Stat label="Equity nominal" value={formatUSD(a.equityNominal)} hint={a.equityNominal === null ? "Falta el valor actual" : undefined} />
                  <Stat label="Rent-to-Cost" value={formatPct(a.rentToCost, 2)} />
                </div>
                <div className="mt-3">
                  <Row label="Renta programada" value={formatUSD(a.operating.grossScheduledMonthly)} />
                  <Row label="Vacancia" value={formatUSD(-a.operating.vacancyLossMonthly)} sub />
                  <Row label="Impuestos" value={formatUSD(-a.operating.expenses.taxes)} sub />
                  <Row label="Seguro" value={formatUSD(-a.operating.expenses.insurance)} sub />
                  <Row label="HOA + servicios" value={formatUSD(-(a.operating.expenses.hoa + a.operating.expenses.utilities))} sub />
                  <Row label="Mantenimiento + CapEx" value={formatUSD(-(a.operating.expenses.maintenance + a.operating.expenses.capex))} sub />
                  <Row label="Administración" value={formatUSD(-a.operating.expenses.management)} sub />
                  <Row label="NOI" value={formatUSD(a.operating.noiMonthly)} strong />
                </div>
              </Card>

              {a.rule15 && (
                <Card title="Regla del 1.5 %" subtitle="Filtro educativo rápido, nunca una aprobación de compra.">
                  <div className="flex items-center gap-2">
                    <span className="num text-2xl font-semibold">{formatPct(a.rule15.ratio, 2)}</span>
                    <Badge tone={a.rule15.meets ? "positive" : "warning"}>{a.rule15.meets ? "Cumple la meta" : "No cumple la meta"}</Badge>
                  </div>
                  <Row label="Renta requerida para 1.5 %" value={formatUSD(a.rule15.requiredRent)} />
                  <Row label="Precio máximo compatible" value={formatUSD(a.rule15.maxPrice)} />
                  <Row label="Diferencia de renta vs. meta" value={formatUSD(a.rule15.rentGap)} tone={a.rule15.rentGap >= 0 ? "positive" : "danger"} />
                  <p className="mt-1 text-[12px] text-muted">Fórmula: renta mensual ÷ (precio + reparaciones) × 100.</p>
                </Card>
              )}

              {a.flip && (
                <Card title="Regla del 50 % · Fix and Flip" subtitle="Precio máximo = 50 % del ARV − reparaciones. Incluye solo reparaciones; el resto de costos se analiza abajo.">
                  <Row label="Oferta máxima según la regla" value={formatUSD(a.flip.maxAllowableOffer)} />
                  <Row label="Tu precio" value={a.price === null ? "—" : formatUSD(a.price)} tone={a.flip.meetsRule ? "positive" : "danger"} />
                  <Row label="Costos de tenencia (6 meses)" value={formatUSD(a.flip.holdingCosts)} sub />
                  <Row label="Costos de venta (7 %)" value={formatUSD(a.flip.sellingCosts)} sub />
                  <Row label="Beneficio neto estimado" value={formatUSD(a.flip.netProfit)} strong tone={a.flip.netProfit >= 0 ? "positive" : "danger"} />
                  <Link href="/laboratorio?tab=flip" className="mt-2 inline-flex items-center gap-1 text-sm text-accent hover:underline">
                    Ajustar en el simulador de flip <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Card>
              )}

              {a.resolved.fallbacks.length > 0 && (
                <Notice tone="neutral" title="Supuestos lógicos aplicados">
                  {a.resolved.fallbacks.join(" ")}
                </Notice>
              )}
              {a.resolved.estimated.length > 0 && (
                <Notice tone="warning" title={`${PROVENANCE_LABEL.estimado}s visibles`}>
                  <PendingList keys={a.resolved.estimated} />
                </Notice>
              )}
              <Card title="Siguientes pasos">
                <div className="grid gap-2 text-sm">
                  <Link className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-surface-2" href="/comparador">
                    Comparar 10 estrategias de financiamiento <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-surface-2" href="/ingeniero">
                    Diseñar el trato con el Ingeniero de Tratos <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-surface-2" href="/riesgos">
                    Evaluar riesgos y pruebas de estrés <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
              <Disclaimer />
            </div>
          </div>
        )}
      </div>
      {a?.subjectToPreview && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Vista rápida: Subject-To con la deuda existente</h2>
          <StructureSummary r={a.subjectToPreview} />
        </div>
      )}
    </>
  );
}
