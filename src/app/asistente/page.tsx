"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import type { ChatTurn } from "@/domain/negotiation/evaluation";
import { useCurrentProperty } from "@/store";
import { PropertyPicker } from "@/components/property/PropertyPicker";
import { Badge, Button, Card, Notice, PageHeader, cx } from "@/components/ui";

interface Msg extends ChatTurn {
  sources?: { title: string; updatedAt: string; lesson: string; links: { label: string; url: string }[] }[];
  excerpts?: { title: string; text: string }[];
  mode?: string;
}

const SUGGESTIONS = [
  "¿Qué es Subject-To?",
  "¿Cuándo me conviene Seller Financing?",
  "¿Qué es una hipoteca wrap?",
  "¿Cómo calculo un balloon?",
  "¿Qué estrategia requiere menos capital?",
  "¿Qué pasa si no puedo refinanciar?",
  "¿Por qué mi cash flow es negativo?",
  "¿Cómo presento una oferta al vendedor?",
  "¿Cómo comparo dos estrategias?",
];

export default function AsistentePage() {
  const property = useCurrentProperty();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turns: next.slice(-12).map(({ role, content }) => ({ role, content })), property }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "No se pudo obtener respuesta.");
      else setMsgs([...next, { role: "assistant", content: data.answer, sources: data.sources, excerpts: data.excerpts, mode: data.mode }]);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Asistente AI"
        title="Tutor de financiamiento creativo"
        description="Pregunta sobre estrategias o sobre los números de la propiedad activa. El tutor usa los resultados del motor de cálculo y el contenido aprobado de la academia, con fuentes y fecha de actualización."
      />
      <PropertyPicker />
      <div className="mt-4">
        <Notice tone="neutral">
          {property ? <>Contexto: <b>{property.name}</b>. Las cifras se recalculan en el servidor con el motor; el asistente no las inventa.</> : "Sin propiedad activa: el tutor responderá solo preguntas generales."} El asistente no es abogado, prestamista, asesor fiscal ni asesor financiero autorizado.
        </Notice>
      </div>
      <Card className="mt-4">
        <div className="grid max-h-[560px] min-h-[240px] gap-4 overflow-y-auto pr-1" aria-live="polite">
          {msgs.length === 0 && (
            <div className="grid gap-3">
              <p className="text-sm text-muted">Prueba con una de estas preguntas:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1.5 text-[13px] hover:bg-surface-2">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cx("max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed", m.role === "user" ? "ml-auto rounded-br-sm bg-primary text-primary-fg" : "rounded-bl-sm bg-surface-2")}>
              {m.mode === "demo" && <Badge tone="warning" className="mb-2">Modo demostración</Badge>}
              <div className="whitespace-pre-line">{m.content}</div>
              {m.excerpts && m.excerpts.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {m.excerpts.map((x) => (
                    <div key={x.title} className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[12.5px] font-semibold">{x.title}</div>
                      <div className="text-[13px] text-muted">{x.text}</div>
                    </div>
                  ))}
                </div>
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 border-t border-border pt-2 text-[12px] text-muted">
                  <div className="font-semibold">Fuentes de la academia</div>
                  <ul className="mt-1 space-y-0.5">
                    {m.sources.map((s) => (
                      <li key={s.title}>
                        {s.lesson !== "catalogo" ? <Link href={`/academia/${s.lesson}`} className="text-accent hover:underline">{s.title}</Link> : s.title} · actualizado {s.updatedAt}
                        {s.links.map((l) => (
                          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ml-2 text-accent hover:underline">{l.label}</a>
                        ))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
            ask(draft);
          }}
        >
          <label htmlFor="q" className="sr-only">Tu pregunta</label>
          <textarea
            id="q"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
            placeholder="Ej.: ¿Por qué mi DSCR es menor a 1.2 en esta propiedad?"
            className="min-h-[44px] flex-1 resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </>
  );
}
