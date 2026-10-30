"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatPct, formatRatio, formatUSD } from "@/domain/money";
import {
  compareStrategies,
  DEFAULT_MARKET,
  DIMENSION_LABEL,
  GOAL_LABEL,
  GOAL_WEIGHTS,
  type Dimension,
  type Experience,
  type Goal,
  type MarketAssumptions,
  type Status,
  type StrategyComparison,
} from "@/domain/strategies/comparator";
import { FIELD_BY_KEY } from "@/domain/property/model";
import { useCurrentProperty } from "@/store";
import { NoProperty, PropertyPicker } from "@/components/property/PropertyPicker";
import { Badge, Card, Disclaimer, NumberField, PageHeader, Select, cx, type Tone } from "@/components/ui";

const STATUS_TONE: Record<Status, Tone> = {
  "Favorable bajo supuestos": "positive",
  "Requiere negociación": "info",
  "Alto riesgo": "warning",
  "Información insuficiente": "neutral",
  "No viable bajo las condiciones planteadas": "danger",
};

function MarketForm({ m, onChange }: { m: MarketAssumptions; onChange: (m: MarketAssumptions) => void }) {
  const pct = (label: string, v: number, f: (n: number) => MarketAssumptions) => <NumberField label={label} kind="percent" value={v} onChange={(x) => onChange(f(x ?? 0))} />;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {pct("Convencional: tasa", m.conventional.rate, (x) => ({ ...m, conventional: { ...m.conventional, rate: x } }))}
      {pct("Convencional: enganche", m.conventional.downPct, (x) => ({ ...m, conventional: { ...m.conventional, downPct: x } }))}
      {pct("DSCR: tasa", m.dscrLoan.rate, (x) => ({ ...m, dscrLoan: { ...m.dscrLoan, rate: x } }))}
      {pct("DSCR: enganche", m.dscrLoan.downPct, (x) => ({ ...m, dscrLoan: { ...m.dscrLoan, downPct: x } }))}
      {pct("Hard money: tasa", m.hardMoney.rate, (x) => ({ ...m, hardMoney: { ...m.hardMoney, rate: x } }))}
      {pct("Hard money: puntos", m.hardMoney.points, (x) => ({ ...m, hardMoney: { ...m.hardMoney, points: x } }))}
      {pct("Privado: tasa", m.privateLender.rate, (x) => ({ ...m, privateLender: { ...m.privateLender, rate: x } }))}
      {pct("Seller fin.: enganche", m.sellerFinance.downPct, (x) => ({ ...m, sellerFinance: { ...m.sellerFinance, downPct: x } }))}
      {pct("Seller fin.: tasa", m.sellerFinance.rate, (x) => ({ ...m, sellerFinance: { ...m.sellerFinance, rate: x } }))}
      <NumberField label="Seller fin.: balloon (meses)" kind="int" value={m.sellerFinance.termMonths} min={1} onChange={(x) => onChange({ ...m, sellerFinance: { ...m.sellerFinance, termMonths: Math.max(1, x ?? 60) } })} />
      {pct("Híbrido: efectivo al vendedor", m.hybridNote.sellerCashPct, (x) => ({ ...m, hybridNote: { ...m.hybridNote, sellerCashPct: x } }))}
      {pct("Híbrido: tasa del pagaré", m.hybridNote.rate, (x) => ({ ...m, hybridNote: { ...m.hybridNote, rate: x } }))}
      {pct("Socio: tu parte del flujo", m.partner.investorProfitShare, (x) => ({ ...m, partner: { ...m.partner, investorProfitShare: x } }))}
      {pct("Lease option: prima", m.leaseOption.optionFeePct, (x) => ({ ...m, leaseOption: { ...m.leaseOption, optionFeePct: x } }))}
      <NumberField label="Meses de reserva" kind="int" value={m.reservesMonths} onChange={(x) => onChange({ ...m, reservesMonths: x ?? 0 })} />
    </div>
  );
}

function StrategyRow({ c, open, onToggle }: { c: StrategyComparison; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="border-t border-border align-top">
        <td className="py-3 pr-2">
          <button type="button" onClick={onToggle} aria-expanded={open} className="flex items-start gap-1.5 text-left font-medium hover:text-accent">
            <ChevronDown className={cx("mt-0.5 h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
            {c.name}
          </button>
        </td>
        <td className="py-3"><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
        <td className="num py-3 text-right">{formatUSD(c.capitalRequired)}</td>
        <td className="num py-3 text-right">{formatUSD(c.monthlyPayment)}</td>
        <td className={cx("num py-3 text-right", (c.cashFlowMonthly ?? 0) < 0 && "text-danger")}>{formatUSD(c.cashFlowMonthly)}</td>
        <td className="num py-3 text-right">{formatPct(c.cashOnCash)}</td>
        <td className="num py-3 text-right">{c.risk?.score ?? "—"}</td>
        <td className="num py-3 text-right font-semibold">{c.total ?? "—"}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="pb-4">
            <div className="grid gap-4 rounded-lg bg-surface-2 p-4 text-[13px] md:grid-cols-3">
              <div>
                <div className="mb-1 font-semibold">Números</div>
                <div>Capital expuesto: <span className="num">{formatUSD(c.capitalExposed)}</span></div>
                <div>Costo financiero (5 años): <span className="num">{formatUSD(c.financingCost5y)}</span></div>
                <div>DSCR: <span className="num">{formatRatio(c.structure?.metrics.dscr)}</span></div>
                <div>Vencimientos: {c.maturities}</div>
                <div>Flexibilidad: {c.flexibility}/100</div>
                {c.custom && <div className="mt-1 text-muted">{c.custom.note}</div>}
              </div>
              <div>
                <div className="mb-1 font-semibold">Riesgos principales</div>
                <ul className="list-disc space-y-0.5 pl-4">{c.risks.map((r) => <li key={r}>{r}</li>)}</ul>
                <div className="mb-1 mt-2 font-semibold">Posibles obstáculos legales</div>
                <ul className="list-disc space-y-0.5 pl-4">{c.legal.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
              <div>
                <div className="mb-1 font-semibold">Por qué esta clasificación</div>
                <ul className="list-disc space-y-0.5 pl-4">{c.statusReasons.map((r) => <li key={r}>{r}</li>)}</ul>
                {c.pending.length > 0 && (
                  <>
                    <div className="mb-1 mt-2 font-semibold">Datos pendientes</div>
                    <div>{c.pending.map((k) => FIELD_BY_KEY[k].label).join(", ")}</div>
                  </>
                )}
                {c.scores && (
                  <>
                    <div className="mb-1 mt-2 font-semibold">Puntaje por dimensión</div>
                    {(Object.keys(c.scores) as Dimension[]).map((d) => (
                      <div key={d} className="flex items-center gap-2">
                        <span className="w-40 shrink-0">{DIMENSION_LABEL[d]}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-accent" style={{ width: `${c.scores![d]}%` }} /></span>
                        <span className="num w-8 text-right">{Math.round(c.scores![d])}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ComparadorPage() {
  const property = useCurrentProperty();
  const [goal, setGoal] = useState<Goal>("flujo");
  const [experience, setExperience] = useState<Experience>("principiante");
  const [market, setMarket] = useState<MarketAssumptions>(DEFAULT_MARKET);
  const [weights, setWeights] = useState<Record<Dimension, number>>(GOAL_WEIGHTS.flujo);
  const [open, setOpen] = useState<string | null>(null);
  const [showMarket, setShowMarket] = useState(false);

  const results = useMemo(() => (property ? compareStrategies(property, market, goal, experience, weights) : []), [property, market, goal, experience, weights]);
  const ranked = useMemo(() => [...results].sort((a, b) => (b.total ?? -1) - (a.total ?? -1)), [results]);

  return (
    <>
      <PageHeader
        eyebrow="Comparador de Financiamiento"
        title="Compara 10 formas de financiar la misma propiedad"
        description="La comparación es multiobjetivo: pondera liquidez, rentabilidad, riesgo, simplicidad y salida según tu objetivo. Nunca elige solo por el mayor ROI."
      />
      <PropertyPicker />
      <div className="mt-6">
        {!property ? (
          <NoProperty what="El comparador" />
        ) : (
          <div className="grid gap-4">
            <Card title="Tu objetivo y ponderación">
              <div className="grid gap-3 md:grid-cols-[repeat(2,minmax(0,220px))_1fr]">
                <Select label="Objetivo" value={goal} onChange={(g) => { setGoal(g); setWeights(GOAL_WEIGHTS[g]); }} options={(Object.keys(GOAL_LABEL) as Goal[]).map((g) => ({ value: g, label: GOAL_LABEL[g] }))} />
                <Select label="Tu experiencia" value={experience} onChange={setExperience} options={[{ value: "principiante", label: "Principiante" }, { value: "intermedio", label: "Intermedio" }, { value: "avanzado", label: "Avanzado" }]} help="Ajusta el peso de la complejidad operativa." />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(Object.keys(weights) as Dimension[]).map((d) => (
                    <NumberField key={d} label={DIMENSION_LABEL[d]} kind="percent" value={weights[d]} onChange={(v) => setWeights({ ...weights, [d]: v ?? 0 })} />
                  ))}
                </div>
              </div>
              <button type="button" className="mt-3 text-sm text-accent hover:underline" onClick={() => setShowMarket((s) => !s)}>
                {showMarket ? "Ocultar" : "Editar"} supuestos de mercado (tasas y términos, no son cotizaciones)
              </button>
              {showMarket && <div className="mt-3"><MarketForm m={market} onChange={setMarket} /></div>}
            </Card>

            {ranked[0]?.total !== null && ranked[0] && (
              <Card>
                <p className="text-sm">
                  Con tu objetivo <b>{GOAL_LABEL[goal].toLowerCase()}</b>, la estructura mejor ponderada es <b>{ranked[0].name}</b> ({ranked[0].total} puntos, {ranked[0].status.toLowerCase()}).
                  {ranked[1] && <> Le sigue <b>{ranked[1].name}</b> ({ranked[1].total}).</>} Revisa sus riesgos y datos pendientes antes de decidir: el puntaje ordena opciones, no aprueba una compra.
                </p>
              </Card>
            )}

            <Card title="Resultados" subtitle="Abre cada fila para ver riesgos, obstáculos legales, datos pendientes y puntaje por dimensión.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="text-left text-[12px] text-muted">
                    <tr>
                      <th className="py-2 font-medium">Estrategia</th>
                      <th className="font-medium">Clasificación</th>
                      <th className="text-right font-medium">Capital requerido</th>
                      <th className="text-right font-medium">Pago mensual</th>
                      <th className="text-right font-medium">Flujo mensual</th>
                      <th className="text-right font-medium">Cash-on-Cash</th>
                      <th className="text-right font-medium">Riesgo</th>
                      <th className="text-right font-medium">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((c) => (
                      <StrategyRow key={c.id} c={c} open={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12px] text-muted">El capital requerido incluye {market.reservesMonths} meses de reserva. En «Socio capitalista», el socio aporta el capital y tú recibes tu parte del flujo. Préstamos convencional y DSCR suponen que calificas: pendiente de verificar con un prestamista.</p>
            </Card>
            <Disclaimer />
          </div>
        )}
      </div>
    </>
  );
}
