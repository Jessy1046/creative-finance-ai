import { describe, expect, it } from "vitest";
import { toCents } from "../money";
import { hybrid, sellerFinance, subjectTo } from "./builders";
import { evaluateStructure, projectReturns } from "./structure";
import { wrapAnalysis } from "./wrap";
import { leaseOptionAnalysis } from "./leaseOption";
import { equityPartnership } from "./partners";
import type { OperatingInputs } from "../finance/metrics";

const op: OperatingInputs = {
  monthlyRent: toCents(1_900),
  vacancyRate: 0,
  taxesMonthly: toCents(150),
  insuranceMonthly: toCents(80),
  maintenanceRate: 0,
  capexRate: 0,
  managementRate: 0,
};

describe("Subject-To", () => {
  const input = subjectTo({
    currentValue: toCents(240_000),
    loan: { balance: toCents(180_000), annualRate: 0.0325, remainingMonths: 300 },
    arrears: toCents(3_000),
    sellerCash: toCents(5_000),
    closingCosts: toCents(2_000),
    repairs: 0,
    reserves: toCents(6_000),
    operating: op,
    cashAvailable: toCents(20_000),
  });
  const r = evaluateStructure(input);

  it("efectivo requerido separa cierre y reserva", () => {
    expect(r.cashToClose).toBe(toCents(10_000));
    expect(r.totalCashRequired).toBe(toCents(16_000));
    expect(r.liquidityGap).toBe(toCents(4_000));
  });
  it("equity = valor − deuda", () => {
    expect(r.equityNominal).toBe(toCents(60_000));
  });
  it("flujo = NOI − P&I (impuestos y seguro solo una vez)", () => {
    const pi = r.debts[0]!.monthlyPayment;
    expect(r.cashFlowMonthly).toBe(toCents(1_900 - 150 - 80) - pi);
  });
  it("advierte due-on-sale", () => {
    expect(r.warnings.join(" ")).toMatch(/due-on-sale/);
  });
  it("advierte si el pago indicado no cuadra con saldo/tasa/plazo", () => {
    const r2 = evaluateStructure(
      subjectTo({ ...{ currentValue: toCents(240_000), arrears: 0, sellerCash: 0, closingCosts: 0, repairs: 0, reserves: 0, operating: op }, loan: { balance: toCents(180_000), annualRate: 0.0325, remainingMonths: 300, monthlyPI: toCents(1_500) } }),
    );
    expect(r2.warnings.join(" ")).toMatch(/Verifica el estado de cuenta/);
  });
});

describe("Seller Financing", () => {
  const r = evaluateStructure(
    sellerFinance({
      price: toCents(250_000),
      currentValue: toCents(250_000),
      downPayment: toCents(25_000),
      note: { annualRate: 0.06, amortizationMonths: 360, termMonths: 60 },
      closingCosts: 0,
      repairs: 0,
      reserves: 0,
      operating: { ...op, monthlyRent: toCents(2_300), taxesMonthly: toCents(250), insuranceMonthly: toCents(100), maintenanceRate: 0.15 },
    }),
  );
  it("pago y balloon", () => {
    expect(r.debtServiceMonthly).toBe(134899);
    expect(r.firstBalloon?.month).toBe(60);
    expect(Math.abs(r.firstBalloon!.amount - toCents(209_372))).toBeLessThan(200);
  });
  it("flujo del ejemplo educativo ($256)", () => {
    expect(r.cashFlowMonthly).toBe(toCents(2_300 - 250 - 100 - 345) - 134899);
  });
});

describe("Híbrido con varias deudas", () => {
  const r = evaluateStructure(
    hybrid({
      price: toCents(300_000),
      currentValue: toCents(300_000),
      loans: [
        { balance: toCents(150_000), annualRate: 0.03, remainingMonths: 300 },
        { balance: toCents(50_000), annualRate: 0.05, remainingMonths: 180, variableRate: true },
      ],
      arrears: 0,
      sellerCash: toCents(10_000),
      note: { annualRate: 0, amortizationMonths: 120, termMonths: 120 },
      closingCosts: toCents(2_000),
      repairs: 0,
      reserves: 0,
      operating: { ...op, monthlyRent: toCents(3_200) },
    }),
  );
  it("el pagaré del vendedor cubre la diferencia", () => {
    const note = r.debts.find((d) => d.debt.kind === "vendedor")!;
    expect(note.debt.terms.principal).toBe(toCents(90_000));
    expect(note.monthlyPayment).toBe(toCents(750));
    expect(note.debt.position).toBe(3);
  });
  it("pago combinado = suma de obligaciones", () => {
    expect(r.debtServiceMonthly).toBe(r.debts.reduce((s, d) => s + d.monthlyPayment, 0));
    expect(r.totalDebt).toBe(toCents(290_000));
  });
  it("advierte tasa variable", () => {
    expect(r.warnings.join(" ")).toMatch(/tasa variable/);
  });
  it("proyección separa componentes y no cuenta refinanciamiento como ganancia", () => {
    const [p5] = projectReturns(r, { rentGrowth: 0, expenseGrowth: 0, appreciation: 0, sellingCostRate: 0, marginalTaxRate: 0, buildingShare: 0.8 }, [5]);
    expect(p5!.appreciation).toBe(0);
    expect(p5!.taxBenefits).toBe(0);
    expect(p5!.cumulativeCashFlow).toBe(r.cashFlowAnnual * 5);
    expect(p5!.total).toBe(p5!.cumulativeCashFlow + p5!.principalPaydown);
  });
});

describe("Wraparound", () => {
  const w = wrapAnalysis({
    salePrice: toCents(230_000),
    buyerDownPayment: toCents(15_000),
    wrapRate: 0.08,
    wrapAmortizationMonths: 360,
    underlying: [{ principal: toCents(150_000), annualRate: 0.04, amortizationMonths: 360 }],
    sellerClosingCosts: 0,
    servicingFeeMonthly: 0,
    holderCashInvested: 0,
  });
  it("flujo del titular = wrap − subyacente (sin duplicar)", () => {
    expect(w.buyerPayment).toBe(157759);
    expect(w.underlyingPayments).toBe(71612);
    expect(w.monthlySpread).toBe(157759 - 71612);
  });
  it("ganancia si el comprador refinancia al año 5", () => {
    const p = w.payoffAt(60);
    expect(p.spreadToDate).toBe(w.monthlySpread * 60);
    expect(p.totalProfit).toBe(toCents(15_000) + p.spreadToDate + p.wrapBalance - p.underlyingBalance);
    expect(Math.abs(p.totalProfit - toCents(135_417))).toBeLessThan(toCents(100));
  });
  it("exposición si el comprador no paga", () => {
    expect(w.exposureIfBuyerDefaults).toBe(71612);
  });
});

describe("Lease Option", () => {
  const r = leaseOptionAnalysis({
    optionFee: toCents(3_000),
    contractRent: toCents(1_600),
    rentCreditMonthly: 0,
    optionFeeCredited: true,
    strikePrice: toCents(230_000),
    termMonths: 36,
    upfrontCosts: 0,
    monthlyCosts: 0,
    expectedValueAtExercise: toCents(260_000),
    subtenantRent: toCents(2_000),
    subtenantOptionFee: toCents(8_000),
    subtenantStrikePrice: toCents(260_000),
    subtenantRentCredit: toCents(200),
    resaleCostRate: 0,
  });
  it("flujo durante el plazo y resultado si vence", () => {
    expect(r.monthlyCashFlow).toBe(toCents(400));
    expect(r.cashAtStart).toBe(toCents(-5_000));
    expect(r.expired.totalResult).toBe(toCents(5_000 + 14_400));
  });
  it("sandwich: ganancia si el inquilino-comprador ejerce", () => {
    // Neto inicial +5,000 (cobra 8,000, paga 3,000) + flujo 400×36
    // + cobra al inquilino 260,000 − 7,200 créditos − 8,000 prima ya cobrada
    // − paga al dueño 230,000 − 3,000 prima acreditada.
    expect(r.exercised.profitIfSubtenantBuys).toBe(toCents(5_000 + 14_400 + 244_800 - 227_000));
  });
});

describe("Socio capitalista (waterfall)", () => {
  const r = equityPartnership({
    investorCapital: toCents(50_000),
    operatorCapital: 0,
    preferredReturn: 0.08,
    investorSplit: 0.5,
    annualCashFlows: [toCents(3_000), toCents(5_000), toCents(6_000)],
    saleProceeds: toCents(80_000),
  });
  it("paga el preferente acumulado antes del split", () => {
    expect(r.investor.distributions[0]).toBe(toCents(3_000));
    expect(r.operator.distributions[0]).toBe(0);
    expect(r.unpaidPreferredAtExit).toBe(0);
  });
  it("devuelve capital al inversionista antes de repartir", () => {
    expect(r.capitalLossRisk).toBe(0);
    expect(r.investor.total + r.operator.total).toBe(toCents(3_000 + 5_000 + 6_000 + 80_000));
    expect(r.investor.irr).not.toBeNull();
  });
});
