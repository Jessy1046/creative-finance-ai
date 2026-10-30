export type Answer = "si" | "no" | "desconocido";

export interface ChecklistQuestion {
  id: string;
  question: string;
  /** Qué respuesta reduce el riesgo. */
  goodAnswer: "si" | "no";
  category: "financiero" | "inmobiliario" | "legal" | "ejecucion";
  help: string;
}

/** Preguntas de debida diligencia que alimentan el motor de riesgos. "No sé" no cuenta como riesgo cero. */
export const CHECKLIST: ChecklistQuestion[] = [
  { id: "busqueda_titulo", question: "¿Una compañía de títulos o abogado hizo la búsqueda de título?", goodAnswer: "si", category: "legal", help: "Revela gravámenes, juicios, impuestos atrasados y defectos de título." },
  { id: "juicios_vendedor", question: "¿Hay juicios, embargos o bancarrota contra el vendedor?", goodAnswer: "no", category: "legal", help: "Pueden adherirse a la propiedad o impedir la transferencia." },
  { id: "abogado_revisa", question: "¿Un abogado con licencia en el estado revisará los contratos y disclosures?", goodAnswer: "si", category: "legal", help: "Ninguna app sustituye la revisión legal." },
  { id: "revision_estatal", question: "¿Revisaste las reglas de tu estado para esta estructura?", goodAnswer: "si", category: "legal", help: "Seller financing, contratos a plazos y lease options se regulan distinto en cada estado." },
  { id: "comprador_ocupante", question: "¿Financiarás a un comprador que vivirá en la casa?", goodAnswer: "no", category: "legal", help: "Puede activar Regulation Z (TILA), Dodd-Frank y el SAFE Act." },
  { id: "originador_licencia", question: "¿Participará un originador con licencia (RMLO) si aplica?", goodAnswer: "si", category: "legal", help: "Necesario en muchos financiamientos a ocupantes." },
  { id: "estado_cuenta", question: "¿Tienes el estado de cuenta más reciente de la hipoteca?", goodAnswer: "si", category: "financiero", help: "Confirma saldo, tasa, escrow y atrasos." },
  { id: "reavaluo_impuestos", question: "¿Consideraste que los impuestos pueden subir tras la venta (reavalúo)?", goodAnswer: "si", category: "inmobiliario", help: "Muchos condados reavalúan al cambiar de dueño." },
  { id: "seguro_cotizado", question: "¿Tienes una cotización de seguro para la propiedad y la estructura?", goodAnswer: "si", category: "inmobiliario", help: "En Subject-To, la póliza debe proteger a ambas partes y el prestamista." },
  { id: "inspeccion", question: "¿Hiciste una inspección profesional?", goodAnswer: "si", category: "inmobiliario", help: "Reduce sorpresas en reparaciones." },
  { id: "contingencia_reparaciones", question: "¿Tu presupuesto de reparaciones incluye contingencia (10–20 %)?", goodAnswer: "si", category: "ejecucion", help: "Los sobrecostos son la norma, no la excepción." },
  { id: "contratista_confirmado", question: "¿Tienes contratista con licencia y precio por escrito?", goodAnswer: "si", category: "ejecucion", help: "Sin contratista confirmado, el cronograma es una suposición." },
  { id: "cronograma_obra", question: "¿Hay un cronograma de obra realista?", goodAnswer: "si", category: "ejecucion", help: "Cada mes de retraso cuesta deuda, impuestos y seguro." },
  { id: "plan_administracion", question: "¿Tienes plan de administración (tú o un administrador)?", goodAnswer: "si", category: "ejecucion", help: "La administración deficiente erosiona el flujo." },
  { id: "servicer", question: "¿Usarás un servicer independiente para los pagos?", goodAnswer: "si", category: "ejecucion", help: "Protege a vendedor y comprador con registro de cada pago." },
];

export const CHECKLIST_BY_ID = Object.fromEntries(CHECKLIST.map((q) => [q.id, q]));
