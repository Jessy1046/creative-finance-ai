import { z } from "zod/v4";
import type { Persona } from "./personas";

/** Esquema de la evaluación educativa (lo devuelve la IA o el modo demostración). */
export const evaluationSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  goodQuestions: z.array(z.string()),
  needsIdentified: z.array(z.string()),
  missingInformation: z.array(z.string()),
  unexplainedRisks: z.array(z.string()),
  improvements: z.array(z.string()),
  ethicsFlags: z.array(z.string()),
  simulatedProposal: z.string(),
});
export type Evaluation = z.infer<typeof evaluationSchema>;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const RISK_TERMS: [string, string[]][] = [
  ["Cláusula due-on-sale", ["due-on-sale", "due on sale", "acelerar", "aceleración", "saldo completo"]],
  ["Revisión por un abogado", ["abogado", "attorney", "legal"]],
  ["Uso de un servicer", ["servicer", "registro de pagos", "compañía de pagos"]],
  ["Balloon / vencimiento", ["balloon", "vencimiento", "pago final"]],
  ["Seguro de la propiedad", ["seguro", "póliza", "poliza"]],
];

const PRESSURE = ["firme hoy", "ahora mismo o", "última oportunidad", "ultima oportunidad", "no le diga al banco", "nadie se va a enterar", "garantizado", "sin riesgo"];

/**
 * Evaluación heurística para el modo demostración (sin IA).
 * Es transparente y limitada: cuenta preguntas abiertas, necesidades descubiertas y riesgos explicados.
 */
export function heuristicEvaluation(persona: Persona, turns: ChatTurn[]): Evaluation {
  const userText = turns.filter((t) => t.role === "user").map((t) => t.content);
  const all = userText.join(" \n ").toLowerCase();
  const questions = userText.flatMap((t) => t.split(/(?<=\?)/).filter((s) => s.includes("?")).map((s) => s.trim()));
  const open = questions.filter((q) => /^(¿)?\s*(qué|que|cómo|como|por qué|por que|cuál|cual|cuáles|cuales|cuándo|cuando|para qué|para que|cuénteme|cuenteme|dígame|digame)/i.test(q));
  const needs = persona.hidden.needs.filter((_, i) => (persona.needKeywords[i] ?? []).some((k) => all.includes(k)));
  const risks = RISK_TERMS.filter(([, keys]) => keys.some((k) => all.includes(k))).map(([label]) => label);
  const pressure = PRESSURE.filter((p) => all.includes(p));

  const score = Math.max(
    0,
    Math.min(100, Math.round(10 + Math.min(open.length, 6) * 7 + needs.length * 12 + risks.length * 5 - pressure.length * 25)),
  );
  return {
    score,
    summary:
      "Evaluación automática del modo demostración (sin IA): mide preguntas abiertas, necesidades descubiertas y riesgos explicados. Con la IA conectada recibirás retroalimentación detallada.",
    goodQuestions: open.slice(0, 5),
    needsIdentified: needs,
    missingInformation: persona.hidden.needs.filter((n) => !needs.includes(n)).map((n) => `No descubriste: ${n.toLowerCase()}.`),
    unexplainedRisks: RISK_TERMS.map(([l]) => l).filter((l) => !risks.includes(l)),
    improvements: [
      open.length < 3 ? "Haz más preguntas abiertas antes de proponer." : "Buen uso de preguntas abiertas.",
      needs.length < persona.hidden.needs.length ? "Resume lo que escuchaste y confirma el problema real del vendedor." : "Identificaste las necesidades principales.",
      "Presenta al menos dos opciones con beneficios y riesgos para cada parte.",
    ],
    ethicsFlags: pressure.map((p) => `Frase de presión o promesa indebida detectada: "${p}".`),
    simulatedProposal: `Estrategias que este vendedor podría considerar: ${persona.hidden.openTo.join("; ")}. Valida números y términos con el simulador.`,
  };
}

/** Respuesta del vendedor en modo demostración (guion simple basado en palabras clave). */
export function demoSellerReply(persona: Persona, turns: ChatTurn[]): string {
  const last = turns.filter((t) => t.role === "user").at(-1)?.content.toLowerCase() ?? "";
  const asked = turns.filter((t) => t.role === "user").length;
  const pressure = PRESSURE.some((p) => last.includes(p));
  if (pressure) return "Mmm… no me gusta sentirme presionado. Prefiero pensarlo y consultarlo con alguien de confianza.";
  for (let i = 0; i < persona.needKeywords.length; i++) {
    if ((persona.needKeywords[i] ?? []).some((k) => last.includes(k))) {
      return `Sí, eso es importante para mí. ${persona.hidden.needs[i]}. ${i === 0 ? persona.hidden.numbers : ""}`.trim();
    }
  }
  if (/due-on-sale|abogado|servicer|riesgo/.test(last)) return "Gracias por explicarme eso. Me da más confianza que me hable claro de los riesgos.";
  if (/(oferta|propongo|ofrezco|financiamiento|subject|pagos mensuales)/.test(last))
    return `Puede ser… ${persona.hidden.openTo[0] ? `Estaría dispuesto a considerar algo así: ${persona.hidden.openTo[0].toLowerCase()}.` : ""} Pero antes quiero entender bien cómo me protege.`;
  if (last.includes("?")) return asked < 3 ? persona.hidden.emotional.replace(/\.$/, "") + "… La verdad, " + persona.hidden.realProblem.charAt(0).toLowerCase() + persona.hidden.realProblem.slice(1) : persona.hidden.realProblem;
  return "Entiendo. ¿Y eso en qué me ayuda a mí?";
}
