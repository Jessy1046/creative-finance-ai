"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CATALOG, CATEGORY_INFO, type Level, type StrategyCategory } from "@/domain/academy/catalog";
import { LESSONS } from "@/domain/academy/lessons";
import { useStore } from "@/store";
import { Badge, Card, Notice, PageHeader, cx } from "@/components/ui";

const LEVEL_TONE = { principiante: "positive", intermedio: "info", avanzado: "warning" } as const;
const PATH = ["Vocabulario", "Análisis financiero", "Estrategias", "Negociación", "Riesgos", "Estructuración", "Debida diligencia", "Presentación de propuestas"];

export default function AcademiaPage() {
  const { progress } = useStore();
  const [level, setLevel] = useState<Level | "todos">("todos");
  const [cat, setCat] = useState<StrategyCategory | "todas">("todas");
  const list = useMemo(() => CATALOG.filter((c) => (level === "todos" || c.level === level) && (cat === "todas" || c.category === cat)), [level, cat]);

  return (
    <>
      <PageHeader
        eyebrow="Academia Creativa"
        title="Aprende a comprar propiedades de diferentes maneras"
        description="Domina los números y toma decisiones respaldadas por conocimiento. Cada lección completa incluye qué es, cómo funciona, ventajas y riesgos para ambas partes, ejemplo con números, simulación editable, examen, caso práctico, checklist y salidas."
      />

      <Card title="Ruta recomendada" subtitle="El estudiante domina progresivamente estas etapas.">
        <ol className="flex flex-wrap gap-2">
          {PATH.map((p, i) => (
            <li key={p} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[13px]">
              <span className="num grid h-5 w-5 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold">{i + 1}</span>
              {p}
            </li>
          ))}
        </ol>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Lecciones completas</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((l) => {
          const done = progress.lessonsCompleted.includes(l.slug);
          const quiz = progress.quizScores[l.slug];
          return (
            <Link key={l.slug} href={`/academia/${l.slug}`} className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent">
              <div className="flex items-center gap-2">
                <Badge tone={LEVEL_TONE[l.level]} className="capitalize">{l.level}</Badge>
                <Badge>{CATEGORY_INFO[l.category].label}</Badge>
                {done && <CheckCircle2 aria-label="Completada" className="ml-auto h-4 w-4 text-positive" />}
              </div>
              <div className="mt-3 font-semibold">{l.title}</div>
              <p className="mt-1 line-clamp-3 text-[13px] text-muted">{l.whatIs}</p>
              <div className="mt-auto flex items-center justify-between pt-3 text-[12.5px] text-muted">
                <span>{l.minutes} min · {l.quiz.length} preguntas{quiz ? ` · ${quiz.correct}/${quiz.total}` : ""}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-1 mt-10 text-lg font-semibold">Catálogo de 40 estrategias</h2>
      <p className="mb-3 text-sm text-muted">Clasificadas por su función real: no todas son equivalentes. La viabilidad legal depende del estado, el uso de la propiedad, el tipo de crédito, la regulación y los contratos.</p>
      <div className="no-print mb-4 flex flex-wrap gap-2">
        {(["todos", "principiante", "intermedio", "avanzado"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l} className={cx("rounded-full border px-3 py-1 text-[13px] capitalize", level === l ? "border-accent bg-info-bg font-semibold" : "border-border hover:bg-surface-2")}>
            {l}
          </button>
        ))}
        <span className="mx-1 w-px bg-border" />
        <button type="button" onClick={() => setCat("todas")} aria-pressed={cat === "todas"} className={cx("rounded-full border px-3 py-1 text-[13px]", cat === "todas" ? "border-accent bg-info-bg font-semibold" : "border-border hover:bg-surface-2")}>
          Todas
        </button>
        {(Object.keys(CATEGORY_INFO) as StrategyCategory[]).map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={cx("rounded-full border px-3 py-1 text-[13px]", cat === c ? "border-accent bg-info-bg font-semibold" : "border-border hover:bg-surface-2")}>
            {CATEGORY_INFO[c].label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <ul className="divide-y divide-border">
          {list.map((c) => (
            <li key={c.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <div className="font-medium">{c.name}</div>
                <div className="text-[12px] text-muted">{CATEGORY_INFO[c.category].label}{c.term ? ` · ${c.term}` : ""}</div>
              </div>
              <p className="text-[13px] text-muted">{c.summary}</p>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge tone={LEVEL_TONE[c.level]} className="capitalize">{c.level}</Badge>
                {c.lesson ? (
                  <Link href={`/academia/${c.lesson}`} className="text-[13px] font-medium text-accent hover:underline">Lección</Link>
                ) : (
                  <span className="text-[12px] text-muted">Lección en preparación</span>
                )}
                {c.simulator && <Link href={`/laboratorio?tab=${c.simulator}`} className="text-[13px] font-medium text-accent hover:underline">Simular</Link>}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <Notice tone="neutral">Las lecciones son inspiración educativa general basada en documentación regulatoria pública. No reproducen cursos ni materiales propietarios.</Notice>
      </div>
    </>
  );
}
