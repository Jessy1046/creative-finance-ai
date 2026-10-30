"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, CircleHelp, Download, XCircle } from "lucide-react";
import { formatPct, formatRatio, formatUSD, type Cents } from "@/domain/money";
import type { Schedule } from "@/domain/finance/amortization";
import { DEFAULT_PROJECTION, projectReturns, type StructureResult } from "@/domain/strategies/structure";
import type { StressOutcome } from "@/domain/risk/stress";
import { CATEGORY_LABEL, type RiskReport } from "@/domain/risk/engine";
import { Badge, Button, Card, Notice, Row, Stat, Tabs, cx } from "@/components/ui";

const axisTick = { fill: "var(--muted)", fontSize: 12 };
const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12 };
const k = (c: number) => `$${Math.round(c / 100_000)}k`;

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const dollars = (c: Cents) => (c / 100).toFixed(2);

export function StructureSummary({ r }: { r: StructureResult }) {
  const cfTone = r.cashFlowMonthly >= 0 ? "positive" : "danger";
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Efectivo total requerido" value={formatUSD(r.totalCashRequired)} hint={`Cierre ${formatUSD(r.cashToClose)}`} help="Cierre + reparaciones + reserva." />
        <Stat label="Flujo mensual" value={formatUSD(r.cashFlowMonthly)} tone={cfTone} hint={`${formatUSD(r.cashFlowAnnual)} al año`} help="NOI − servicio de deuda. No incluye amortización de capital." />
        <Stat label="Cash-on-Cash" value={formatPct(r.metrics.cashOnCash)} tone={(r.metrics.cashOnCash ?? 0) >= 0 ? undefined : "danger"} help="Flujo anual ÷ efectivo invertido (sin la reserva)." />
        <Stat label="Equity nominal" value={formatUSD(r.equityNominal)} tone={r.equityNominal < 0 ? "danger" : undefined} hint={r.equityAfterRepair !== null ? `Tras reparaciones ${formatUSD(r.equityAfterRepair)}` : undefined} help="Valor − deuda total. No es efectivo disponible." />
      </div>

      {r.warnings.length > 0 && (
        <Notice tone="warning" title="Alertas">
          <ul className="list-disc space-y-0.5 pl-5">
            {r.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Flujo mensual">
          <Row label="Renta programada" value={formatUSD(r.operating.grossScheduledMonthly)} />
          <Row label="Vacancia" value={formatUSD(-r.operating.vacancyLossMonthly)} sub />
          <Row label="Ingreso efectivo" value={formatUSD(r.operating.effectiveGrossMonthly)} />
          <Row label="Gastos operativos" value={formatUSD(-r.operating.operatingExpensesMonthly)} sub />
          <Row label="NOI" value={formatUSD(r.operating.noiMonthly)} strong />
          {r.debts.map((d) => (
            <Row key={d.debt.id} label={d.debt.label} value={formatUSD(-d.monthlyPayment)} sub />
          ))}
          <Row label="Flujo de efectivo" value={formatUSD(r.cashFlowMonthly)} strong tone={cfTone} />
        </Card>
        <Card title="Efectivo requerido">
          {r.cashBreakdown.length === 0 && <p className="text-sm text-muted">Sin efectivo inicial.</p>}
          {r.cashBreakdown.map((x) => (
            <Row key={x.label} label={x.label} value={formatUSD(x.amount)} />
          ))}
          <Row label="Total" value={formatUSD(r.totalCashRequired)} strong />
          {r.liquidityGap !== null && (
            <Row label="Liquidez restante" value={formatUSD(r.liquidityGap)} tone={r.liquidityGap < 0 ? "danger" : "positive"} />
          )}
          {r.reservesMonthsOfPayments !== null && <p className="mt-2 text-[12.5px] text-muted">La reserva cubre {r.reservesMonthsOfPayments.toFixed(1)} meses de deuda + impuestos + seguro.</p>}
        </Card>
        <Card title="Métricas">
          <Row label="Cap Rate (sobre precio)" value={formatPct(r.metrics.capRate, 2)} />
          <Row label="DSCR" value={formatRatio(r.metrics.dscr)} tone={r.metrics.dscr !== null && r.metrics.dscr < 1 ? "danger" : undefined} />
          <Row label="LTV" value={formatPct(r.metrics.ltv)} />
          <Row label="LTC" value={formatPct(r.metrics.ltc)} />
          <Row label="Debt Yield" value={formatPct(r.metrics.debtYield)} />
          <Row label="Ocupación de equilibrio" value={formatPct(r.metrics.breakEvenOccupancy)} />
          <Row label="Rent-to-Cost" value={formatPct(r.metrics.rentToCost, 2)} />
          <Row label="Recuperación" value={r.metrics.paybackMonths === null ? "No se recupera con flujo negativo" : `${r.metrics.paybackMonths} meses`} />
        </Card>
      </div>

      {r.debts.length > 0 && (
        <Card title="Obligaciones de deuda" subtitle="Cada fuente de deuda se calcula por separado.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-[12px] text-muted">
                <tr>
                  <th className="py-2 font-medium">Deuda</th>
                  <th className="font-medium">Posición</th>
                  <th className="text-right font-medium">Saldo</th>
                  <th className="text-right font-medium">Tasa</th>
                  <th className="text-right font-medium">Pago</th>
                  <th className="text-right font-medium">Interés total</th>
                  <th className="text-right font-medium">Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {r.debts.map((d) => (
                  <tr key={d.debt.id} className="border-t border-border">
                    <td className="py-2">
                      {d.debt.label}
                      {d.debt.inSellersName && <Badge tone="warning" className="ml-2">A nombre del vendedor</Badge>}
                    </td>
                    <td>{d.debt.position}.ª</td>
                    <td className="num text-right">{formatUSD(d.debt.terms.principal)}</td>
                    <td className="num text-right">{formatPct(d.debt.terms.annualRate, 3)}</td>
                    <td className="num text-right">{formatUSD(d.monthlyPayment, { decimals: true })}</td>
                    <td className="num text-right">{formatUSD(d.totalInterest)}</td>
                    <td className="num text-right">{d.balloon > 0 ? `Mes ${d.maturityMonth} · balloon ${formatUSD(d.balloon)}` : `Mes ${d.maturityMonth}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export function AmortizationView({ schedules, filename }: { schedules: { label: string; principal: Cents; schedule: Schedule }[]; filename: string }) {
  const [idx, setIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const current = schedules[idx];
  const yearly = useMemo(() => {
    if (!current) return [];
    const out: { year: number; saldo: number; interes: number; capital: number }[] = [];
    for (const row of current.schedule.rows) {
      const y = Math.ceil(row.month / 12);
      let e = out[y - 1];
      if (!e) {
        e = { year: y, saldo: 0, interes: 0, capital: 0 };
        out[y - 1] = e;
      }
      e.saldo = row.balance;
      e.interes += row.interest;
      e.capital += row.principal + row.extra;
    }
    return out;
  }, [current]);
  if (!current) return null;
  const rows = showAll ? current.schedule.rows : current.schedule.rows.slice(0, 24);

  return (
    <Card
      title="Tabla de amortización"
      subtitle={`${current.label}: interés total ${formatUSD(current.schedule.totalInterest)}${current.schedule.balloon > 0 ? ` · balloon ${formatUSD(current.schedule.balloon)} en el mes ${current.schedule.endMonth}` : ""}`}
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            downloadCsv(filename, [
              ["Deuda", "Mes", "Tasa anual", "Pago", "Interés", "Capital", "Abono extra", "Saldo"],
              ...schedules.flatMap((s) => s.schedule.rows.map((r) => [s.label, r.month, (r.annualRate * 100).toFixed(3), dollars(r.payment), dollars(r.interest), dollars(r.principal), dollars(r.extra), dollars(r.balance)])),
            ])
          }
        >
          <Download className="h-4 w-4" /> CSV
        </Button>
      }
    >
      {schedules.length > 1 && (
        <div className="mb-3">
          <Tabs label="Deuda" value={String(idx)} onChange={(v) => setIdx(Number(v))} tabs={schedules.map((s, i) => ({ id: String(i), label: s.label }))} />
        </div>
      )}
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <AreaChart data={yearly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} tickLine={false} axisLine={false} label={{ value: "Año", position: "insideBottomRight", offset: -2, fill: "var(--muted)", fontSize: 11 }} />
            <YAxis tickFormatter={k} tick={axisTick} tickLine={false} axisLine={false} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [formatUSD(v), n === "saldo" ? "Saldo" : n === "interes" ? "Interés del año" : "Capital del año"]} labelFormatter={(l) => `Año ${l}`} />
            <Area type="monotone" dataKey="saldo" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.12} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="sticky top-0 bg-surface-2 text-left text-[12px] text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Mes</th>
              <th className="px-3 text-right font-medium">Pago</th>
              <th className="px-3 text-right font-medium">Interés</th>
              <th className="px-3 text-right font-medium">Capital</th>
              <th className="px-3 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-t border-border">
                <td className="num px-3 py-1.5">{r.month}</td>
                <td className="num px-3 text-right">{formatUSD(r.payment, { decimals: true })}</td>
                <td className="num px-3 text-right">{formatUSD(r.interest, { decimals: true })}</td>
                <td className="num px-3 text-right">{formatUSD(r.principal + r.extra, { decimals: true })}</td>
                <td className="num px-3 text-right">{formatUSD(r.balance, { decimals: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {current.schedule.rows.length > 24 && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Mostrar los primeros 24 meses" : `Mostrar los ${current.schedule.rows.length} meses`}
        </Button>
      )}
    </Card>
  );
}

export function ProjectionView({ r }: { r: StructureResult }) {
  const [appreciation, setAppreciation] = useState(DEFAULT_PROJECTION.appreciation);
  const horizons = useMemo(() => projectReturns(r, { ...DEFAULT_PROJECTION, appreciation }), [r, appreciation]);
  const data = horizons.map((h) => ({ name: `${h.years} años`, flujo: h.cumulativeCashFlow, amortizacion: h.principalPaydown, apreciacion: h.appreciation }));
  return (
    <Card
      title="Retorno total a 5, 10, 15 y 30 años"
      subtitle="Separa flujo operativo, amortización de capital y apreciación hipotética. El refinanciamiento no se cuenta como ganancia."
      actions={
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          Apreciación supuesta
          <select value={appreciation} onChange={(e) => setAppreciation(Number(e.target.value))} className="h-8 rounded-md border border-border bg-surface px-2 text-text">
            {[0, 0.02, 0.03, 0.04].map((a) => (
              <option key={a} value={a}>
                {(a * 100).toFixed(0)} % anual
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="h-60 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={k} tick={axisTick} tickLine={false} axisLine={false} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [formatUSD(v), n === "flujo" ? "Flujo acumulado" : n === "amortizacion" ? "Amortización" : "Apreciación hipotética"]} />
            <Legend formatter={(v) => (v === "flujo" ? "Flujo acumulado" : v === "amortizacion" ? "Amortización" : "Apreciación hipotética")} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="flujo" stackId="a" fill="var(--chart-2)" />
            <Bar dataKey="amortizacion" stackId="a" fill="var(--chart-1)" />
            <Bar dataKey="apreciacion" stackId="a" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead className="text-left text-[12px] text-muted">
            <tr>
              <th className="py-2 font-medium">Horizonte</th>
              <th className="text-right font-medium">Flujo acumulado</th>
              <th className="text-right font-medium">Amortización</th>
              <th className="text-right font-medium">Apreciación</th>
              <th className="text-right font-medium">Total</th>
              <th className="text-right font-medium">TIR (con venta)</th>
              <th className="text-right font-medium">Equity multiple</th>
            </tr>
          </thead>
          <tbody>
            {horizons.map((h) => (
              <tr key={h.years} className="border-t border-border">
                <td className="py-1.5">{h.years} años{h.balloonsInside > 0 && <Badge tone="warning" className="ml-2">balloon</Badge>}</td>
                <td className={cx("num text-right", h.cumulativeCashFlow < 0 && "text-danger")}>{formatUSD(h.cumulativeCashFlow)}</td>
                <td className="num text-right">{formatUSD(h.principalPaydown)}</td>
                <td className="num text-right">{formatUSD(h.appreciation)}</td>
                <td className="num text-right font-semibold">{formatUSD(h.total)}</td>
                <td className="num text-right" title={h.irrWarning ?? undefined}>{formatPct(h.irr)}</td>
                <td className="num text-right">{h.equityMultiple === null ? "—" : `${h.equityMultiple.toFixed(2)}x`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-muted">
        Supuestos: renta +2.5 %/año, gastos +3 %/año, venta con 7 % de costos. Beneficios fiscales no incluidos (consulta a un CPA). Si hay balloon dentro del horizonte, se supone refinanciado al mismo costo: es un supuesto, no una garantía.
      </p>
    </Card>
  );
}

export function StressView({ tests }: { tests: StressOutcome[] }) {
  const broken = tests.filter((t) => t.breaks);
  return (
    <Card title="Pruebas de estrés" subtitle={broken.length ? `${broken.length} de ${tests.length} escenarios rompen la rentabilidad o la liquidez.` : "Ningún escenario probado rompe la inversión con estos supuestos."}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead className="text-left text-[12px] text-muted">
            <tr>
              <th className="py-2 font-medium">Escenario</th>
              <th className="px-3 text-right font-medium">Flujo mensual</th>
              <th className="px-3 text-right font-medium">DSCR</th>
              <th className="px-3 text-right font-medium">Efectivo adicional</th>
              <th className="px-3 text-right font-medium">Liquidez después</th>
              <th className="pl-3 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id} className="border-t border-border align-top">
                <td className="py-2 pr-2">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-[12px] text-muted">{t.description}</div>
                </td>
                <td className={cx("num px-3 text-right", t.cashFlowMonthly < 0 && "text-danger")}>{formatUSD(t.cashFlowMonthly)}</td>
                <td className="num px-3 text-right">{formatRatio(t.dscr)}</td>
                <td className="num px-3 text-right">{t.extraCashNeeded ? formatUSD(t.extraCashNeeded) : "—"}</td>
                <td className={cx("num px-3 text-right", (t.liquidityAfter ?? 0) < 0 && "text-danger")}>{t.liquidityAfter === null ? "Pendiente" : formatUSD(t.liquidityAfter)}</td>
                <td className="pl-3">
                  {t.breaks ? (
                    <span className="inline-flex items-start gap-1 text-danger">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{t.reasons.join(" ")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-positive">
                      <CheckCircle2 className="h-4 w-4" /> Resiste
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function riskTone(score: number | null) {
  if (score === null) return "neutral" as const;
  if (score < 25) return "positive" as const;
  if (score < 45) return "info" as const;
  if (score < 65) return "warning" as const;
  return "danger" as const;
}

export function RiskSummary({ report, onlyHeader = false }: { report: RiskReport; onlyHeader?: boolean }) {
  const tone = riskTone(report.score);
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[12.5px] text-muted">Risk Score</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num text-4xl font-semibold">{report.score ?? "—"}</span>
            <span className="text-sm text-muted">/ 100</span>
          </div>
          <Badge tone={tone} className="mt-2 capitalize">
            Riesgo {report.level}
          </Badge>
          <div className="mt-3 text-[12.5px] text-muted">Confianza del análisis</div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(report.confidence * 100)} aria-label="Confianza">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(report.confidence * 100)}%` }} />
          </div>
          <div className="num mt-1 text-[12.5px]">{Math.round(report.confidence * 100)} %</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(report.categories) as (keyof RiskReport["categories"])[]).map((c) => {
            const cat = report.categories[c];
            return (
              <div key={c} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-[12.5px] text-muted">{CATEGORY_LABEL[c]}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="num text-2xl font-semibold">{cat.score ?? "—"}</span>
                  <Badge tone={riskTone(cat.score)}>confianza {Math.round(cat.confidence * 100)} %</Badge>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className={cx("h-full rounded-full", riskTone(cat.score) === "danger" ? "bg-danger" : riskTone(cat.score) === "warning" ? "bg-warning" : "bg-positive")} style={{ width: `${cat.score ?? 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!onlyHeader && (
        <Card title="Factores y evidencia" subtitle="Metodología: promedio ponderado de los factores evaluados. Los datos faltantes reducen la confianza; nunca cuentan como riesgo cero.">
          <ul className="divide-y divide-border">
            {report.factors
              .filter((f) => f.applicable)
              .sort((a, b) => (b.evaluation?.risk ?? -1) - (a.evaluation?.risk ?? -1))
              .map((f) => (
                <li key={f.id} className="flex items-start gap-3 py-2.5">
                  {f.evaluation ? (
                    f.evaluation.risk >= 60 ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> : <CheckCircle2 className={cx("mt-0.5 h-4 w-4 shrink-0", f.evaluation.risk >= 35 ? "text-warning" : "text-positive")} />
                  ) : (
                    <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {f.label}
                      <Badge>{CATEGORY_LABEL[f.category].replace("Riesgo ", "")}</Badge>
                      <span className="text-[12px] font-normal text-muted">peso {f.weight}</span>
                    </div>
                    <div className="text-[13px] text-muted">{f.evaluation ? f.evaluation.evidence : `Sin datos: ${f.missing ?? "pendiente"}`}</div>
                  </div>
                  <span className="num shrink-0 text-sm font-semibold">{f.evaluation ? f.evaluation.risk : "—"}</span>
                </li>
              ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">{report.disclaimer}</p>
        </Card>
      )}
    </div>
  );
}
