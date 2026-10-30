# Arquitectura

## Capas

```
src/
  domain/                 ← lógica pura, sin React, 100 % probada con Vitest
    money.ts              montos en centavos enteros, tasas como fracción, redondeo explícito
    finance/              amortización, métricas, VPN/TIR, BRRRR
    strategies/           motor de estructuras, builders, wrap, lease option, socios,
                          comparador multiobjetivo, Ingeniero de Tratos
    risk/                 Risk Engine (factores + pesos + confianza), estrés y escenarios
    property/             modelo de propiedad con procedencia, análisis, resumen para la IA
    academy/              catálogo, lecciones, casos, recuperación (RAG ligero)
    negotiation/          perfiles de vendedores, evaluación (esquema + heurística demo)
  lib/ai/                 adaptador de proveedor de IA (solo servidor), prompts
  app/api/                rutas: /status, /negotiate, /negotiate/evaluate, /assistant
  app/*                   pantallas (Next.js App Router)
  components/             design system (ui), vistas financieras, simuladores
  store/                  repositorio local (interfaz PropertyRepository)
```

## Decisiones

- **Fórmulas fuera de la UI.** Ningún componente calcula: todos llaman a `src/domain`. Un mismo motor (`evaluateStructure`) alimenta simuladores, comparador, Ingeniero de Tratos, riesgos y reportes.
- **Dinero exacto.** Montos en centavos enteros. El interés mensual se redondea a centavos (medio centavo lejos del cero) y el último pago liquida el saldo exacto.
- **Sin mezclar retornos.** La proyección separa flujo operativo, amortización, apreciación hipotética y beneficio fiscal (0 por defecto). El refinanciamiento nunca cuenta como ganancia. Un balloon dentro del horizonte se supone refinanciado al mismo costo y se marca.
- **Datos honestos.** Cada dato tiene procedencia (verificado, usuario, estimado, simulado). Los faltantes quedan «Pendiente de verificar». Los supuestos solo se aplican por acción del usuario.
- **Riesgo transparente.** Score = Σ(peso × riesgo) / Σ(pesos evaluados). Confianza = peso evaluado / peso aplicable. «No sé» baja la confianza, nunca el riesgo.
- **IA acotada.** Las claves viven en el servidor. El asistente recibe cifras recalculadas en el servidor a partir de la propiedad validada con Zod, más fragmentos de contenido aprobado con fuente y fecha. La evaluación de negociación usa salida estructurada (Zod). Fallback de modelo del lado del servidor ante rechazos por política.
- **Seguridad.** Validación Zod en todas las rutas, límite de solicitudes por IP (en memoria; sustituir por Redis con varias instancias), cabeceras de seguridad, sin almacenar datos bancarios.

## Pruebas

`npm test` cubre: tasa 0 %, amortización, balloon, tasa variable, deudas simultáneas, abonos adelantados, flujos negativos, capital inicial cero, costos de cierre, TIR con varios cambios de signo y períodos largos, refinanciamiento (BRRRR), wrap, lease option, waterfall, Risk Engine, estrés, comparador, Ingeniero de Tratos, recuperación y evaluación.

## Siguientes pasos técnicos

1. Autenticación (Auth.js) y roles; conectar `prisma/schema.prisma` y migrar `PropertyRepository` a PostgreSQL.
2. Panel del Instructor (CRUD de cursos, casos, parámetros) y auditoría.
3. Respuestas de IA en streaming; RAG con embeddings cuando crezca el contenido.
4. Módulo de cumplimiento por estado (tabla de reglas con fuente y fecha por estado).
5. Interfaces de proveedores de datos inmobiliarios autorizados (comparables, rentas, registros).
6. Reportes PDF del lado del servidor; pruebas end-to-end con Playwright en CI.
7. Lecciones completas para el resto del catálogo.
