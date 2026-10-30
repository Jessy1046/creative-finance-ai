/**
 * Catálogo de estrategias. Cada una se clasifica por su función real:
 * no todas son equivalentes (una es una forma de adquirir, otra una fuente de capital,
 * otra una salida o un tratamiento fiscal).
 */

export type StrategyCategory = "adquisicion" | "financiamiento" | "intermediacion" | "administracion" | "salida" | "fiscal";

export const CATEGORY_INFO: Record<StrategyCategory, { label: string; description: string }> = {
  adquisicion: { label: "Estructura de adquisición", description: "Cómo pasa el control o el título de la propiedad." },
  financiamiento: { label: "Fuente de financiamiento", description: "De dónde sale el dinero y en qué términos." },
  intermediacion: { label: "Intermediación", description: "Ganar por conectar un contrato con un comprador final." },
  administracion: { label: "Administración / operación", description: "Cómo se opera el activo para generar flujo." },
  salida: { label: "Estrategia de salida", description: "Cómo se recupera el capital y se realiza la ganancia." },
  fiscal: { label: "Tratamiento fiscal", description: "Cómo se difieren o reducen impuestos (consulta a un CPA)." },
};

export type Level = "principiante" | "intermedio" | "avanzado";

export interface CatalogEntry {
  id: string;
  name: string;
  term?: string;
  category: StrategyCategory;
  level: Level;
  summary: string;
  /** Slug de la lección completa, si existe. */
  lesson?: string;
  /** Simulador disponible en el laboratorio. */
  simulator?: string;
}

export const CATALOG: CatalogEntry[] = [
  { id: "subject-to", name: "Subject-To", term: "Sub2", category: "adquisicion", level: "avanzado", summary: "Adquieres el título mientras la hipoteca existente sigue a nombre del vendedor y tú haces los pagos.", lesson: "subject-to", simulator: "subject_to" },
  { id: "seller-financing", name: "Seller Financing / Owner Financing", category: "financiamiento", level: "principiante", summary: "El vendedor financia la compra: enganche y pagos mensuales con interés, garantizados por la propiedad.", lesson: "seller-financing", simulator: "seller_finance" },
  { id: "hibrido", name: "Subject-To + Seller Financing", term: "Híbrido", category: "adquisicion", level: "avanzado", summary: "Tomas la hipoteca existente y el vendedor financia su equity con un segundo pagaré.", lesson: "hibrido", simulator: "hibrido" },
  { id: "wrap", name: "Wraparound Mortgage", term: "Wrap / AITD", category: "financiamiento", level: "avanzado", summary: "Vendes con un pagaré nuevo que 'envuelve' la deuda existente; cobras la diferencia.", lesson: "wraparound", simulator: "wrap" },
  { id: "asuncion", name: "Mortgage Assumption formal", category: "adquisicion", level: "intermedio", summary: "El prestamista aprueba que el comprador asuma el préstamo existente (común en FHA/VA, con requisitos)." },
  { id: "loan-mod", name: "Loan Modification", category: "financiamiento", level: "intermedio", summary: "Alternativa a evaluar con el vendedor en apuros: el banco modifica tasa, plazo o atrasos." },
  { id: "master-lease", name: "Master Lease", category: "administracion", level: "intermedio", summary: "Arriendas toda la propiedad al dueño y la operas; a menudo con opción de compra." },
  { id: "lease-option", name: "Lease Option", category: "adquisicion", level: "principiante", summary: "Rentas con el derecho, no la obligación, de comprar a un precio fijado.", lesson: "lease-option", simulator: "lease_option" },
  { id: "lease-purchase", name: "Lease Purchase", category: "adquisicion", level: "intermedio", summary: "Rentas con la obligación de comprar al final: más compromiso que una opción." },
  { id: "rent-to-own", name: "Rent-to-Own", category: "salida", level: "principiante", summary: "Término comercial para rentas con opción o con obligación de compra dirigidas a compradores finales." },
  { id: "land-contract", name: "Land Contract / Contract for Deed", category: "financiamiento", level: "intermedio", summary: "El vendedor conserva el título hasta que el comprador termina de pagar. Muy regulado en varios estados." },
  { id: "installment", name: "Installment Land Sale", category: "fiscal", level: "intermedio", summary: "Venta a plazos que puede permitir al vendedor reconocer la ganancia a lo largo del tiempo (IRS Pub. 537)." },
  { id: "private-money", name: "Private Money Lending", category: "financiamiento", level: "principiante", summary: "Préstamo de una persona, garantizado con la propiedad, con interés y plazo negociados.", simulator: "socios" },
  { id: "hard-money", name: "Hard Money Lending", category: "financiamiento", level: "principiante", summary: "Préstamo de corto plazo basado en el activo, con tasa y puntos altos; común en flips y BRRRR." },
  { id: "jv", name: "Joint Venture", category: "financiamiento", level: "intermedio", summary: "Dos o más partes se asocian para un trato específico, aportando capital, crédito o trabajo." },
  { id: "equity-partnership", name: "Equity Partnership", category: "financiamiento", level: "intermedio", summary: "Un socio aporta capital a cambio de participación en el flujo y en la ganancia.", simulator: "socios" },
  { id: "capital-partnership", name: "Capital Partnership", category: "financiamiento", level: "avanzado", summary: "Estructura con preferred return y waterfall para varios inversionistas pasivos.", simulator: "socios" },
  { id: "transactional", name: "Transactional Funding", category: "intermediacion", level: "intermedio", summary: "Préstamo de horas o días para cerrar un double close en wholesaling." },
  { id: "gap", name: "Gap Funding", category: "financiamiento", level: "intermedio", summary: "Préstamo que cubre la diferencia que no financia el prestamista principal (enganche, cierre)." },
  { id: "portfolio-sf", name: "Portfolio Seller Financing", category: "financiamiento", level: "avanzado", summary: "Un dueño con varias propiedades financia la venta de todo o parte del portafolio." },
  { id: "carryback", name: "Seller Carryback", category: "financiamiento", level: "intermedio", summary: "El vendedor financia una parte del precio junto con un préstamo bancario." },
  { id: "second-note", name: "Second Position Seller Note", category: "financiamiento", level: "intermedio", summary: "Pagaré del vendedor en segunda posición, detrás de otra deuda." },
  { id: "cross-collateral", name: "Cross-Collateralization", category: "financiamiento", level: "avanzado", summary: "Usar el equity de una propiedad como garantía adicional de otra compra." },
  { id: "blanket", name: "Blanket Loans", category: "financiamiento", level: "avanzado", summary: "Un solo préstamo garantizado por varias propiedades." },
  { id: "refi", name: "Refinanciamiento y Cash-out Refinance", category: "salida", level: "principiante", summary: "Reemplazar la deuda por una nueva; el cash-out recupera capital con deuda, no es ganancia." },
  { id: "brrrr", name: "BRRRR", category: "salida", level: "intermedio", summary: "Buy, Rehab, Rent, Refinance, Repeat: recuperar capital para repetir.", lesson: "brrrr", simulator: "brrrr" },
  { id: "house-hacking", name: "House Hacking", category: "administracion", level: "principiante", summary: "Vives en una unidad y rentas las demás para reducir tu costo de vivienda." },
  { id: "wholesaling", name: "Wholesaling", category: "intermediacion", level: "principiante", summary: "Contratas una propiedad y asignas el contrato a otro comprador. Requiere cumplir reglas de licenciamiento de cada estado." },
  { id: "novation", name: "Novation Agreements", category: "intermediacion", level: "avanzado", summary: "Acuerdo para mejorar y vender la propiedad del vendedor en el mercado; regulado y sensible." },
  { id: "wholetailing", name: "Wholetailing", category: "salida", level: "intermedio", summary: "Compras y revendes con mejoras ligeras al comprador final." },
  { id: "flip", name: "Fix and Flip", category: "salida", level: "intermedio", summary: "Comprar, remodelar y vender. Regla del 50 % como filtro; análisis completo de beneficio neto.", simulator: "flip" },
  { id: "buy-hold", name: "Buy and Hold", category: "administracion", level: "principiante", summary: "Comprar para rentar a largo plazo y construir equity y flujo." },
  { id: "sf-resale", name: "Seller Financing en la reventa", category: "salida", level: "avanzado", summary: "Vender tu propiedad financiando al comprador; atención a Reg Z y SAFE Act." },
  { id: "notes", name: "Compra de Mortgage Notes", category: "financiamiento", level: "avanzado", summary: "Comprar pagarés garantizados con inmuebles: te conviertes en el acreedor." },
  { id: "pnpl", name: "Performing y Nonperforming Notes", category: "financiamiento", level: "avanzado", summary: "Notas al corriente (flujo) o en impago (descuento, reestructura o ejecución)." },
  { id: "multifamily", name: "Multifamily Value-Add", category: "administracion", level: "avanzado", summary: "Aumentar el NOI de un multifamiliar con mejoras y mejor operación; el valor sigue al NOI." },
  { id: "1031", name: "1031 Exchange", category: "fiscal", level: "avanzado", summary: "Diferir impuestos reinvirtiendo en una propiedad similar con plazos estrictos (consulta a un CPA y un intermediario calificado)." },
  { id: "opcion", name: "Opción de compra", term: "Option", category: "adquisicion", level: "intermedio", summary: "Pagas por el derecho exclusivo de comprar a un precio durante un plazo." },
  { id: "earnest", name: "Earnest Money estructurado", category: "adquisicion", level: "principiante", summary: "Depósito de buena fe y sus condiciones de devolución según el contrato." },
  { id: "multi-capital", name: "Acuerdos híbridos con múltiples fuentes de capital", category: "financiamiento", level: "avanzado", summary: "Combinar vendedor, prestamista privado, socio y banco en un mismo trato." },
];
