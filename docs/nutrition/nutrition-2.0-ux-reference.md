# Nutrition 2.0 — Referencia visual y UX

**Fecha:** 2026-09-30
**Fuente:** 6 capturas de una app móvil de nutrición de terceros que entregó Ronny. Están en `C:\Users\ronny\OneDrive\Escritorio\Nueva carpeta\` y no se versionan porque son capturas de un producto ajeno.
**Uso:** es una guía de **estructura y flujo**. No se copian la marca, los íconos, las ilustraciones ni los textos. Todo se implementa con nuestro design system (tokens, Geist, componentes existentes) y respetando D1–D5 de [`nutrition-2.0-reuse-analysis.md`](nutrition-2.0-reuse-analysis.md).

## Estado de implementación (2026-09-30)

| Pantalla | Estado | Ruta / código |
| --- | --- | --- |
| 1. "Hoy" | ✅ Implementada | `/client/nutrition` · `nutrition-today-page.tsx`, `journal-summary-card.tsx` |
| 2. Comidas por tipo con ✔ / ⇄ / ✕ | ✅ Implementada | `journal-meal-section.tsx` |
| 3. Agregar comida (3 fuentes) | ✅ Base de datos y código de barras. ⏳ Foto: visible como "Beta · próximamente" (U3). El proveedor de IA actual (DeepSeek) no acepta imágenes. | `add-food-sheet.tsx` |
| 4. Buscador con pestañas | ✅ De mi plan · Todos · Recientes | `/client/nutrition/add` · `food-search-page.tsx` |
| 5. Detalle con porciones y nutrientes | ✅ Tipo de comida, chips de porción, macros en vivo y otros nutrientes con "—" | `/client/nutrition/foods/$foodId` · `food-log-page.tsx` |
| 6. Alimento propio | ✅ PRIVATE (U2) | `/client/nutrition/foods/new` · `new-food-page.tsx` |
| Escáner | ✅ Cámara con `BarcodeDetector` nativo y entrada manual. Open Food Facts local primero (D4) | `/client/nutrition/barcode` · `barcode-page.tsx` |
| Plan completo | ✅ Movido | `/client/nutrition/plan` |
| Vista del coach | ✅ Diario de solo lectura en la nutrición del cliente | `client-food-journal.tsx` |

**Decisiones UX aplicadas:**
- **U1:** el ejercicio no suma a la meta.
- **U2:** el cliente puede crear alimentos, siempre privados.
- **U3:** el escaneo por foto queda pendiente de un proveedor con visión.
- **U4:** la meta es del plan y el cliente no la edita.

## La diferencia clave

La app de referencia es de **auto-registro**: el usuario define su meta y registra lo que come. **Training App es coach-first:** el **nutricionista o Trainer prescribe el plan** y el cliente lo sigue y registra. Por eso, a cada pantalla le agregamos una capa:

| En la referencia | En Training App |
| --- | --- |
| El usuario edita su "Meta" (✏️) | La meta **viene del plan asignado** (objetivo del día relativo, D2). El cliente no la edita. |
| Las secciones de comida están vacías y se usa "+ Agregar" | Cada sección muestra **primero las comidas prescritas del día**, con sus acciones (✔ Lo comí · ⇄ Cambiar por alternativa · ✕ Omitir), y después "+ Agregar" para lo que no estaba en el plan. |
| "Restante" = meta − comido | Además de lo restante, se ve la **adherencia** al plan (lo marcado contra lo prescrito), y el profesional la ve en su dashboard (N7). |
| El usuario crea sus alimentos | El catálogo lo curan los profesionales. Si el cliente crea un alimento, queda **privado y visible para su coach** (decisión U2). |

## Pantallas → fases

### 1. "Hoy" (Nutrición del cliente) — **N5**
**Referencia:** navegación de fecha (‹ Hoy ›), un anillo con lo "Restante", Meta, Comida y Ejercicio, un "Ver macros" y un botón grande "+ AGREGAR COMIDA".

**Nuestra versión:**
- ‹ Hoy › navega por **fechas reales**. El Engine resuelve qué **Day N** del plan toca en cada fecha (D2, `startDate` + `cycleMode`), y si no hay plan ese día lo dice.
- **Anillo principal:** consumido contra objetivo del día, y restante. Ya existen los anillos de macros de la pantalla actual (`daily-targets.tsx`); se reutilizan para proteína, carbohidratos y grasa **consumidos contra objetivo** (hoy muestran lo planificado).
- **Ejercicio:** decisión U1.
- **CTA:** "+ Agregar comida" abre el selector de fuentes (pantalla 3).

### 2. Comidas del día por tipo — **N5** (se construye sobre el tablero de `e1710db`)
**Referencia:** secciones Desayuno, Almuerzo, Cena, Bocadillo y No categorizado, cada una con "+ Agregar …".

**Nuestra versión:**
- Los tipos son los que ya tenemos (`BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`, `OTHER`), con los íconos de `meal-type-icon.ts`.
- En cada sección:
  1. **ítems prescritos** del día con ✔ / ⇄ / ✕ (el diario guarda el snapshot, sección 22 del análisis);
  2. **ítems extra** que registró el cliente;
  3. "+ Agregar a {tipo}".
- El resumen de kcal por sección muestra lo **consumido** contra lo **planificado**.

### 3. "Agregar comida": elegir la fuente — **N5 / N8 / N9**
**Referencia:** Base de datos de alimentos · Escanear código de barras · Escanear comida (BETA, foto).

| Opción | Fase | Regla |
| --- | --- | --- |
| **Base de datos de alimentos** | N5 (búsqueda local; USDA en N2 solo para profesionales) | El cliente busca en el catálogo GLOBAL y en sus alimentos propios. **No importa desde USDA**: eso queda para el profesional (`nutrition.catalog.import`). |
| **Código de barras** | N8 (Open Food Facts) | Local primero; si no está, OFF → importación bajo demanda (el mismo patrón que D4). Atribución ODbL. |
| **Escanear comida (foto)** | N9 | Decisión U3. La IA solo **identifica alimentos candidatos del catálogo**; el cliente confirma alimento y porción, y **los nutrientes salen siempre de la base** (D3). |

### 4. Buscador de alimentos — **N2** (profesional) y **N5** (cliente)
**Referencia:** buscador, pestañas (Todos los alimentos · Mis comidas · …) y filas del tipo "Egg, Whole, Raw — 72 calorías por 1 egg".

**Nuestra versión:**
- **Pestañas:** Todos · **Del plan** (alimentos de su plan, lo más rápido para el cliente) · Recientes/Favoritos · Recetas (N3).
- **Cada fila:** el **displayName** en español y las kcal **por porción por defecto** ("72 kcal por 1 huevo") o por 100 g. Requiere `food_portions` (N2).
- **Nombres de USDA:** se muestra el displayName (D3). Si es `AI_GENERATED` y no está verificado, aparece una marca discreta "traducción automática", y el nombre original se ve en el detalle.
- **Para el profesional (N2):** resultados locales primero y después "USDA · importar" (D4).

### 5. Detalle del alimento (agregar al diario) — **N2 + N5**
**Referencia:**
- nombre;
- selector de tipo de comida;
- **chips de unidad de porción** (1 egg · g · ml · oz · taza · cucharada) y cantidad;
- "Macros principales" (kcal grande + P/C/G);
- "Otros macros" (grasa trans, saturada, fibra…).

**Nuestra versión:**
- **Chips de unidad:** las porciones del alimento (`food_portions`, p. ej. "1 huevo = 50 g") más g, y ml si hay densidad. Todo se resuelve a **gramos** en el Engine (sección 13 del análisis). Unidades imperiales (oz, taza, cucharada) **solo si el alimento tiene esa porción definida**; nunca se adivina una conversión.
- **Macros principales:** se recalculan en vivo al cambiar la cantidad (vista previa con `POST /nutrition/calculate`).
- **"Otros nutrientes":** el catálogo de N1 (azúcares, grasa saturada, sodio, vitaminas…). Un nutriente desconocido se muestra como "—", **nunca como 0** (D3, `null` ≠ 0).
- **Tipo de comida:** viene preseleccionado según la sección desde la que se abrió.
- **Además:** si se abre desde un ítem prescrito, la vista muestra "Prescrito: 150 g" y la diferencia con lo que el cliente está registrando.

### 6. "Nueva comida" (alimento personalizado) — **N5**, según U2
**Referencia:** foto, nombre, marca opcional, tipo de comida, unidad y tamaño de porción (y después, los nutrientes).

**Nuestra versión:**
- El formulario se reutiliza para el profesional (catálogo) y para el cliente (alimento privado, U2).
- Los nutrientes se ingresan **por porción declarada** y el backend los normaliza a 100 g.
- **Foto del alimento:** fuera de alcance por ahora. La imagen del alimento se representa con un **ícono por categoría**, propio del design system.

## Fuera de alcance (visto en las capturas)

- **Gamificación** (nivel, racha 🔥, monedas, "Rangos", "Amigos"): no pertenece al módulo de nutrición. La **racha de registro** puede salir de la adherencia (N7) si el producto la quiere más adelante.
- **Banners promocionales** ("Prueba gratis"): no aplica.

## Decisiones nuevas (UX) que necesito cerrar

| # | Pregunta | Recomendación |
| --- | --- | --- |
| **U1** | ¿Las calorías de ejercicio (del módulo de training) **suman a lo restante** como en la referencia? | **No por defecto.** Se muestran aparte ("quemadas en entrenamiento: ~201 kcal") porque la estimación es imprecisa y la meta la fija el profesional. Más adelante, el profesional podría activarlo por cliente. |
| **U2** | ¿El **cliente** puede crear alimentos propios? | **Sí, privados del cliente** (`source=MANUAL`, `visibility=PRIVATE`, dueño el cliente) y visibles para su coach en el diario. Nunca entran al catálogo GLOBAL sin curación. Hay que agregar la capability `nutrition.catalog.write.own` al rol CLIENT. |
| **U3** | ¿Hacemos **"Escanear comida" con foto (IA)**? | **Sí, en N9**, pero solo como identificador de candidatos del catálogo con confirmación del cliente. La IA **no** estima calorías ni gramos por sí sola (D3). |
| **U4** | ¿El cliente puede **editar su meta**? | **No.** La meta es prescrita. El cliente puede **proponer** un ajuste (un mensaje o check-in al coach), pero no cambiarla. |

## Impacto en el roadmap

No aparece ninguna fase nueva. Las pantallas se reparten así:
- **N2:** buscador del profesional y porciones (chips de unidad).
- **N3:** pestaña de recetas.
- **N5:** "Hoy", secciones por comida con acciones sobre lo prescrito, agregar comida, detalle con porciones y alimentos propios del cliente (si se aprueba U2).
- **N7:** adherencia y racha.
- **N8:** código de barras.
- **N9:** escanear comida.
