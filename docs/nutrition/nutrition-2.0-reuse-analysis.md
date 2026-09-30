# Nutrition 2.0 — Análisis de reutilización open source

**Estado:** Diseño aprobado (decisiones D1–D5). **N1 terminada** (2026-09-30).

**Módulo del cliente implementado el 2026-09-30** (según [`nutrition-2.0-ux-reference.md`](nutrition-2.0-ux-reference.md)):
- **Diario (N5):** `food_log_entries` con snapshots y el día con plan, consumido, restante y adherencia. El cliente puede marcar comido, cambiar u omitir ítems prescritos, y registrar extras.
- **Porciones (parte de N2):** `food_portions`, editables desde el API profesional.
- **Visibilidad GLOBAL/PRIVATE (parte de N2):** los alimentos propios del cliente son privados (U2).
- **Código de barras con Open Food Facts (N8):** búsqueda local primero e importación única (D4).
- **Vista de solo lectura para el Trainer asignado.**

**Pendiente:**
- búsqueda e importación de USDA (el resto de N2);
- recetas (N3);
- días relativos y plantillas (N4);
- el **framework formal** de capabilities con grants y auditoría (N5-a). Hoy el acceso al diario se aplica por rol más asignación, y ADMIN está excluido (D5 cumplido, sin grants excepcionales todavía);
- sustituciones aprobadas (N6);
- analítica (N7);
- foto con IA (N9).
**Referencia visual y de UX:** [`nutrition-2.0-ux-reference.md`](nutrition-2.0-ux-reference.md). Pantallas objetivo por fase y decisiones U1–U4 pendientes.
**Fecha:** 2026-09-29
**Línea:** B (Ronny). Ver [`docs/TEAM-PLAN.md`](../TEAM-PLAN.md).
**Documento relacionado:** [`docs/frontend/nutrition-research.md`](../frontend/nutrition-research.md), la investigación previa de Eli.

## Decisiones cerradas (2026-09-29)

| # | Decisión | Efecto en el diseño |
| --- | --- | --- |
| D1 | **Training App es un producto comercial y de código cerrado.** | No se copia código GPL, AGPL, Commons Clause ni PolyForm-NC. Tampoco se copian archivos MPL de kcal, porque obligaría a publicarlos. De las fuentes incompatibles solo se toman patrones y conceptos, y los reimplementamos nosotros. Secciones 4, 10 y 26–29. |
| D2 | **Modelo temporal híbrido.** Las plantillas usan días relativos (Day 1…N) con sus comidas. Al asignar, se fija una fecha de inicio que mapea cada día relativo a una fecha real. Las plantillas nunca se atan al calendario y se pueden reutilizar y duplicar. | Secciones 11, 12, 19 y 20. |
| D3 | **Nombres de USDA.** El nombre original se conserva siempre y es inmutable. Aparte existe un `displayName` en español, marcado según su origen (manual, fuente, generado por IA, traducido por una persona) y con un estado de verificación. La IA **nunca** genera ni modifica nutrientes, y cada valor nutricional conserva su trazabilidad a la fuente. | Secciones 11, 12, 13, 14 y 15. |
| D4 | **USDA:** sin siembra masiva. Se busca primero en local, se consulta USDA solo si hace falta, se importa bajo demanda lo que el profesional elige y se guarda en caché local. No hay duplicados gracias a `source + externalId`. | Secciones 12, 14, 15 y 30. |
| D5 | **Acceso al Nutrition Journal:** ADMIN **no** lee diarios por defecto. CLIENT accede a su propio diario y TRAINER/NUTRITIONIST a los clientes asignados con el permiso correspondiente. La autorización es por **capabilities**, para poder conceder en el futuro un acceso administrativo excepcional, auditado y temporal. | Secciones 12, 22, 24 y 30. |

## Cómo se hizo este análisis

- Se clonaron los cinco repositorios y se leyó el **código fuente**, no solo los README. Las rutas de archivo citadas son relativas a la raíz de cada repo, en este commit:

  | Repo | Commit analizado | Fecha del commit |
  | --- | --- | --- |
  | [supersonic13/opennutritracker](https://github.com/supersonic13/opennutritracker) | `e4dbccd` | 2026-05-03 |
  | [TandoorRecipes/recipes](https://github.com/TandoorRecipes/recipes) | `2001a36` | 2026-09-29 |
  | [kcal-app/kcal](https://github.com/kcal-app/kcal) | `9f3c280` | 2024-05-04 |
  | [whiteravens20/diet-app](https://github.com/whiteravens20/diet-app) | `4569a0b` | 2026-09-15 |
  | [ddarmon/llmn](https://github.com/ddarmon/llmn) | `1d04c18` | 2026-01-01 |

- Nuestro código se revisó en la rama `ronny`, commit `e1710db`.
- **Esto no es asesoría legal.** Las conclusiones de licencia son una lectura técnica de los textos. Antes de publicar el producto comercialmente, un abogado debe revisar la sección 4 y la sección 29.

---

## Resumen ejecutivo

1. **Casi nada del código externo se puede copiar tal cual.** Hay dos motivos:
   - **Licencias:** GPL-3.0, AGPL-3.0 + Commons Clause y PolyForm *Noncommercial* no son compatibles con un producto cerrado o comercial. MPL-2.0 exige mantener abiertos los archivos que copiemos.
   - **Stack:** Dart/Flutter, Django/Vue, Laravel/PHP y Python. El único que usa NestJS (Diet App) es justamente el que prohíbe el uso comercial.
2. **Lo que sí podemos reutilizar legalmente es muchísimo, y es lo más valioso:**
   - **Datos públicos:** USDA FoodData Central es de dominio público (CC0). Open Food Facts es ODbL, con obligaciones.
   - **Hechos y estándares:** IDs de nutrientes de FDC, factores de Atwater, fórmulas publicadas (Mifflin-St Jeor, IOM), equivalencias de unidades.
   - **Diseños de dominio probados:** patrones, modelos y algoritmos como **ideas**, reimplementados por nosotros.
   - **Código MIT de llmn**, con atribución, aunque está en Python.
3. **Recomendación:** mantener y extender nuestro módulo actual, que ya tiene buenas bases (snapshots, totales calculados en backend, ciclo de vida del plan). Sobre él construimos:
   - **un** catálogo de nutrientes;
   - **un** `Food` con trazabilidad de fuente;
   - **un** sistema de unidades con gramos como base;
   - **un** Nutrition Engine puro;
   - recetas, biblioteca de comidas, planes por días, diario del cliente y adherencia.

   Cada pieza toma como referencia el proyecto que mejor la resolvió.

---

## 1. Estado actual de nuestro Nutrition

### Backend (NestJS + TypeORM + PostgreSQL)

**Migración:** `backend/src/database/migrations/1757721600000-CreateNutrition.ts`.

**Módulo `backend/src/modules/nutrition-foods/`**
- **Entidad `NutritionFood`**:
  - `name`, `brand`, `description`;
  - nutrientes **por 100 g** como columnas fijas: kcal, proteína, carbohidratos, grasa y fibra (esta última opcional);
  - `status` (ACTIVE/ARCHIVED) y `createdByUserId`.
- **Endpoints** `/nutrition/foods`: `GET` (lista paginada con búsqueda), `GET :foodId`, `POST`, `PATCH :foodId` y `PATCH :foodId/status`.
- **Permisos**: ADMIN y TRAINER. Un TRAINER solo modifica los alimentos que creó (`nutrition-foods.service.ts`, L254 y L269).

**Módulo `backend/src/modules/nutrition-plans/`**
- **Entidades**:
  - `NutritionPlan`: cliente, nombre, descripción, `startDate`/`endDate`, objetivos diarios (kcal/P/C/G), estado DRAFT/ACTIVE/ARCHIVED, `activatedAt`, `archivedAt`;
  - `NutritionPlanMeal`: `name`, `mealType` (BREAKFAST/LUNCH/DINNER/SNACK/OTHER), `position`, `notes`;
  - `NutritionPlanMealItem`: `sourceFoodId`, `quantityGrams` y un **snapshot** del nombre, la marca y los nutrientes del alimento.
- **Endpoints para Trainer** (`/clients/:clientId/nutrition-plans`): crear, listar, ver y editar; `PUT :planId/meals` (reemplazo atómico); `PATCH :planId/items/:mealItemId`; `PATCH :planId/status`.
- **Endpoints para Client** (`/clients/me/nutrition-plans`): `GET current`, `GET` y `GET :planId`.
- **Cálculo** (`nutrition-calc.util.ts`): `scalePer100`, `scaleNullablePer100`, `sumNutrition` y `roundNutrition`. Los totales y las diferencias contra el objetivo los calcula el backend.
- **Tests**: `nutrition-foods.service.spec.ts`, `nutrition-calc.util.spec.ts`, `nutrition-plans.mapper.spec.ts`, `nutrition-plans.service.spec.ts`, más los E2E `backend/test/nutrition-foods.e2e-spec.ts` y `backend/test/nutrition-plans.e2e-spec.ts`.
- **Duplicación**: `numeric.transformer.ts` y `transform.util.ts` existen por separado en los dos módulos.

### Frontend (React 19 + Vite + TanStack + Orval)

- **Client**, `frontend/src/features/client-nutrition/`: plan actual en solo lectura, agrupado por tipo de comida (reintegrado en `e1710db`), objetivos con anillos de macros y comparación planificado/objetivo. Tests en `tests/client-nutrition-page.spec.tsx`, `lib/*.spec.ts` y `frontend/e2e/client-nutrition.spec.ts`.
- **Trainer**, `frontend/src/features/trainer-workspace/components/`:
  - `trainer-client-nutrition-page.tsx`;
  - `trainer-nutrition-plan-detail-page.tsx`;
  - `nutrition-meal-editor.tsx`;
  - `nutrition-food-search.tsx`;
  - `trainer-foods-page.tsx`.

  Test: `tests/nutrition-editor.spec.tsx`.
- **Admin**: `frontend/src/features/admin-workspace/components/admin-foods-page.tsx`. Es un archivo de la zona compartida con la línea A; hay que coordinar con Eli.

### Lo que no existe
- Micronutrientes, porciones o medidas caseras, unidades distintas de gramos, y fuente o ID externo del alimento.
- Recetas, biblioteca de comidas reutilizables, planes con varios días y plantillas de plan.
- Diario de consumo, adherencia, analítica y sustituciones.
- Importación desde USDA u Open Food Facts.

---

## 2. Qué conservar (KEEP)

| Pieza | Por qué |
| --- | --- |
| **Snapshot de nutrientes en el ítem del plan** (`NutritionPlanMealItem`) | Es el mismo principio que usan kcal (`journal_entries` guarda los nutrientes ya calculados) y OpenNutriTracker (`IntakeEntity` guarda el `MealEntity` completo). El plan no cambia si después se edita el alimento. |
| **Totales y diferencias calculados en el backend** | Coincide con la ADR 0005 de Diet App (`docs/adr/0005-curated-db-source-of-truth.md`): la nutrición siempre se deriva, nunca se escribe a mano. |
| **Ciclo de vida del plan** (DRAFT/ACTIVE/ARCHIVED, un solo activo) | Es correcto y ya está probado. |
| **Reemplazo atómico de comidas** (`PUT …/meals`) | Es simple y transaccional. El builder por días puede seguir el mismo patrón. |
| **Propiedad del alimento por creador** y roles | Es la base del modelo de permisos (sección 24). |
| **Frontend del cliente** (tablero por tipo de comida) | Es la base del "hoy" del diario. |
| **Distinción "planificado ≠ consumido"** en los textos | Es un requisito de producto que sigue vigente. |

## 3. Qué reemplazar / extender / eliminar

| Clasificación | Pieza | Cambio |
| --- | --- | --- |
| **EXTEND** | `NutritionFood` | Agregar `source`, `externalId` (fdcId o código de barras), `sourceDataType`, `importedAt`, el modelo de nombre (`nameOriginal` inmutable, `name` como displayName, `nameOrigin` y verificación, D3), `visibility` (GLOBAL/PRIVATE, N2), `category`, `densityGPerMl` y porciones. Las 5 columnas de macros **se conservan** como caché de consulta rápida. |
| **EXTEND** | `NutritionPlan` | Días (`NutritionPlanDay`), tipo de día (entreno/descanso), objetivos por día opcionales y plantillas. |
| **EXTEND** | `NutritionPlanMealItem` | Puede apuntar a un alimento **o a una receta**, con cantidad en unidad y porción, siempre resuelta a gramos. |
| **EXTEND** | Buscador de alimentos del Trainer | Búsqueda en el catálogo local y en FDC/OFF, con importación. |
| **REPLACE** | Nutrientes solo como columnas fijas | Pasan a un **catálogo de nutrientes** + `food_nutrients` para micronutrientes. Las columnas de macros quedan derivadas y sincronizadas. |
| **REPLACE** | `nutrition-calc.util.ts` | Se reemplaza por un **Nutrition Engine** puro (sección 13) que absorbe estas funciones sin cambiar su comportamiento. |
| **REMOVE** | Utilidades duplicadas `numeric.transformer.ts` / `transform.util.ts` | Se consolidan en un solo lugar dentro del módulo nuevo. |
| **REMOVE** | *(nada más por ahora)* | No se elimina ninguna tabla ni endpoint hasta que la migración de la sección 25 termine. |

---

## 4. Análisis de licencias

**Condición confirmada (D1):** Training App es un producto **comercial y de código cerrado**, distribuido y ofrecido como SaaS. Ya no es un supuesto, y la tabla se evalúa bajo esta condición.

**Política resultante:**
- **Ningún archivo de código externo entra al repo**, salvo MIT o similares permisivas con el aviso de copyright correspondiente.
- **MPL-2.0 (kcal)** permitiría copiar archivos, pero esos archivos tendrían que publicarse. Como no queremos publicar código, **tampoco copiamos kcal.**
- De GPL, AGPL + Commons Clause y PolyForm-NC tomamos solo **conceptos y patrones**. Estudiamos la implementación, anotamos el patrón y escribimos una implementación propia **sin tener el archivo fuente al lado**.
- **Los datos** (USDA CC0, Open Food Facts ODbL) sí se usan, respetando sus condiciones (sección 16).

| Proyecto | Licencia (verificada en el repo) | ¿Copiar código a Training App? | Obligaciones si se copiara |
| --- | --- | --- | --- |
| OpenNutriTracker | **GPL-3.0** (`LICENSE`) | **No.** Copiar o traducir su código haría que nuestro producto distribuido quede bajo GPL. | Liberar el código derivado bajo GPL. |
| Tandoor Recipes | **AGPL-3.0 + Commons Clause v1.0** (`LICENSE.md`) | **No.** AGPL alcanza también el uso por red (SaaS), y Commons Clause prohíbe "vender" el software, incluido el hosting pagado. | Liberar el código y no venderlo. |
| kcal | **MPL-2.0** (`LICENSE`); iconos Heroicons MIT; logo Logodust (`ATTRIBUTIONS.md`) | **No, por decisión (D1).** MPL lo permitiría legalmente, pero los archivos copiados tendrían que publicarse, y además es PHP. Solo tomamos conceptos. | Si alguna vez se copiara un archivo: mantener los avisos y publicar ese archivo. |
| Diet App | **PolyForm Noncommercial 1.0.0** (`LICENSE`, `package.json`, README L178–181) | **No para uso comercial.** El README dice: *"commercial use requires a separate license"*. Sus datasets (`data/*.json`) tienen la misma licencia. | Solo uso personal o no comercial. |
| llmn | **MIT, declarada** en el README (L632) | **Legalmente sí**, con atribución. Pero **el repo no trae archivo `LICENSE` ni el campo `license` en `pyproject.toml`**, así que por prudencia **no copiamos código**. Solo usamos datos públicos de FDC (los IDs de nutrientes), que no dependen de llmn. | Si se copiara código: conservar el aviso de copyright y la licencia MIT. |

**Datos externos (no son código):**

| Fuente | Licencia | Consecuencia |
| --- | --- | --- |
| **USDA FoodData Central** | Dominio público / CC0 1.0 | Podemos importarla, guardarla, modificarla y distribuirla. Se recomienda citar la fuente. |
| **Open Food Facts** | Base de datos **ODbL 1.0**; contenido individual DbCL; imágenes CC BY-SA | Atribución obligatoria. Si redistribuimos una **base de datos derivada**, aplica share-alike sobre esa base. La API exige un `User-Agent` identificado y tiene límites de uso (verificarlos al implementar). |
| **Open data de Tandoor** (el importador `cookbook/helper/open_data_importer.py` consume un dataset aparte) | **No verificada** | No usarla hasta verificar la licencia del dataset. |

**Regla para "ADAPT" desde fuentes GPL, AGPL o NC:** traducir código línea por línea a TypeScript sigue siendo una obra derivada. Solo podemos tomar lo que **no está protegido**:
- ideas y arquitectura;
- nombres de conceptos;
- fórmulas científicas;
- IDs y campos de las APIs públicas (FDC/OFF);
- el comportamiento observable.

Esto se escribe desde cero, sin tener el archivo abierto al lado.

---

## 5. OpenNutriTracker: qué podemos aprovechar

GPL-3.0, por lo tanto **solo REFERENCE o ADAPT conceptual**.

| Qué | Dónde | Qué aprendemos |
| --- | --- | --- |
| **Copia local de FDC en Postgres** | `lib/features/add_meal/data/data_sources/sp_fdc_data_source.dart`, `…/dto/fdc_sp/sp_const.dart` | Guardan FDC en 3 tablas (`fdc_food`, `fdc_portions` con `measure_unit_id`, `amount` y `gram_weight`, y `fdc_nutrients`), con descripciones traducidas (`description_en`, `description_de`) y búsqueda full-text. **Es el patrón que vamos a seguir para USDA.** |
| **Búsqueda en la API de FDC** | `…/data_sources/fdc_data_source.dart`, `…/dto/fdc/fdc_const.dart` | Filtran solo `Foundation` + `SR Legacy` y excluyen `Branded`. También tienen el catálogo de `measure_unit_id` de FDC (1000 = cup, 1001 = tablespoon…), que son datos públicos de FDC. |
| **Open Food Facts** | `…/data_sources/off_data_source.dart`, `lib/core/utils/off_const.dart` | Buscan con `/cgi/search.pl`, consultan códigos de barras con `/api/v2/product/{code}`, piden `fields` limitados, usan un User-Agent propio y separan el 404 de "producto no encontrado". |
| **Nutrientes normalizados por 100 g** | `lib/features/add_meal/domain/entity/meal_nutriments_entity.dart` | Todos los valores van por 100 g/ml, y OFF puede traer string o número, así que se convierte con cuidado (`asDoubleOrNull`). |
| **Entrada de diario (intake) con snapshot** | `lib/core/domain/entity/intake_entity.dart` | La entrada guarda `amount`, `unit`, `type` (tipo de comida), `dateTime` y **el alimento completo**. Los totales salen de cantidad × valor por unidad. |
| **Día registrado con objetivo guardado** | `lib/core/domain/entity/tracked_day_entity.dart`, `…/tracked_day_data_source.dart` | Cada día guarda el **objetivo vigente ese día** junto a lo consumido. Así, si el objetivo cambia después, el historial sigue siendo fiel. **Lo adoptamos para la adherencia.** |
| **Metas de calorías y macros** | `lib/core/utils/calc/{bmr_calc,tdee_calc,calorie_goal_calc,macro_calc,pal_calc}.dart` | TDEE según IOM 2005, macros por porcentaje y ajuste de ±500 kcal. Las fórmulas son científicas y públicas: podemos implementarlas nosotros citando la fuente original, no el archivo. |
| **UX del diario del cliente** | `lib/features/home/presentation/widgets/{dashboard_widget,macro_nutriments_widget,intake_vertical_list}.dart`, `lib/features/diary/…/diary_table_calendar.dart` | Muestra consumido contra objetivo, anillos de macros, lista por comida y calendario con colores por día. |
| **Buscador con recientes** | `lib/features/add_meal/presentation/bloc/recent_meal_bloc.dart` | Muestra los alimentos usados hace poco antes de buscar. |

## 6. Tandoor: qué podemos aprovechar

AGPL-3.0 + Commons Clause, por lo tanto **solo REFERENCE o ADAPT conceptual**.

| Qué | Dónde | Qué aprendemos |
| --- | --- | --- |
| **Nutrientes como tipos genéricos** | `cookbook/models.py`: `PropertyType` (L990), `Property` (L1037), `FoodProperty` (L1056) | Cada nutriente es una fila de catálogo con `unit`, `order`, `category` y **`fdc_id`**. Así se agregan micronutrientes sin migrar columnas. **Lo adoptamos (sección 11).** |
| **Base de cálculo del alimento** | `Food.properties_food_amount` / `properties_food_unit` (`models.py`, L774+) | El alimento declara "estos valores son por X unidad", normalmente 100 g. |
| **Conversiones por alimento** | `UnitConversion` (`models.py`, L909), `cookbook/helper/unit_conversion_helper.py` | Tiene una tabla genérica g/kg/ml/l (`CONVERSION_TABLE`) y conversiones **específicas por alimento** ("1 taza de arroz = 185 g"). |
| **Cálculo con marcas de incompletitud** | `cookbook/helper/property_helper.py` (`calculate_recipe_properties`) | Devuelve el total junto con `missing_value`, `missing_unit` y `missing_conversion` por alimento. **Nunca muestra un total falso como si fuera exacto. Lo adoptamos en el Engine.** |
| **Importar un alimento desde FDC** | `cookbook/views/api.py` L1130–1215 (`fdc`) y L3098 (búsqueda) | Busca por `fdc_id`, llama a `/fdc/v1/food/{id}` y mapea `foodNutrients[].nutrient.id` al `fdc_id` del catálogo. **Defecto a evitar:** si falta un nutriente guarda `0` (L1194–1198). Nosotros guardaremos `null`, que significa desconocido. |
| **Sustitutos** | `Food.substitute` (M2M), `substitute_siblings`, `substitute_children` (`models.py`, L774+) | Sustitutos explícitos y además por jerarquía (hermanos o hijos en un árbol de alimentos). |
| **Recetas con porciones y pasos** | `Recipe` (L1086), `Step` (L961, con `step_recipe` para subrecetas), `Ingredient` (L936, con `is_header`, `no_amount` y `original_text`) | Soporta subrecetas, ingredientes sin cantidad y encabezados. |
| **Plan de comidas** | `MealType` (L1247, con `order`, `color`, `time` y `default`), `MealPlan` (L1268, con `recipe`, `servings`, `from_date`/`to_date` y `shared`) | Los tipos de comida son configurables y el plan es una receta × porciones en una fecha. |
| **Fusión de duplicados** | `MergeModelMixin` (`Unit`, `PropertyType`) | Sirve para limpiar el catálogo cuando hay alimentos repetidos. |

## 7. kcal: qué podemos aprovechar

MPL-2.0. Es PHP, así que en la práctica lo usamos como **ADAPT**. Si alguna vez copiáramos un archivo, ese archivo seguiría siendo MPL.

| Qué | Dónde | Qué aprendemos |
| --- | --- | --- |
| **Ingrediente polimórfico: Food *o* Recipe** | `database/migrations/2021_01_22_212856_create_ingredient_amounts_table.php` (`ingredient_id`/`ingredient_type`, `parent_id`/`parent_type`), `app/Models/IngredientAmount.php` L154–171 | Una receta puede llevar otra receta como ingrediente, y el cálculo delega en la función que corresponde a cada tipo. |
| **Multiplicador de nutrientes por unidad** | `app/Support/Nutrients.php`: `calculateFoodNutrientMultiplier`, `calculateRecipeNutrientAmount` | Convierte oz, g y porciones, y tsp/tbsp/cup con factores fijos (1 cup = 16 tbsp = 48 tsp). Si la combinación no se puede convertir, **lanza un error en vez de adivinar**. |
| **Receta: porciones, peso y volumen** | `2020_12_21_215932_create_recipes_table.php` (`servings`, `weight`, `volume`), `app/Models/Recipe.php` (`*Total()` / `*PerServing()`) | Los nutrientes por porción son el total dividido entre las porciones. El peso cocido permite medir la receta en gramos. |
| **Diario con snapshot y resumen** | `2020_12_31_180016_create_journal_entries_table.php`, `app/Http/Controllers/JournalEntryController.php` L175–193 | Cada entrada guarda los nutrientes **ya calculados**, la comida y un resumen legible ("150 g arroz; 1 taza leche"). |
| **Metas por día de la semana** | `app/Models/Goal.php` (`days` como máscara de bits), `2021_05_15_082223_create_journal_dates_table.php` | Cada día del diario queda asociado a la meta que tenía, por ejemplo días de entreno contra días de descanso. |
| **Redondeo de etiqueta nutricional** | `Nutrients::round` | Redondea como las etiquetas de la FDA. Solo aplica **al mostrar**; nunca debe usarse en los cálculos. |

## 8. Diet App: qué podemos aprovechar

PolyForm Noncommercial, por lo tanto **solo REFERENCE**. Es el proyecto más parecido al nuestro (NestJS + TypeScript), y justamente por eso hay que cuidar de **no copiar**.

| Qué | Dónde | Qué aprendemos |
| --- | --- | --- |
| **La base curada es la fuente de verdad; la IA nunca inventa nutrición** | `docs/adr/0005-curated-db-source-of-truth.md` | Es exactamente nuestra regla de datos. La IA propone estructura, un validador rechaza ingredientes desconocidos y **se recalcula todo**. |
| **Cola de curación** | `docs/adr/0008-curation-queue.md` | Lo que llega de IA o de importaciones queda en borrador hasta que una persona lo revisa. |
| **Unidades canónicas con densidad y peso por pieza** | `apps/api/src/engine/units.ts` (`toCanonical`, `UnitConversionError`) | g/ml/pieza con `density` y `gramsPerPiece`. Si falta un dato de conversión, se reporta como **error de calidad de datos** en vez de adivinar. |
| **Sustitución isocalórica** | `apps/api/src/engine/substitution.ts` (`substituteIngredient`, `constraintViolations`) | Ajusta la cantidad del reemplazo para igualar las kcal y devuelve la diferencia de macros, la cantidad ajustada, una explicación y las restricciones que no se cumplen (alérgenos, dieta). |
| **Rebalanceo y optimizador** | `apps/api/src/engine/rebalance.ts` (`REBALANCE_TOLERANCE = 0.1`), `optimizer.ts` (`slotBudgets`, `fitServings`, `SERVING_MIN/MAX`) | Reparte las kcal del día por tipo de comida y ajusta las porciones dentro de un rango. |
| **Objetivo según tipo de día** | `apps/api/src/engine/nutrition.ts` (`dayTypeCalorieTarget`, `TRAINING_DAY_FACTOR`) | Los días de entreno y de descanso tienen objetivos distintos, algo muy relevante para una app de entrenamiento. |
| **Importador de USDA** | `apps/api/scripts/import-usda.ts`, `apps/api/src/admin/usda/importer.ts` | Por defecto trae solo Foundation (unos 340 alimentos); SR Legacy es opcional porque "contamina" el catálogo con variantes. Hay que tener en cuenta el límite de 1000 solicitudes por hora con API key. |
| **Traducciones de ingredientes** | `apps/api/prisma/schema.prisma` (`IngredientTranslation`, `TranslationSource`) | Guarda los nombres por idioma y de dónde salió cada traducción (curada o IA). |

## 9. llmn: qué podemos aprovechar

MIT (declarada), por lo tanto **DIRECT para datos y constantes** y **ADAPT para los algoritmos** (está en Python).

| Qué | Dónde | Qué aprendemos |
| --- | --- | --- |
| **Mapa de IDs de nutrientes de FDC** | `src/llmn/data/nutrient_ids.py` (`NUTRIENT_IDS`) | Energía 1008, proteína 1003, grasa 1004, carbohidratos 1005, fibra 1079, azúcar 2000, sodio 1093, vitaminas y minerales. Son **datos públicos de FDC**; lo usamos como semilla de nuestro catálogo de nutrientes. |
| **Carga masiva desde los CSV de FDC** | `src/llmn/data/usda_loader.py` (`food.csv`, `food_nutrient.csv`, `nutrient.csv` y el opcional `food_portion.csv`, filtrando por `data_type`) | Es la forma correcta de sembrar miles de alimentos **sin gastar cuota de la API**. |
| **Optimizador de dieta (programación cuadrática)** | `src/llmn/optimizer/solver.py` (`solve_qp`, `solve_diet_problem`), `optimizer/models.py` (`NutrientConstraint`, `FoodConstraint`, `OptimizationRequest`) | Busca gramos por alimento que cumplan kcal, macros y micronutrientes con rangos. Es para una fase posterior, detrás de "sugerir". |
| **Diagnóstico de inviabilidad** | `src/llmn/explore/diagnosis.py`, `optimizer/multiperiod_diagnosis.py` | Cuando no hay solución, explica qué restricción la impide. Es ideal para el asistente del Trainer. |
| **Salida pensada para LLM** | `src/llmn/agent/{schema,response}.py` | Respuestas estructuradas para que la IA **proponga** y el motor **calcule**. |

**Faltante común:** ninguno de los cinco maneja los alimentos de FDC que traen la energía en los nutrientes **2047/2048** (energía Atwater general/específica) en lugar del 1008. Lo resolvemos nosotros (sección 15).

---

## 10. Matriz de reutilización

**Niveles de reutilización:**
- **DIRECT**: se reutiliza con cambios mínimos.
- **ADAPT**: se reimplementa en nuestro stack a partir de la idea o el algoritmo.
- **REFERENCE**: solo como inspiración.
- **BUILD**: lo hacemos nosotros.

| Nuestra funcionalidad | Proyecto fuente | Archivos o módulos fuente | Licencia | Nivel | Razón |
| --- | --- | --- | --- | --- | --- |
| Catálogo de nutrientes (IDs FDC) | Datos FDC (llmn solo como índice de consulta) | Documentación de FDC; `src/llmn/data/nutrient_ids.py` | CC0 | **DIRECT** (datos) | Son hechos públicos de USDA. No copiamos el archivo de llmn. |
| Modelo nutriente genérico | Tandoor | `cookbook/models.py` (`PropertyType`/`Property`) | AGPL + CC | **ADAPT** (conceptual) | Buen modelo; nuestra versión en TypeORM sin copiar código. |
| Food con fuente y ID externo | OpenNutriTracker, Tandoor | `meal_entity.dart` (`source`, `code`), `Food.fdc_id` | GPL / AGPL | **ADAPT** (conceptual) | Normalizado en un solo `Food`. |
| Porciones / medidas caseras | OpenNutriTracker, datos FDC | `sp_fdc_portion_dto.dart`, `food_portion.csv` | GPL / CC0 | **ADAPT** + datos DIRECT | Las porciones de FDC son datos públicos. |
| Sistema de unidades (g canónico, densidad, pieza) | Diet App, kcal | `engine/units.ts`, `Support/Nutrients.php` | NC / MPL | **ADAPT** | Idea: todo se convierte a gramos y falla explícitamente si no se puede. |
| Conversión por alimento | Tandoor | `UnitConversion`, `unit_conversion_helper.py` | AGPL + CC | **ADAPT** (conceptual) | Se implementa como `FoodPortion`. |
| Nutrition Engine (escalar, sumar, receta, día) | kcal, Tandoor, Diet App | `Nutrients.php`, `property_helper.py`, `engine/nutrition.ts` | MPL / AGPL / NC | **BUILD** (extiende nuestro `nutrition-calc.util.ts`) | La matemática es trivial; lo valioso son los casos borde (null contra 0, faltantes). |
| Marcas de dato incompleto | Tandoor | `property_helper.py` | AGPL + CC | **ADAPT** (conceptual) | Se devuelve `completeness` en todos los cálculos. |
| Búsqueda e importación FDC por API | Tandoor, OpenNutriTracker | `views/api.py` L1130/L3098, `fdc_data_source.dart` | AGPL / GPL | **ADAPT** | Se usan los endpoints públicos de FDC; el código es nuestro. |
| ~~Siembra masiva FDC (CSV)~~ | llmn, OpenNutriTracker | `usda_loader.py`, `sp_const.dart` | MIT / GPL | **DESCARTADO (D4)** | Se reemplaza por búsqueda local primero, USDA como respaldo e importación bajo demanda. |
| Búsqueda local primero + USDA de respaldo | OpenNutriTracker (un repositorio único con un método por fuente: OFF, FDC y su copia local; la orquestación "local primero" es nuestra) | `lib/features/add_meal/data/repository/products_repository.dart` | GPL | **ADAPT** (conceptual) | Nuestro endpoint unificado (sección 15). |
| Energía 2047/2048 de FDC | — | — | — | **BUILD** | Nadie lo resuelve. |
| Open Food Facts (búsqueda y código de barras) | OpenNutriTracker | `off_data_source.dart`, `off_const.dart` | GPL | **ADAPT** (conceptual) | Se usa la API pública, con atribución ODbL. |
| Recetas (ingredientes, porciones, peso cocido) | kcal, Tandoor | `create_recipes_table.php`, `Recipe.php`, `models.py` (`Recipe`/`Ingredient`) | MPL / AGPL | **ADAPT** | Modelo de kcal (porciones, peso y volumen) más las marcas de Tandoor. |
| Subrecetas (receta como ingrediente) | kcal | `IngredientAmount.php` (polimórfico) | MPL | **ADAPT** (fase 2) | Se modela con dos FK anulables y un CHECK, no con polimorfismo por string. |
| Biblioteca de comidas | Tandoor, Diet App | `MealType`, `Recipe.mealTypes` | AGPL / NC | **REFERENCE** | Es sencilla: BUILD con nuestro modelo. |
| Plan por días | Tandoor, Diet App, kcal | `MealPlan`, `engine/optimizer.ts` (`OptimizerDay`), `Goal.days` | AGPL / NC / MPL | **ADAPT** | Días numerados dentro del plan (no fechas), con tipo de día. |
| Objetivo según día de entreno o descanso | Diet App, kcal | `dayTypeCalorieTarget`, `Goal.days` | NC / MPL | **ADAPT** (conceptual) | Es especialmente útil para una app de entrenamiento. |
| Plantillas de plan | — | — | — | **BUILD** | Ningún proyecto lo resuelve al estilo coach → cliente. |
| Sustitución isocalórica | Diet App, Tandoor | `engine/substitution.ts`, `Food.substitute*` | NC / AGPL | **ADAPT** (conceptual) | Sustitutos aprobados por el Trainer, más el cálculo de equivalencia. |
| Diario de consumo | OpenNutriTracker, kcal | `intake_entity.dart`, `journal_entries` | GPL / MPL | **ADAPT** | Entrada con snapshot, fecha local y tipo de comida. |
| Día registrado con objetivo guardado | OpenNutriTracker, kcal | `tracked_day_entity.dart`, `journal_dates` | GPL / MPL | **ADAPT** | La base de la adherencia histórica. |
| Adherencia | OpenNutriTracker | `TrackedDayEntity` (rangos +500/−1000 kcal) | GPL | **BUILD** (con umbrales configurables) | Sus umbrales son arbitrarios; definimos los nuestros. |
| Analítica semanal y tendencias | — | — | — | **BUILD** | Agregaciones SQL sobre el diario. |
| Metas (BMR/TDEE/macros) | OpenNutriTracker, Diet App | `bmr_calc.dart`, `tdee_calc.dart`, `engine/nutrition.ts` | GPL / NC | **BUILD** desde las fórmulas publicadas | Mifflin-St Jeor e IOM 2005 son públicas. Es opcional: el Trainer suele prescribir. |
| Optimización o sugerencia de plan | llmn | `optimizer/solver.py`, `explore/diagnosis.py` | MIT (sin archivo LICENSE) | **REFERENCE** (fase tardía) | Requiere un solver QP en TS o un servicio aparte (va contra el stack). No se copia código mientras falte el archivo de licencia. |
| Autorización por capabilities (diario) | — | — | — | **BUILD** (D5) | Ningún proyecto modela el acceso coach/cliente/admin excepcional. |
| Nombre original + displayName verificado | Diet App (concepto `TranslationSource`) | `apps/api/prisma/schema.prisma` (`IngredientTranslation`) | NC | **ADAPT** (conceptual, D3) | Origen del nombre y estado de verificación. |
| IA asistente (solo sugiere) | Diet App, llmn | ADR 0005/0008, `agent/schema.py` | NC / MIT | **REFERENCE** | Aplicamos la regla: la IA propone y el Engine calcula y valida. |
| UI: buscador, builder, diario y dashboard | Los cinco | Flutter / Vue / Blade / Next | Varias | **REFERENCE** | Ningún código de UI es compatible (stack o licencia). |

---

## 11. Modelo de dominio final

```
Nutrient (catálogo)            ← un solo concepto de nutriente
   │
Food ──< FoodNutrient >── Nutrient     (valores por 100 g; null = desconocido;
 │                                      cada valor con source + ref de nutriente externo)
 │  └──< FoodPortion                   ("1 taza" = 185 g)
 │  └── source / externalId            (único por fuente externa, D4)
 │  └── nameOriginal (inmutable) + displayName (origen + verificación, D3)
 │
Recipe ──< RecipeIngredient ──> Food | Recipe(v2)
 │        (cantidad + unidad → gramos resueltos)
 │  └── servings, cookedWeightG
 │
MealTemplate (biblioteca) ──< MealTemplateItem ──> Food | Recipe
 │
NutritionPlan
 ├── kind = TEMPLATE  (sin cliente, sin fechas, duplicable)          (D2)
 └── kind = CLIENT    (copia de una plantilla o creado directo;
                       startDate + cycleMode ONCE | REPEAT mapea Day N → fecha)
 └──< NutritionPlanDay (dayIndex 1..N relativo, tipo de día, objetivos opcionales)
       └──< NutritionPlanMeal (tipo, orden)
             └──< NutritionPlanMealItem ──> Food | Recipe  + SNAPSHOT
                    └──< PlanItemAlternative (sustitutos aprobados)
 │
FoodLogEntry (diario del cliente) ──> PlanItem? | Food | Recipe | QuickAdd  + SNAPSHOT
 │
NutritionDay (resumen del día: objetivo vigente guardado + totales) → Adherencia → Analytics

Capabilities (D5): rol → capabilities por defecto + concesiones explícitas (auditadas, con vencimiento)
```

**Principios (lo que pediste: una sola representación de cada cosa):**
1. **Un solo `Food`.** Un alimento manual, uno de USDA y uno de OFF son la misma entidad y solo cambia `source`.
2. **Un solo `Nutrient`**, con un código estable y su `fdcNutrientId`/`offKey` para mapear las fuentes externas.
3. **Un solo sistema de unidades:** todo se resuelve a **gramos** (o ml × densidad) antes de calcular.
4. **Un solo Engine:** funciones puras que usan el plan, la receta, el diario y la analítica.
5. **Snapshots** en todo lo que representa algo prescrito o consumido. El catálogo puede cambiar sin afectar el historial.
6. **`null` significa desconocido y `0` significa cero.** Nunca se mezclan.
7. **Las plantillas son atemporales.** Solo el plan de cliente tiene fechas: `fecha(Day N) = startDate + (N − 1)` en modo `ONCE`, o de forma cíclica con `((fecha − startDate) mod N) + 1` en modo `REPEAT` (D2).
8. **Los valores nutricionales solo los escriben las personas o los importadores.** La IA no tiene ninguna ruta de escritura hacia `food_nutrients` ni hacia los snapshots (D3).
9. **La autorización se decide por capability, no por rol.** El rol solo aporta las capabilities por defecto (D5).

## 12. Modelo de datos (PostgreSQL / TypeORM)

Propuesta. Los nombres son tentativos y todo entra por migraciones TypeORM (`synchronize: false`).

| Tabla | Columnas clave | Notas |
| --- | --- | --- |
| `nutrients` | `id`, `code` (único, p. ej. `energy_kcal`, `protein_g`, `vitamin_c_mg`), `name_en`, `name_es`, `unit` (`kcal`/`g`/`mg`/`µg`), `category` (energy/macro/mineral/vitamin/other), `fdc_nutrient_id`, `off_key`, `display_order`, `is_core` | Se carga con la lista de IDs de nutrientes de FDC (sección 9). Este es un catálogo de ~21 filas, no la base de alimentos: la base de alimentos no se siembra (D4). |
| `nutrition_foods` *(existente, se extiende)* | **Fuente:** + `source` (`MANUAL`/`USDA_FDC`/`OPEN_FOOD_FACTS`), `external_id` (el `fdcId` o el código de barras), `source_data_type` (Foundation/SR Legacy/Branded), `source_version`, `imported_at`, `imported_by_user_id`. **Nombre (D3):** la columna existente `name` pasa a ser el **displayName**; + `name_original` (inmutable una vez importado), `name_origin` (`MANUAL`/`SOURCE`/`AI_GENERATED`/`HUMAN_TRANSLATED`), `name_verified_at`, `name_verified_by_user_id`. **Otros:** + `category`, `density_g_per_ml`; `visibility` (`GLOBAL`/`PRIVATE`) llega en N2. | Se **mantienen** las 5 columnas de macros como caché sincronizada con `food_nutrients`. Índice único parcial en `(source, external_id)` para no duplicar el mismo alimento externo (D4). CHECK: `MANUAL` o `external_id` no nulo. |
| `food_nutrients` | `food_id`, `nutrient_id`, `amount_per_100g` (**nullable**), `derivation` (`MEASURED`/`CALCULATED`/`ESTIMATED`), **`source`** (`MANUAL`/`USDA_FDC`/`OPEN_FOOD_FACTS`), **`source_nutrient_ref`** (el ID de nutriente FDC o la key de OFF), `updated_by_user_id` | PK compuesta. **No existe un valor de origen `AI`**: la IA no puede escribir aquí (D3). |
| `food_portions` | `id`, `food_id`, `label_es`, `label_en`, `amount`, `gram_weight`, `source` | Por ejemplo "1 unidad mediana = 118 g". |
| `recipes` | `id`, `owner_user_id`, `visibility`, `name`, `description`, `instructions`, `servings`, `cooked_weight_g` (nullable), `status` | |
| `recipe_ingredients` | `id`, `recipe_id`, `food_id` (v2: `sub_recipe_id` con CHECK de exactamente uno), `quantity`, `unit` (`g`/`ml`/`portion`), `food_portion_id`, `grams_resolved`, `position`, `note` | Se guardan los gramos resueltos para tener auditoría. |
| `meal_templates` | `id`, `owner_user_id`, `visibility`, `name`, `meal_type`, `notes` | La biblioteca de comidas. |
| `meal_template_items` | `id`, `meal_template_id`, `food_id` / `recipe_id` (CHECK), `quantity`, `unit`, `food_portion_id`, `grams_resolved`, `position` | |
| `nutrition_plans` *(existente, se extiende)* | + `kind` (`TEMPLATE`/`CLIENT`), `owner_user_id` (autor de la plantilla), `template_source_id` (de qué plantilla se copió), `cycle_mode` (`ONCE`/`REPEAT`); `client_profile_id` pasa a **nullable** para las plantillas. **`start_date` y `end_date`**, que ya existen, se usan solo en `CLIENT`. | CHECK: una `TEMPLATE` no tiene cliente ni fechas; un `CLIENT` tiene cliente. Las operaciones **duplicar plantilla**, **guardar plan como plantilla** y **asignar plantilla** son copias profundas (D2). |
| `nutrition_plan_days` | `id`, `plan_id`, `day_index` (1..N, **relativo**), `label`, `day_type` (`ANY`/`TRAINING`/`REST`), objetivos por día (nullable = hereda del plan) | No hay ninguna columna de fecha: la fecha real se **calcula** con el `start_date` del plan de cliente. Los planes actuales se migran a 1 día. |
| `nutrition_plan_meals` *(existente)* | + `plan_day_id` | |
| `nutrition_plan_meal_items` *(existente)* | + `recipe_id` (nullable), `unit`, `food_portion_id`, `quantity`; `source_food_id` pasa a nullable (CHECK de uno de los dos) | El **snapshot se conserva** y se amplía con micronutrientes en `jsonb` (`nutrients_snapshot`). |
| `plan_item_alternatives` | `id`, `plan_item_id`, `food_id` / `recipe_id`, `quantity_grams`, snapshot | Son los sustitutos que el Trainer aprueba. |
| `food_log_entries` | `id`, `client_profile_id`, `local_date` (`date`), `meal_type`, `kind` (`PLANNED`/`FOOD`/`RECIPE`/`QUICK_ADD`), `plan_item_id`, `food_id`, `recipe_id`, `grams`, `servings`, `nutrients_snapshot` (`jsonb`) + columnas de macros, `logged_at` (`timestamptz`), `note` | La fecha es la **local del cliente**. Se indexa por `(client_profile_id, local_date)`. |
| `nutrition_days` | `client_profile_id`, `local_date`, `plan_id`, `plan_day_id`, **objetivos guardados** (kcal/P/C/G), `completed_at` | El patrón `tracked_day` y `journal_dates`. Los totales se calculan con consultas; si hace falta, se agrega una caché después. |
| `external_food_search_cache` | `source`, `query_normalized`, `data_types`, `results` (`jsonb`, solo resumen: externalId, nombre original y marca), `fetched_at`, `expires_at` | Caché **de búsqueda** con TTL (7 días, por ejemplo). No es un catálogo: solo evita repetir llamadas a USDA (D4). |
| `external_food_raw` | `source`, `external_id`, `payload` (`jsonb`, respuesta de detalle completa), `fetched_at` | Guarda la respuesta original de cada alimento **importado**, como auditoría y para poder re-normalizar sin volver a llamar. Es de uso interno, no se expone. |
| `nutrition_capability_grants` | `id`, `grantee_user_id`, `capability`, `scope_type` (`CLIENT`/`GLOBAL`), `scope_client_profile_id`, `reason`, `granted_by_user_id`, `granted_at`, `expires_at`, `revoked_at` | Concesiones **excepcionales y auditadas** (D5), por ejemplo "ADMIN puede leer el diario del cliente X hasta el 10/10 por un ticket de soporte". Las capabilities por defecto de cada rol viven en código, no aquí. |
| `nutrition_access_audit` | `id`, `actor_user_id`, `capability`, `client_profile_id`, `resource`, `grant_id`, `at` | Registro de cada lectura de datos nutricionales sensibles que se hace **con una concesión** (no por el acceso normal del cliente o del coach asignado). |

## 13. Nutrition Engine

**Dónde:** un módulo puro en `backend/src/modules/nutrition-engine/` (o `common/nutrition/`), **sin dependencias de Nest ni de TypeORM**. Solo tiene funciones y tipos, y se testea con tablas de casos.

**Cadena de cálculo**, en el orden que pediste:

```
resolveGrams(quantity, unit, food, portion?)       → gramos | UnitConversionError
scaleFood(food.per100g, grams)                     → NutrientVector (+completeness)
recipeTotals(ingredients)                          → NutrientVector total
perServing(recipeTotals, servings)                 → NutrientVector por porción
perGramOfRecipe(recipeTotals, cookedWeightG)       → para registrar "180 g de la receta"
mealTotals(items)                                  → suma de alimentos y recetas
dayTotals(meals | logEntries)                      → total del día
compareToTargets(dayTotals, targets)               → diferencia + % por nutriente
adherence(days, policy)                            → métricas (sección 23)
substitute(from, to, grams, strategy)              → cantidad equivalente + deltas (sección 21)
```

**Reglas:**
- **`NutrientVector`** es `Record<NutrientCode, number | null>`. Al sumar un `null`, el resultado queda marcado como **incompleto** (`completeness: { missing: NutrientCode[], foodsMissing: id[] }`), como hace Tandoor en `property_helper.py`. En la interfaz se muestra "≥ 1,850 kcal (faltan datos de 2 alimentos)".
- **No se redondea dentro del Engine.** Se redondea solo al guardar el snapshot (2 decimales, como hoy `roundNutrition`) y al mostrar.
- **Es determinista:** el mismo input da el mismo output. Sin IA ni red.
- **Absorbe `nutrition-calc.util.ts`** sin cambiar sus resultados: los tests actuales deben seguir pasando.
- **Frontend:** el backend es la autoridad. Para la vista previa en vivo del builder hay dos opciones:
  - un endpoint `POST /nutrition/calculate`, con debounce;
  - un helper mínimo de escalado en el frontend, marcado como "vista previa", cuyo valor final sale del API al guardar.

  Recomendación: el **endpoint**, para no duplicar la lógica. Nunca se importa `backend/src` en el frontend.

## 14. Food Database

- **Objetivo:** no cargar miles de alimentos a mano, y guardar **solo** los que realmente se usan, con trazabilidad.
- **Capas:**
  1. **Catálogo curado**: `nutrition_foods` con `visibility=GLOBAL`, administrado por ADMIN. Es lo que ven todos.
  2. **Alimentos privados del Trainer**: `visibility=PRIVATE` y `owner`. Es el comportamiento actual.
  3. **Fuentes externas bajo demanda**: FDC (y más adelante OFF). Al usarlas, se **importa** el alimento a la capa 1 o 2 con `source` y `external_id`.
  - ~~Siembra masiva~~: **descartada (D4).** La base crece solo con los alimentos que realmente se usan.
- **Deduplicación:** índice único `(source, external_id)`. Importar un alimento que ya existe **devuelve el registro local**, sin duplicarlo. Una "re-sincronización" explícita (solo ADMIN) actualiza los nutrientes y la `source_version`; los planes y diarios existentes no cambian gracias al snapshot.
- **Idioma y nombres (D3):**
  - `name_original` guarda el texto de USDA **tal cual** y es inmutable.
  - `name` es el **displayName** en español. Al importar se inicializa con el original (`name_origin=SOURCE`).
  - La IA puede **proponer** un displayName (`name_origin=AI_GENERATED`, sin verificar). Una persona puede editarlo (`HUMAN_TRANSLATED`) o **verificarlo** (`name_verified_at` y `_by`).
  - La interfaz muestra una marca "traducción automática, sin verificar" hasta que alguien lo verifique.
  - La IA solo toca campos de texto (nombre y descripción), **nunca** nutrientes, porciones ni densidad.

## 15. Integración USDA FoodData Central

- **Licencia:** CC0 / dominio público, así que se puede usar libremente. La atribución se recomienda.
- **Estrategia (D4): local primero, USDA como respaldo, importación bajo demanda y caché local.** No hay siembra masiva ni CSV.

```
Profesional escribe "arroz"
  → 1. GET /nutrition/foods/search?q=arroz&include=external
        a) busca en local (nombre y name_original; GLOBAL + propios)
        b) si hay menos de K resultados locales, o si el usuario pide "buscar en USDA":
             ¿hay caché de búsqueda vigente? → úsala
             si no → FDC foods/search (Foundation, SR Legacy) → guardar en caché de búsqueda
        c) respuesta: resultados locales primero; luego los externos NO importados
           (marcados "USDA · importar"). Los externos que ya existen localmente
           se muestran como locales, deduplicados por (source, external_id).
  → 2. El profesional selecciona un resultado externo
  → 3. POST /nutrition/foods/import { source: USDA_FDC, externalId }
        - si ya existe (source, externalId) → devuelve el existente (idempotente)
        - si no → FDC food/{fdcId} → guardar raw → normalizar (nutrientes, energía,
          porciones) → crear el Food con name_original, displayName = original,
          source y nutrientes con source_nutrient_ref → 201
  → 4. En adelante el alimento es local: se reutiliza sin llamar a USDA.
```

- **API** (`api.nal.usda.gov/fdc/v1`): `foods/search` con `dataType=Foundation,SR Legacy` (como OpenNutriTracker en `fdc_const.dart`) y `food/{fdcId}` para el detalle.
  - La key va **solo en el backend** (`.env`, `FDC_API_KEY`) y nunca llega al frontend ni a los logs.
  - La key propia permite unas 1000 solicitudes por hora (según Diet App `import-usda.ts`; verificar al implementar).
  - Las llamadas tienen timeout, reintento con backoff ante 429/5xx y rate limit por usuario.
  - **Si USDA no responde, la búsqueda local sigue funcionando** y la sección externa indica "no disponible".
- **Mapeo de nutrientes:** se hace por `fdc_nutrient_id` en nuestra tabla `nutrients` (sección 12). Cada valor se guarda con `source=USDA_FDC` y `source_nutrient_ref` igual al ID de FDC.
- **Inmutabilidad:** los valores importados no se editan a mano. Si un profesional necesita corregir uno, se guarda como `source=MANUAL` y queda auditado; el original sigue en `external_food_raw`.
- **Energía:** se usa **1008** (kcal). Si no está, **2047** (Atwater general) y después **2048** (Atwater específica). Si no hay ninguno, se calcula 4/4/9 con los macros y se marca `derivation=CALCULATED`.
- **Porciones:** `food_portion.csv` o `foodPortions` en la API, que se convierten en `food_portions` con `gram_weight`.
- **Valores negativos o ausentes:** un negativo se guarda como `null` y se registra. **No se convierte en 0**, a diferencia de Tandoor (`api.py` L1194–1198).
- **Branded foods:** quedan excluidos al inicio. Son muy ruidosos y para productos de marca es mejor OFF.

## 16. Integración Open Food Facts

- **Uso:** productos de marca y **código de barras** en el diario del cliente. Es una fase posterior.
- **Endpoints:** `/api/v2/product/{barcode}` y búsqueda con `fields` limitados (patrón de `off_const.dart`). Se envía un `User-Agent` propio (`TrainingApp/<versión> (<contacto>)`).
- **Datos:** se normaliza `nutriments.*_100g` a nuestro vector. OFF trae strings, números o nulos, así que se convierte con cuidado. Hay que atender `energy-kcal_100g` contra `energy_100g`, que viene en kJ (÷ 4.184).
- **Licencia ODbL:**
  - se muestra una atribución visible ("Datos de Open Food Facts, ODbL");
  - `source=OPEN_FOOD_FACTS` queda guardado en cada alimento;
  - **no se exporta** un dataset derivado sin cumplir share-alike;
  - no se usan imágenes CC BY-SA sin atribución.
- **Calidad:** OFF es colaborativo, así que el alimento importado entra como `PRIVATE` o pendiente de revisión, no como `GLOBAL` directo.

## 17. Recipe Builder

- **Modelo:** kcal (`servings`, `weight`, `volume`) + Tandoor (ingredientes con nota, encabezados y sin cantidad) + las marcas de incompletitud.

```
Recipe
├── Ingredients
│   ├── Food            (v2: o subreceta, patrón polimórfico de kcal)
│   ├── Quantity
│   └── Unit            (g | ml | porción del alimento → gramos resueltos)
├── Servings
├── Cooked weight (opcional → permite registrar "X g de la receta")
└── Calculated Nutrition (Engine: total, por porción, por 100 g; completeness)
```

- **UX:**
  - al cambiar una cantidad, se recalcula en vivo con `POST /nutrition/calculate`;
  - junto a cada ingrediente se ve su aporte (kcal y macros);
  - si falta una conversión, se muestra una advertencia en línea, como el `missing_conversion` de Tandoor.
- **Escalado:** para "cocinar para N porciones" se multiplican las cantidades; los nutrientes por porción no cambian.

## 18. Meal Library

- Son comidas reutilizables del Trainer, por ejemplo "Desayuno alto en proteína A". Cada una tiene un `meal_type` sugerido y sus ítems (alimento o receta con cantidad).
- **Uso:** al construir el plan, "insertar comida de la biblioteca" **copia** los ítems al plan con su snapshot. Editar la comida de la biblioteca después **no** cambia planes ya asignados, igual que en los planes actuales.
- Referencia: Tandoor (`MealType` y recetas como unidad de plan) y Diet App (`Recipe.mealTypes`). Es BUILD porque es simple.

## 19. Plan Builder

```
Nutrition Plan
├── Targets (plan)                      ← como hoy
├── Day 1  (tipo: Entreno | objetivos propios opcionales)
│   ├── Breakfast / Lunch / Snack / Dinner  (orden configurable)
│   │     └── ítems: alimento | receta | comida de biblioteca (copiada)
│   │           └── alternativas aprobadas (sustitutos)
├── Day 2  (tipo: Descanso)
└── …
```

- **Días relativos (1 a N) en todos los planes; las fechas solo aparecen al asignar (D2).**
  - El plan de cliente tiene `start_date` y `cycle_mode`.
  - **`ONCE`:** `fecha(Day N) = start_date + (N − 1)`, y el plan termina tras el Day N.
  - **`REPEAT`:** el plan se repite en ciclo. `dayIndex(fecha) = ((fecha − start_date) mod N) + 1`.
  - Una fecha fuera de rango no tiene día asignado, y la interfaz muestra "sin plan para este día".
  - El Engine calcula el "día que toca" en función de la fecha local del cliente. Nada guarda la fecha en los días.
  - En el futuro, el día que toca podría elegirse por tipo de día (entreno o descanso) según el módulo de training. No es parte de este diseño inicial.
- **Acciones:** duplicar día, copiar comida entre días y "aplicar a todos los días".
- **Totales por día contra objetivo:** se reutiliza la tabla de comparación que ya existe en `plan-totals.tsx`, ahora por día.
- **Referencias:** `OptimizerDay` y `slotBudgets` de Diet App (reparto de kcal por comida, como guía visual), `Goal.days` de kcal y `dayTypeCalorieTarget` de Diet App (objetivos por tipo de día).

## 20. Templates

- Una plantilla es un `NutritionPlan` con `kind=TEMPLATE`, sin cliente y **sin fechas**. Solo tiene días relativos (D2).
- **Operaciones:**
  - `POST /nutrition/templates/:id/duplicate`: copia profunda en otra plantilla ("Copia de …").
  - `POST /nutrition/templates/:id/assign` `{ clientId, startDate, cycleMode }`: crea un plan `CLIENT` (copia profunda de días, comidas, ítems y snapshots) con `template_source_id`, en `DRAFT` o activado según el flujo actual. La plantilla y el plan del cliente evolucionan por separado.
  - `POST /clients/:clientId/nutrition-plans/:planId/save-as-template`: la operación inversa; se descartan las fechas y el cliente.
- **Reutilización:** una plantilla se puede asignar a muchos clientes, y cada asignación es independiente.
- **Visibilidad:** son privadas del Trainer, y ADMIN puede publicar plantillas globales.
- Es BUILD: ningún proyecto lo resuelve con el flujo coach → cliente.

## 21. Substitutions

**Dos niveles:**
1. **Alternativas aprobadas por el Trainer** en cada ítem del plan (`plan_item_alternatives`). El cliente solo puede elegir entre ellas. Es la idea de `Food.substitute` de Tandoor, aplicada a un ítem concreto.
2. **Cálculo de equivalencia** en el Engine, basado en el concepto de `engine/substitution.ts` de Diet App. **Se reimplementa, no se copia:**
   - `strategy`: `ISOCALORIC` (igualar kcal, el caso por defecto) o `ISOPROTEIN` (igualar proteína, útil en entrenamiento);
   - devuelve la cantidad ajustada, los deltas de kcal y macros y las advertencias (por ejemplo, "+12 g de grasa").
- **Registro:** cuando el cliente usa una alternativa, el diario guarda lo que **realmente** comió, con `plan_item_id` para medir la adherencia.

## 22. Client tracking

- **Pantalla "Hoy"** (evolución del tablero actual):
  - consumido contra objetivo en kcal y macros, con anillos (UX de `dashboard_widget.dart` y `macro_nutriments_widget.dart` de OpenNutriTracker);
  - comidas del día del plan, cada una con **"Lo comí"** (registra el ítem planificado con su snapshot en un toque), **"Comí otra cosa"** (una alternativa o un alimento del catálogo) y **"Omitir"**;
  - agregar un alimento suelto o una comida rápida (solo kcal y macros, marcada como `QUICK_ADD`).
- **Historial:** un calendario con el estado de cada día, como `diary_table_calendar.dart` de OpenNutriTracker.
- **Fecha local:** `local_date` se calcula en el cliente con su zona horaria y se valida en el backend (±1 día respecto del servidor). `logged_at` va en UTC.
- **Privacidad:** las notas del diario se tratan como las de los check-ins: nunca se escriben en logs.
- **Acceso (D5):** el **Nutrition Journal** lo leen el propio cliente y los profesionales asignados que tengan la capability. ADMIN no lo lee por defecto (sección 24).
- **Reglas de producto:**
  - "planificado" y "consumido" se muestran siempre separados;
  - no hay "calorías restantes" hasta que exista el diario;
  - ninguna cifra la genera la IA.

## 23. Analytics

Se calcula con consultas SQL sobre `food_log_entries` y `nutrition_days`. Si hace falta rendimiento, se agrega una tabla de resumen después.

| Métrica | Definición propuesta (configurable) |
| --- | --- |
| Día registrado | Tiene al menos 1 entrada en el diario. |
| Adherencia calórica del día | Consumido dentro de ±10% del objetivo **guardado ese día** (la tolerancia es la idea de `REBALANCE_TOLERANCE` de Diet App; el umbral es nuestro). |
| Adherencia de proteína | ≥ 90% del objetivo de proteína. |
| Cumplimiento del plan | Ítems planificados marcados "Lo comí" o con alternativa aprobada ÷ ítems planificados. |
| Semana | Promedio de kcal y macros, días registrados/7, días adherentes/7 y racha. |
| Tendencia | Media móvil de 7 días de kcal y proteína. Más adelante se cruza con peso corporal (módulo body) y rendimiento (training). |

- **Dashboard del Trainer:**
  - clientes con baja adherencia o sin registrar;
  - detalle por cliente (semana, tendencias y comidas más omitidas);
  - integración con el dashboard actual de F10 ("clientes que requieren atención").

## 24. Permisos

**Modelo (D5): autorización por capabilities.**

- Cada endpoint pide una **capability**, no un rol.
- El rol solo aporta las **capabilities por defecto** (un mapa en código, versionado y testeado).
- Las excepciones se conceden con **grants explícitos** (`nutrition_capability_grants`): tienen alcance (un cliente o todos), motivo, quién lo concedió y vencimiento, y cada uso queda en `nutrition_access_audit`.
- Implementación en Nest: un decorador `@RequireCapability('nutrition.journal.read', { scope: 'client' })` y un `CapabilityGuard` que evalúa esto en orden:
  1. propiedad (el cliente es el propio usuario);
  2. asignación (el profesional está asignado al cliente, reutilizando la verificación actual de assignments);
  3. capability por defecto del rol;
  4. grant vigente.

**Catálogo de capabilities (inicial):**

| Capability | CLIENT | TRAINER / NUTRITIONIST* | ADMIN |
| --- | --- | --- | --- |
| `nutrition.catalog.read` | Solo los alimentos de su plan y los que registra | ✔ | ✔ |
| `nutrition.catalog.write.own` | — | ✔ (lo que creó) | ✔ |
| `nutrition.catalog.curate` (GLOBAL, fusionar, re-sincronizar USDA, verificar nombres) | — | — | ✔ |
| `nutrition.catalog.import` (USDA/OFF) | — | ✔ | ✔ |
| `nutrition.templates.manage.own` | — | ✔ | ✔ (plantillas GLOBALES) |
| `nutrition.plan.read` | Su propio plan | Clientes **asignados** | — por defecto (solo con grant) |
| `nutrition.plan.write` | — | Clientes **asignados** | — por defecto (solo con grant) |
| `nutrition.journal.read` | Su propio diario | Clientes **asignados** | **— por defecto; solo con grant auditado** |
| `nutrition.journal.write` | Su propio diario | — (el profesional no escribe en el diario del cliente) | — |
| `nutrition.analytics.read` | Sus propias métricas | Clientes **asignados** | Solo métricas **agregadas y anónimas** de la plataforma, sin detalle por cliente salvo con grant |
| `nutrition.access.grant` | — | — | ✔ (concede y revoca grants; la concesión queda auditada) |

\* **NUTRITIONIST** no existe hoy como rol. El modelo lo admite sin cambiar endpoints: solo agrega un mapa de capabilities por defecto.

**Qué conserva ADMIN (D5):** usuarios, profesionales, asignaciones, catálogos, configuración, auditoría y operación de la plataforma. **No** asume que puede leer información nutricional detallada de los clientes.

**Nota sobre los endpoints actuales:** hoy `nutrition-plans.controller.ts` permite `ADMIN` en los planes de cliente. Se mantiene durante la migración por compatibilidad y se retira cuando llegue el `CapabilityGuard` (fase N5, sección 30). La UI de Admin no consume esos endpoints: solo muestra el **conteo** `activeNutritionPlans` en su dashboard (`admin-dashboard-page.tsx` L142, un dato agregado compatible con D5). Aun así, hay que avisar a la línea A antes de retirar el acceso.

- **Reglas adicionales:**
  - los objetos PRIVATE de un Trainer nunca aparecen a otro Trainer;
  - el cliente ve los datos del plan por **snapshot**, no por referencia al objeto privado;
  - las llamadas a FDC/OFF salen solo desde el backend, con rate limit por usuario;
  - las mutaciones del Trainer no invalidan las keys `/clients/me` (regla vigente de F10).

## 25. Estrategia de migración

1. **Migraciones aditivas.** Solo se agregan tablas y columnas nullable; no se rompe ningún endpoint actual.
2. **Backfill:**
   - `nutrition_foods.source = MANUAL`, `name_origin = MANUAL`, `name_original = NULL`. La `visibility` llega en N2 y conserva el comportamiento actual: los alimentos existentes quedan `GLOBAL`, porque hoy todos los Trainers los ven;
   - las columnas de macros se copian a `food_nutrients` con `source = MANUAL`;
   - cada plan existente pasa a ser `kind = CLIENT` con `cycle_mode = ONCE` y **1 día** (`nutrition_plan_days`), y sus comidas se asignan a ese día.
3. **Engine:** reemplaza `nutrition-calc.util.ts` con los **mismos tests en verde**, sin cambiar el comportamiento.
4. **API:**
   - los endpoints nuevos conviven con los actuales;
   - las respuestas actuales se mantienen, y los planes de 1 día se siguen viendo igual;
   - se regenera Orval (`npm run api:generate`) en un PR propio, avisando a la línea A.
5. **Frontend:**
   - la pantalla de Client sigue funcionando con planes de 1 día;
   - el builder por días reemplaza al editor actual detrás de la misma ruta.
6. **Limpieza** (en una fase posterior y con migración reversible): hacer obligatorio `plan_day_id` y eliminar las utilidades duplicadas.

## 26. Qué código podemos reutilizar directamente

Hay que decirlo con honestidad: **muy poco código es reutilizable literalmente.** Sí podemos usar directamente:

1. **Los datos de USDA FDC** completos: CC0.
2. **Los IDs de nutrientes de FDC**, tomados de la documentación pública de USDA. `nutrient_ids.py` de llmn sirvió solo como índice para encontrarlos; no copiamos el archivo.
3. **Las equivalencias de unidades**: son hechos (1 cup = 16 tbsp = 48 tsp; 1 oz = 28.349523125 g; 1 kcal = 4.184 kJ).
4. **Las fórmulas científicas** (Atwater 4/4/9, Mifflin-St Jeor, IOM 2005), citando la publicación original.
5. **Los datos de Open Food Facts** bajo ODbL, con atribución y cumpliendo share-alike.
6. ~~Los algoritmos de llmn~~: **no por ahora.** El repo no tiene archivo LICENSE; se usan solo como referencia hasta que el autor lo agregue.

**Código fuente copiado al repo desde los cinco proyectos: ninguno** (D1).

## 27. Qué debemos adaptar

- El modelo de nutrientes genérico y las marcas de incompletitud (Tandoor, conceptual).
- La copia local de FDC con porciones y nombres traducidos (OpenNutriTracker, conceptual, junto con el cargador de llmn).
- El sistema de unidades canónicas con densidad y pieza que falla explícitamente (Diet App, conceptual; kcal).
- La receta con porciones y peso cocido, y la subreceta polimórfica (kcal, **conceptual**: no se copian archivos MPL, D1).
- La entrada de diario con snapshot y el día registrado con objetivo guardado (OpenNutriTracker, kcal).
- La sustitución isocalórica con deltas (Diet App, conceptual).
- Los objetivos por tipo de día (Diet App, kcal).
- La regla "la IA propone, el Engine calcula" y la cola de curación (ADR de Diet App, conceptual).

## 28. Qué debemos implementar nosotros

- El Nutrition Engine en TypeScript, que extiende `nutrition-calc.util.ts`.
- La energía 2047/2048 de FDC y la política de `null` contra `0`.
- Las plantillas atemporales, la copia profunda (duplicar, asignar, guardar como plantilla) y el mapeo `startDate + cycleMode` (D2).
- Los planes por días relativos.
- La búsqueda local primero, USDA como respaldo, la importación idempotente por `(source, externalId)` y la caché de búsqueda (D4).
- El modelo de nombre original inmutable + displayName con origen y verificación (D3).
- La autorización por capabilities, los grants excepcionales y la auditoría de acceso (D5).
- Las alternativas aprobadas por el Trainer en cada ítem.
- Las métricas de adherencia y el dashboard del Trainer.
- Toda la interfaz: buscador multi-fuente, recipe builder, plan builder, "Hoy" del cliente y analítica, con nuestro design system.
- Los permisos y la integración con asignaciones, notificaciones (F12) y el dashboard (F10).

## 29. Riesgos técnicos y de licencias

| Riesgo | Mitigación |
| --- | --- |
| **Contaminación de licencia** al "adaptar" desde GPL/AGPL/NC | Reimplementar desde la idea sin copiar líneas, y revisar el diff en la revisión de código. Solo se toma código de MIT (llmn) o de MPL (kcal, respetando el alcance por archivo). |
| llmn **sin archivo LICENSE** | Tratarlo como MIT según el README y pedir al autor que agregue el archivo. Mientras tanto, usar solo datos públicos de FDC, que no dependen de llmn. |
| Tandoor "open data" con licencia no verificada | No usarlo hasta verificarla. |
| **ODbL de OFF** (share-alike de la base derivada) | Atribución, `source` por alimento, sin exportar el dataset y revisión legal antes de lanzar. |
| Nombres generados por IA tomados como verdad | `name_origin=AI_GENERATED` + una marca visible "sin verificar" + `name_original` inmutable (D3). |
| La IA escribe nutrientes por error | No existe ninguna ruta de escritura de la IA hacia `food_nutrients` ni hacia los snapshots, `source` no tiene el valor `AI` y un test lo verifica (D3). |
| USDA caído o cuota agotada | La búsqueda local funciona sola, hay caché de búsqueda con TTL, backoff y un mensaje "USDA no disponible" (D4). |
| Importaciones duplicadas por concurrencia | Índice único `(source, external_id)` + import idempotente (si choca, se devuelve el existente). |
| Grants de acceso excepcional usados de más | Vencimiento obligatorio, motivo obligatorio, auditoría por lectura y listado de grants activos para ADMIN (D5). |
| Calidad de FDC (energía 2047/2048, nulos, negativos, nombres en inglés) | Lógica explícita (sección 15), marcas de incompletitud y curación antes de publicar como GLOBAL. |
| Límites de la API de FDC/OFF | Caché de búsqueda con TTL (`external_food_search_cache`), la búsqueda local va primero, los alimentos importados se reutilizan sin llamar de nuevo, hay rate limit por usuario y la key queda solo en el servidor. |
| Complejidad (5 subsistemas nuevos) | Roadmap por fases con entregables usables en cada una (sección 30). |
| Zona horaria del diario | `local_date` explícita, validación ±1 día y tests de medianoche. |
| Rendimiento de la analítica | Índices por `(client_profile_id, local_date)`, y una tabla de resumen solo si se mide lentitud. |
| Choque con la línea A (Eli) | Los archivos compartidos (`admin-foods-page.tsx`, `generated/**`, migraciones) van en PRs pequeños y avisados. |
| La IA como fuente de números | La regla de datos (sección 13): la IA nunca escribe nutrientes y el Engine recalcula todo. |

## 30. Roadmap de implementación

Cada fase termina en un PR a `main` con tests y es usable por sí sola.

| Fase | Contenido | Depende de |
| --- | --- | --- |
| **N0 — Decisiones** | ✅ **Cerradas** (D1–D5). Pendientes operativos: API key de FDC (necesaria en N2) y revisión legal de ODbL antes de N8 | — |
| **N1 — Catálogo de nutrientes + Food 2.0 + Engine v1** | `nutrients` (seed con IDs de FDC); `food_nutrients` con `source` y `source_nutrient_ref`; trazabilidad del alimento (`source`, `external_id`, índice único); modelo de nombre (`name_original`, `name_origin`, verificación); backfill; Engine v1 puro (absorbe `nutrition-calc.util.ts`). **Sin cambios de permisos ni de UI.** | N0 |
| **N2 — USDA bajo demanda** | Búsqueda unificada con local primero y FDC de respaldo, caché de búsqueda, import idempotente (`POST /nutrition/foods/import`), `external_food_raw`, energía 2047/2048, porciones (`food_portions`), `visibility` GLOBAL/PRIVATE, UI del buscador (Trainer/Admin) y marca "sin verificar" | N1 |
| **N3 — Recetas** | Recipe builder con recálculo en vivo (`POST /nutrition/calculate`), porciones y peso cocido | N1 |
| **N4 — Planes por días relativos + plantillas + biblioteca** | `kind` TEMPLATE/CLIENT, `nutrition_plan_days`, `cycle_mode`, duplicar, asignar con `startDate`, guardar como plantilla, `meal_templates` y builder por días | N1, N3 |
| **N5 — Capabilities + Nutrition Journal** | `CapabilityGuard`, el mapa rol → capabilities, grants y auditoría (**antes** de exponer datos del diario); `food_log_entries` y `nutrition_days`; "Hoy" del cliente; retirar el acceso implícito de ADMIN a los planes de cliente | N4 |
| **N6 — Sustituciones** | Alternativas aprobadas por ítem y equivalencia isocalórica o isoproteica | N4, N5 |
| **N7 — Adherencia + analítica** | Métricas de la sección 23, dashboard del Trainer y métricas agregadas y anónimas para ADMIN | N5 |
| **N8 — Open Food Facts** | Código de barras y marcas, con la misma arquitectura de local primero e importación. Atribución ODbL | N2, N5 |
| **N9 — IA asistente** | La IA sugiere displayName y descripciones (D3), comidas y sustitutos, y el Engine valida y recalcula. El optimizador tipo llmn queda como decisión de arquitectura aparte | N2, N4–N7 |

**Primer entregable:** N1, que ya está preparado para Codex en [`.ai/CURRENT_TASK.md`](../../.ai/CURRENT_TASK.md). Después sigue N2, que resuelve "no quiero crear miles de alimentos a mano" sin sembrar la base completa.

---

## Decisiones

Todas las decisiones de diseño están cerradas (ver "Decisiones cerradas" al inicio). Quedan dos pendientes operativos que no bloquean N1:

1. Conseguir la API key de USDA FDC para N2 (api.data.gov).
2. Hacer la revisión legal de ODbL (Open Food Facts) antes de N8.
