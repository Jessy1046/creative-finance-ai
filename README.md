# Creative Finance AI · by Latinos Creativos

Academia interactiva, simulador y analista de **financiamiento creativo** en bienes raíces de EE. UU., en español.

> Aprende a comprar propiedades de diferentes maneras, domina los números y toma decisiones respaldadas por conocimiento.

Plataforma educativa: no es asesoría legal, fiscal ni financiera, y ningún resultado es una aprobación de compra.

## Inicio rápido

```bash
npm install
cp .env.example .env.local   # opcional: ANTHROPIC_API_KEY para activar la IA
npm run dev                  # http://localhost:3000
npm test                     # pruebas del motor financiero
npm run typecheck
npm run build
```

Sin `ANTHROPIC_API_KEY`, el Negociador y el Asistente funcionan en **Modo demostración**: el vendedor responde con un guion y la evaluación es heurística. La interfaz lo indica siempre.

## Qué funciona en esta versión (v0.1)

| Módulo | Estado |
| --- | --- |
| Mi Dashboard | ✅ Propiedades, oportunidades guardadas, cursos en progreso, alertas de riesgo, biblioteca de casos |
| Academia Creativa | ✅ 6 lecciones completas (Subject-To, Seller Financing, Híbrido, Wrap, Lease Option, BRRRR) con examen, caso, checklist y fuentes · catálogo de 40 estrategias clasificadas |
| Analizar Propiedad | ✅ Carga manual con procedencia por dato, «Pendiente de verificar», supuestos visibles, regla del 1.5 %, regla del 50 %, vista Subject-To |
| Laboratorio | ✅ Simuladores: Subject-To, Seller Financing, Híbrido (varias deudas), Wraparound, Lease Option, Socios/prestamistas (waterfall), BRRRR, Fix and Flip · amortización con CSV · retorno a 5/10/15/30 años · pruebas de estrés |
| Comparador | ✅ 10 estrategias, clasificación en 5 estados, puntaje multiobjetivo con pesos editables y supuestos de mercado editables |
| Ingeniero de Tratos AI | ✅ Propone estructuras, explica qué negociar, obligaciones, peor escenario y salidas; explicación con IA |
| Negociación AI | ✅ 9 vendedores virtuales, texto y dictado por voz (si el navegador lo permite), evaluación educativa estructurada |
| Analizador de Riesgos | ✅ Risk Score 0–100 con 24 factores, evidencia, pesos configurables, confianza por datos faltantes, escenarios y pruebas de estrés |
| Asistente AI | ✅ Tutor con RAG ligero sobre contenido aprobado, fuentes y fecha; cifras recalculadas en el servidor |
| Reportes | ✅ Reporte imprimible (PDF desde el navegador) y CSV |
| Mis Propiedades / Mi Progreso | ✅ En el navegador (localStorage) |
| Plan de Salida | 🟡 Resumen de salidas por estructura; planificador completo en fase 2 |
| Panel del Instructor, autenticación, base de datos | ⏳ Fase 2 (esquema listo en `prisma/schema.prisma`) |
| Datos inmobiliarios por dirección | ⏳ Fase 2: solo carga manual; nunca se inventan comparables ni rentas |

## Arquitectura

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
