import type { Cents } from "../money";
import { flipAnalysis, operatingStatement, ruleOneAndHalf, capRate, rentToCost, type FlipResult, type OperatingResult, type RuleOneAndHalfResult } from "../finance/metrics";
import { evaluateStructure, type StructureResult } from "../strategies/structure";
import { subjectTo } from "../strategies/builders";
import { missingFor, operatingFrom, resolve, type PropertyRecord, type Resolved, type NumberKey } from "./model";

export interface PropertyAnalysis {
  resolved: Resolved;
  operating: OperatingResult;
  price: Cents | null;
  capRate: number | null;
  rentToCost: number | null;
  rule15: RuleOneAndHalfResult | null;
  flip: FlipResult | null;
  equityNominal: Cents | null;
  equityAfterRepair: Cents | null;
  existingDebtTotal: Cents;
  /** Vista rápida Subject-To si hay deuda existente completa. */
  subjectToPreview: StructureResult | null;
  missing: { operacion: NumberKey[]; equity: NumberKey[]; deudaExistente: NumberKey[]; liquidez: NumberKey[] };
  /** El análisis operativo es confiable solo si no faltan datos críticos. */
  operationalComplete: boolean;
}

export function analyzeProperty(p: PropertyRecord): PropertyAnalysis {
  const resolved = resolve(p);
  const v = resolved.values;
  const op = operatingFrom(v);
  const operating = operatingStatement(op);
  const price = v.negotiatedPrice;
  const repairs = v.repairs ?? 0;
  const existingDebtTotal = (v.existingBalance ?? 0) + (v.liens ?? 0);

  const missing = {
    operacion: missingFor(resolved, "operacion"),
    equity: missingFor(resolved, "equity"),
    deudaExistente: missingFor(resolved, "deudaExistente"),
    liquidez: missingFor(resolved, "liquidez"),
  };

  const flip =
    v.arv !== null && price !== null
      ? flipAnalysis({
          arv: v.arv,
          purchasePrice: price,
          repairs,
          purchaseClosingCosts: v.closingCosts ?? 0,
          financingCosts: v.financingCosts ?? 0,
          holdingMonthly: op.taxesMonthly + op.insuranceMonthly + (op.utilitiesMonthly ?? 0) + (op.hoaMonthly ?? 0),
          holdingMonths: 6,
          marketingCosts: 0,
          sellingCostRate: 0.07,
        })
      : null;

  let subjectToPreview: StructureResult | null = null;
  if (missing.deudaExistente.length === 0 && v.existingBalance! > 0 && v.currentValue !== null) {
    subjectToPreview = evaluateStructure(
      subjectTo({
        currentValue: v.currentValue,
        arv: v.arv ?? undefined,
        loan: {
          balance: v.existingBalance!,
          annualRate: v.existingRate!,
          remainingMonths: v.existingRemainingMonths!,
          monthlyPI: v.existingPayment ?? undefined,
        },
        arrears: (v.pastDue ?? 0) + (v.penalties ?? 0),
        sellerCash: price !== null ? Math.max(0, price - v.existingBalance! - (v.pastDue ?? 0) - (v.penalties ?? 0)) : 0,
        closingCosts: v.closingCosts ?? 0,
        repairs,
        reserves: 0,
        operating: op,
        cashAvailable: v.cashAvailable ?? undefined,
      }),
    );
  }

  return {
    resolved,
    operating,
    price,
    capRate: price !== null ? capRate(operating.noiAnnual, price) : null,
    rentToCost: price !== null ? rentToCost(op.monthlyRent, price, repairs) : null,
    rule15: price !== null && v.projectedRent !== null ? ruleOneAndHalf(v.projectedRent, price, repairs) : null,
    flip,
    equityNominal: v.currentValue !== null && price !== null ? v.currentValue - (v.existingBalance ?? 0) - (v.liens ?? 0) : null,
    equityAfterRepair: v.arv !== null ? v.arv - existingDebtTotal : null,
    existingDebtTotal,
    subjectToPreview,
    missing,
    operationalComplete: missing.operacion.length === 0,
  };
}
