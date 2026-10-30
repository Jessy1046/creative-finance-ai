import { CATALOG } from "./catalog";
import { LESSONS, type Lesson } from "./lessons";

/**
 * Recuperación de contenido aprobado (RAG ligero, sin servicios externos).
 * Divide las lecciones en fragmentos con su fuente y los ordena por coincidencia de términos.
 * Interfaz preparada para sustituirse por búsqueda vectorial en el futuro.
 */
export interface KnowledgeChunk {
  id: string;
  title: string;
  lesson: string;
  updatedAt: string;
  text: string;
  sources: { label: string; url: string }[];
}

const STOP = new Set("el la los las un una unos unas de del al a en y o que qué es por para con sin se su sus mi me lo le como cómo cuando cuándo cual cuál mas más muy ya si no hay este esta esto eso".split(" "));

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function chunksFor(l: Lesson): KnowledgeChunk[] {
  const base = { lesson: l.slug, updatedAt: l.updatedAt, sources: l.sources };
  const sections: [string, string][] = [
    ["Qué es", l.whatIs],
    ["Cómo funciona", l.howItWorks.join(" ")],
    ["Cuándo usarla", `${l.whenToUse.join(" ")} Perfil del vendedor: ${l.sellerProfile.join(", ")}. Problema que resuelve: ${l.problemSolved}`],
    ["Ventajas", `Para el vendedor: ${l.sellerAdvantages.join("; ")}. Para el comprador: ${l.buyerAdvantages.join("; ")}.`],
    ["Riesgos", `Vendedor: ${l.sellerRisks.join("; ")}. Comprador: ${l.buyerRisks.join("; ")}.`],
    ["Requisitos", `Financieros: ${l.financialRequirements.join("; ")}. Legales: ${l.legalRequirements.join("; ")}.`],
    ["Ejemplo", `${l.example.title}: ${l.example.rows.map(([a, b]) => `${a} ${b}`).join("; ")}. ${l.example.note}`],
    ["Salidas y debida diligencia", `Salidas: ${l.exits.join("; ")}. Checklist: ${l.checklist.join("; ")}.`],
  ];
  return sections.map(([name, text], i) => ({ ...base, id: `${l.slug}#${i}`, title: `${l.title} — ${name}`, text: `${l.term}. ${text}` }));
}

const CHUNKS: KnowledgeChunk[] = [
  ...LESSONS.flatMap(chunksFor),
  ...CATALOG.filter((c) => !c.lesson).map((c) => ({
    id: `catalogo#${c.id}`,
    title: c.name,
    lesson: "catalogo",
    updatedAt: "2026-10-30",
    text: c.summary,
    sources: [],
  })),
];

// El título incluye el nombre de la estrategia y su término en inglés (p. ej. «Wrap / AITD»).
const INDEX = CHUNKS.map((c) => ({ chunk: c, terms: new Set(tokens(`${c.title} ${c.text}`)), titleTerms: new Set(tokens(`${c.title} ${c.text.split(". ")[0]}`)) }));

// Peso por rareza (IDF): un término que aparece en pocos fragmentos pesa más que uno común.
const DF = new Map<string, number>();
for (const { terms } of INDEX) for (const t of terms) DF.set(t, (DF.get(t) ?? 0) + 1);
const idf = (t: string) => Math.log(1 + INDEX.length / (DF.get(t) ?? INDEX.length));

export function retrieve(query: string, k = 4): KnowledgeChunk[] {
  const q = [...new Set(tokens(query))];
  if (q.length === 0) return [];
  return INDEX.map(({ chunk, terms, titleTerms }) => ({
    chunk,
    score: q.reduce((s, t) => s + (terms.has(t) ? idf(t) * (titleTerms.has(t) ? 2 : 1) : 0), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.chunk);
}

export function formatKnowledge(chunks: KnowledgeChunk[]): string {
  return chunks
    .map((c) => `### ${c.title} (actualizado ${c.updatedAt})\n${c.text}\nFuentes: ${c.sources.map((s) => s.label).join("; ") || "contenido interno de la academia"}`)
    .join("\n\n");
}
