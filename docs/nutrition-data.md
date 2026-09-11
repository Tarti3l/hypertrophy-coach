# Datos nutricionales — origen y cobertura

## Fuente

**Tablas Peruanas de Composición de Alimentos (TPCA)**, Instituto Nacional de Salud /
CENAN, edición 2017. Publicación de acceso abierto bajo licencia Creative Commons.
Valores **por 100 g de porción comestible**, tal como los publica la fuente.

Citación oficial: Reyes-García M, Gómez-Sanchez I, Espinoza-Barrientos C. *Tablas peruanas
de composición de alimentos*. Lima: Instituto Nacional de Salud, 2017.

El PDF vive en `docs/fuentes/tablas-peruanas-2017.pdf`, ignorado por git por peso.
Se descarga de nuevo desde el enlace del final.

**Ojo con el archivo:** el repositorio del INS publica dos documentos. El que aparece
primero en buscadores, `tablas-peruanas-QR.pdf`, es una versión de bolsillo de 20 páginas
que solo trae cereales. El bueno tiene 146 páginas y está en el bitstream
`2ee9e34b-d816-4f34-8fb9-81ae3b0fd3e5`.

## Cobertura del catálogo

Migración `00008_food_catalog.sql`: **884 alimentos** en 11 grupos.

| Código | Grupo | Alimentos |
|---|---|---|
| A | Cereales y derivados | 160 |
| B | Verduras, hortalizas y derivados | 125 |
| C | Frutas y derivados | 142 |
| D | Grasas, aceites y oleaginosas | 41 |
| E | Pescados y mariscos | 90 |
| F | Carnes y derivados | 103 |
| G | Leche y derivados | 26 |
| H | Bebidas | 16 |
| J | Huevos y derivados | 15 |
| T | Leguminosas y derivados | 85 |
| U | Tubérculos, raíces y derivados | 81 |

Cada fila lleva su código TPCA en la columna `source`.

## Cómo se extrajo

`pdftotext -layout` sobre el PDF oficial, y un parser que lee las columnas
`<ENERC> kcal`, `<PROCNT>`, `<FAT>` y `<CHOCDF>`. El PDF tiene capa de texto real,
así que no hubo OCR ni transcripción manual.

**Verificación:** tres alimentos contrastados contra consultas web independientes al mismo
documento antes de generar la migración — Avena envasada (A5), Pan francés (A49) y
Quinua (A54). Coinciden exactamente. Además se comprobó que ningún valor cayera fuera de
rango plausible, que es como se detecta una columna cruzada.

## Datos incompletos

La TPCA marca con `•` las celdas que no midió. Sobre los 2228 alimentos de la edición
2023, 1157 tienen `data_incomplete = true` (les falta alguna de las 21 columnas), y 44
tienen en null alguno de los cuatro macros: `protein_g` en 7, `carbs_g` en 39, `fat_g`
en 7, `energy_kcal` en ninguno.

**El valor que falta se guarda como `null`, nunca como 0.** Un nutriente no reportado no
es un nutriente ausente: poner 0 le diría a un socio que el jugo de cocona no tiene
proteína, que es un dato inventado. Por eso `foods` dejó de exigir not null en esas
cuatro columnas (migración 00023) y la interfaz muestra "no reportada" en vez de un
número. Los totales del día avisan cuando incluyen un alimento con datos faltantes.

En `meal_entries` los macros **sí** siguen siendo not null: ahí el valor se calcula al
momento de comer y es el historial de la persona, no el catálogo.

La alternativa era descartar esos alimentos, pero entre ellos está el atún en conserva:
un catálogo peruano sin atún sería peor que uno que admite lo que no sabe.

## Porciones caseras

`food_portions` tiene 19 equivalencias para 17 alimentos de uso diario
(1 taza de arroz = 150 g, 1 unidad de huevo = 50 g, etc.).

**Estas NO provienen de la TPCA.** Son medidas domésticas estimadas. Si se quiere rigor,
la referencia es la tabla de medidas caseras del CENAN, que se debe citar aparte.
El resto de los 884 alimentos se registra en gramos.

## Peso corporal

`body_weight_logs` (migración 00024) guarda el historial de peso de cada persona:
una fila por día y por usuario, con la fecha de la medición que ella elige.

**No participa en el cálculo de macros y no debe hacerlo sin una decisión explícita del
dueño.** Las metas vigentes salen de `user_profiles` (`weight_kg` y `macro_targets`), se
calculan una sola vez en el onboarding, y registrar un peso no las recalcula ni toca ese
perfil. Son dos datos distintos a propósito: uno es el peso declarado con el que se
estimaron las metas, el otro es lo que la persona se pesa después.

El peso del onboarding **no se copia** a esta tabla. No tiene fecha de medición
verificable —solo se sabe cuándo se completó el formulario, que es cuándo se declaró, no
cuándo se pesó—, así que darle una fecha (y menos "hoy") sería inventar un dato. La
pantalla «Mi peso» lo muestra aparte, etiquetado como declarado y fuera de la evolución.

El `unique (user_id, measured_on)` es lo que impide duplicar mediciones: registrar dos
veces el mismo día corrige ese día en lugar de crear otra fila.

## Productos envasados

Pendiente, fase 4. La opción sin costo es **Open Food Facts**: API gratuita, sin API key,
datos bajo Open Database License. Pide un User-Agent que identifique la app y respeta
15 consultas por minuto por IP. Cubre productos con código de barras, no comida preparada.

## Fuentes

- [Tablas Peruanas de Composición de Alimentos — INS, 2017](https://repositorio.ins.gob.pe/items/7dd870ba-42db-449c-bef2-5d67d881383f)
- [PDF completo, 146 páginas](https://repositorio.ins.gob.pe/server/api/core/bitstreams/2ee9e34b-d816-4f34-8fb9-81ae3b0fd3e5/content)
- [Open Food Facts — documentación de la API](https://openfoodfacts.github.io/openfoodfacts-server/api/)
