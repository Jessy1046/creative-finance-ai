"use client";

import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { CASES } from "@/domain/academy/cases";
import { newProperty } from "@/domain/property/model";
import { repo, setCurrent, updateProgress, useStore } from "@/store";
import { Button, EmptyState } from "@/components/ui";

export function openCase(caseId: string) {
  const c = CASES.find((x) => x.id === caseId);
  if (!c) return;
  const existing = repo.get(`case_${caseId}`);
  if (existing) setCurrent(existing.id);
  else repo.save(c.record());
  updateProgress((p) => (p.casesOpened.includes(caseId) ? p : { ...p, casesOpened: [...p.casesOpened, caseId] }));
}

export function createProperty() {
  const p = newProperty({ name: `Propiedad ${repo.list().length + 1}` });
  repo.save(p);
  return p;
}

/** Selector de la propiedad activa, compartido por analizador, comparador, ingeniero, riesgos y asistente. */
export function PropertyPicker() {
  const { properties, currentId } = useStore();
  return (
    <div className="no-print flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1">
        <label htmlFor="picker" className="mb-1 block text-[12.5px] font-medium text-muted">
          Propiedad activa
        </label>
        <select
          id="picker"
          value={currentId ?? ""}
          onChange={(e) => setCurrent(e.target.value || null)}
          className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">Selecciona una propiedad…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[200px]">
        <label htmlFor="case-picker" className="mb-1 block text-[12.5px] font-medium text-muted">
          Cargar caso de práctica
        </label>
        <select
          id="case-picker"
          value=""
          onChange={(e) => e.target.value && openCase(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">Elegir caso…</option>
          {CASES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      <Button variant="secondary" onClick={() => createProperty()}>
        <Plus className="h-4 w-4" /> Nueva
      </Button>
    </div>
  );
}

export function NoProperty({ what }: { what: string }) {
  return (
    <EmptyState
      icon={<Building2 className="h-8 w-8" />}
      title="Elige una propiedad para empezar"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => openCase("caso-a")}>Abrir el Caso A de práctica</Button>
          <Link href="/analizar" className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">
            Analizar una propiedad nueva
          </Link>
        </div>
      }
    >
      {what} usa los datos de la propiedad activa. Selecciona una arriba, carga un caso de práctica o crea una nueva.
    </EmptyState>
  );
}
