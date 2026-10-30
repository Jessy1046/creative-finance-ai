"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, FileText, Star, Trash2 } from "lucide-react";
import { analyzeProperty } from "@/domain/property/analyze";
import { formatPct, formatUSD } from "@/domain/money";
import { repo, setCurrent, useStore } from "@/store";
import { createProperty, openCase } from "@/components/property/PropertyPicker";
import { Badge, Button, Card, EmptyState, Notice, PageHeader } from "@/components/ui";

export default function PropiedadesPage() {
  const { properties } = useStore();
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        eyebrow="Mis Propiedades"
        title="Propiedades y oportunidades"
        description="Todo se guarda en este navegador. La sincronización en la nube con cuenta de usuario llegará con la autenticación (fase 2)."
        actions={<Link href="/analizar" onClick={() => createProperty()} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg hover:brightness-110">Nueva propiedad</Link>}
      />
      {properties.length === 0 ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="No hay propiedades guardadas" action={<Button onClick={() => openCase("caso-b")}>Cargar el Caso B</Button>}>
          Analiza una propiedad o carga un caso de práctica.
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {properties.map((p) => {
            const a = analyzeProperty(p);
            return (
              <Card key={p.id}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href="/analizar" onClick={() => setCurrent(p.id)} className="font-semibold hover:text-accent">{p.name}</Link>
                      {p.saved && <Badge tone="warning"><Star className="h-3 w-3" fill="currentColor" /> Guardada</Badge>}
                      {p.caseId && <Badge tone="info">Caso de práctica · datos simulados</Badge>}
                      {!a.operationalComplete && <Badge tone="warning">{a.missing.operacion.length} datos pendientes</Badge>}
                    </div>
                    <div className="text-[12.5px] text-muted">{p.propertyType} · {p.units} unidad(es) · {[p.address.city, p.address.state].filter(Boolean).join(", ") || "Ubicación pendiente"} · actualizado {new Date(p.updatedAt).toLocaleDateString("es-US")}</div>
                  </div>
                  <div className="num grid grid-cols-3 gap-4 text-right text-sm">
                    <div><div className="text-[11.5px] text-muted">Precio</div>{formatUSD(a.price)}</div>
                    <div><div className="text-[11.5px] text-muted">NOI/mes</div>{formatUSD(a.operating.noiMonthly)}</div>
                    <div><div className="text-[11.5px] text-muted">Cap</div>{formatPct(a.capRate, 2)}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" aria-label={p.saved ? "Quitar de guardadas" : "Guardar oportunidad"} onClick={() => repo.save({ ...p, saved: !p.saved })}><Star className="h-4 w-4" fill={p.saved ? "currentColor" : "none"} /></Button>
                    <Link href={`/reporte?id=${p.id}`} aria-label="Reporte" className="inline-flex h-8 items-center rounded-lg px-3 text-muted hover:bg-surface-2 hover:text-text"><FileText className="h-4 w-4" /></Link>
                    <Button size="sm" variant="ghost" aria-label="Eliminar" onClick={() => setConfirm(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {confirm === p.id && (
                  <div className="mt-3">
                    <Notice tone="danger" title={`¿Eliminar «${p.name}»?`}>
                      Esta acción no se puede deshacer.
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="danger" onClick={() => { repo.remove(p.id); setConfirm(null); }}>Eliminar</Button>
                        <Button size="sm" variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button>
                      </div>
                    </Notice>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
