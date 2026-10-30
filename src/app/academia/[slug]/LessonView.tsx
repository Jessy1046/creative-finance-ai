"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import { CATEGORY_INFO } from "@/domain/academy/catalog";
import { LESSON_BY_SLUG } from "@/domain/academy/lessons";
import { updateProgress, useStore } from "@/store";
import { openCase } from "@/components/property/PropertyPicker";
import { Badge, Button, Card, Disclaimer, PageHeader, cx } from "@/components/ui";

function List({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-muted">No aplica.</p>;
  return <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

export function LessonView({ slug }: { slug: string }) {
  const l = LESSON_BY_SLUG[slug]!;
  const router = useRouter();
  const { progress } = useStore();
  const [answers, setAnswers] = useState<(number | null)[]>(l.quiz.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const done = progress.lessonsCompleted.includes(slug);
  const correct = answers.filter((a, i) => a === l.quiz[i]!.answer).length;

  const submit = () => {
    setSubmitted(true);
    updateProgress((p) => ({
      ...p,
      quizScores: { ...p.quizScores, [slug]: { correct, total: l.quiz.length, at: new Date().toISOString() } },
      lessonsCompleted: correct / l.quiz.length >= 0.7 && !p.lessonsCompleted.includes(slug) ? [...p.lessonsCompleted, slug] : p.lessonsCompleted,
    }));
  };

  return (
    <>
      <Link href="/academia" className="no-print mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" /> Academia
      </Link>
      <PageHeader
        eyebrow={CATEGORY_INFO[l.category].label}
        title={l.title}
        description={<><span className="italic">{l.term}</span> · Nivel {l.level} · {l.minutes} min · Actualizado {l.updatedAt}</>}
        actions={
          <>
            {done && <Badge tone="positive"><CheckCircle2 className="h-3.5 w-3.5" /> Completada</Badge>}
            <Link href={`/laboratorio?tab=${l.simulator}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg hover:brightness-110">
              <FlaskConical className="h-4 w-4" /> Simulación editable
            </Link>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-4">
          <Card title="Qué es"><p className="text-[15px] leading-relaxed">{l.whatIs}</p></Card>
          <Card title="Cómo funciona">
            <ol className="grid gap-2">
              {l.howItWorks.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm leading-relaxed">
                  <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-info-bg text-[12px] font-semibold text-accent">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Cuándo utilizarla"><List items={l.whenToUse} /></Card>
            <Card title="Para qué vendedor es adecuada"><List items={l.sellerProfile} /><p className="mt-3 text-sm"><b>Problema que resuelve:</b> {l.problemSolved}</p></Card>
            <Card title="Ventajas para el vendedor"><List items={l.sellerAdvantages} /></Card>
            <Card title="Ventajas para el comprador"><List items={l.buyerAdvantages} /></Card>
            <Card title="Riesgos para el vendedor"><List items={l.sellerRisks} /></Card>
            <Card title="Riesgos para el comprador"><List items={l.buyerRisks} /></Card>
            <Card title="Requisitos financieros"><List items={l.financialRequirements} /></Card>
            <Card title="Requisitos legales"><List items={l.legalRequirements} /></Card>
          </div>
          <Card title={`Ejemplo con números: ${l.example.title}`}>
            <dl className="divide-y divide-border">
              {l.example.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 text-sm"><dt>{k}</dt><dd className="num text-right">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-2 text-[12.5px] text-muted">{l.example.note}</p>
          </Card>

          <Card title="Preguntas de evaluación" subtitle="Aprueba con 70 % o más para marcar la lección como completada.">
            <div className="grid gap-5">
              {l.quiz.map((q, qi) => (
                <fieldset key={q.q}>
                  <legend className="mb-2 text-sm font-semibold">{qi + 1}. {q.q}</legend>
                  <div className="grid gap-1.5">
                    {q.options.map((o, oi) => {
                      const selected = answers[qi] === oi;
                      const isRight = submitted && oi === q.answer;
                      const isWrong = submitted && selected && oi !== q.answer;
                      return (
                        <label key={o} className={cx("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm", isRight ? "border-positive bg-positive-bg" : isWrong ? "border-danger bg-danger-bg" : selected ? "border-accent bg-info-bg" : "border-border hover:bg-surface-2")}>
                          <input type="radio" name={`q${qi}`} checked={selected} disabled={submitted} onChange={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))} />
                          {o}
                          {isRight && <CheckCircle2 className="ml-auto h-4 w-4 text-positive" />}
                          {isWrong && <XCircle className="ml-auto h-4 w-4 text-danger" />}
                        </label>
                      );
                    })}
                  </div>
                  {submitted && <p className="mt-1.5 text-[13px] text-muted">{q.explain}</p>}
                </fieldset>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              {!submitted ? (
                <Button disabled={answers.some((a) => a === null)} onClick={submit}>Calificar</Button>
              ) : (
                <>
                  <span className="text-sm font-semibold">{correct} de {l.quiz.length} correctas</span>
                  <Button variant="secondary" onClick={() => { setAnswers(l.quiz.map(() => null)); setSubmitted(false); }}>Intentar de nuevo</Button>
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card title="Caso práctico">
            <div className="text-sm font-semibold">{l.practiceCase.title}</div>
            <p className="mt-1 text-sm text-muted">{l.practiceCase.scenario}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{l.practiceCase.tasks.map((t) => <li key={t}>{t}</li>)}</ol>
            {l.practiceCase.caseId && (
              <Button className="mt-3 w-full" variant="secondary" onClick={() => { openCase(l.practiceCase.caseId!); router.push("/ingeniero"); }}>
                Abrir el caso en el Ingeniero de Tratos
              </Button>
            )}
          </Card>
          <Card title="Checklist de debida diligencia">
            <ul className="grid gap-1.5">
              {l.checklist.map((c) => (
                <li key={c}>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5" checked={checked.includes(c)} onChange={(e) => setChecked(e.target.checked ? [...checked, c] : checked.filter((x) => x !== c))} />
                    {c}
                  </label>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Posibles estrategias de salida"><List items={l.exits} /></Card>
          <Card title="Fuentes">
            <ul className="space-y-1.5 text-[13px]">
              {l.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{s.label}</a></li>)}
            </ul>
            <p className="mt-2 text-[12px] text-muted">La viabilidad legal depende del estado, el uso de la propiedad, el tipo de crédito y los contratos.</p>
          </Card>
          <Disclaimer />
        </div>
      </div>
    </>
  );
}
