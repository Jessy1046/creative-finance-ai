"use client";

import { Wand2 } from "lucide-react";
import { FIELD_DEFS, PROPERTY_TYPES, PROVENANCES, PROVENANCE_LABEL, applyAssumption, type FieldDef, type NumberKey, type PropertyRecord, type Provenance } from "@/domain/property/model";
import { Card, NumberField, Select, TextField, cx } from "@/components/ui";

const GROUPS: { id: FieldDef["group"]; title: string; subtitle: string }[] = [
  { id: "precio", title: "Precio y valor", subtitle: "Nunca inventamos valores de mercado: usa avalúos o comparables verificados." },
  { id: "ingresos", title: "Ingresos", subtitle: "Rentas actuales y proyectadas de todas las unidades." },
  { id: "gastos", title: "Gastos operativos", subtitle: "Los porcentajes se aplican sobre la renta." },
  { id: "costos", title: "Costos de compra y reparación", subtitle: "" },
  { id: "deuda", title: "Deuda existente", subtitle: "Del estado de cuenta del vendedor y del reporte de título." },
  { id: "inversionista", title: "Tu capital", subtitle: "Para medir liquidez y reservas." },
];

const SOURCE_TONE: Record<Provenance, string> = {
  verificado: "text-positive",
  usuario: "text-muted",
  estimado: "text-warning",
  simulado: "text-accent",
};

export function PropertyForm({ value, onChange }: { value: PropertyRecord; onChange: (p: PropertyRecord) => void }) {
  const setField = (key: NumberKey, v: number | null) => {
    const prev = value.numbers[key];
    // Al editar, el dato pasa a "introducido por el usuario" salvo que ya estuviera marcado como verificado.
    const source: Provenance = prev.source === "verificado" ? "verificado" : prev.source === "simulado" ? "simulado" : "usuario";
    onChange({ ...value, numbers: { ...value.numbers, [key]: { value: v, source } }, updatedAt: new Date().toISOString() });
  };
  const setSource = (key: NumberKey, source: Provenance) =>
    onChange({ ...value, numbers: { ...value.numbers, [key]: { ...value.numbers[key], source } } });

  return (
    <div className="grid gap-4">
      <Card title="Identificación" subtitle="Carga manual. Las fuentes de datos inmobiliarios autorizadas se conectarán en una fase posterior.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Nombre" value={value.name} onChange={(name) => onChange({ ...value, name })} />
          <TextField label="Dirección" value={value.address.line} onChange={(line) => onChange({ ...value, address: { ...value.address, line } })} />
          <div className="grid grid-cols-[1fr_80px_100px] gap-2">
            <TextField label="Ciudad" value={value.address.city} onChange={(city) => onChange({ ...value, address: { ...value.address, city } })} />
            <TextField label="Estado" value={value.address.state} maxLength={2} onChange={(state) => onChange({ ...value, address: { ...value.address, state: state.toUpperCase() } })} />
            <TextField label="ZIP" value={value.address.zip} maxLength={10} onChange={(zip) => onChange({ ...value, address: { ...value.address, zip } })} />
          </div>
          <Select label="Tipo de propiedad" value={value.propertyType} onChange={(propertyType) => onChange({ ...value, propertyType })} options={PROPERTY_TYPES.map((t) => ({ value: t, label: t }))} />
          <NumberField label="Unidades" kind="int" value={value.units} min={1} onChange={(u) => onChange({ ...value, units: Math.max(1, u ?? 1) })} />
        </div>
      </Card>

      {GROUPS.map((g) => (
        <Card key={g.id} title={g.title} subtitle={g.subtitle || undefined}>
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {FIELD_DEFS.filter((f) => f.group === g.id).map((f) => {
              const field = value.numbers[f.key];
              const pending = field.value === null;
              return (
                <div key={f.key} className="min-w-0">
                  <NumberField
                    label={f.label}
                    term={f.term}
                    help={f.help}
                    kind={f.kind === "rate" ? "percent" : f.kind === "count" || f.kind === "months" ? "int" : "money"}
                    value={field.value}
                    allowNull
                    onChange={(v) => setField(f.key, v)}
                  />
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11.5px]">
                    {pending ? (
                      <span className="font-medium text-warning">Pendiente de verificar{f.critical ? " · crítico" : ""}</span>
                    ) : (
                      <label className="flex items-center gap-1">
                        <span className="sr-only">Procedencia de {f.label}</span>
                        <select value={field.source} onChange={(e) => setSource(f.key, e.target.value as Provenance)} className={cx("rounded border-0 bg-transparent p-0 text-[11.5px] font-medium outline-none", SOURCE_TONE[field.source])}>
                          {PROVENANCES.map((p) => (
                            <option key={p} value={p}>
                              {PROVENANCE_LABEL[p]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {pending && f.assumption !== null && (
                      <button type="button" onClick={() => onChange(applyAssumption(value, f.key))} className="inline-flex items-center gap-1 text-accent hover:underline" title={f.assumptionNote}>
                        <Wand2 className="h-3 w-3" /> Usar supuesto: {f.assumptionNote}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
