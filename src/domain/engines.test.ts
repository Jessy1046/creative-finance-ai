import { describe, expect, it } from "vitest";
import { CASES } from "./academy/cases";
import { retrieve } from "./academy/retrieve";
import { analyzeProperty } from "./property/analyze";
import { applyAssumption, newProperty, propertySchema } from "./property/model";
import { assessRisk } from "./risk/engine";
import { runScenarios, runStressTests } from "./risk/stress";
import { compareStrategies } from "./strategies/comparator";
import { availableKinds, buildProposal, defaultParams, evaluateProposal } from "./strategies/dealEngineer";
import { evaluateStructure } from "./strategies/structure";
import { heuristicEvaluation, demoSellerReply } from "./negotiation/evaluation";
import { PERSONAS } from "./negotiation/personas";

const caseRecord = (id: string) => CASES.find((c) => c.id === id)!.record();

describe("modelo de propiedad", () => {
  it("todos los casos pasan la validación", () => {
    for (const c of CASES) expect(propertySchema.safeParse(c.record()).success).toBe(true);
  });
  it("los datos faltantes quedan pendientes; los supuestos quedan marcados como estimados", () => {
    const p = newProperty();
    const a = analyzeProperty(p);
    expect(a.operationalComplete).toBe(false);
    const p2 = applyAssumption(p, "vacancyRate");
    expect(p2.numbers.vacancyRate).toEqual({ value: 0.08, source: "estimado" });
    expect(applyAssumption(p, "currentValue")).toBe(p); // sin supuesto razonable: no se inventa
  });
});

describe("Risk Engine", () => {
  it("datos faltantes bajan la confianza, no el riesgo", () => {
    const empty = assessRisk(newProperty(), null);
    expect(empty.confidence).toBeLessThan(0.3);
    expect(empty.factors.filter((f) => f.applicable && !f.evaluation).length).toBeGreaterThan(5);
  });
  it("puntaje alto = más riesgo; la confianza sube al responder la debida diligencia", () => {
    const rec = caseRecord("caso-a");
    const s = evaluateStructure(buildProposal(rec, defaultParams(rec, "subject_to")));
    const before = assessRisk(rec, s);
    const bad = assessRisk({ ...rec, checklist: { ...rec.checklist, abogado_revisa: "no", revision_estatal: "no", seguro_cotizado: "no" } }, s);
    const good = assessRisk({ ...rec, checklist: { ...rec.checklist, abogado_revisa: "si", revision_estatal: "si", seguro_cotizado: "si" } }, s);
    expect(bad.score!).toBeGreaterThan(good.score!);
    expect(good.confidence).toBeGreaterThan(before.confidence);
    expect(s.input.debts[0]!.inSellersName).toBe(true);
    expect(before.factors.find((f) => f.id === "due_on_sale")!.evaluation!.risk).toBeGreaterThanOrEqual(70);
  });
  it("los pesos son configurables", () => {
    const rec = caseRecord("caso-g");
    const s = evaluateStructure(buildProposal(rec, defaultParams(rec, "subject_to")));
    const a = assessRisk(rec, s, { flujo_negativo: 0 });
    expect(a.factors.find((f) => f.id === "flujo_negativo")!.weight).toBe(0);
  });
});

describe("pruebas de estrés", () => {
  it("el Caso G se rompe al subir gastos y vacancia", () => {
    const rec = caseRecord("caso-g");
    const input = buildProposal(rec, defaultParams(rec, "subject_to"));
    const base = evaluateStructure(input);
    expect(base.cashFlowMonthly).toBeGreaterThan(0);
    const tests = runStressTests(input);
    expect(tests.some((t) => t.breaks)).toBe(true);
    const crisis = runScenarios(input).find((s) => s.id === "crisis")!;
    expect(crisis.result.cashFlowMonthly).toBeLessThan(0);
  });
  it("incluye aceleración de deuda y balloon cuando aplican", () => {
    const c = caseRecord("caso-c");
    expect(runStressTests(buildProposal(c, defaultParams(c, "hibrido"))).map((t) => t.id)).toContain("aceleracion");
    const f = caseRecord("caso-f");
    const ids = runStressTests(buildProposal(f, defaultParams(f, "seller_finance"))).map((t) => t.id);
    expect(ids).toContain("balloon");
    expect(ids).toContain("refi-tasa");
    expect(ids).not.toContain("aceleracion");
  });
});

describe("comparador", () => {
  it("compara 10 estrategias y clasifica cada una", () => {
    const res = compareStrategies(caseRecord("caso-a"));
    expect(res).toHaveLength(10);
    for (const r of res) expect(r.status).toBeTruthy();
  });
  it("sin deuda existente, Subject-To queda como información insuficiente", () => {
    const res = compareStrategies(caseRecord("caso-b"));
    expect(res.find((r) => r.id === "subject_to")!.status).toBe("Información insuficiente");
  });
  it("si el capital supera el efectivo disponible, la compra cash no es viable", () => {
    const res = compareStrategies(caseRecord("caso-b"));
    expect(res.find((r) => r.id === "cash")!.status).toBe("No viable bajo las condiciones planteadas");
  });
  it("el objetivo cambia la ponderación, no los números", () => {
    const rec = caseRecord("caso-d");
    const a = compareStrategies(rec, undefined, "flujo");
    const b = compareStrategies(rec, undefined, "poco_capital");
    expect(a.find((x) => x.id === "dscr")!.cashFlowMonthly).toBe(b.find((x) => x.id === "dscr")!.cashFlowMonthly);
    expect(a.find((x) => x.id === "dscr")!.total).not.toBe(b.find((x) => x.id === "dscr")!.total);
  });
});

describe("Ingeniero de Tratos", () => {
  it("propone las estructuras disponibles según los datos", () => {
    expect(availableKinds(caseRecord("caso-b")).filter((k) => k.available).map((k) => k.kind)).toEqual(["seller_finance"]);
    expect(availableKinds(caseRecord("caso-a")).every((k) => k.available)).toBe(true);
  });
  it("explica qué negociar, obligaciones, peor escenario y salidas", () => {
    const rec = caseRecord("caso-c");
    const r = evaluateProposal(rec, defaultParams(rec, "hibrido"));
    expect(r.negotiate.length).toBeGreaterThan(2);
    expect(r.obligations.length).toBeGreaterThan(1);
    expect(r.exits.length).toBeGreaterThan(1);
    expect(r.worst).not.toBeNull();
    expect(r.explanation.join(" ")).toMatch(/due-on-sale/);
  });
  it("el pagaré del híbrido cubre el equity restante del vendedor", () => {
    const rec = caseRecord("caso-c");
    const p = defaultParams(rec, "hibrido");
    const s = evaluateStructure(buildProposal(rec, p));
    const note = s.debts.find((d) => d.debt.kind === "vendedor")!;
    expect(note.debt.terms.principal + p.cashToSeller + 150_000_00).toBe(p.price);
  });
});

describe("contenido y negociación", () => {
  it("la recuperación encuentra la lección correcta", () => {
    expect(retrieve("¿Qué es una hipoteca wrap?")[0]!.lesson).toBe("wraparound");
    expect(retrieve("balloon seller financing").some((c) => c.lesson === "seller-financing")).toBe(true);
    expect(retrieve("")).toEqual([]);
  });
  it("la evaluación heurística premia preguntas abiertas y castiga la presión", () => {
    const p = PERSONAS[1]!;
    const good = heuristicEvaluation(p, [
      { role: "assistant", content: p.opening },
      { role: "user", content: "¿Qué es lo más importante para usted con la mudanza? ¿Cómo le preocupa su crédito?" },
      { role: "user", content: "Le explico el riesgo due-on-sale y que un abogado revise todo con un servicer." },
    ]);
    const bad = heuristicEvaluation(p, [
      { role: "assistant", content: p.opening },
      { role: "user", content: "Firme hoy, es su última oportunidad. Nadie se va a enterar." },
    ]);
    expect(good.score).toBeGreaterThan(bad.score);
    expect(bad.ethicsFlags.length).toBeGreaterThan(0);
    expect(good.needsIdentified.length).toBeGreaterThan(0);
  });
  it("el vendedor de demostración reacciona a la presión", () => {
    expect(demoSellerReply(PERSONAS[0]!, [{ role: "user", content: "Es su última oportunidad" }])).toMatch(/presionado/);
  });
});
