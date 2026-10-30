"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw, Send, Sparkles } from "lucide-react";
import { PERSONAS, type Persona } from "@/domain/negotiation/personas";
import type { ChatTurn, Evaluation } from "@/domain/negotiation/evaluation";
import { updateProgress } from "@/store";
import { Badge, Button, Card, Notice, PageHeader, cx } from "@/components/ui";

type SpeechRec = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null };

function useSpeech(onText: (t: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRec | null>(null);
  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "es-US";
    r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" "));
    r.onend = () => setListening(false);
    rec.current = r;
    setSupported(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    supported,
    listening,
    toggle: () => {
      if (!rec.current) return;
      if (listening) rec.current.stop();
      else {
        rec.current.start();
        setListening(true);
      }
    },
  };
}

function EvaluationView({ e, mode }: { e: Evaluation; mode: string }) {
  const list = (title: string, items: string[], empty: string, tone?: "danger") => (
    <div>
      <div className="mb-1 text-[13px] font-semibold">{title}</div>
      {items.length ? (
        <ul className={cx("list-disc space-y-0.5 pl-5 text-[13px]", tone === "danger" && "text-danger")}>{items.map((i) => <li key={i}>{i}</li>)}</ul>
      ) : (
        <p className="text-[13px] text-muted">{empty}</p>
      )}
    </div>
  );
  return (
    <Card title="Evaluación educativa" actions={<Badge tone={mode === "ia" ? "positive" : "warning"}>{mode === "ia" ? "Evaluada con IA" : "Evaluación automática (demo)"}</Badge>}>
      <div className="flex items-baseline gap-2">
        <span className="num text-4xl font-semibold">{e.score}</span>
        <span className="text-muted">/ 100</span>
      </div>
      <p className="mt-1 text-sm">{e.summary}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {list("Preguntas bien realizadas", e.goodQuestions, "Aún no hay preguntas abiertas destacadas.")}
        {list("Necesidades identificadas", e.needsIdentified, "No identificaste necesidades todavía.")}
        {list("Información faltante", e.missingInformation, "Nada importante quedó sin descubrir.")}
        {list("Riesgos no explicados", e.unexplainedRisks, "Explicaste los riesgos principales.")}
        {list("Recomendaciones de mejora", e.improvements, "—")}
        {list("Alertas éticas", e.ethicsFlags, "Sin presión, engaño ni promesas indebidas.", "danger")}
      </div>
      <div className="mt-4 rounded-lg bg-surface-2 p-3 text-[13px]">
        <div className="mb-0.5 font-semibold">Propuesta financiera simulada</div>
        {e.simulatedProposal}
      </div>
    </Card>
  );
}

export default function NegociacionPage() {
  const [persona, setPersona] = useState<Persona>(PERSONAS[1]!);
  const [turns, setTurns] = useState<ChatTurn[]>([{ role: "assistant", content: PERSONAS[1]!.opening }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<{ e: Evaluation; mode: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const speech = useSpeech((t) => setDraft((d) => (d ? `${d} ${t}` : t)));

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const choose = (p: Persona) => {
    setPersona(p);
    setTurns([{ role: "assistant", content: p.opening }]);
    setEvaluation(null);
    setError(null);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/negotiate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personaId: persona.id, turns: next }) });
      const data = await res.json();
      setMode(data.mode ?? null);
      if (!res.ok) setError(data.error ?? "No se pudo obtener respuesta.");
      else setTurns([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  };

  const evaluate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/negotiate/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personaId: persona.id, turns }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "No se pudo evaluar.");
      setEvaluation({ e: data.evaluation, mode: data.mode });
      updateProgress((p) => ({ ...p, negotiations: [...p.negotiations, { personaId: persona.id, score: data.evaluation.score, at: new Date().toISOString(), mode: data.mode }] }));
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Simulador de Negociación AI"
        title="Practica con vendedores virtuales"
        description="Escucha primero, haz preguntas abiertas, descubre el problema real y presenta varias soluciones con sus beneficios y riesgos. Al terminar, recibe una evaluación educativa."
      />
      <Notice tone="neutral" title="Reglas de la práctica">
        Nunca ocultes una transferencia, engañes a un banco, presiones a un propietario vulnerable ni prometas resultados. El simulador detecta y señala esas conductas.
      </Notice>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <div className="text-[12.5px] font-medium text-muted">Elige un perfil de vendedor</div>
          {PERSONAS.map((p) => (
            <button key={p.id} type="button" onClick={() => choose(p)} className={cx("rounded-lg border px-3 py-2.5 text-left transition-colors", p.id === persona.id ? "border-accent bg-info-bg" : "border-border bg-surface hover:bg-surface-2")}>
              <div className="text-sm font-semibold">{p.title}</div>
              <div className="text-[12.5px] text-muted">{p.name} · {p.situation}</div>
            </button>
          ))}
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <Card
            title={`${persona.name} — ${persona.title}`}
            subtitle={persona.situation}
            actions={
              <>
                {mode && <Badge tone={mode === "ia" ? "positive" : "warning"}>{mode === "ia" ? "Respuestas con IA" : "Modo demostración"}</Badge>}
                <Button size="sm" variant="ghost" onClick={() => choose(persona)}><RotateCcw className="h-4 w-4" /> Reiniciar</Button>
              </>
            }
          >
            <div className="grid max-h-[460px] gap-3 overflow-y-auto pr-1" aria-live="polite">
              {turns.map((t, i) => (
                <div key={i} className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", t.role === "user" ? "ml-auto rounded-br-sm bg-primary text-primary-fg" : "rounded-bl-sm bg-surface-2")}>
                  {t.content}
                </div>
              ))}
              {busy && <div className="w-24 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted">…</div>}
              <div ref={bottom} />
            </div>
            {error && <div className="mt-3"><Notice tone="danger">{error}</Notice></div>}
            <form
              className="mt-4 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label htmlFor="msg" className="sr-only">Tu mensaje</label>
              <textarea
                id="msg"
                rows={2}
                maxLength={2000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Escribe como lo dirías por teléfono. Ej.: ¿Qué es lo más importante para usted en esta venta?"
                className="min-h-[44px] flex-1 resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
              {speech.supported && (
                <Button variant="secondary" aria-label={speech.listening ? "Detener dictado" : "Dictar por voz"} onClick={speech.toggle}>
                  {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" disabled={busy || turns.filter((t) => t.role === "user").length < 1} onClick={evaluate}>
                <Sparkles className="h-4 w-4" /> Terminar y evaluar
              </Button>
            </div>
          </Card>
          {evaluation && <EvaluationView e={evaluation.e} mode={evaluation.mode} />}
        </div>
      </div>
    </>
  );
}
