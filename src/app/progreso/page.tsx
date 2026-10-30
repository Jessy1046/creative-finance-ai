"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { LESSONS } from "@/domain/academy/lessons";
import { CASES } from "@/domain/academy/cases";
import { PERSONA_BY_ID } from "@/domain/negotiation/personas";
import { useStore } from "@/store";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";

export default function ProgresoPage() {
  const { progress } = useStore();
  const pct = Math.round((progress.lessonsCompleted.length / LESSONS.length) * 100);
  const avgNeg = progress.negotiations.length ? Math.round(progress.negotiations.reduce((s, n) => s + n.score, 0) / progress.negotiations.length) : null;
  return (
    <>
      <PageHeader eyebrow="Mi Progreso" title="Tu avance en la academia" description="Lecciones, exámenes, casos y negociaciones. Se guarda en este navegador." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Ruta completada" value={`${pct} %`} />
        <Stat label="Lecciones aprobadas" value={`${progress.lessonsCompleted.length} / ${LESSONS.length}`} />
        <Stat label="Casos abiertos" value={`${progress.casesOpened.length} / ${CASES.length}`} />
        <Stat label="Promedio en negociación" value={avgNeg ?? "—"} hint={`${progress.negotiations.length} prácticas`} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Lecciones">
          <ul className="divide-y divide-border">
            {LESSONS.map((l) => {
              const done = progress.lessonsCompleted.includes(l.slug);
              const q = progress.quizScores[l.slug];
              return (
                <li key={l.slug} className="flex items-center gap-3 py-2.5 text-sm">
                  {done ? <CheckCircle2 className="h-4 w-4 text-positive" /> : <Circle className="h-4 w-4 text-muted" />}
                  <Link href={`/academia/${l.slug}`} className="flex-1 hover:text-accent">{l.title}</Link>
                  {q ? <Badge tone={done ? "positive" : "warning"}>{q.correct}/{q.total}</Badge> : <Badge>Sin examen</Badge>}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="Negociaciones recientes">
          {progress.negotiations.length === 0 ? (
            <p className="text-sm text-muted">Aún no has practicado. <Link href="/negociacion" className="text-accent hover:underline">Empieza una negociación</Link>.</p>
          ) : (
            <ul className="divide-y divide-border">
              {[...progress.negotiations].reverse().slice(0, 10).map((n, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{PERSONA_BY_ID[n.personaId]?.title ?? n.personaId}<span className="ml-2 text-[12px] text-muted">{new Date(n.at).toLocaleDateString("es-US")}</span></span>
                  <span className="flex items-center gap-2"><Badge tone={n.mode === "ia" ? "positive" : "warning"}>{n.mode === "ia" ? "IA" : "demo"}</Badge><span className="num font-semibold">{n.score}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-6">
        <Notice tone="neutral" title="Certificados y retos semanales">Los certificados educativos de finalización, los retos semanales y las rutas personalizadas requieren cuentas de usuario y se habilitarán en la fase 2.</Notice>
      </div>
    </>
  );
}
