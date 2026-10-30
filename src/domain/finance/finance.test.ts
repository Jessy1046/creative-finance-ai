import { describe, expect, it } from "vitest";
import { roundCents, toCents } from "../money";
import { amortize, balanceAfter, monthlyPayment } from "./amortization";
import { annualizeMonthly, equityMultiple, irr, npv } from "./cashflows";
import {
  breakEvenOccupancy,
  capRate,
  cashOnCash,
  debtYield,
  dscr,
  flipAnalysis,
  ltc,
  ltv,
  operatingStatement,
  paybackMonths,
  rentToCost,
  ruleOneAndHalf,
} from "./metrics";
import { brrrr } from "./brrrr";

describe("money", () => {
  it("redondea medio centavo alejándose del cero", () => {
    expect(roundCents(0.5)).toBe(1);
    expect(roundCents(-0.5)).toBe(-1);
    expect(roundCents(1.49)).toBe(1);
    expect(toCents(1234.565)).toBe(123457);
    expect(Object.is(roundCents(-0.4), 0)).toBe(true);
  });
});

describe("monthlyPayment", () => {
  it("coincide con la fórmula estándar ($225,000 al 6 % a 30 años = $1,348.99)", () => {
    expect(monthlyPayment(toCents(225_000), 0.06, 360)).toBe(134899);
  });
  it("tasa 0 %: capital / meses", () => {
    expect(monthlyPayment(toCents(90_000), 0, 120)).toBe(75000);
  });
  it("principal 0 o plazo 0 → 0", () => {
    expect(monthlyPayment(0, 0.05, 360)).toBe(0);
    expect(monthlyPayment(100, 0.05, 0)).toBe(0);
  });
});

describe("amortize", () => {
  it("liquida el préstamo exactamente al final del plazo", () => {
    const s = amortize({ principal: toCents(150_000), annualRate: 0.04, amortizationMonths: 360 });
    expect(s.rows).toHaveLength(360);
    expect(s.balloon).toBe(0);
    expect(s.paidOffMonth).toBe(360);
    expect(s.totalPrincipal).toBe(toCents(150_000));
    expect(s.initialPayment).toBe(71612);
  });

  it("calcula el balloon a 5 años ($225,000 al 6 %, 30 años → ≈ $209,372)", () => {
    const s = amortize({ principal: toCents(225_000), annualRate: 0.06, amortizationMonths: 360, termMonths: 60 });
    expect(s.endMonth).toBe(60);
    expect(Math.abs(s.balloon - toCents(209_372.3))).toBeLessThan(100); // < $1 por redondeo mensual
  });

  it("tasa 0 %: el saldo baja linealmente", () => {
    const s = amortize({ principal: toCents(12_000), annualRate: 0, amortizationMonths: 12 });
    expect(s.totalInterest).toBe(0);
    expect(s.rows[5]!.balance).toBe(toCents(6_000));
    expect(s.balloon).toBe(0);
  });

  it("solo intereses: el saldo completo vence al final", () => {
    const s = amortize({ principal: toCents(100_000), annualRate: 0.12, amortizationMonths: 12, termMonths: 12, interestOnly: true });
    expect(s.initialPayment).toBe(toCents(1_000));
    expect(s.balloon).toBe(toCents(100_000));
    expect(s.totalInterest).toBe(toCents(12_000));
  });

  it("abonos extra a capital acortan el plazo y reducen intereses", () => {
    const base = amortize({ principal: toCents(200_000), annualRate: 0.07, amortizationMonths: 360 });
    const extra = amortize({ principal: toCents(200_000), annualRate: 0.07, amortizationMonths: 360, extraPrincipal: toCents(200) });
    expect(extra.paidOffMonth).not.toBeNull();
    expect(extra.paidOffMonth!).toBeLessThan(360);
    expect(extra.totalInterest).toBeLessThan(base.totalInterest);
    expect(extra.totalPrincipal).toBe(toCents(200_000));
  });

  it("abono extra puntual en un mes específico", () => {
    const s = amortize({ principal: toCents(10_000), annualRate: 0.05, amortizationMonths: 60, extraPrincipal: { 1: toCents(5_000) } });
    expect(s.rows[0]!.extra).toBe(toCents(5_000));
    expect(s.paidOffMonth!).toBeLessThan(60);
  });

  it("tasa variable: el pago se recalcula cuando cambia la tasa", () => {
    const s = amortize({
      principal: toCents(300_000),
      annualRate: 0.05,
      amortizationMonths: 360,
      rateChanges: [{ startMonth: 61, annualRate: 0.08 }],
    });
    const before = s.rows[59]!.payment;
    const after = s.rows[60]!.payment;
    expect(after).toBeGreaterThan(before);
    expect(s.rows[60]!.annualRate).toBe(0.08);
    expect(s.balloon).toBe(0);
  });

  it("pago indicado menor que el interés no produce amortización negativa", () => {
    const s = amortize({ principal: toCents(100_000), annualRate: 0.12, amortizationMonths: 360, termMonths: 3, paymentOverride: toCents(500) });
    expect(s.rows.every((r) => r.principal === 0)).toBe(true);
    expect(s.balloon).toBe(toCents(100_000));
  });

  it("balanceAfter coincide con la tabla", () => {
    const terms = { principal: toCents(150_000), annualRate: 0.04, amortizationMonths: 360 };
    expect(balanceAfter(terms, 60)).toBe(amortize(terms).rows[59]!.balance);
    expect(balanceAfter(terms, 0)).toBe(toCents(150_000));
  });
});

describe("cashflows", () => {
  it("VPN conocido", () => {
    expect(npv(0.1, [-100, 110])).toBeCloseTo(0, 10);
  });
  it("TIR simple", () => {
    expect(irr([-100, 110]).rate!).toBeCloseTo(0.1, 6);
    expect(irr([-1000, 300, 400, 500]).rate!).toBeCloseTo(0.0889633947, 6);
  });
  it("TIR negativa", () => {
    expect(irr([-100, 50, 40]).rate!).toBeLessThan(0);
  });
  it("sin cambio de signo → no existe TIR", () => {
    const r = irr([100, 50, 40]);
    expect(r.rate).toBeNull();
    expect(r.warning).toMatch(/no cambian de signo/);
  });
  it("varios cambios de signo → advertencia", () => {
    const r = irr([-100, 230, -132]);
    expect(r.signChanges).toBe(2);
    expect(r.warning).toMatch(/más de una TIR/);
    expect(r.rate).not.toBeNull();
  });
  it("períodos largos y anualización", () => {
    const flows = [-1000, ...Array.from({ length: 11 }, () => 0), 1100];
    const m = irr(flows).rate!;
    expect(annualizeMonthly(m)).toBeCloseTo(0.1, 6);
  });
  it("múltiplo de capital", () => {
    expect(equityMultiple(250, 100)).toBe(2.5);
    expect(equityMultiple(250, 0)).toBeNull();
  });
});

describe("métricas", () => {
  const op = operatingStatement({
    monthlyRent: toCents(2_000),
    vacancyRate: 0.05,
    taxesMonthly: toCents(200),
    insuranceMonthly: toCents(100),
    maintenanceRate: 0.05,
    capexRate: 0.05,
    managementRate: 0.1,
  });

  it("estado operativo", () => {
    expect(op.grossScheduledMonthly).toBe(toCents(2_000));
    expect(op.vacancyLossMonthly).toBe(toCents(100));
    expect(op.effectiveGrossMonthly).toBe(toCents(1_900));
    expect(op.expenses.management).toBe(toCents(190));
    expect(op.operatingExpensesMonthly).toBe(toCents(200 + 100 + 100 + 100 + 190));
    expect(op.noiMonthly).toBe(toCents(1_210));
    expect(op.noiAnnual).toBe(toCents(14_520));
  });

  it("cap rate, DSCR, LTV, LTC, debt yield", () => {
    expect(capRate(toCents(14_520), toCents(200_000))!).toBeCloseTo(0.0726, 6);
    expect(dscr(toCents(14_520), toCents(12_000))!).toBeCloseTo(1.21, 6);
    expect(dscr(toCents(14_520), 0)).toBeNull();
    expect(ltv(toCents(150_000), toCents(200_000))).toBe(0.75);
    expect(ltc(toCents(150_000), toCents(250_000))).toBe(0.6);
    expect(debtYield(toCents(14_520), toCents(150_000))!).toBeCloseTo(0.0968, 6);
  });

  it("flujo negativo produce cash-on-cash negativo; capital 0 → null", () => {
    expect(cashOnCash(toCents(-1_200), toCents(10_000))).toBeCloseTo(-0.12, 6);
    expect(cashOnCash(toCents(1_200), 0)).toBeNull();
  });

  it("ocupación de equilibrio, rent-to-cost y recuperación", () => {
    expect(breakEvenOccupancy(toCents(690), toCents(1_000), toCents(2_000))).toBeCloseTo(0.845, 6);
    expect(rentToCost(toCents(2_000), toCents(130_000), toCents(20_000))!).toBeCloseTo(0.013333, 5);
    expect(paybackMonths(toCents(10_000), toCents(365))).toBe(28);
    expect(paybackMonths(toCents(10_000), toCents(-5))).toBeNull();
    expect(paybackMonths(0, toCents(100))).toBe(0);
  });

  it("regla del 1.5 %", () => {
    const r = ruleOneAndHalf(toCents(2_000), toCents(120_000), toCents(10_000));
    expect(r.ratio!).toBeCloseTo(2000 / 130000, 8);
    expect(r.meets).toBe(true);
    expect(r.requiredRent).toBe(toCents(1_950));
    expect(r.maxPrice).toBe(toCents(2000 / 0.015 - 10_000));
    expect(r.rentGap).toBe(toCents(50));
  });

  it("regla del 50 % y beneficio neto del flip", () => {
    const f = flipAnalysis({
      arv: toCents(300_000),
      purchasePrice: toCents(120_000),
      repairs: toCents(40_000),
      purchaseClosingCosts: toCents(3_000),
      financingCosts: toCents(12_000),
      holdingMonthly: toCents(500),
      holdingMonths: 6,
      marketingCosts: toCents(1_000),
      sellingCostRate: 0.07,
    });
    expect(f.maxAllowableOffer).toBe(toCents(110_000));
    expect(f.meetsRule).toBe(false);
    expect(f.sellingCosts).toBe(toCents(21_000));
    expect(f.netProfit).toBe(toCents(300_000 - 120_000 - 40_000 - 3_000 - 12_000 - 3_000 - 1_000 - 21_000));
  });
});

describe("BRRRR", () => {
  const r = brrrr({
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
  });

  it("refinanciamiento y capital recuperado", () => {
    expect(r.steps.refinance.newLoan).toBe(toCents(142_500));
    expect(r.steps.refinance.refiCosts).toBe(toCents(2_850));
    expect(r.steps.refinance.cashOut).toBe(toCents(142_500 - 126_000 - 2_850));
    expect(r.steps.hold.interestCarry).toBe(toCents(126_000 * 0.01 * 6));
    expect(r.capitalLeftIn).toBe(r.totalCashInvested - r.steps.refinance.cashOut);
  });

  it("no asume que el refinanciamiento será aprobado", () => {
    expect(r.refiConditions.some((c) => c.ok === null)).toBe(true);
  });
});
