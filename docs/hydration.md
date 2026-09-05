# Objetivo de hidratación — respaldo científico

Fuentes usadas por `apps/mobile/src/features/nutrition/services/hydrationCalculator.ts`.

## Ingesta Adecuada de agua total

| Fuente | Hombres adultos | Mujeres adultas | Notas |
|---|---|---|---|
| EFSA (2010), *Dietary Reference Values for water* | 2.5 L/día | 2.0 L/día | "Agua total": incluye bebidas de todo tipo y la humedad de los alimentos. Adolescentes 14–17: 2.5 L varones, 2.0 L mujeres. |
| National Academies / IOM (2004) | 3.7 L/día | 2.7 L/día | Estima que ~80 % del agua total viene de bebidas y ~20 % de los alimentos. |

En el cálculo usamos los valores de EFSA como **piso** y el reparto 80/20 de las Academias
Nacionales para convertir agua total en "lo que hay que beber".

## Individualización por masa corporal

Las guías institucionales dan volúmenes fijos, no fórmulas por peso. Las revisiones clínicas
sí manejan 30–35 mL/kg/día. La revisión de *Nutrients* sobre adultos mayores de 65 documenta
el uso de **30 mL/kg/día** en esa población, por la menor capacidad de concentración renal.

Implementación: 35 mL/kg hasta los 64 años, 30 mL/kg desde los 65.

## Ejercicio

ACSM recomienda reponer las pérdidas por sudor durante el ejercicio, del orden de
**0.4–0.8 L/hora**, y rehidratar después con ~1.5 L por cada kg de masa corporal perdida
(150 % de la pérdida). Las tasas de sudoración van de 1 a 3 L/hora según persona y ambiente.

Implementación: **+500 mL** los días de entrenamiento (punto medio del rango, sesión de ~1 h).

## Techo de seguridad

La revisión de *Nutrients* señala que no hay evidencia de beneficio al beber por encima de
las cantidades recomendadas. El cálculo se topa en **4 L/día de agua total** para que un peso
alto no produzca un objetivo desaconsejable.

## Por qué la estatura no entra

Ninguna de estas guías usa la estatura. El determinante antropométrico del requerimiento
hídrico es la masa corporal. Añadir un término por estatura no tendría respaldo.

## Fuentes

- [EFSA — Scientific Opinion on Dietary Reference Values for water (2010)](https://www.efsa.europa.eu/en/efsajournal/pub/1459)
- [EFSA — Dietary Reference Values for nutrients, summary report (2017)](https://www.efsa.europa.eu/sites/default/files/2017_09_DRVs_summary_report.pdf)
- [National Academies — Report Sets Dietary Intake Levels for Water, Salt, and Potassium (2004)](https://www.nationalacademies.org/news/report-sets-dietary-intake-levels-for-water-salt-and-potassium-to-maintain-health-and-reduce-chronic-disease-risk)
- [Fluid Intake Recommendation Considering the Physiological Adaptations of Adults Over 65 (Nutrients, 2020)](https://www.mdpi.com/2072-6643/12/11/3383)
- [Korey Stringer Institute — Hydration (guía ACSM de reposición de fluidos)](https://koreystringer.institute.uconn.edu/hydration/)
