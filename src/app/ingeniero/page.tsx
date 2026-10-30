"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, XCircle } from "lucide-react";
import { formatPct, formatRatio, formatUSD } from "@/domain/money";
import { availableKinds, defaultParams, evaluateProposal, PROPOSAL_LABEL, type ProposalKind, type ProposalParams } from "@/domain/strategies/dealEngineer";
import { useCurrentProperty } from "@/store";
import { NoProperty, PropertyPicker } from "@/components/property/PropertyPicker";
import { StressView, StructureSummary, riskTone } from "@/components/finance/views";
import { Badge, Button, Card, Disclaimer, Notice, NumberField, PageHeader, Tabs } from "@/components/ui";

function ParamsForm({ p, onChange }: { p: ProposalParams; onChange: (p: ProposalParams) => void }) {
  const set = <K extends keyof ProposalParams>(k: K, v: ProposalParams[K]) => onChange({ ...p, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <NumberField label="Precio" value={p.price} onChange={(v) => set("price", v ?? 0)} />
      <NumberField label={p.kind === "seller_finance" ? "Enganche" : "Efectivo al vendedor"} value={p.cashToSeller} onChange={(v) => set("cashToSeller", v ?? 0)} />
      {p.kind !== "subject_to" && (
        <>
          <NumberField label="Tasa del pagaré al vendedor" kind="percent" value={p.noteRate} onChange={(v) => set("noteRate", v ?? 0)} />
          <NumberField label="Amortización (meses)" kind="int" value={p.noteAmortMonths} min={1} onChange={(v) => set("noteAmortMonths", Math.max(1, v ?? 1))} />
          <NumberField label="Vencimiento (meses)" kind="int" value={p.noteTermMonths} min={1} onChange={(v) => set("noteTermMonths", Math.max(1, v ?? 1))} />
        </>
      )}
      <NumberField label="Costos de cierre" value={p.closingCosts} onChange={(v) => set("closingCosts", v ?? 0)} />
      <NumberField label="Reparaciones" value={p.repairs} onChange={(v) => set("repairs", v ?? 0)} />
      <NumberField label="Reserva" value={p.reserves} onChange={(v) => set("reserves", v ?? 0)} />
    </div>
  );
}

export default function IngenieroPage() {
  const property = useCurrentProperty();
  const kinds = useMemo(() => (property ? availableKinds(property) : []), [property]);
  const [kind, setKind] = useState<ProposalKind>("subject_to");
  const [params, setParams] = useState<Record<ProposalKind, ProposalParams> | null>(null);
  const [ai, setAi] = useState<{ loading: boolean; text?: string; error?: string; mode?: string }>({ loading: false });

  useEffect(() => {
    if (!property) {
      setParams(null);
      return;
    }
    setParams({
      subject_to: defaultParams(property, "subject_to"),
      seller_finance: defaultParams(property, "seller_finance"),
      hibrido: defaultParams(property, "hibrido"),
    });
    const firstAvailable = availableKinds(property).find((k) => k.available);
    if (firstAvailable) setKind(firstAvailable.kind);
    setAi({ loading: false });
    // Solo al cambiar de propiedad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]);

  const proposals = useMemo(() => {
    if (!property || !params) return null;
    return Object.fromEntries(kinds.filter((k) => k.available).map((k) => [k.kind, evaluateProposal(property, params[k.kind])])) as Partial<Record<ProposalKind, ReturnType<typeof evaluateProposal>>>;
  }, [property, params, kinds]);
  const current = proposals?.[kind];

  const askAi = async () => {
    if (!property || !current) return;
    setAi({ loading: true });
    const question = `Explícame la estructura ${PROPOSAL_LABEL[kind]} para esta propiedad con estos términos: precio ${formatUSD(current.params.price)}, ${kind === "seller_finance" ? "enganche" : "efectivo al vendedor"} ${formatUSD(current.params.cashToSeller)}${kind !== "subject_to" ? `, pagaré al ${formatPct(current.params.noteRate)} amortizado en ${current.params.noteAmortMonths} meses con vencimiento a ${current.params.noteTermMonths} meses` : ""}. Resultados del motor para esta estructura: efectivo requerido ${formatUSD(current.result.totalCashRequired)}, flujo ${formatUSD(current.result.cashFlowMonthly)}/mes, DSCR ${formatRatio(current.result.metrics.dscr)}, Risk Score ${current.risk.score}/100, peor escenario: ${current.worst?.label ?? "ninguno"}. ¿Qué tendría que negociar, qué obligaciones asumiría, cuál es el peor escenario y cómo podría salir?`;
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turns: [{ role: "user", content: question }], property }) });
      const data = await res.json();
      if (!res.ok) setAi({ loading: false, error: data.error ?? "No se pudo obtener la explicación." });
      else setAi({ loading: false, text: data.answer, mode: data.mode });
    } catch {
      setAi({ loading: false, error: "No se pudo conectar con el servidor." });
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Ingeniero de Tratos AI"
        title="Diseña la estructura del trato"
        description="El sistema propone estructuras posibles para la propiedad activa, muestra sus efectos económicos y explica qué negociar, qué obligaciones asumes, el peor escenario y cómo salir. Cambia enganche, plazos, tasas y pagos al vendedor."
      />
      <PropertyPicker />
      <div className="mt-6">
        {!property || !params ? (
          <NoProperty what="El Ingeniero de Tratos" />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {kinds.map((k) => {
                const p = proposals?.[k.kind];
                return (
                  <button
                    key={k.kind}
                    type="button"
                    disabled={!k.available}
                    onClick={() => setKind(k.kind)}
                    className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${kind === k.kind ? "border-accent bg-info-bg" : "border-border bg-surface hover:bg-surface-2"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{PROPOSAL_LABEL[k.kind]}</span>
                      {p && <Badge tone={p.viable ? "positive" : "danger"}>{p.viable ? "Viable bajo supuestos" : "Con obstáculos"}</Badge>}
                    </div>
                    {p ? (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[12.5px]">
                        <div><div className="text-muted">Capital</div><div className="num font-medium">{formatUSD(p.result.totalCashRequired)}</div></div>
                        <div><div className="text-muted">Flujo</div><div className={`num font-medium ${p.result.cashFlowMonthly < 0 ? "text-danger" : ""}`}>{formatUSD(p.result.cashFlowMonthly)}</div></div>
                        <div><div className="text-muted">Riesgo</div><div className="num font-medium">{p.risk.score ?? "—"}</div></div>
                      </div>
                    ) : (
                      <p className="mt-2 text-[12.5px] text-muted">{k.reason}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {current && (
              <>
                <Card title={`Términos: ${PROPOSAL_LABEL[kind]}`} actions={<Button size="sm" variant="ghost" onClick={() => setParams({ ...params, [kind]: defaultParams(property, kind) })}>Restablecer</Button>}>
                  <ParamsForm p={params[kind]} onChange={(p) => setParams({ ...params, [kind]: p })} />
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card title="Explicación del motor" subtitle="Generada a partir de los cálculos; no usa IA.">
                    <div className="grid gap-2 text-sm leading-relaxed">
                      {current.explanation.map((e) => <p key={e}>{e}</p>)}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge tone={riskTone(current.risk.score)}>Risk Score {current.risk.score ?? "—"}/100</Badge>
                      <Badge>Confianza {Math.round(current.risk.confidence * 100)} %</Badge>
                      <Link href="/riesgos" className="text-[12.5px] text-accent hover:underline">Ver análisis de riesgo</Link>
                    </div>
                  </Card>
                  <Card title="Viabilidad">
                    {current.viable ? (
                      <p className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" />Bajo estos supuestos no hay obstáculos numéricos. Aún faltan la revisión legal, de título y de seguro.</p>
                    ) : (
                      <ul className="grid gap-1.5 text-sm">
                        {current.viabilityReasons.map((r) => <li key={r} className="flex items-start gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />{r}</li>)}
                      </ul>
                    )}
                  </Card>
                  <Card title="Qué tendrías que negociar"><ul className="list-disc space-y-1 pl-5 text-sm">{current.negotiate.map((n) => <li key={n}>{n}</li>)}</ul></Card>
                  <Card title="Obligaciones que asumirías"><ul className="list-disc space-y-1 pl-5 text-sm">{current.obligations.map((n) => <li key={n}>{n}</li>)}</ul></Card>
                  <Card title="Cómo podrías salir de la inversión"><ul className="list-disc space-y-1 pl-5 text-sm">{current.exits.map((n) => <li key={n}>{n}</li>)}</ul></Card>
                  <Card
                    title="Explicación con IA"
                    subtitle="El asistente usa los resultados del motor; no inventa cifras."
                    actions={<Button size="sm" onClick={askAi} disabled={ai.loading}><Bot className="h-4 w-4" />{ai.loading ? "Pensando…" : "Explicar"}</Button>}
                  >
                    {ai.error && <Notice tone="danger">{ai.error}</Notice>}
                    {ai.text && (
                      <div className="grid gap-2 text-sm leading-relaxed">
                        {ai.mode === "demo" && <Badge tone="warning">Modo demostración</Badge>}
                        {ai.text.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                      </div>
                    )}
                    {!ai.text && !ai.error && <p className="text-sm text-muted">Pide una explicación en lenguaje sencillo de esta estructura y sus riesgos.</p>}
                  </Card>
                </div>

                <StructureSummary r={current.result} />
                <StressView tests={current.stress} />
              </>
            )}
            <Disclaimer />
          </div>
        )}
      </div>
    </>
  );
}
