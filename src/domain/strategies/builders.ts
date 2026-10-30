import { roundCents, type Cents, type Rate } from "../money";
import type { OperatingInputs } from "../finance/metrics";
import { emptyUpfront, type DebtInput, type StructureInput } from "./structure";

/**
 * Constructores de estructuras para los simuladores principales.
 * Traducen entradas "humanas" (lo que pregunta el formulario) al modelo genérico.
 */

export interface ExistingLoan {
  balance: Cents;
  annualRate: Rate;
  remainingMonths: number;
  /** Pago P&I del estado de cuenta (opcional; si falta se calcula). */
  monthlyPI?: Cents;
  variableRate?: boolean;
}

export interface SubjectToInputs {
  currentValue: Cents;
  arv?: Cents;
  loan: ExistingLoan;
  arrears: Cents;
  sellerCash: Cents;
  closingCosts: Cents;
  repairs: Cents;
  reserves: Cents;
  operating: OperatingInputs;
  cashAvailable?: Cents;
}

export function existingLoanDebt(loan: ExistingLoan, id = "existente", label = "Hipoteca existente"): DebtInput {
  return {
    id,
    label,
    kind: "existente",
    position: 1,
    inSellersName: true,
    variableRate: loan.variableRate,
    terms: {
      principal: loan.balance,
      annualRate: loan.annualRate,
      amortizationMonths: loan.remainingMonths,
      paymentOverride: loan.monthlyPI,
    },
  };
}

/**
 * Subject-To: el inversionista adquiere el título "sujeto a" la hipoteca existente.
 * El préstamo sigue siendo obligación personal del vendedor; no es una asunción aprobada por el banco.
 * Precio = saldo de la hipoteca + atrasos + efectivo al vendedor.
 */
export function subjectTo(i: SubjectToInputs): StructureInput {
  return {
    name: "Subject-To",
    purchasePrice: i.loan.balance + i.arrears + i.sellerCash,
    currentValue: i.currentValue,
    arv: i.arv,
    operating: i.operating,
    debts: [existingLoanDebt(i.loan)],
    upfront: {
      ...emptyUpfront(),
      sellerCash: i.sellerCash,
      arrears: i.arrears,
      closingCosts: i.closingCosts,
      repairs: i.repairs,
      reserves: i.reserves,
    },
    cashAvailable: i.cashAvailable,
  };
}

export interface SellerNoteTerms {
  annualRate: Rate;
  amortizationMonths: number;
  /** Vencimiento (balloon). */
  termMonths: number;
  interestOnly?: boolean;
}

export interface SellerFinanceInputs {
  price: Cents;
  currentValue: Cents;
  arv?: Cents;
  downPayment: Cents;
  note: SellerNoteTerms;
  closingCosts: Cents;
  repairs: Cents;
  reserves: Cents;
  operating: OperatingInputs;
  cashAvailable?: Cents;
}

export function sellerFinance(i: SellerFinanceInputs): StructureInput {
  return {
    name: "Seller Financing",
    purchasePrice: i.price,
    currentValue: i.currentValue,
    arv: i.arv,
    operating: i.operating,
    debts: [
      {
        id: "vendedor",
        label: "Pagaré al vendedor",
        kind: "vendedor",
        position: 1,
        terms: {
          principal: Math.max(0, i.price - i.downPayment),
          annualRate: i.note.annualRate,
          amortizationMonths: i.note.amortizationMonths,
          termMonths: i.note.termMonths,
          interestOnly: i.note.interestOnly,
        },
      },
    ],
    upfront: { ...emptyUpfront(), downPayment: i.downPayment, closingCosts: i.closingCosts, repairs: i.repairs, reserves: i.reserves },
    cashAvailable: i.cashAvailable,
  };
}

export interface HybridInputs {
  /** Precio total acordado con el vendedor. */
  price: Cents;
  currentValue: Cents;
  arv?: Cents;
  loans: ExistingLoan[];
  arrears: Cents;
  /** Efectivo al vendedor al cierre (enganche sobre su equity). */
  sellerCash: Cents;
  /** Segundo pagaré al vendedor por el resto de su equity. */
  note: SellerNoteTerms;
  closingCosts: Cents;
  repairs: Cents;
  reserves: Cents;
  operating: OperatingInputs;
  cashAvailable?: Cents;
}

/**
 * Híbrido: Subject-To de una o más hipotecas existentes + pagaré del vendedor en segunda posición
 * por la diferencia entre el precio y (saldos + atrasos + efectivo al cierre).
 */
export function hybrid(i: HybridInputs): StructureInput {
  const existingTotal = i.loans.reduce((s, l) => s + l.balance, 0);
  const notePrincipal = Math.max(0, i.price - existingTotal - i.arrears - i.sellerCash);
  const debts: DebtInput[] = i.loans.map((l, idx) => ({
    ...existingLoanDebt(l, `existente-${idx + 1}`, i.loans.length > 1 ? `Hipoteca existente ${idx + 1}` : "Hipoteca existente"),
    position: idx + 1,
  }));
  debts.push({
    id: "vendedor",
    label: "Pagaré al vendedor (2.ª posición)",
    kind: "vendedor",
    position: i.loans.length + 1,
    terms: {
      principal: notePrincipal,
      annualRate: i.note.annualRate,
      amortizationMonths: i.note.amortizationMonths,
      termMonths: i.note.termMonths,
      interestOnly: i.note.interestOnly,
    },
  });
  return {
    name: "Subject-To + Seller Financing",
    purchasePrice: i.price,
    currentValue: i.currentValue,
    arv: i.arv,
    operating: i.operating,
    debts,
    upfront: {
      ...emptyUpfront(),
      sellerCash: i.sellerCash,
      arrears: i.arrears,
      closingCosts: i.closingCosts,
      repairs: i.repairs,
      reserves: i.reserves,
    },
    cashAvailable: i.cashAvailable,
  };
}

/** Préstamo institucional / hard money / privado sobre el precio de compra. */
export interface LenderLoanInputs {
  price: Cents;
  currentValue: Cents;
  arv?: Cents;
  /** Fracción del precio financiada. */
  loanToPrice: Rate;
  /** Fracción de las reparaciones financiada (hard money suele financiarlas). */
  repairsFinanced?: Rate;
  annualRate: Rate;
  amortizationMonths: number;
  termMonths?: number;
  interestOnly?: boolean;
  points: Rate;
  closingCosts: Cents;
  repairs: Cents;
  reserves: Cents;
  operating: OperatingInputs;
  kind: "banco" | "hard_money" | "privado";
  label: string;
  cashAvailable?: Cents;
}

export function lenderLoan(i: LenderLoanInputs): StructureInput {
  const purchaseLoan = roundCents(i.price * i.loanToPrice);
  const repairsLoan = roundCents(i.repairs * (i.repairsFinanced ?? 0));
  const principal = purchaseLoan + repairsLoan;
  return {
    name: i.label,
    purchasePrice: i.price,
    currentValue: i.currentValue,
    arv: i.arv,
    operating: i.operating,
    debts: [
      {
        id: i.kind,
        label: i.label,
        kind: i.kind,
        position: 1,
        terms: {
          principal,
          annualRate: i.annualRate,
          amortizationMonths: i.amortizationMonths,
          termMonths: i.termMonths,
          interestOnly: i.interestOnly,
        },
      },
    ],
    upfront: {
      ...emptyUpfront(),
      downPayment: i.price - purchaseLoan,
      closingCosts: i.closingCosts,
      financingCosts: roundCents(principal * i.points),
      repairs: i.repairs - repairsLoan,
      reserves: i.reserves,
    },
    cashAvailable: i.cashAvailable,
  };
}
