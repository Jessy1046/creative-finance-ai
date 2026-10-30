"use client";

import Link from "next/link";
import { useMemo } from "react";
import { availableKinds, defaultParams, evaluateProposal, PROPOSAL_LABEL } from "@/domain/strategies/dealEngineer";
import { formatUSD } from "@/domain/money";
import { useCurrentProperty } from "@/store";
import { NoProperty, PropertyPicker } from "@/components/property/PropertyPicker";
import { Card, Notice, PageHeader } from "@/components/ui";

export default function SalidaPage() {
  const property = useCurrentProperty();
  const plans = useMemo(() => (property ? availableKinds(property).filter((k) => k.available).map((k) => evaluateProposal(property, defaultParams(property, k.kind))) : []), [property]);
  return (
    <>
      <PageHeader eyebrow="Plan de Salida" title="¿Cómo recuperarías tu capital?" description="Cada estructura tiene salidas distintas y vencimientos que las condicionan. Esta vista resume las salidas que calcula el Ingeniero de Tratos para la propiedad activa." />
      <PropertyPicker />
      <div className="mt-6 grid gap-4">
        {!property ? (
          <NoProperty what="El plan de salida" />
        ) : plans.length === 0 ? (
          <Notice tone="warning">Faltan datos para proponer estructuras. Completa precio y deuda existente en el analizador.</Notice>
        ) : (
          plans.map((p) => (
            <Card key={p.params.kind} title={PROPOSAL_LABEL[p.params.kind]} subtitle={p.result.firstBalloon ? `Vencimiento crítico: ${formatUSD(p.result.firstBalloon.amount)} en el mes ${p.result.firstBalloon.month}` : "Sin balloon"}>
              <ul className="list-disc space-y-1 pl-5 text-sm">{p.exits.map((e) => <li key={e}>{e}</li>)}</ul>
              {p.worst?.breaks && <p className="mt-2 text-sm text-danger">Riesgo para la salida: {p.worst.label}. {p.worst.reasons.join(" ")}</p>}
            </Card>
          ))
        )}
        <Notice tone="neutral" title="Fase 2">El planificador completo (cronograma de salida, comparación de vender vs. refinanciar vs. mantener con impuestos estimados y 1031) está en preparación. Hoy puedes ajustar los términos en el <Link href="/ingeniero" className="text-accent hover:underline">Ingeniero de Tratos</Link>.</Notice>
      </div>
    </>
  );
}
