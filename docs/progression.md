# Sobrecarga progresiva — reglas y fuentes

Implementado en `apps/mobile/src/features/training/services/progression.ts`.

## Dos mecanismos, no uno

Este documento describe la regla 2-por-2, que decide **entre sesiones** si toca
subir peso. Hay un segundo mecanismo, **dentro de la misma sesión**, en
`apps/mobile/src/features/progress/components/SetTracker.tsx`: al cerrar una
serie efectiva, compara las repeticiones contra un rango fijo de 8 a 12 y
avisa si conviene subir el peso ya, sin esperar a la sesión siguiente. No
reemplaza la regla 2-por-2 ni compite con ella — una decide el peso de
*hoy*, la otra el de *la próxima vez*.

**Decisión de producto, no un hallazgo a medias:** esta app entrena siempre
al fallo en el rango de 8 a 12 repeticiones. Es deliberado, para que un
principiante aprenda una sola regla en vez de un objetivo distinto por
ejercicio. Rangos más altos para trabajo de aislamiento son válidos en la
literatura en general, pero programarlos queda **fuera de alcance a
propósito** — no es algo que esta app vaya a ofrecer. Por eso `target_reps`
de una rutina, cuando exista, tiene que caer dentro de 8-12: si no cae,
el dato está mal, no la regla.

Esto ya obligó a corregir 9 ejercicios del catálogo cuyo `default_reps_low`/
`default_reps_high` quedaba fuera de 8-12 (migración `00021`): el caso que lo
expuso fue "Apertura en máquina (pec deck)" (10-15), más seis compuestos con
rango de fuerza clásico (press de banca, militar, remo con barra, sentadilla
con barra, sentadilla frontal, sentadilla profunda — todos 6-10) y dos
variantes de peso corporal (curl nórdico 4-8, dominada asistida 5-10) — ninguno
de estos ocho es aislamiento, así que la excepción de arriba no los cubría.
Quedan sin tocar, a propósito, los ejercicios de aislamiento con techo más
alto (curls, extensiones, elevaciones, pantorrilla, abdominales — típicamente
10-20) y dos que no se miden en repeticiones al fallo (`farmers-walk`,
tiempo/distancia; `plank`, isométrico).

## Cuándo subir peso: la regla 2-por-2 (NSCA)

> "Cuando alguien hace 2 repeticiones más del objetivo en la **última serie** de los
> **dos últimos entrenamientos** de un ejercicio, hay que añadir peso en el siguiente."

Dos detalles que la implementación respeta y que es fácil equivocar:

1. **La última serie, no la primera.** La primera serie siempre sale mejor porque no hay
   fatiga acumulada; usarla como criterio haría subir peso antes de tiempo. Es uno de los
   casos límite a comprobar a mano (ver Verificación).
2. **Dos sesiones consecutivas, no una.** Un buen día no es progreso.

## Cuánto subir

NSCA, personas **poco entrenadas**:

| | Incremento |
|---|---|
| Tren superior | 2–5 lb (≈ 1–2.3 kg) |
| Tren inferior | 5–10 lb (≈ 2.3–4.5 kg) |

Para personas más entrenadas: superior 5–10 lb, inferior 10–15 lb o más. En términos
relativos, "se usan subidas del 2.5 al 10 %" en lugar de valores absolutos.

**Cómo lo aplicamos:** el salto de disco realista más pequeño de un gimnasio — 2.5 kg
arriba (dos discos de 1.25) y 5 kg abajo (dos de 2.5) — **topado al 10 % del peso actual**.
Sin ese tope, subir 2.5 kg a una mancuerna de 10 kg sería un salto del 25 %, muy por encima
del rango. Con el tope, ese caso sube 1 kg. Piso mínimo de 0.5 kg para que la sugerencia
nunca sea "sube 0".

## Escalera de sugerencias

| Situación | Qué sugiere |
|---|---|
| Sin historial | Punto de partida: un peso que permita completar el objetivo con buena técnica |
| Última sesión por debajo del objetivo | Repetir peso hasta llegar al objetivo |
| Llegó al objetivo, sin superarlo por 2 | Una repetición más, mismo peso |
| Regla 2-por-2 cumplida | Subir peso y volver al objetivo de repeticiones |

Objetivo por defecto: 10 repeticiones. Cuando el editor de rutinas permita fijar
`target_reps`, ese valor manda.

## Verificación

No hay pruebas automatizadas para `progression.ts`: `apps/mobile/package.json` no define
un test runner. La verificación de los casos límite —que se mire la última serie y no la
primera, que una sola sesión buena no dispare la subida, el tope del 10 % en cargas
ligeras y el piso de 0.5 kg— es manual.

## Fuentes

- [NSCA CPT — Programas de entrenamiento de fuerza (regla 2-por-2)](https://www.ptpioneer.com/personal-training/certifications/nsca-cpt/nsca-cpt-chapter-15/)
- [NSCA CSCS — Diseño de programas de entrenamiento (incrementos de carga)](https://www.ptpioneer.com/personal-training/certifications/nsca-cscs/cscs-chapter-17/)
- [ACSM — Progression Models in Resistance Training for Healthy Adults](https://pubmed.ncbi.nlm.nih.gov/19204579/)
