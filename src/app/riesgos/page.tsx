"use client";

import { useMemo, useState } from "react";
import { formatPct, formatRatio, formatUSD } from "@/domain/money";
import { CHECKLIST, type Answer } from "@/domain/risk/checklist";
import { assessRisk, CATEGORY_LABEL, FACTORS, type RiskCategory } from "@/domain/risk/engine";
import { runScenarios, runStressTests } from "@/domain/risk/stress";
import { availableKinds, buildProposal, defaultParams, PROPOSAL_LABEL, type ProposalKind } from "@/domain/strategies/dealEngineer";
import { evaluateStructure } from "@/domain/strategies/structure";
import { repo, useCurrentProperty } from "@/store";
import { NoProperty, PropertyPicker } from "@/components/property/PropertyPicker";
import { RiskSummary, StressView } from "@/components/finance/views";
import { Card, Disclaimer, NumberField, PageHeader, Select, cx } from "@/components/ui";

const ANSWERS: { value: Answer; label: string }[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "desconocido", label: "No sé" },
];

export default function RiesgosPage() {
  const property = useCurrentProperty();
  const kinds = useMemo(() => (property ? availableKinds(property).filter((k) => k.available) : []), [property]);
  const [kind, setKind] = useState<ProposalKind | "">("");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [showWeights, setShowWeights] = useState(false);
  const activeKind = (kind && kinds.some((k) => k.kind === kind) ? kind : kinds[0]?.kind) as ProposalKind | undefined;

  const input = useMemo(() => (property && activeKind ? buildProposal(property, defaultParams(property, activeKind)) : null), [property, activeKind]);
  const structure = useMemo(() => (input ? evaluateStructure(input) : null), [input]);
  const report = useMemo(() => (property ? assessRisk(property, structure, weights) : null), [property, structure, weights]);
  const stress = useMemo(() => (input ? runStressTests(input) : []), [input]);
  const scenarios = useMemo(() => (input ? runScenarios(input) : []), [input]);

  const setAnswer = (id: string, a: Answer) => property && repo.save({ ...property, checklist: { ...property.checklist, [id]: a } });

  return (
    <>
      <PageHeader
        eyebrow="Analizador de Riesgos"
        title="Risk Engine"
        description="Evalúa por separado el riesgo financiero, inmobiliario, legal y de ejecución. Un puntaje alto significa más riesgo. Los datos faltantes reducen la confianza; nunca cuentan como riesgo cero."
      />
      <PropertyPicker />
      <div className="mt-6">
        {!property || !report ? (
          <NoProperty what="El analizador de riesgos" />
        ) : (
          <div className="grid gap-4">
            <Card title="Estructura evaluada" subtitle="Los términos se ajustan en el Ingeniero de Tratos; aquí se usan los valores sugeridos.">
              <div className="max-w-sm">
                <Select
                  label="Estructura"
                  value={(activeKind ?? "") as string}
                  onChange={(v) => setKind(v as ProposalKind)}
                  options={kinds.length ? kinds.map((k) => ({ value: k.kind, label: PROPOSAL_LABEL[k.kind] })) : [{ value: "", label: "Sin estructura (faltan datos)" }]}
                />
              </div>
            </Card>

            <RiskSummary report={report} />

            <Card title="Debida diligencia" subtitle="Tus respuestas alimentan el motor. «No sé» deja el factor sin evaluar y baja la confianza.">
              <div className="grid gap-x-8 md:grid-cols-2">
                {(["legal", "financiero", "inmobiliario", "ejecucion"] as RiskCategory[]).map((cat) => (
                  <div key={cat} className="mb-4">
                    <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">{CATEGORY_LABEL[cat]}</div>
                    {CHECKLIST.filter((q) => q.category === cat).map((q) => {
                      const a = property.checklist[q.id] ?? "desconocido";
                      return (
                        <fieldset key={q.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2">
                          <legend className="sr-only">{q.question}</legend>
                          <span className="min-w-0 flex-1 text-sm" title={q.help}>{q.question}</span>
                          <span className="inline-flex overflow-hidden rounded-md border border-border">
                            {ANSWERS.map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                aria-pressed={a === o.value}
                                onClick={() => setAnswer(q.id, o.value)}
                                className={cx("px-2.5 py-1 text-[12.5px]", a === o.value ? (o.value === q.goodAnswer ? "bg-positive-bg font-semibold text-positive" : o.value === "desconocido" ? "bg-surface-2 font-semibold" : "bg-danger-bg font-semibold text-danger") : "text-muted hover:bg-surface-2")}
                              >
                                {o.label}
                              </button>
                            ))}
                          </span>
                        </fieldset>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Escenarios" subtitle="Conservador, base, optimista y crisis sobre la estructura evaluada.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {scenarios.map((s) => (
                  <div key={s.id} className={cx("rounded-lg border p-3", s.result.cashFlowMonthly < 0 ? "border-danger/40 bg-danger-bg" : "border-border")}>
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-[12px] text-muted">{s.description}</div>
                    <div className={cx("num mt-2 text-xl font-semibold", s.result.cashFlowMonthly < 0 && "text-danger")}>{formatUSD(s.result.cashFlowMonthly)}<span className="text-sm font-normal text-muted">/mes</span></div>
                    <div className="num text-[12.5px] text-muted">DSCR {formatRatio(s.result.metrics.dscr)} · CoC {formatPct(s.result.metrics.cashOnCash)} · Equity {formatUSD(s.result.equityNominal)}</div>
                  </div>
                ))}
              </div>
            </Card>

            {stress.length > 0 && <StressView tests={stress} />}

            <Card title="Metodología y pesos" subtitle="Score = Σ(peso × riesgo) ÷ Σ(pesos evaluados). Puedes cambiar los pesos." actions={<button type="button" className="text-sm text-accent hover:underline" onClick={() => setShowWeights((s) => !s)}>{showWeights ? "Ocultar pesos" : "Configurar pesos"}</button>}>
              {showWeights ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {FACTORS.map((f) => (
                    <NumberField key={f.id} label={f.label} kind="int" value={weights[f.id] ?? f.weight} onChange={(v) => setWeights({ ...weights, [f.id]: v ?? 0 })} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{FACTORS.length} factores en 4 categorías. Cada factor cita su evidencia. El puntaje es educativo y no sustituye la revisión legal, financiera o técnica.</p>
              )}
            </Card>
            <Disclaimer />
          </div>
        )}
      </div>
    </>
  );
}
