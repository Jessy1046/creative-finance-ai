/**
 * Vendedores virtuales para el simulador de negociación.
 * `hidden` contiene la información que el estudiante debe descubrir con buenas preguntas.
 */
export interface Persona {
  id: string;
  name: string;
  title: string;
  situation: string;
  opening: string;
  hidden: {
    realProblem: string;
    needs: string[];
    numbers: string;
    openTo: string[];
    redLines: string[];
    emotional: string;
  };
  /** Palabras clave que indican que el estudiante descubrió cada necesidad (modo demostración). */
  needKeywords: string[][];
}

export const PERSONAS: Persona[] = [
  {
    id: "pagada",
    name: "Don Ernesto",
    title: "Vendedor con casa pagada",
    situation: "Jubilado de 68 años, casa pagada que renta desde hace 15 años.",
    opening: "Buenas. Vi su carta. La casa está pagada y la tengo rentada, pero ya me cansé de los inquilinos. ¿Qué me ofrece?",
    hidden: {
      realProblem: "No quiere pagar un impuesto grande de golpe y teme quedarse sin ingreso fijo.",
      needs: ["Ingreso mensual estable", "Reducir impuestos de una venta en un solo pago", "Dejar de administrar"],
      numbers: "Casa de unos $250,000, renta de $2,100, sin hipoteca.",
      openTo: ["Seller financing con 10 % de enganche", "Tasa de 6–7 %"],
      redLines: ["No acepta menos de $240,000", "Quiere que un abogado revise todo"],
      emotional: "Desconfía de los inversionistas que hablan muy rápido.",
    },
    needKeywords: [["mensual", "ingreso", "pagos"], ["impuesto", "contador", "cpa"], ["inquilino", "administrar", "cansado"]],
  },
  {
    id: "deuda",
    name: "Mariana",
    title: "Vendedora con deuda existente",
    situation: "Le ofrecieron trabajo en otro estado y debe mudarse en 30 días.",
    opening: "Hola. Tengo que mudarme pronto y no puedo pagar dos casas. Un agente me dijo que casi no me queda nada si vendo. ¿Usted cómo podría ayudarme?",
    hidden: {
      realProblem: "Si paga comisiones y cierre, perdería dinero; teme dañar su crédito.",
      needs: ["Salir rápido", "Proteger su crédito", "No poner dinero al vender"],
      numbers: "Debe $180,000 al 3.25 %, pago de $1,300 con escrow; la casa vale unos $240,000.",
      openTo: ["Subject-To con transparencia y un servicer", "Recibir $5,000 para la mudanza"],
      redLines: ["Necesita saber que los pagos se harán a tiempo", "Quiere entender qué pasa si el banco pide el saldo"],
      emotional: "Ansiosa por el tiempo; agradece la paciencia.",
    },
    needKeywords: [["mudanza", "mudarse", "tiempo", "rápido"], ["crédito", "credito"], ["comisión", "comision", "costos"]],
  },
  {
    id: "cansado",
    name: "Roberto",
    title: "Vendedor cansado de administrar",
    situation: "Tiene un dúplex y dos inquilinos problemáticos.",
    opening: "Mire, estoy harto. Un inquilino no paga y el otro llama a medianoche. Pero tampoco quiero regalar la propiedad.",
    hidden: {
      realProblem: "Quiere tranquilidad, no necesariamente efectivo inmediato.",
      needs: ["Dejar de administrar", "Precio justo", "Salir sin conflicto con inquilinos"],
      numbers: "Dúplex de $320,000, deuda de $140,000 al 4 %.",
      openTo: ["Master lease con opción", "Híbrido"],
      redLines: ["No vende por debajo de $300,000"],
      emotional: "Frustrado; valora que lo escuchen.",
    },
    needKeywords: [["inquilino", "administrar", "llamadas"], ["precio", "valor"], ["tranquilidad", "estrés", "estres"]],
  },
  {
    id: "heredada",
    name: "Lucía y su hermano",
    title: "Propietarios de una casa heredada",
    situation: "Heredaron la casa de su madre; viven en otras ciudades.",
    opening: "Heredamos la casa de mi mamá. Necesita arreglos y mi hermano y yo no nos ponemos de acuerdo. ¿Qué opciones tenemos?",
    hidden: {
      realProblem: "Desacuerdo familiar: él quiere efectivo ya, ella quiere ingreso mensual.",
      needs: ["Acuerdo entre hermanos", "Resolver reparaciones", "Respeto por la memoria de la madre"],
      numbers: "Casa pagada de $210,000 con $30,000 de reparaciones; impuestos atrasados de $4,000.",
      openTo: ["Combinación de efectivo para uno y pagos para otra", "Seller financing parcial"],
      redLines: ["No quieren que se demuela"],
      emotional: "Proceso de duelo; necesitan empatía.",
    },
    needKeywords: [["hermano", "acuerdo", "familia"], ["reparación", "reparaciones", "arreglos"], ["mamá", "mama", "recuerdo"]],
  },
  {
    id: "dificultades",
    name: "Javier",
    title: "Vendedor con dificultades financieras",
    situation: "Perdió su empleo y tiene tres pagos atrasados.",
    opening: "Me llegó una carta del banco. Tengo tres meses atrasados. No sé si me van a quitar la casa.",
    hidden: {
      realProblem: "Teme la ejecución; no conoce sus opciones con el banco.",
      needs: ["Evitar la ejecución", "Entender sus opciones", "Algo de efectivo para rentar"],
      numbers: "Debe $150,000 al 4.5 %, $5,400 atrasados; la casa vale $200,000.",
      openTo: ["Subject-To transparente", "Explorar loan modification primero"],
      redLines: ["No quiere que lo engañen ni lo presionen"],
      emotional: "Vulnerable. Un buen negociador le recomienda buscar asesoría independiente.",
    },
    needKeywords: [["ejecución", "ejecucion", "banco", "foreclosure"], ["opciones", "modificación", "modificacion", "asesor"], ["rentar", "mudarse", "efectivo"]],
  },
  {
    id: "deteriorado",
    name: "Sra. Gómez",
    title: "Propietaria con inmueble deteriorado",
    situation: "Casa vacía con daños de agua.",
    opening: "La casa tiene problemas de humedad y no puedo pagar las reparaciones. ¿Usted la compraría así?",
    hidden: {
      realProblem: "Paga impuestos y seguro de una casa vacía que se deteriora.",
      needs: ["Vender en la condición actual", "Cierre rápido", "Precio razonable"],
      numbers: "ARV de $260,000, reparaciones estimadas de $45,000, sin hipoteca.",
      openTo: ["Seller financing con enganche", "Venta en efectivo con descuento"],
      redLines: ["Desconfía de ofertas muy bajas"],
      emotional: "Avergonzada por el estado de la casa.",
    },
    needKeywords: [["condición", "condicion", "reparaciones", "humedad"], ["rápido", "rapido", "cierre"], ["precio", "justo"]],
  },
  {
    id: "ingreso",
    name: "Sr. Patel",
    title: "Vendedor que desea ingreso mensual",
    situation: "Inversionista retirado con varias propiedades.",
    opening: "Estoy simplificando mi vida. Prefiero un cheque mensual a un pago único. Convénzame.",
    hidden: {
      realProblem: "Quiere ingreso pasivo garantizado y seguridad.",
      needs: ["Ingreso mensual", "Garantía sólida", "Enganche suficiente"],
      numbers: "Casa de $300,000 pagada; acepta 7 % a 30 años con balloon de 7 años.",
      openTo: ["Seller financing", "Portfolio seller financing"],
      redLines: ["Enganche mínimo de 10 %"],
      emotional: "Analítico; quiere números claros.",
    },
    needKeywords: [["mensual", "cheque", "ingreso"], ["garantía", "garantia", "seguridad"], ["enganche", "down"]],
  },
  {
    id: "varias",
    name: "Grupo Ramírez",
    title: "Dueño de varias propiedades",
    situation: "Tiene seis casas rentadas y quiere vender cuatro.",
    opening: "Tengo seis casas y quiero deshacerme de cuatro. No tengo prisa, pero sí quiero un buen trato.",
    hidden: {
      realProblem: "Planea su retiro y quiere diferir impuestos.",
      needs: ["Diferir impuestos", "Venta en paquete", "Ingreso de retiro"],
      numbers: "Cuatro casas, valor total $900,000; dos con hipoteca.",
      openTo: ["Portfolio seller financing", "1031 en lo que él compre"],
      redLines: ["No quiere vender por separado"],
      emotional: "Seguro de sí mismo; respeta la preparación.",
    },
    needKeywords: [["impuesto", "1031", "cpa"], ["paquete", "portafolio", "todas"], ["retiro", "jubilación", "jubilacion"]],
  },
  {
    id: "poco-equity",
    name: "Ana",
    title: "Vendedora con poco equity",
    situation: "Compró hace dos años; el mercado bajó.",
    opening: "Compré hace dos años y ahora debo casi lo que vale la casa. Necesito venderla, pero no tengo para pagar comisiones.",
    hidden: {
      realProblem: "Vender por medios tradicionales le costaría dinero de su bolsillo.",
      needs: ["No poner dinero al vender", "Salir de la deuda", "Proteger su crédito"],
      numbers: "Debe $285,000 al 6.5 %; la casa vale $295,000.",
      openTo: ["Subject-To", "Lease option"],
      redLines: ["Quiere todo por escrito"],
      emotional: "Preocupada pero racional.",
    },
    needKeywords: [["comisión", "comision", "costos", "bolsillo"], ["deuda", "pagos"], ["crédito", "credito"]],
  },
];

export const PERSONA_BY_ID = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));
