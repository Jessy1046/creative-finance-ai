"use client";

import { useMemo, useState } from "react";
import { toCents, formatPct, formatUSD, formatRatio, type Cents, type Rate } from "@/domain/money";
import { amortize } from "@/domain/finance/amortization";
import { wrapAnalysis } from "@/domain/strategies/wrap";
import { leaseOptionAnalysis, type LeaseOptionInputs } from "@/domain/strategies/leaseOption";
import { equityPartnership, privateLoanSummary } from "@/domain/strategies/partners";
import { brrrr, type BrrrrInputs } from "@/domain/finance/brrrr";
import { flipAnalysis, type FlipInputs } from "@/domain/finance/metrics";
import { AmortizationView } from "@/components/finance/views";
import { Badge, Card, Notice, NumberField, Row, Stat, Tabs } from "@/components/ui";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";

// ---------------------------------------------------------------- Wrap

export function WrapSim() {
  const [salePrice, setSalePrice] = useState<Cents>(toCents(230_000));
  const [down, setDown] = useState<Cents>(toCents(15_000));
  const [wrapRate, setWrapRate] = useState<Rate>(0.08);
  const [wrapAmort, setWrapAmort] = useState(360);
  const [wrapTerm, setWrapTerm] = useState(360);
  const [under, setUnder] = useState({ principal: toCents(150_000), annualRate: 0.04, amortizationMonths: 360 });
  const [closing, setClosing] = useState<Cents>(toCents(2_500));
  const [fee, setFee] = useState<Cents>(toCents(30));
  const [invested, setInvested] = useState<Cents>(toCents(10_000));
  const [month, setMonth] = useState(60);

  const w = useMemo(
    () => wrapAnalysis({ salePrice, buyerDownPayment: down, wrapRate, wrapAmortizationMonths: wrapAmort, wrapTermMonths: wrapTerm, underlying: [under], sellerClosingCosts: closing, servicingFeeMonthly: fee, holderCashInvested: invested }),
    [salePrice, down, wrapRate, wrapAmort, wrapTerm, under, closing, fee, invested],
  );
  const payoff = w.payoffAt(month);
  const wrapSchedule = useMemo(() => amortize({ principal: w.wrapPrincipal, annualRate: wrapRate, amortizationMonths: wrapAmort, termMonths: wrapTerm }), [w.wrapPrincipal, wrapRate, wrapAmort, wrapTerm]);
  const underSchedule = useMemo(() => amortize(under), [under]);

  return (
    <div className="grid gap-4">
      <Notice tone="warning" title="Alertas legales y de servicing">
        <ul className="list-disc space-y-0.5 pl-5">{w.alerts.map((a) => <li key={a}>{a}</li>)}</ul>
      </Notice>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Pagaré wrap (lo que te paga el comprador)">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Precio de venta" value={salePrice} onChange={(v) => setSalePrice(v ?? 0)} />
            <NumberField label="Enganche del comprador" value={down} onChange={(v) => setDown(v ?? 0)} />
            <NumberField label="Tasa del wrap" kind="percent" value={wrapRate} onChange={(v) => setWrapRate(v ?? 0)} />
            <NumberField label="Amortización (meses)" kind="int" value={wrapAmort} min={1} onChange={(v) => setWrapAmort(Math.max(1, v ?? 1))} />
            <NumberField label="Vencimiento (meses)" kind="int" value={wrapTerm} min={1} onChange={(v) => setWrapTerm(Math.max(1, v ?? 1))} />
            <NumberField label="Comisión del servicer / mes" value={fee} onChange={(v) => setFee(v ?? 0)} />
          </div>
        </Card>
        <Card title="Deuda subyacente (lo que tú sigues pagando)">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Saldo" value={under.principal} onChange={(v) => setUnder({ ...under, principal: v ?? 0 })} />
            <NumberField label="Tasa" kind="percent" value={under.annualRate} onChange={(v) => setUnder({ ...under, annualRate: v ?? 0 })} />
            <NumberField label="Plazo restante (meses)" kind="int" value={under.amortizationMonths} min={1} onChange={(v) => setUnder({ ...under, amortizationMonths: Math.max(1, v ?? 1) })} />
            <NumberField label="Tu costo de cierre" value={closing} onChange={(v) => setClosing(v ?? 0)} />
            <NumberField label="Capital que invertiste" value={invested} onChange={(v) => setInvested(v ?? 0)} help="Lo que te costó controlar la propiedad (base de tu retorno)." />
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pago del comprador" value={formatUSD(w.buyerPayment, { decimals: true })} />
        <Stat label="Pago subyacente" value={formatUSD(w.underlyingPayments, { decimals: true })} />
        <Stat label="Diferencia mensual" value={formatUSD(w.monthlySpread, { decimals: true })} tone={w.monthlySpread >= 0 ? "positive" : "danger"} help="Pago wrap − pago subyacente − servicer. Impuestos y seguro van en escrow y no se cuentan dos veces." />
        <Stat label="Margen de tasa" value={`${(w.rateSpread * 100).toFixed(2)} pts`} />
      </div>
      <Card title="Resultado si el comprador refinancia o paga el wrap" actions={<div className="w-40"><NumberField label="Mes" kind="int" value={month} min={1} onChange={(v) => setMonth(Math.max(1, v ?? 1))} /></div>}>
        <Row label="Enganche recibido" value={formatUSD(down)} />
        <Row label="Diferencia acumulada" value={formatUSD(payoff.spreadToDate)} />
        <Row label="Saldo del wrap que te pagan" value={formatUSD(payoff.wrapBalance)} />
        <Row label="Saldo subyacente que liquidas" value={formatUSD(-payoff.underlyingBalance)} />
        <Row label="Tu costo de cierre y capital invertido" value={formatUSD(-(closing + invested))} sub />
        <Row label="Ganancia total" value={formatUSD(payoff.totalProfit)} strong tone={payoff.totalProfit >= 0 ? "positive" : "danger"} />
        <p className="mt-2 text-[12.5px] text-muted">Si el comprador deja de pagar, sigues debiendo {formatUSD(w.exposureIfBuyerDefaults)} cada mes.</p>
      </Card>
      <AmortizationView filename="wrap-amortizacion.csv" schedules={[{ label: "Pagaré wrap", principal: w.wrapPrincipal, schedule: wrapSchedule }, { label: "Deuda subyacente", principal: under.principal, schedule: underSchedule }]} />
    </div>
  );
}

// ---------------------------------------------------------------- Lease Option

export function LeaseOptionSim() {
  const [i, setI] = useState<LeaseOptionInputs>({
    optionFee: toCents(3_000),
    contractRent: toCents(1_600),
    rentCreditMonthly: 0,
    optionFeeCredited: true,
    strikePrice: toCents(230_000),
    termMonths: 36,
    upfrontCosts: 0,
    monthlyCosts: toCents(50),
    expectedValueAtExercise: toCents(255_000),
    subtenantRent: toCents(2_000),
    subtenantOptionFee: toCents(8_000),
    subtenantStrikePrice: toCents(260_000),
    subtenantRentCredit: toCents(200),
    resaleCostRate: 0.07,
  });
  const set = <K extends keyof LeaseOptionInputs>(k: K, v: LeaseOptionInputs[K]) => setI({ ...i, [k]: v });
  const r = useMemo(() => leaseOptionAnalysis(i), [i]);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Contrato con el dueño">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Prima de opción" term="Option fee" value={i.optionFee} onChange={(v) => set("optionFee", v ?? 0)} />
            <NumberField label="Renta contractual" value={i.contractRent} onChange={(v) => set("contractRent", v ?? 0)} />
            <NumberField label="Crédito de renta / mes" value={i.rentCreditMonthly} onChange={(v) => set("rentCreditMonthly", v ?? 0)} />
            <NumberField label="Precio de ejercicio" term="Strike price" value={i.strikePrice} onChange={(v) => set("strikePrice", v ?? 0)} />
            <NumberField label="Plazo (meses)" kind="int" value={i.termMonths} min={1} onChange={(v) => set("termMonths", Math.max(1, v ?? 1))} />
            <NumberField label="Costos iniciales y reparaciones" value={i.upfrontCosts} onChange={(v) => set("upfrontCosts", v ?? 0)} />
            <NumberField label="Costos mensuales a tu cargo" value={i.monthlyCosts} onChange={(v) => set("monthlyCosts", v ?? 0)} />
            <NumberField label="Valor esperado al ejercer" value={i.expectedValueAtExercise} onChange={(v) => set("expectedValueAtExercise", v ?? 0)} help="Supuesto: no es una valoración." />
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={i.optionFeeCredited} onChange={(e) => set("optionFeeCredited", e.target.checked)} className="h-4 w-4" /> La prima se acredita al precio
            </label>
          </div>
        </Card>
        <Card title="Sandwich: tu inquilino-comprador (opcional)" subtitle="Deja la renta en 0 si no subarriendas.">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Renta que cobras" value={i.subtenantRent} onChange={(v) => set("subtenantRent", v ?? 0)} />
            <NumberField label="Prima que cobras" value={i.subtenantOptionFee} onChange={(v) => set("subtenantOptionFee", v ?? 0)} />
            <NumberField label="Su precio de ejercicio" value={i.subtenantStrikePrice} onChange={(v) => set("subtenantStrikePrice", v ?? 0)} />
            <NumberField label="Su crédito de renta / mes" value={i.subtenantRentCredit} onChange={(v) => set("subtenantRentCredit", v ?? 0)} />
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Efectivo al inicio" value={formatUSD(r.cashAtStart)} hint={r.cashAtStart < 0 ? "Recibes más de lo que pagas" : undefined} />
        <Stat label="Flujo mensual" value={formatUSD(r.monthlyCashFlow)} tone={r.monthlyCashFlow >= 0 ? "positive" : "danger"} />
        <Stat label="Flujo durante el plazo" value={formatUSD(r.cashFlowDuringTerm)} />
        <Stat label="Pagas al ejercer" value={formatUSD(r.amountDueAtExercise)} hint={`Créditos ${formatUSD(r.creditsEarned)}`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Si se ejerce la opción">
          <Row label="Equity inmediata (valor esperado − monto a pagar)" value={formatUSD(r.exercised.equityAtExercise)} />
          <Row label="Ganancia si ejerces y revendes" value={formatUSD(r.exercised.profitIfResold)} tone={r.exercised.profitIfResold >= 0 ? "positive" : "danger"} strong />
          {r.exercised.profitIfSubtenantBuys !== null && <Row label="Ganancia si tu inquilino-comprador compra" value={formatUSD(r.exercised.profitIfSubtenantBuys)} tone={r.exercised.profitIfSubtenantBuys >= 0 ? "positive" : "danger"} strong />}
        </Card>
        <Card title="Si la opción vence sin ejercer">
          <Row label="Prima perdida" value={formatUSD(-r.expired.lostOptionFee)} />
          <Row label="Créditos perdidos" value={formatUSD(-r.expired.lostCredits)} />
          <Row label="Resultado total (con el flujo del plazo)" value={formatUSD(r.expired.totalResult)} strong tone={r.expired.totalResult >= 0 ? "positive" : "danger"} />
        </Card>
      </div>
      <Card title="Obligaciones contractuales">
        <ul className="list-disc space-y-1 pl-5 text-sm">{r.obligations.map((o) => <li key={o}>{o}</li>)}</ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Socios y prestamistas privados

export function PartnersSim() {
  const [view, setView] = useState<"operador" | "inversionista">("inversionista");
  const [investorCapital, setInvestorCapital] = useState<Cents>(toCents(60_000));
  const [operatorCapital, setOperatorCapital] = useState<Cents>(0);
  const [pref, setPref] = useState<Rate>(0.08);
  const [split, setSplit] = useState<Rate>(0.5);
  const [cf, setCf] = useState<Cents>(toCents(6_000));
  const [growth, setGrowth] = useState<Rate>(0.02);
  const [years, setYears] = useState(5);
  const [sale, setSale] = useState<Cents>(toCents(95_000));
  const [loan, setLoan] = useState({ principal: toCents(50_000), annualRate: 0.1, termMonths: 12, points: 0.02, interestOnly: true });

  const flows = useMemo(() => Array.from({ length: years }, (_, y) => Math.round(cf * Math.pow(1 + growth, y))), [cf, growth, years]);
  const r = useMemo(() => equityPartnership({ investorCapital, operatorCapital, preferredReturn: pref, investorSplit: split, annualCashFlows: flows, saleProceeds: sale }), [investorCapital, operatorCapital, pref, split, flows, sale]);
  const pl = privateLoanSummary(loan);
  const party = view === "inversionista" ? r.investor : r.operator;

  return (
    <div className="grid gap-4">
      <Notice tone="warning" title="Ningún retorno es garantizado">
        Las cifras dependen del flujo y del precio de venta supuestos. Levantar capital de terceros puede constituir una oferta de valores: consulta a un abogado antes de hacerlo.
      </Notice>
      <Card title="Socio capitalista: preferred return y waterfall">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Capital del inversionista" value={investorCapital} onChange={(v) => setInvestorCapital(v ?? 0)} />
          <NumberField label="Capital del operador" value={operatorCapital} onChange={(v) => setOperatorCapital(v ?? 0)} />
          <NumberField label="Preferred return" kind="percent" value={pref} onChange={(v) => setPref(v ?? 0)} help="Retorno anual acumulable que recibe primero el inversionista." />
          <NumberField label="Split para el inversionista" kind="percent" value={split} onChange={(v) => setSplit(v ?? 0)} help="Parte del excedente después del preferente." />
          <NumberField label="Flujo distribuible año 1" value={cf} onChange={(v) => setCf(v ?? 0)} />
          <NumberField label="Crecimiento anual del flujo" kind="percent" value={growth} onChange={(v) => setGrowth(v ?? 0)} />
          <NumberField label="Años" kind="int" value={years} min={1} onChange={(v) => setYears(Math.min(30, Math.max(1, v ?? 1)))} />
          <NumberField label="Producto neto de la venta" value={sale} onChange={(v) => setSale(v ?? 0)} help="Después de pagar deuda y costos de venta." />
        </div>
      </Card>
      <Tabs label="Reporte" value={view} onChange={setView} tabs={[{ id: "inversionista", label: "Reporte del inversionista" }, { id: "operador", label: "Reporte del operador" }]} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Capital aportado" value={formatUSD(party.contributed)} />
        <Stat label="Total recibido" value={formatUSD(party.total)} />
        <Stat label="TIR" value={formatPct(party.irr)} hint={party.contributed === 0 ? "Sin capital aportado" : undefined} />
        <Stat label="Equity multiple" value={party.equityMultiple === null ? "—" : `${party.equityMultiple.toFixed(2)}x`} />
      </div>
      <Card title="Distribuciones por año">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[13px]">
            <thead className="text-left text-[12px] text-muted"><tr><th className="py-2 font-medium">Año</th><th className="text-right font-medium">Flujo del proyecto</th><th className="text-right font-medium">Inversionista</th><th className="text-right font-medium">Operador</th></tr></thead>
            <tbody>
              {flows.map((f, y) => (
                <tr key={y} className="border-t border-border">
                  <td className="py-1.5">{y + 1}{y === flows.length - 1 && <Badge className="ml-2">incluye venta</Badge>}</td>
                  <td className="num text-right">{formatUSD(f + (y === flows.length - 1 ? sale : 0))}</td>
                  <td className="num text-right">{formatUSD(r.investor.distributions[y] ?? 0)}</td>
                  <td className="num text-right">{formatUSD(r.operator.distributions[y] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {r.capitalLossRisk > 0 && <p className="mt-2 text-sm text-danger">Con estos supuestos el inversionista no recupera {formatUSD(r.capitalLossRisk)} de su capital.</p>}
        {r.unpaidPreferredAtExit > 0 && <p className="mt-1 text-sm text-warning">Queda preferente sin pagar: {formatUSD(r.unpaidPreferredAtExit)}.</p>}
      </Card>
      <Card title="Prestamista privado" subtitle="Préstamo con interés, garantizado por la propiedad.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Monto" value={loan.principal} onChange={(v) => setLoan({ ...loan, principal: v ?? 0 })} />
          <NumberField label="Interés anual" kind="percent" value={loan.annualRate} onChange={(v) => setLoan({ ...loan, annualRate: v ?? 0 })} />
          <NumberField label="Plazo (meses)" kind="int" value={loan.termMonths} min={1} onChange={(v) => setLoan({ ...loan, termMonths: Math.max(1, v ?? 1) })} />
          <NumberField label="Puntos" kind="percent" value={loan.points} onChange={(v) => setLoan({ ...loan, points: v ?? 0 })} />
        </div>
        <div className="mt-3 grid gap-x-8 md:grid-cols-2">
          <div>
            <Row label="Pago mensual (solo intereses)" value={formatUSD(pl.monthlyPayment)} />
            <Row label="Puntos al cierre" value={formatUSD(pl.pointsAmount)} />
            <Row label="Balloon al vencimiento" value={formatUSD(pl.balloonAtMaturity)} />
          </div>
          <div>
            <Row label="Costo total para el operador" value={formatUSD(pl.totalCostToBorrower)} />
            <Row label="Rendimiento anual del prestamista" value={formatPct(pl.lenderYield)} />
            <p className="mt-1 text-[12px] text-muted">Garantías: pagaré y deed of trust registrados. Verifica límites estatales de interés (usura).</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- BRRRR

export function BrrrrSim() {
  const [i, setI] = useState<BrrrrInputs>({
    purchasePrice: toCents(100_000),
    rehabCost: toCents(40_000),
    purchaseClosingCosts: toCents(3_000),
    acquisitionLoan: toCents(126_000),
    acquisitionRate: 0.12,
    acquisitionPoints: 0.02,
    monthsToRefinance: 6,
    holdingMonthly: toCents(300),
    monthsWithoutRent: 4,
    operating: { monthlyRent: toCents(1_800), vacancyRate: 0.08, taxesMonthly: toCents(150), insuranceMonthly: toCents(100), maintenanceRate: 0.08, capexRate: 0.05, managementRate: 0.09 },
    arv: toCents(190_000),
    refiLtv: 0.75,
    refiRate: 0.075,
    refiAmortizationMonths: 360,
    refiCostRate: 0.02,
    lenderMinDscr: 1.2,
  });
  const set = <K extends keyof BrrrrInputs>(k: K, v: BrrrrInputs[K]) => setI({ ...i, [k]: v });
  const r = useMemo(() => brrrr(i), [i]);
  const steps = [
    { n: "1. Compra", rows: [["Efectivo al cierre", r.steps.buy.cashAtClosing], ["Préstamo de adquisición", r.steps.buy.acquisitionLoan], ["Puntos", r.steps.buy.points]] },
    { n: "2. Rehabilitación", rows: [["Costo", r.steps.rehab.rehabCost], ["Financiado", r.steps.rehab.financedByLoan], ["Pagado en efectivo", r.steps.rehab.paidCash]] },
    { n: "3. Renta (tenencia)", rows: [["Intereses de tenencia", r.steps.hold.interestCarry], ["Costos sin renta", r.steps.hold.holdingCosts], ["NOI cobrado antes del refi", r.steps.hold.rentCollected]] },
    { n: "4. Refinanciamiento", rows: [["Préstamo nuevo", r.steps.refinance.newLoan], ["Deuda cancelada", r.steps.refinance.payoff], ["Costos del refi", r.steps.refinance.refiCosts], ["Efectivo recuperado", r.steps.refinance.cashOut]] },
  ] as const;
  return (
    <div className="grid gap-4">
      <Notice tone="info" title="El refinanciamiento no se asume aprobado">
        El efectivo recuperado es capital devuelto con deuda nueva, no ganancia. El prestamista decidirá con su avalúo, su LTV y su DSCR mínimo.
      </Notice>
      <Card title="Supuestos">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Precio de compra" value={i.purchasePrice} onChange={(v) => set("purchasePrice", v ?? 0)} />
          <NumberField label="Rehabilitación" value={i.rehabCost} onChange={(v) => set("rehabCost", v ?? 0)} />
          <NumberField label="Costos de cierre" value={i.purchaseClosingCosts} onChange={(v) => set("purchaseClosingCosts", v ?? 0)} />
          <NumberField label="Préstamo de adquisición" value={i.acquisitionLoan} onChange={(v) => set("acquisitionLoan", v ?? 0)} />
          <NumberField label="Tasa de adquisición" kind="percent" value={i.acquisitionRate} onChange={(v) => set("acquisitionRate", v ?? 0)} />
          <NumberField label="Puntos" kind="percent" value={i.acquisitionPoints} onChange={(v) => set("acquisitionPoints", v ?? 0)} />
          <NumberField label="Meses hasta refinanciar" kind="int" value={i.monthsToRefinance} min={1} onChange={(v) => set("monthsToRefinance", Math.max(1, v ?? 1))} />
          <NumberField label="Meses sin renta" kind="int" value={i.monthsWithoutRent} onChange={(v) => set("monthsWithoutRent", v ?? 0)} />
          <NumberField label="Costos mensuales sin renta" value={i.holdingMonthly} onChange={(v) => set("holdingMonthly", v ?? 0)} />
          <NumberField label="Renta mensual" value={i.operating.monthlyRent} onChange={(v) => set("operating", { ...i.operating, monthlyRent: v ?? 0 })} />
          <NumberField label="ARV" value={i.arv} onChange={(v) => set("arv", v ?? 0)} help="Debe sustentarse con comparables reales." />
          <NumberField label="LTV del refinanciamiento" kind="percent" value={i.refiLtv} onChange={(v) => set("refiLtv", v ?? 0)} />
          <NumberField label="Tasa del refinanciamiento" kind="percent" value={i.refiRate} onChange={(v) => set("refiRate", v ?? 0)} />
          <NumberField label="Costos del refi" kind="percent" value={i.refiCostRate} onChange={(v) => set("refiCostRate", v ?? 0)} />
          <NumberField label="DSCR mínimo del prestamista" kind="int" value={Math.round((i.lenderMinDscr ?? 1.2) * 100)} onChange={(v) => set("lenderMinDscr", (v ?? 120) / 100)} help="En centésimas: 120 = 1.20" />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((s) => (
          <Card key={s.n} title={s.n}>
            {s.rows.map(([l, v]) => <Row key={l} label={l} value={formatUSD(v)} />)}
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Capital total invertido" value={formatUSD(r.totalCashInvested)} />
        <Stat label="Capital recuperado" value={formatUSD(r.capitalRecovered)} />
        <Stat label="Capital que queda invertido" value={formatUSD(r.capitalLeftIn)} tone={r.capitalLeftIn <= 0 ? "positive" : undefined} />
        <Stat label="Nuevo pago mensual" value={formatUSD(r.newMonthlyPayment)} />
        <Stat label="Flujo después del refi" value={formatUSD(r.cashFlowAfterRefi)} tone={r.cashFlowAfterRefi >= 0 ? "positive" : "danger"} hint={`DSCR ${formatRatio(r.dscrAfterRefi)} · CoC ${formatPct(r.cashOnCashAfterRefi)}`} />
      </div>
      <Card title="5. Repetir: condiciones a verificar antes de contar con el refinanciamiento">
        <ul className="grid gap-2">
          {r.refiConditions.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              {c.ok === true ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-positive" /> : c.ok === false ? <XCircle className="mt-0.5 h-4 w-4 text-danger" /> : <CircleHelp className="mt-0.5 h-4 w-4 text-muted" />}
              <span><b className="font-medium">{c.label}.</b> <span className="text-muted">{c.detail}</span></span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Fix and Flip

export function FlipSim() {
  const [i, setI] = useState<FlipInputs>({
    arv: toCents(300_000),
    purchasePrice: toCents(130_000),
    repairs: toCents(40_000),
    rulePercent: 0.5,
    purchaseClosingCosts: toCents(3_500),
    financingCosts: toCents(14_000),
    holdingMonthly: toCents(650),
    holdingMonths: 6,
    marketingCosts: toCents(1_500),
    sellingCostRate: 0.07,
  });
  const set = <K extends keyof FlipInputs>(k: K, v: FlipInputs[K]) => setI({ ...i, [k]: v });
  const r = useMemo(() => flipAnalysis(i), [i]);
  return (
    <div className="grid gap-4">
      <Card title="Regla del 50 % y beneficio neto" subtitle="La regla solo resta reparaciones. Todos los demás costos se analizan por separado abajo.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <NumberField label="ARV" value={i.arv} onChange={(v) => set("arv", v ?? 0)} />
          <NumberField label="Precio de compra" value={i.purchasePrice} onChange={(v) => set("purchasePrice", v ?? 0)} />
          <NumberField label="Reparaciones" value={i.repairs} onChange={(v) => set("repairs", v ?? 0)} />
          <NumberField label="% del ARV de la regla" kind="percent" value={i.rulePercent ?? 0.5} onChange={(v) => set("rulePercent", v ?? 0.5)} help="50 % por defecto; 70 % es la variante común." />
          <NumberField label="Cierre de compra" value={i.purchaseClosingCosts} onChange={(v) => set("purchaseClosingCosts", v ?? 0)} />
          <NumberField label="Costos de financiación" value={i.financingCosts} onChange={(v) => set("financingCosts", v ?? 0)} help="Puntos + intereses durante la tenencia." />
          <NumberField label="Tenencia / mes" value={i.holdingMonthly} onChange={(v) => set("holdingMonthly", v ?? 0)} help="Impuestos, seguro, servicios." />
          <NumberField label="Meses de tenencia" kind="int" value={i.holdingMonths} onChange={(v) => set("holdingMonths", v ?? 0)} />
          <NumberField label="Comercialización" value={i.marketingCosts} onChange={(v) => set("marketingCosts", v ?? 0)} />
          <NumberField label="Costo de venta" kind="percent" value={i.sellingCostRate} onChange={(v) => set("sellingCostRate", v ?? 0)} />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Oferta máxima (regla)" value={formatUSD(r.maxAllowableOffer)} />
        <Stat label="¿Cumple la regla?" value={r.meetsRule ? "Sí" : "No"} tone={r.meetsRule ? "positive" : "warning"} />
        <Stat label="Beneficio neto" value={formatUSD(r.netProfit)} tone={r.netProfit >= 0 ? "positive" : "danger"} />
        <Stat label="Retorno sobre costo" value={formatPct(r.returnOnCost)} />
      </div>
      <Card title="Desglose de costos">
        <Row label="Compra" value={formatUSD(i.purchasePrice)} />
        <Row label="Reparaciones" value={formatUSD(i.repairs)} />
        <Row label="Cierre de compra" value={formatUSD(i.purchaseClosingCosts)} />
        <Row label="Financiación" value={formatUSD(i.financingCosts)} />
        <Row label="Tenencia" value={formatUSD(r.holdingCosts)} />
        <Row label="Comercialización" value={formatUSD(i.marketingCosts)} />
        <Row label="Venta" value={formatUSD(r.sellingCosts)} />
        <Row label="Costo total" value={formatUSD(r.totalCosts)} strong />
      </Card>
    </div>
  );
}
