import type { Level, StrategyCategory } from "./catalog";

/**
 * Contenido educativo aprobado (base del RAG del asistente).
 * Fuentes: documentación regulatoria pública. Inspiración educativa general,
 * sin copiar cursos ni materiales propietarios.
 */

export interface Source {
  label: string;
  url: string;
}

export const SOURCES = {
  regZ: { label: "CFPB — Regulation Z (12 CFR 1026)", url: "https://www.consumerfinance.gov/rules-policy/regulations/1026/36/" },
  irs537: { label: "IRS — Publicación 537, Installment Sales", url: "https://www.irs.gov/publications/p537" },
  fannieTransfer: { label: "Fannie Mae — Determinar si se permite una transferencia de propiedad (D1-4.1-01)", url: "https://guide-servicing.fanniemae.com/svc/d1-4.1-01/determining-whether-transfer-ownership-permitted" },
  garn: { label: "12 U.S.C. § 1701j-3 — Garn–St Germain (due-on-sale)", url: "https://www.law.cornell.edu/uscode/text/12/1701j-3" },
  safe: { label: "CFPB — SAFE Act / Regulation H (12 CFR 1008)", url: "https://www.consumerfinance.gov/rules-policy/regulations/1008/" },
  fairHousing: { label: "HUD — Fair Housing Act", url: "https://www.hud.gov/program_offices/fair_housing_equal_opp/fair_housing_act_overview" },
} satisfies Record<string, Source>;

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Lesson {
  slug: string;
  title: string;
  term: string;
  level: Level;
  category: StrategyCategory;
  minutes: number;
  updatedAt: string;
  whatIs: string;
  howItWorks: string[];
  whenToUse: string[];
  sellerProfile: string[];
  problemSolved: string;
  sellerAdvantages: string[];
  buyerAdvantages: string[];
  sellerRisks: string[];
  buyerRisks: string[];
  financialRequirements: string[];
  legalRequirements: string[];
  example: { title: string; rows: [string, string][]; note: string };
  /** Pestaña del laboratorio con la simulación editable. */
  simulator: string;
  quiz: QuizQuestion[];
  practiceCase: { title: string; scenario: string; tasks: string[]; caseId?: string };
  checklist: string[];
  exits: string[];
  sources: Source[];
}

const UPDATED = "2026-10-30";

export const LESSONS: Lesson[] = [
  {
    slug: "subject-to",
    title: "Subject-To (Sub2)",
    term: "Subject-To the existing financing",
    level: "avanzado",
    category: "adquisicion",
    minutes: 14,
    updatedAt: UPDATED,
    whatIs:
      "Comprar \"sujeto a\" la hipoteca existente: el vendedor te transfiere el título (deed) y su préstamo sigue vigente a su nombre. Tú haces los pagos. No es una asunción aprobada por el banco: el préstamo sigue siendo obligación personal del vendedor.",
    howItWorks: [
      "Verificas el préstamo con el estado de cuenta: saldo, tasa, pago, escrow y atrasos.",
      "Acuerdas con el vendedor el precio: normalmente el saldo de la hipoteca + atrasos + un pago en efectivo.",
      "Un abogado o compañía de títulos prepara la escritura, los disclosures y las autorizaciones.",
      "Al cerrar, el título pasa a ti (o a tu entidad/fideicomiso) y pones al corriente los atrasos.",
      "Pagas cada mes a través de un servicer, mantienes el seguro correcto y das al vendedor acceso para verificar.",
      "Sales refinanciando a tu nombre, vendiendo o pagando el préstamo hasta el final.",
    ],
    whenToUse: [
      "El vendedor tiene poco equity y necesita salir rápido.",
      "La tasa existente es mucho menor que la del mercado actual.",
      "Hay atrasos y el vendedor quiere evitar una ejecución hipotecaria.",
    ],
    sellerProfile: ["Vendedor con deuda existente", "Vendedor con dificultades financieras", "Vendedor con poco equity", "Traslado de trabajo o divorcio"],
    problemSolved: "Alivia al vendedor de un pago que no puede o no quiere seguir haciendo, sin esperar a una venta tradicional que no cubriría comisiones ni atrasos.",
    sellerAdvantages: ["Deja de pagar desde el cierre", "Puede evitar la ejecución y el daño a su crédito si los pagos se mantienen al día", "Sin comisiones ni reparaciones", "Cierre en días"],
    buyerAdvantages: ["Hereda una tasa baja", "Poco capital inicial", "Sin calificar para un préstamo nuevo"],
    sellerRisks: ["Su crédito depende de tus pagos", "Sigue siendo responsable del préstamo", "Si el banco acelera la deuda, puede perder la casa sin haber cobrado"],
    buyerRisks: ["Cláusula due-on-sale: el prestamista puede exigir el saldo", "Seguro mal configurado deja la casa sin cobertura", "Gravámenes ocultos sin búsqueda de título", "Reglas estatales sobre compras a propietarios en ejecución"],
    financialRequirements: ["Efectivo para atrasos, cierre y pago al vendedor", "Reservas de al menos 6 meses de PITI", "Plan para refinanciar o liquidar si el banco acelera"],
    legalRequirements: ["Disclosures firmados explicando que el préstamo sigue a nombre del vendedor", "Revisión de las reglas del estado (algunos regulan compras a propietarios en ejecución)", "Póliza de seguro que proteja al prestamista, al vendedor y a ti", "Autorización del vendedor para hablar con el servicer"],
    example: {
      title: "Casa de $240,000 con préstamo al 3.25 %",
      rows: [
        ["Valor", "$240,000"],
        ["Saldo del préstamo", "$180,000"],
        ["Atrasos + efectivo al vendedor + cierre", "$3,000 + $5,000 + $2,000"],
        ["Renta", "$1,900"],
        ["Pago P&I + impuestos + seguro", "Calculado en el simulador"],
      ],
      note: "Abre el simulador para ver el flujo exacto con tus gastos y reservas.",
    },
    simulator: "subject_to",
    quiz: [
      { q: "En un Subject-To, ¿a nombre de quién queda el préstamo?", options: ["Del comprador", "Del vendedor", "Del banco", "De la compañía de títulos"], answer: 1, explain: "El préstamo sigue siendo obligación personal del vendedor; por eso su crédito depende de tus pagos." },
      { q: "¿Qué permite la cláusula due-on-sale?", options: ["Bajar la tasa", "Que el prestamista exija el saldo completo al transferirse la propiedad", "Prohibir la venta", "Cancelar el seguro"], answer: 1, explain: "La ley Garn–St Germain permite a los prestamistas hacer valer esta cláusula, salvo excepciones específicas." },
      { q: "¿Subject-To es lo mismo que una asunción formal?", options: ["Sí", "No: la asunción requiere aprobación del prestamista"], answer: 1, explain: "En una asunción formal el prestamista aprueba al nuevo deudor; en Subject-To no hay aprobación." },
      { q: "¿Cuál es la mejor práctica para los pagos?", options: ["Pagar en efectivo al vendedor", "Usar un servicer independiente con acceso para ambas partes", "Pagar cuando haya renta"], answer: 1, explain: "El servicer deja registro de cada pago y protege a ambas partes." },
    ],
    practiceCase: {
      title: "Caso A: hipoteca baja y dueño que necesita vender",
      scenario: "Un propietario se muda por trabajo. Debe $180,000 al 3.25 % y la casa vale $240,000. Tiene dos pagos atrasados.",
      tasks: ["Calcula el efectivo total para entrar con 6 meses de reserva.", "Identifica los riesgos que debes explicarle al vendedor.", "Propón dos salidas si el banco acelera la deuda."],
      caseId: "caso-a",
    },
    checklist: ["Estado de cuenta reciente", "Búsqueda de título y gravámenes", "Verificación de impuestos y seguro", "Disclosures firmados", "Póliza de seguro actualizada", "Servicer contratado", "Reserva separada", "Plan de salida por escrito"],
    exits: ["Refinanciar a tu nombre", "Vender en el mercado", "Rentar a largo plazo", "Vender con wrap cumpliendo la regulación aplicable"],
    sources: [SOURCES.garn, SOURCES.fannieTransfer],
  },
  {
    slug: "seller-financing",
    title: "Seller Financing / Owner Financing",
    term: "Seller financing",
    level: "principiante",
    category: "financiamiento",
    minutes: 10,
    updatedAt: UPDATED,
    whatIs:
      "El vendedor actúa como banco: recibes la escritura, firmas un pagaré (promissory note) y una hipoteca o deed of trust a su favor, y le pagas mensualmente con el interés acordado.",
    howItWorks: [
      "Negocias cinco términos: precio, enganche, tasa, amortización y vencimiento (balloon).",
      "Se firma el contrato de compraventa con los términos del financiamiento.",
      "Al cerrar, el vendedor te pasa el título y registra su garantía sobre la propiedad.",
      "Pagas a través de un servicer.",
      "Antes del vencimiento refinancias, vendes o negocias una extensión.",
    ],
    whenToUse: ["El vendedor no tiene hipoteca (o la liquida al cierre)", "Busca ingreso mensual en lugar de un pago único", "La propiedad no califica para un préstamo bancario"],
    sellerProfile: ["Vendedor con casa pagada", "Vendedor que desea ingreso mensual", "Dueño cansado de administrar", "Propietario de una casa heredada"],
    problemSolved: "Convierte el equity del vendedor en un ingreso mensual con interés, y te permite comprar sin un banco.",
    sellerAdvantages: ["Ingreso mensual con interés", "Puede repartir el reconocimiento de la ganancia en el tiempo (venta a plazos; consulta a un CPA)", "Precio más alto que una venta en efectivo", "La propiedad garantiza la deuda"],
    buyerAdvantages: ["Términos flexibles", "Cierre rápido", "Sin requisitos bancarios"],
    sellerRisks: ["Impago del comprador y posible ejecución", "Recibe el capital lentamente", "Si financia a un comprador ocupante, reglas federales y estatales"],
    buyerRisks: ["Balloon que vence aunque el mercado baje", "Tasa a veces mayor que la bancaria", "Si el vendedor tenía hipoteca no liquidada, riesgo due-on-sale"],
    financialRequirements: ["Enganche negociado", "Capacidad de pago verificable", "Plan para el balloon"],
    legalRequirements: ["Pagaré y garantía registrados", "Revisión de Regulation Z / SAFE Act si el comprador vivirá en la casa", "Reglas estatales de seller financing"],
    example: {
      title: "Casa de $250,000",
      rows: [
        ["Enganche 10 %", "$25,000"],
        ["Pagaré", "$225,000 al 6 %, 30 años"],
        ["Pago P&I", "$1,348.99"],
        ["Balloon al año 5", "≈ $209,372"],
        ["Renta − impuestos/seguro − reservas", "$2,300 − $350 − $345"],
        ["Flujo mensual", "≈ $256"],
      ],
      note: "Cifras calculadas con el motor de la app y verificadas en pruebas unitarias.",
    },
    simulator: "seller_finance",
    quiz: [
      { q: "¿Qué es un pago balloon?", options: ["Un pago extra opcional", "El saldo pendiente que vence completo en una fecha", "La prima del seguro"], answer: 1, explain: "Si la amortización es más larga que el plazo, al vencer se paga el saldo restante." },
      { q: "¿Qué documento garantiza la deuda con la propiedad?", options: ["El pagaré", "La hipoteca o deed of trust", "El contrato de renta"], answer: 1, explain: "El pagaré es la promesa de pago; la hipoteca o deed of trust es la garantía." },
      { q: "¿Por qué le puede convenir al vendedor?", options: ["Porque cobra intereses y puede diferir impuestos", "Porque no recibe nada", "Porque pierde la garantía"], answer: 0, explain: "Recibe ingreso con interés y, como venta a plazos, puede reconocer la ganancia en el tiempo." },
    ],
    practiceCase: {
      title: "Caso B: casa pagada, vendedor que busca pagos mensuales",
      scenario: "Una pareja jubilada vende una casa pagada de $250,000 y quiere un ingreso mensual estable.",
      tasks: ["Propón enganche, tasa y plazo.", "Calcula el balloon y cómo lo pagarías.", "Explica al vendedor sus riesgos y cómo protegerse."],
      caseId: "caso-b",
    },
    checklist: ["Título libre de gravámenes", "Pagaré y garantía revisados por abogado", "Servicer", "Seguro con el vendedor como acreedor", "Plan para el balloon"],
    exits: ["Refinanciar antes del balloon", "Vender", "Negociar extensión"],
    sources: [SOURCES.irs537, SOURCES.regZ, SOURCES.safe],
  },
  {
    slug: "hibrido",
    title: "Híbrido: Subject-To + Seller Financing",
    term: "Hybrid / Sub2 + seller carry",
    level: "avanzado",
    category: "adquisicion",
    minutes: 12,
    updatedAt: UPDATED,
    whatIs:
      "Tomas la hipoteca existente (Subject-To) y el vendedor financia su equity con un segundo pagaré, a menudo a tasa baja o 0 %. El vendedor recibe precio completo; tú conservas la tasa baja.",
    howItWorks: [
      "Calculas el equity del vendedor: precio − saldo de la hipoteca − atrasos.",
      "Ofreces un pago inicial y el resto en un pagaré en segunda posición.",
      "Verificas que la renta cubra ambos pagos más reservas.",
      "Se registran ambos instrumentos y se paga todo por servicer.",
    ],
    whenToUse: ["Tasa existente baja y el vendedor tiene equity", "El vendedor quiere su precio pero acepta cobrarlo en el tiempo"],
    sellerProfile: ["Vendedor con deuda existente y equity", "Dueño de varias propiedades", "Vendedor que desea ingreso mensual"],
    problemSolved: "Une dos necesidades: el vendedor cobra su equity completo y tú evitas un préstamo nuevo a tasa alta.",
    sellerAdvantages: ["Precio completo", "Efectivo al cierre y pagos mensuales", "Sin comisiones"],
    buyerAdvantages: ["Tasa baja heredada", "Poco capital inicial", "Pagaré flexible negociado"],
    sellerRisks: ["Due-on-sale sobre la primera hipoteca", "Su pagaré está en segunda posición: cobra después del banco"],
    buyerRisks: ["Varias obligaciones simultáneas", "Riesgo de aceleración", "Riesgo de refinanciamiento al vencer el pagaré"],
    financialRequirements: ["Renta que cubra ambos pagos + reservas", "Reserva mayor que en un Subject-To simple"],
    legalRequirements: ["Disclosures de due-on-sale", "Registro del segundo pagaré", "Reglas estatales"],
    example: {
      title: "Casa de $300,000",
      rows: [
        ["Hipoteca existente", "$200,000 al 2.875 %"],
        ["Efectivo al vendedor", "$10,000"],
        ["Pagaré del vendedor", "$90,000 al 0 % por 10 años"],
        ["Pago al vendedor", "$750/mes"],
      ],
      note: "El simulador permite agregar más de una hipoteca existente y editar cada deuda por separado.",
    },
    simulator: "hibrido",
    quiz: [
      { q: "¿En qué posición queda el pagaré del vendedor?", options: ["Primera", "Segunda (detrás de la hipoteca)", "No tiene garantía"], answer: 1, explain: "La hipoteca existente mantiene la primera posición." },
      { q: "¿Qué debe cubrir la renta?", options: ["Solo la hipoteca", "La hipoteca, el pagaré, los gastos y las reservas"], answer: 1, explain: "Ambas obligaciones son tuyas desde el cierre." },
    ],
    practiceCase: {
      title: "Caso C: propiedad que necesita reparaciones",
      scenario: "Casa con hipoteca al 3 % y $25,000 de reparaciones. El vendedor quiere $40,000 de su equity.",
      tasks: ["Estructura el híbrido.", "Prueba el escenario de reparaciones +25 %.", "Define el plan si el pagaré vence antes de refinanciar."],
      caseId: "caso-c",
    },
    checklist: ["Estado de cuenta", "Búsqueda de título", "Pagaré en segunda posición revisado", "Servicer para ambos pagos", "Reservas", "Seguro"],
    exits: ["Refinanciar ambas deudas", "Vender", "Rentar hasta liquidar el pagaré"],
    sources: [SOURCES.garn, SOURCES.fannieTransfer],
  },
  {
    slug: "wraparound",
    title: "Wraparound Mortgage",
    term: "Wrap / All-Inclusive Trust Deed",
    level: "avanzado",
    category: "financiamiento",
    minutes: 12,
    updatedAt: UPDATED,
    whatIs:
      "Vendes una propiedad financiando al comprador con un pagaré nuevo que \"envuelve\" la deuda existente. El comprador te paga a ti; tú pagas la deuda subyacente y te quedas con la diferencia. Son dos obligaciones distintas y relacionadas.",
    howItWorks: [
      "Controlas una propiedad con deuda existente.",
      "Vendes con enganche y un pagaré wrap a una tasa mayor que la subyacente.",
      "Si el comprador vivirá en la casa, verificas capacidad de pago y usas un originador con licencia cuando aplique.",
      "Un servicer cobra al comprador y paga primero la deuda subyacente.",
    ],
    whenToUse: ["Quieres vender con flujo mensual", "El comprador tiene enganche pero no califica con un banco"],
    sellerProfile: ["Inversionista que vende una propiedad con deuda existente"],
    problemSolved: "Da acceso a vivienda a compradores que el banco rechaza y genera flujo al vendedor-inversionista.",
    sellerAdvantages: ["Diferencia de tasas cada mes", "Enganche al cerrar", "Sin administrar inquilinos"],
    buyerAdvantages: ["Compra sin banco", "Pagos registrados que construyen historial"],
    sellerRisks: ["Si el comprador no paga, tú sigues pagando la deuda subyacente", "Due-on-sale sobre la deuda subyacente", "Regulación de financiamiento al consumidor"],
    buyerRisks: ["Si el titular del wrap no paga la deuda subyacente, la propiedad puede ser ejecutada", "Por eso el servicer independiente es indispensable"],
    financialRequirements: ["Reservas para cubrir la deuda subyacente si el comprador falla"],
    legalRequirements: ["Regulation Z / TILA y SAFE Act si el comprador es ocupante", "Disclosures del wrap", "Reglas estatales"],
    example: {
      title: "Venta en $230,000",
      rows: [
        ["Enganche del comprador", "$15,000"],
        ["Pagaré wrap", "$215,000 al 8 %, 30 años → $1,577.59"],
        ["Deuda subyacente", "$150,000 al 4 % → $716.12"],
        ["Diferencia mensual", "$861.47"],
      ],
      note: "El flujo del titular es la diferencia; impuestos y seguro van en escrow y no se cuentan dos veces.",
    },
    simulator: "wrap",
    quiz: [
      { q: "¿Qué pasa si el comprador deja de pagar?", options: ["Nada", "El titular sigue debiendo la deuda subyacente", "El banco absorbe la pérdida"], answer: 1, explain: "Las obligaciones son distintas: la subyacente sigue vigente." },
      { q: "¿Por qué usar un servicer?", options: ["Para cobrar más", "Para garantizar que la deuda subyacente se pague primero y quede registro"], answer: 1, explain: "Protege al comprador y al titular." },
    ],
    practiceCase: {
      title: "Wrap con comprador ocupante",
      scenario: "Un comprador con $15,000 de enganche e ingresos por cuenta propia quiere vivir en la casa.",
      tasks: ["Calcula la diferencia mensual.", "Lista los requisitos de Reg Z y SAFE Act a verificar.", "Calcula tu exposición si el comprador falla 3 meses."],
    },
    checklist: ["Servicer", "Originador con licencia si aplica", "Disclosures", "Reserva para la deuda subyacente", "Revisión estatal"],
    exits: ["El comprador refinancia y liquida el wrap", "Vender el pagaré", "Cobrar hasta el vencimiento"],
    sources: [SOURCES.regZ, SOURCES.safe, SOURCES.garn],
  },
  {
    slug: "lease-option",
    title: "Lease Option",
    term: "Lease with option to purchase",
    level: "principiante",
    category: "adquisicion",
    minutes: 9,
    updatedAt: UPDATED,
    whatIs:
      "Rentas una propiedad con el derecho, pero no la obligación, de comprarla a un precio fijado antes de cierta fecha. Pagas una prima de opción (option fee) y parte de la renta puede acreditarse al precio.",
    howItWorks: [
      "Negocias prima, renta, crédito mensual, precio de ejercicio y plazo.",
      "Firmas un contrato de renta y uno de opción, y registras un memorándum de opción.",
      "En un sandwich, subarriendas con opción a un inquilino-comprador a precio y renta mayores.",
      "Al final ejerces la opción, la asignas o la dejas vencer.",
    ],
    whenToUse: ["El dueño quiere precio completo y puede esperar", "Quieres controlar una propiedad con poco capital"],
    sellerProfile: ["Dueño cansado de administrar", "Propiedad que no se ha vendido"],
    problemSolved: "El dueño cobra renta garantizada y su precio; tú controlas la propiedad sin comprarla todavía.",
    sellerAdvantages: ["Precio completo", "Prima no reembolsable", "Renta garantizada"],
    buyerAdvantages: ["Poco capital", "Riesgo limitado a la prima y créditos", "Tiempo para mejorar crédito o reunir capital"],
    sellerRisks: ["La propiedad queda comprometida durante el plazo"],
    buyerRisks: ["Pierdes la prima y los créditos si no ejerces", "El dueño puede tener gravámenes", "Reglas estatales (algunos estados lo tratan como contrato a plazos)"],
    financialRequirements: ["Prima de opción", "Capacidad para financiar el precio de ejercicio al final"],
    legalRequirements: ["Contratos separados de renta y opción", "Memorándum de opción registrado", "Permiso para subarrendar (sandwich)", "Revisión estatal"],
    example: {
      title: "Sandwich lease option",
      rows: [
        ["Renta al dueño / del inquilino", "$1,600 / $2,000"],
        ["Prima pagada / cobrada", "$3,000 / $8,000"],
        ["Precio con el dueño / al inquilino", "$230,000 / $260,000"],
        ["Si el inquilino compra a los 36 meses", "≈ $37,200 de ganancia total"],
      ],
      note: "Verificado en las pruebas del motor; incluye créditos de $200/mes al inquilino.",
    },
    simulator: "lease_option",
    quiz: [
      { q: "¿Qué pierdes si la opción vence sin ejercer?", options: ["Nada", "La prima y los créditos acumulados"], answer: 1, explain: "La prima compra el derecho; si no lo usas, se pierde." },
      { q: "¿Para qué sirve el memorándum de opción?", options: ["Para registrar públicamente tu derecho de compra", "Para pagar menos renta"], answer: 0, explain: "Avisa a terceros que existe tu opción." },
    ],
    practiceCase: {
      title: "Caso H: vendedor que rechaza la primera oferta",
      scenario: "El dueño rechaza tu oferta en efectivo y dice que solo vende a precio completo.",
      tasks: ["Propón una renta con opción.", "Calcula qué pasa si no ejerces.", "Prepara cómo explicarle sus ventajas."],
      caseId: "caso-h",
    },
    checklist: ["Contrato de renta", "Contrato de opción", "Memorándum registrado", "Búsqueda de gravámenes del dueño", "Permiso de subarriendo"],
    exits: ["Ejercer y quedarte", "Ejercer y revender", "Asignar la opción", "Dejarla vencer"],
    sources: [SOURCES.fairHousing],
  },
  {
    slug: "brrrr",
    title: "Método BRRRR",
    term: "Buy, Rehab, Rent, Refinance, Repeat",
    level: "intermedio",
    category: "salida",
    minutes: 10,
    updatedAt: UPDATED,
    whatIs:
      "Comprar por debajo del valor, rehabilitar, rentar y refinanciar para recuperar parte del capital y repetir. El efectivo del refinanciamiento es capital devuelto con deuda nueva, no ganancia.",
    howItWorks: ["Compra (a menudo con hard money).", "Rehabilitación con presupuesto y contingencia.", "Renta a un inquilino calificado.", "Refinanciamiento según el avalúo del prestamista.", "Repetición con el capital recuperado."],
    whenToUse: ["Propiedades con descuento por reparaciones", "Mercados donde la renta sostiene un préstamo nuevo"],
    sellerProfile: ["Propietario con inmueble deteriorado", "Propietario de una casa heredada"],
    problemSolved: "Reutilizar el mismo capital en varias propiedades.",
    sellerAdvantages: ["Venta rápida en la condición actual"],
    buyerAdvantages: ["Equity forzado con la rehabilitación", "Capital reutilizable"],
    sellerRisks: [],
    buyerRisks: ["El refinanciamiento puede no aprobarse o aprobarse por menos", "Sobrecosto y retrasos", "Tasa del refinanciamiento mayor a la esperada"],
    financialRequirements: ["Capital para enganche, rehab y tenencia", "DSCR suficiente con la tasa del refinanciamiento"],
    legalRequirements: ["Permisos de obra", "Contratos con contratistas", "Cumplimiento de Fair Housing al rentar"],
    example: {
      title: "Compra $100,000 + rehab $40,000, ARV $190,000",
      rows: [
        ["Préstamo nuevo 75 % LTV", "$142,500"],
        ["Liquida hard money", "$126,000"],
        ["Costos del refinanciamiento 2 %", "$2,850"],
        ["Efectivo recuperado", "$13,650"],
      ],
      note: "Abre el simulador BRRRR para ver capital que queda invertido y flujo posterior.",
    },
    simulator: "brrrr",
    quiz: [
      { q: "¿El cash-out de un refinanciamiento es ganancia?", options: ["Sí", "No: es capital devuelto con deuda nueva"], answer: 1, explain: "Aumenta tu deuda; no es utilidad." },
      { q: "¿Qué decide cuánto te prestan al refinanciar?", options: ["Tu ARV estimado", "El avalúo del prestamista y su LTV/DSCR"], answer: 1, explain: "El prestamista usa su propio avalúo." },
    ],
    practiceCase: {
      title: "Caso D: tríplex con refinanciamiento futuro",
      scenario: "Tríplex con flujo positivo que planeas refinanciar en 12 meses.",
      tasks: ["Simula el refinanciamiento con tasa +2 pts.", "¿Cuánto capital queda invertido?", "¿Qué pasa si el avalúo sale 10 % más bajo?"],
      caseId: "caso-d",
    },
    checklist: ["Presupuesto con contingencia", "Contratista confirmado", "Cronograma", "Precalificación del refinanciamiento", "Comparables para el ARV"],
    exits: ["Refinanciar y mantener", "Vender si el refinanciamiento no conviene"],
    sources: [SOURCES.fairHousing],
  },
];

export const LESSON_BY_SLUG = Object.fromEntries(LESSONS.map((l) => [l.slug, l]));
