"use client";

import { toCents, type Cents } from "@/domain/money";
import type { OperatingInputs } from "@/domain/finance/metrics";
import { operatingFrom, resolve, type PropertyRecord } from "@/domain/property/model";
import { Card, NumberField } from "@/components/ui";

export const DEFAULT_OPERATING: OperatingInputs = {
  monthlyRent: toCents(1_900),
  otherMonthlyIncome: 0,
  vacancyRate: 0.06,
  taxesMonthly: toCents(200),
  insuranceMonthly: toCents(100),
  hoaMonthly: 0,
  utilitiesMonthly: 0,
  maintenanceRate: 0.06,
  capexRate: 0.05,
  managementRate: 0,
};

export function OperatingForm({ value, onChange }: { value: OperatingInputs; onChange: (v: OperatingInputs) => void }) {
  const set = <K extends keyof OperatingInputs>(k: K, v: OperatingInputs[K]) => onChange({ ...value, [k]: v });
  return (
    <Card title="Supuestos operativos" subtitle="Renta y gastos de la propiedad (mensuales).">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <NumberField label="Renta mensual" value={value.monthlyRent} onChange={(v) => set("monthlyRent", v ?? 0)} />
        <NumberField label="Vacancia" kind="percent" value={value.vacancyRate} onChange={(v) => set("vacancyRate", v ?? 0)} />
        <NumberField label="Impuestos / mes" value={value.taxesMonthly} onChange={(v) => set("taxesMonthly", v ?? 0)} />
        <NumberField label="Seguro / mes" value={value.insuranceMonthly} onChange={(v) => set("insuranceMonthly", v ?? 0)} />
        <NumberField label="HOA + servicios / mes" value={(value.hoaMonthly ?? 0) + (value.utilitiesMonthly ?? 0)} onChange={(v) => onChange({ ...value, hoaMonthly: v ?? 0, utilitiesMonthly: 0 })} />
        <NumberField label="Mantenimiento" kind="percent" value={value.maintenanceRate ?? 0} onChange={(v) => set("maintenanceRate", v ?? 0)} help="% de la renta" />
        <NumberField label="CapEx" kind="percent" value={value.capexRate ?? 0} onChange={(v) => set("capexRate", v ?? 0)} help="% de la renta" />
        <NumberField label="Administración" kind="percent" value={value.managementRate ?? 0} onChange={(v) => set("managementRate", v ?? 0)} help="% de la renta cobrada" />
      </div>
    </Card>
  );
}

/** Valores base desde la propiedad activa (lo que falte queda en 0 y se avisa en el analizador). */
export function fromProperty(p: PropertyRecord) {
  const { values: v } = resolve(p);
  const n = (x: number | null) => x ?? 0;
  return {
    operating: operatingFrom(v),
    price: n(v.negotiatedPrice),
    value: n(v.currentValue ?? v.negotiatedPrice),
    arv: v.arv ?? undefined,
    repairs: n(v.repairs),
    closing: n(v.closingCosts),
    balance: n(v.existingBalance),
    rate: n(v.existingRate),
    remaining: v.existingRemainingMonths ?? 360,
    payment: v.existingPayment ?? undefined,
    arrears: n(v.pastDue) + n(v.penalties),
    cash: v.cashAvailable ?? undefined,
  };
}

export type Cash = Cents;
