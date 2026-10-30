"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { toCents, type Cents, type Rate } from "@/domain/money";
import type { OperatingInputs } from "@/domain/finance/metrics";
import { hybrid, sellerFinance, subjectTo, type ExistingLoan } from "@/domain/strategies/builders";
import { evaluateStructure, type StructureInput } from "@/domain/strategies/structure";
import { runStressTests } from "@/domain/risk/stress";
import { useCurrentProperty } from "@/store";
import { AmortizationView, ProjectionView, StressView, StructureSummary } from "@/components/finance/views";
import { Button, Card, Notice, NumberField } from "@/components/ui";
import { DEFAULT_OPERATING, OperatingForm, fromProperty } from "./common";

function Results({ input, file }: { input: StructureInput; file: string }) {
  const r = useMemo(() => evaluateStructure(input), [input]);
  const stress = useMemo(() => runStressTests(input), [input]);
  return (
    <div className="grid gap-4">
      <StructureSummary r={r} />
      <AmortizationView filename={file} schedules={r.debts.map((d) => ({ label: d.debt.label, principal: d.debt.terms.principal, schedule: d.schedule }))} />
      <ProjectionView r={r} />
      <StressView tests={stress} />
    </div>
  );
}

function LoadFromProperty({ onLoad }: { onLoad: (d: ReturnType<typeof fromProperty>) => void }) {
  const p = useCurrentProperty();
  if (!p) return null;
  return (
    <Button variant="secondary" size="sm" onClick={() => onLoad(fromProperty(p))}>
      <Download className="h-4 w-4" /> Usar datos de «{p.name}»
    </Button>
  );
}

// ---------------------------------------------------------------- Subject-To

export function SubjectToSim() {
  const [value, setValue] = useState<Cents>(toCents(240_000));
  const [loan, setLoan] = useState<ExistingLoan>({ balance: toCents(180_000), annualRate: 0.0325, remainingMonths: 300 });
  const [arrears, setArrears] = useState<Cents>(toCents(3_000));
  const [sellerCash, setSellerCash] = useState<Cents>(toCents(5_000));
  const [closing, setClosing] = useState<Cents>(toCents(2_000));
  const [repairs, setRepairs] = useState<Cents>(0);
  const [reserves, setReserves] = useState<Cents>(toCents(9_000));
  const [cash, setCash] = useState<Cents | undefined>(toCents(25_000));
  const [op, setOp] = useState<OperatingInputs>(DEFAULT_OPERATING);

  const input = useMemo(
    () => subjectTo({ currentValue: value, loan, arrears, sellerCash, closingCosts: closing, repairs, reserves, operating: op, cashAvailable: cash }),
    [value, loan, arrears, sellerCash, closing, repairs, reserves, op, cash],
  );

  return (
    <div className="grid gap-4">
      <Notice tone="warning" title="Subject-To no es una asunción aprobada">
        El préstamo sigue siendo obligación personal del vendedor. El prestamista puede ejercer la cláusula due-on-sale y exigir el saldo completo. Se requieren disclosures, seguro adecuado, servicer y revisión legal en tu estado.
      </Notice>
      <Card title="Datos del trato" actions={<LoadFromProperty onLoad={(d) => { setValue(d.value); setLoan({ balance: d.balance, annualRate: d.rate, remainingMonths: d.remaining, monthlyPI: d.payment }); setArrears(d.arrears); setClosing(d.closing); setRepairs(d.repairs); setCash(d.cash); setOp(d.operating); setSellerCash(Math.max(0, d.price - d.balance - d.arrears)); }} />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Valor del inmueble" value={value} onChange={(v) => setValue(v ?? 0)} />
          <NumberField label="Saldo de la hipoteca" term="Loan balance" value={loan.balance} onChange={(v) => setLoan({ ...loan, balance: v ?? 0 })} />
          <NumberField label="Interés" kind="percent" value={loan.annualRate} onChange={(v) => setLoan({ ...loan, annualRate: v ?? 0 })} />
          <NumberField label="Plazo restante (meses)" kind="int" value={loan.remainingMonths} min={1} onChange={(v) => setLoan({ ...loan, remainingMonths: Math.max(1, v ?? 1) })} />
          <NumberField label="Pago P&I del estado de cuenta" allowNull value={loan.monthlyPI ?? null} onChange={(v) => setLoan({ ...loan, monthlyPI: v ?? undefined })} help="Opcional. Si difiere del calculado, la app lo advierte." />
          <NumberField label="Atrasos y cargos" value={arrears} onChange={(v) => setArrears(v ?? 0)} />
          <NumberField label="Pago al vendedor" value={sellerCash} onChange={(v) => setSellerCash(v ?? 0)} />
          <NumberField label="Costos de cierre" value={closing} onChange={(v) => setClosing(v ?? 0)} />
          <NumberField label="Reparaciones" value={repairs} onChange={(v) => setRepairs(v ?? 0)} />
          <NumberField label="Reserva de efectivo" value={reserves} onChange={(v) => setReserves(v ?? 0)} help="Recomendado: 6 meses de PITI." />
          <NumberField label="Tu efectivo disponible" allowNull value={cash ?? null} onChange={(v) => setCash(v ?? undefined)} />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={!!loan.variableRate} onChange={(e) => setLoan({ ...loan, variableRate: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> Tasa variable
          </label>
        </div>
      </Card>
      <OperatingForm value={op} onChange={setOp} />
      <Card title="Checklist de autorización, documentación y monitoreo">
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {[
            "Estado de cuenta reciente y autorización para hablar con el servicer",
            "Búsqueda de título: gravámenes, juicios, impuestos",
            "Disclosures firmados: el préstamo sigue a nombre del vendedor y puede acelerarse",
            "Póliza de seguro que proteja al prestamista, al vendedor y a ti",
            "Servicer independiente con acceso para el vendedor",
            "Reserva separada y plan si el banco exige el saldo",
            "Revisión de las reglas estatales (compras a propietarios en ejecución)",
            "Monitoreo mensual: pagos, escrow, impuestos y seguro",
          ].map((t) => (
            <li key={t} className="flex gap-2"><span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{t}</li>
          ))}
        </ul>
      </Card>
      <Results input={input} file="subject-to-amortizacion.csv" />
    </div>
  );
}

// ---------------------------------------------------------------- Seller Financing

export function SellerFinanceSim() {
  const [price, setPrice] = useState<Cents>(toCents(250_000));
  const [down, setDown] = useState<Cents>(toCents(25_000));
  const [rate, setRate] = useState<Rate>(0.06);
  const [amort, setAmort] = useState(360);
  const [term, setTerm] = useState(60);
  const [io, setIo] = useState(false);
  const [closing, setClosing] = useState<Cents>(toCents(3_000));
  const [repairs, setRepairs] = useState<Cents>(0);
  const [reserves, setReserves] = useState<Cents>(toCents(6_000));
  const [cash, setCash] = useState<Cents | undefined>(toCents(40_000));
  const [op, setOp] = useState<OperatingInputs>({ ...DEFAULT_OPERATING, monthlyRent: toCents(2_300), taxesMonthly: toCents(250), insuranceMonthly: toCents(100), vacancyRate: 0, maintenanceRate: 0.15, capexRate: 0 });

  const input = useMemo(
    () => sellerFinance({ price, currentValue: price, downPayment: down, note: { annualRate: rate, amortizationMonths: amort, termMonths: term, interestOnly: io }, closingCosts: closing, repairs, reserves, operating: op, cashAvailable: cash }),
    [price, down, rate, amort, term, io, closing, repairs, reserves, op, cash],
  );
  const r = useMemo(() => evaluateStructure(input), [input]);
  const note = r.debts[0];

  return (
    <div className="grid gap-4">
      <Card title="Términos del financiamiento" actions={<LoadFromProperty onLoad={(d) => { setPrice(d.price); setClosing(d.closing); setRepairs(d.repairs); setCash(d.cash); setOp(d.operating); setDown(Math.round(d.price * 0.1)); }} />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Precio" value={price} onChange={(v) => setPrice(v ?? 0)} />
          <NumberField label="Enganche" term="Down payment" value={down} onChange={(v) => setDown(v ?? 0)} />
          <NumberField label="Interés" kind="percent" value={rate} onChange={(v) => setRate(v ?? 0)} />
          <NumberField label="Amortización (meses)" kind="int" value={amort} min={1} onChange={(v) => setAmort(Math.max(1, v ?? 1))} />
          <NumberField label="Vencimiento / balloon (meses)" kind="int" value={term} min={1} onChange={(v) => setTerm(Math.max(1, v ?? 1))} />
          <NumberField label="Costos de cierre" value={closing} onChange={(v) => setClosing(v ?? 0)} />
          <NumberField label="Reparaciones" value={repairs} onChange={(v) => setRepairs(v ?? 0)} />
          <NumberField label="Reserva" value={reserves} onChange={(v) => setReserves(v ?? 0)} />
          <NumberField label="Tu efectivo disponible" allowNull value={cash ?? null} onChange={(v) => setCash(v ?? undefined)} />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={io} onChange={(e) => setIo(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" /> Solo intereses
          </label>
        </div>
      </Card>
      <OperatingForm value={op} onChange={setOp} />
      {note && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Riesgo para el comprador">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {note.balloon > 0 && <li>Debes pagar <b className="num">${(note.balloon / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}</b> en el mes {note.maturityMonth}. Para refinanciarlo, el préstamo nuevo necesitaría un LTV de {((note.balloon / price) * 100).toFixed(0)} % sobre el precio actual.</li>}
              <li>Capacidad proyectada de refinanciar: depende de tu crédito, del avalúo y de las tasas en ese momento. No se asume aprobada.</li>
              <li>Si el vendedor tenía hipoteca no liquidada, aplica el riesgo due-on-sale.</li>
            </ul>
          </Card>
          <Card title="Riesgo para el vendedor">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>Impago del comprador: tendría que ejecutar la garantía.</li>
              <li>Recibe el capital en el tiempo; interés total de {(note.totalInterest / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} hasta el vencimiento.</li>
              <li>Si el comprador vivirá en la casa: Regulation Z / SAFE Act y reglas estatales.</li>
            </ul>
          </Card>
        </div>
      )}
      <Results input={input} file="seller-financing-amortizacion.csv" />
    </div>
  );
}

// ---------------------------------------------------------------- Híbrido

export function HybridSim() {
  const [price, setPrice] = useState<Cents>(toCents(300_000));
  const [value, setValue] = useState<Cents>(toCents(300_000));
  const [loans, setLoans] = useState<ExistingLoan[]>([{ balance: toCents(200_000), annualRate: 0.02875, remainingMonths: 330 }]);
  const [arrears, setArrears] = useState<Cents>(0);
  const [sellerCash, setSellerCash] = useState<Cents>(toCents(10_000));
  const [noteRate, setNoteRate] = useState<Rate>(0);
  const [noteAmort, setNoteAmort] = useState(120);
  const [noteTerm, setNoteTerm] = useState(120);
  const [closing, setClosing] = useState<Cents>(toCents(2_000));
  const [repairs, setRepairs] = useState<Cents>(0);
  const [reserves, setReserves] = useState<Cents>(toCents(12_000));
  const [cash, setCash] = useState<Cents | undefined>(toCents(30_000));
  const [op, setOp] = useState<OperatingInputs>({ ...DEFAULT_OPERATING, monthlyRent: toCents(2_800), taxesMonthly: toCents(275), insuranceMonthly: toCents(110) });

  const input = useMemo(
    () => hybrid({ price, currentValue: value, loans, arrears, sellerCash, note: { annualRate: noteRate, amortizationMonths: noteAmort, termMonths: noteTerm }, closingCosts: closing, repairs, reserves, operating: op, cashAvailable: cash }),
    [price, value, loans, arrears, sellerCash, noteRate, noteAmort, noteTerm, closing, repairs, reserves, op, cash],
  );
  const setLoan = (i: number, l: ExistingLoan) => setLoans(loans.map((x, j) => (j === i ? l : x)));

  return (
    <div className="grid gap-4">
      <Notice tone="info" title="Riesgos de prelación, aceleración y refinanciamiento">
        La hipoteca existente queda en primera posición y el pagaré del vendedor detrás. Si el prestamista acelera la primera, ambas obligaciones siguen vigentes. Planifica cómo pagar el pagaré al vencer.
      </Notice>
      <Card title="Precio y pagos al vendedor" actions={<LoadFromProperty onLoad={(d) => { setPrice(d.price); setValue(d.value); setLoans([{ balance: d.balance, annualRate: d.rate, remainingMonths: d.remaining, monthlyPI: d.payment }]); setArrears(d.arrears); setClosing(d.closing); setRepairs(d.repairs); setCash(d.cash); setOp(d.operating); }} />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Precio acordado" value={price} onChange={(v) => setPrice(v ?? 0)} />
          <NumberField label="Valor actual" value={value} onChange={(v) => setValue(v ?? 0)} />
          <NumberField label="Atrasos" value={arrears} onChange={(v) => setArrears(v ?? 0)} />
          <NumberField label="Efectivo al vendedor al cierre" value={sellerCash} onChange={(v) => setSellerCash(v ?? 0)} />
          <NumberField label="Tasa del pagaré al vendedor" kind="percent" value={noteRate} onChange={(v) => setNoteRate(v ?? 0)} />
          <NumberField label="Amortización del pagaré (meses)" kind="int" value={noteAmort} min={1} onChange={(v) => setNoteAmort(Math.max(1, v ?? 1))} />
          <NumberField label="Vencimiento del pagaré (meses)" kind="int" value={noteTerm} min={1} onChange={(v) => setNoteTerm(Math.max(1, v ?? 1))} />
          <NumberField label="Costos de cierre" value={closing} onChange={(v) => setClosing(v ?? 0)} />
          <NumberField label="Reparaciones" value={repairs} onChange={(v) => setRepairs(v ?? 0)} />
          <NumberField label="Reserva" value={reserves} onChange={(v) => setReserves(v ?? 0)} />
          <NumberField label="Tu efectivo disponible" allowNull value={cash ?? null} onChange={(v) => setCash(v ?? undefined)} />
        </div>
      </Card>
      <Card title="Deudas existentes" subtitle="Edita cada obligación por separado." actions={<Button size="sm" variant="secondary" onClick={() => setLoans([...loans, { balance: toCents(30_000), annualRate: 0.06, remainingMonths: 180 }])}><Plus className="h-4 w-4" /> Agregar deuda</Button>}>
        <div className="grid gap-3">
          {loans.map((l, i) => (
            <div key={i} className="grid grid-cols-2 items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[repeat(4,1fr)_auto]">
              <NumberField label={`Saldo hipoteca ${i + 1}`} value={l.balance} onChange={(v) => setLoan(i, { ...l, balance: v ?? 0 })} />
              <NumberField label="Interés" kind="percent" value={l.annualRate} onChange={(v) => setLoan(i, { ...l, annualRate: v ?? 0 })} />
              <NumberField label="Plazo restante (meses)" kind="int" value={l.remainingMonths} min={1} onChange={(v) => setLoan(i, { ...l, remainingMonths: Math.max(1, v ?? 1) })} />
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" checked={!!l.variableRate} onChange={(e) => setLoan(i, { ...l, variableRate: e.target.checked })} className="h-4 w-4" /> Variable
              </label>
              <Button variant="ghost" size="sm" aria-label={`Eliminar hipoteca ${i + 1}`} disabled={loans.length === 1} onClick={() => setLoans(loans.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <OperatingForm value={op} onChange={setOp} />
      <Results input={input} file="hibrido-amortizacion.csv" />
    </div>
  );
}
