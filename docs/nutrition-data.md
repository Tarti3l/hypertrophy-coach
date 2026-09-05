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

58 alimentos no reportan alguno de los macronutrientes: la TPCA marca esas celdas con `•`.
Se guardan con **0** en el valor faltante y con `data_incomplete = true`.

La alternativa era descartarlos, pero entre ellos está el atún en conserva: un catálogo
peruano sin atún sería peor que uno con un cero declarado. La bandera existe para poder
mostrarlo en la interfaz cuando haga falta.

## Porciones caseras

`food_portions` tiene 19 equivalencias para 17 alimentos de uso diario
(1 taza de arroz = 150 g, 1 unidad de huevo = 50 g, etc.).

**Estas NO provienen de la TPCA.** Son medidas domésticas estimadas. Si se quiere rigor,
la referencia es la tabla de medidas caseras del CENAN, que se debe citar aparte.
El resto de los 884 alimentos se registra en gramos.

## Productos envasados

Pendiente, fase 4. La opción sin costo es **Open Food Facts**: API gratuita, sin API key,
datos bajo Open Database License. Pide un User-Agent que identifique la app y respeta
15 consultas por minuto por IP. Cubre productos con código de barras, no comida preparada.

## Fuentes

- [Tablas Peruanas de Composición de Alimentos — INS, 2017](https://repositorio.ins.gob.pe/items/7dd870ba-42db-449c-bef2-5d67d881383f)
- [PDF completo, 146 páginas](https://repositorio.ins.gob.pe/server/api/core/bitstreams/2ee9e34b-d816-4f34-8fb9-81ae3b0fd3e5/content)
- [Open Food Facts — documentación de la API](https://openfoodfacts.github.io/openfoodfacts-server/api/)
