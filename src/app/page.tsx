"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight, BookOpen, Building2, Calculator, Handshake, Star } from "lucide-react";
import { LESSONS } from "@/domain/academy/lessons";
import { CASES } from "@/domain/academy/cases";
import { analyzeProperty } from "@/domain/property/analyze";
import { assessRisk } from "@/domain/risk/engine";
import { formatPct, formatUSD } from "@/domain/money";
import { setCurrent, useStore } from "@/store";
import { openCase } from "@/components/property/PropertyPicker";
import { riskTone } from "@/components/finance/views";
import { Badge, Button, Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export default function Dashboard() {
  const { properties, progress } = useStore();
  const rows = useMemo(
    () =>
      properties.map((p) => {
        const a = analyzeProperty(p);
        const risk = assessRisk(p, a.subjectToPreview);
        return { p, a, risk };
      }),
    [properties],
  );
  const alerts = rows.flatMap(({ p, a, risk }) => {
    const out: { id: string; text: string; tone: "danger" | "warning" }[] = [];
    if (a.operating.noiMonthly < 0 && a.operationalComplete) out.push({ id: `${p.id}-noi`, text: `${p.name}: el NOI es negativo.`, tone: "danger" });
    if (a.subjectToPreview && a.subjectToPreview.cashFlowMonthly < 0) out.push({ id: `${p.id}-cf`, text: `${p.name}: flujo negativo con la deuda existente.`, tone: "danger" });
    if ((risk.score ?? 0) >= 60) out.push({ id: `${p.id}-risk`, text: `${p.name}: Risk Score ${risk.score}/100.`, tone: "warning" });
    if (!a.operationalComplete) out.push({ id: `${p.id}-data`, text: `${p.name}: faltan ${a.missing.operacion.length} datos operativos.`, tone: "warning" });
    return out;
  });
  const inProgress = LESSONS.filter((l) => progress.quizScores[l.slug] && !progress.lessonsCompleted.includes(l.slug));
  const next = LESSONS.find((l) => !progress.lessonsCompleted.includes(l.slug));
  const saved = rows.filter((r) => r.p.saved);

  return (
    <>
      <PageHeader
        eyebrow="Mi Dashboard"
        title="Aprende, negocia, calcula, compara y decide"
        description="Tu centro de trabajo: propiedades analizadas, cursos en progreso, oportunidades guardadas y alertas de riesgo."
        actions={
          <Link href="/analizar" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg hover:brightness-110">
            <Calculator className="h-4 w-4" /> Analizar propiedad
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Propiedades analizadas" value={properties.length} />
        <Stat label="Oportunidades guardadas" value={saved.length} />
        <Stat label="Lecciones completadas" value={`${progress.lessonsCompleted.length} / ${LESSONS.length}`} />
        <Stat label="Negociaciones practicadas" value={progress.negotiations.length} hint={progress.negotiations.length ? `Último puntaje ${progress.negotiations.at(-1)!.score}` : undefined} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Propiedades analizadas" actions={<Link href="/propiedades" className="text-sm text-accent hover:underline">Ver todas</Link>}>
          {rows.length === 0 ? (
            <EmptyState icon={<Building2 className="h-8 w-8" />} title="Aún no has analizado propiedades" action={<Button onClick={() => openCase("caso-a")}>Empezar con el Caso A</Button>}>
              Carga un caso de práctica o analiza tu primera propiedad.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-[12px] text-muted">
                  <tr>
                    <th className="py-2 font-medium">Propiedad</th>
                    <th className="text-right font-medium">Precio</th>
                    <th className="text-right font-medium">NOI / mes</th>
                    <th className="text-right font-medium">Cap Rate</th>
                    <th className="text-right font-medium">Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map(({ p, a, risk }) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2">
                        <Link href="/analizar" onClick={() => setCurrent(p.id)} className="font-medium hover:text-accent">
                          {p.saved && <Star className="mr-1 inline h-3.5 w-3.5 text-warning" fill="currentColor" />}
                          {p.name}
                        </Link>
                        <div className="text-[12px] text-muted">{p.propertyType}{p.caseId ? " · caso de práctica" : ""}</div>
                      </td>
                      <td className="num text-right">{formatUSD(a.price)}</td>
                      <td className="num text-right">{formatUSD(a.operating.noiMonthly)}</td>
                      <td className="num text-right">{formatPct(a.capRate, 2)}</td>
                      <td className="text-right"><Badge tone={riskTone(risk.score)}>{risk.score ?? "—"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card title="Alertas de riesgo">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted">Sin alertas. Las alertas aparecen cuando una propiedad tiene flujo negativo, riesgo alto o datos faltantes.</p>
            ) : (
              <ul className="grid gap-2">
                {alerts.slice(0, 6).map((al) => (
                  <li key={al.id} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${al.tone === "danger" ? "text-danger" : "text-warning"}`} />
                    {al.text}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Cursos en progreso">
            {inProgress.length > 0 ? (
              <ul className="grid gap-2">
                {inProgress.map((l) => (
                  <li key={l.slug}><Link href={`/academia/${l.slug}`} className="flex items-center justify-between text-sm hover:text-accent">{l.title}<span className="num text-muted">{progress.quizScores[l.slug]!.correct}/{progress.quizScores[l.slug]!.total}</span></Link></li>
                ))}
              </ul>
            ) : next ? (
              <Link href={`/academia/${next.slug}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-2">
                <span><BookOpen className="mr-2 inline h-4 w-4 text-accent" />Siguiente: {next.title}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <p className="text-sm text-positive">Completaste todas las lecciones disponibles.</p>
            )}
          </Card>
          <Card title="Practica una negociación">
            <Link href="/negociacion" className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-2">
              <span><Handshake className="mr-2 inline h-4 w-4 text-accent" />9 vendedores virtuales</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Biblioteca de casos de práctica</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CASES.map((c) => (
          <button key={c.id} type="button" onClick={() => openCase(c.id)} className="flex flex-col rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent">
            <div className="text-sm font-semibold">{c.title}</div>
            <p className="mt-1 text-[12.5px] text-muted">{c.summary}</p>
            <div className="mt-auto flex flex-wrap gap-1 pt-3">{c.focus.map((f) => <Badge key={f}>{f}</Badge>)}</div>
            {progress.casesOpened.includes(c.id) && <span className="mt-2 text-[12px] text-positive">Abierto · editable en el analizador</span>}
          </button>
        ))}
      </div>
    </>
  );
}
