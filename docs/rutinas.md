# Rutinas: splits, selección de ejercicios y cardio

Este documento respalda el generador de rutinas. Cada recomendación que la app le
muestra al usuario sale de aquí, y cada línea de aquí tiene una fuente. Donde no
hay evidencia, lo decimos: **la app nunca presenta consenso práctico como si fuera
un hallazgo experimental.**

Escala que usamos en toda la app (columna `exercises.evidence_level`):

| Nivel | Qué significa | Cómo se muestra en la UI |
| --- | --- | --- |
| `hipertrofia` | Ensayo de intervención con medición directa (ecografía, MRI, CSA) | "Respaldado por estudios de crecimiento muscular" |
| `emg` | Solo electromiografía aguda | "Respaldado por activación muscular (evidencia indirecta)" |
| `consenso` | Sin evidencia comparativa directa; razonamiento biomecánico o práctica establecida | "Práctica establecida, sin estudio comparativo" |

> **Por qué distinguimos EMG de hipertrofia.** La amplitud de EMG medida de forma
> aguda **no es un predictor validado de crecimiento muscular**. Vigotsky,
> Halperin, Trajano y Vieira (2022) desmontan la cadena lógica "más activación →
> más crecimiento" y concluyen que los estudios agudos comparativos deben
> someterse a escrutinio antes de usarlos para prescribir ejercicios.
> — Vigotsky et al. (2022), *Sports Medicine* 52(2):193–199.
> https://doi.org/10.1007/s40279-021-01619-2

---

## 1. Lo que de verdad decide el resultado: el volumen, no el split

Antes de hablar de días y agrupaciones conviene fijar la jerarquía, porque la app
no debe vender el split como si fuera la variable importante. No lo es.

**El volumen semanal es el motor principal de la hipertrofia, con dosis-respuesta
y rendimientos decrecientes.**

- Schoenfeld, Ogborn & Krieger (2017), *Journal of Sports Sciences* 35(11):1073–1082.
  34 grupos de tratamiento de 15 estudios. Series semanales como variable continua:
  efecto significativo (p = 0.002); cada serie adicional se asocia a **+0.37 %** de
  ganancia. Alto vs bajo volumen dentro de cada estudio: p = 0.03, diferencia
  equivalente a **+3.9 %**. https://europepmc.org/article/MED/27433992
- Pelland, Remmert, Robinson, Hinson & Zourdos (2026), *Sports Medicine* 56(2):481–505.
  **67 estudios, 2.058 participantes.** Probabilidad posterior de que la pendiente
  volumen→hipertrofia sea > 0: **100 %**, con rendimientos decrecientes.
  https://link.springer.com/article/10.1007/s40279-025-02344-w
- Iversen, Norum, Schoenfeld & Fimland (2021), *Sports Medicine* 51(10):2079–2095.
  Traducción por categorías: **~5 %, ~7 % y ~10 %** de hipertrofia para **<5, 5–9 y
  10+** series semanales por músculo. Recomiendan **al menos 4 series semanales por
  grupo muscular**. https://europepmc.org/article/PMC/PMC8449772
- Baz-Valle, Balsalobre-Fernández, Alix-Fages & Santos-Concejero (2022),
  *Journal of Human Kinetics* 81:199–210. Solo sujetos entrenados, medición directa.
  Recomendación textual: **12–20 series semanales por grupo muscular** como estándar
  para hombres jóvenes entrenados. Sin diferencias moderado (12–20) vs alto (>20) en
  cuádriceps (p = 0.19) ni bíceps (p = 0.59); **el tríceps sí favoreció más volumen
  (p = 0.01)**. https://ouci.dntb.gov.ua/en/works/ldvzLjq7/

**Volumen que usa la app:**

| Nivel | Series semanales por grupo muscular |
| --- | --- |
| Principiante (0–6 meses) | **6–10** |
| Intermedio | **10–16** |
| Avanzado | **12–20** |

El rango de principiante es deliberadamente conservador: por encima del mínimo de 4
que exige Iversen 2021, y muy por debajo del techo, porque un principiante gana con
casi cualquier estímulo (los estudios reportan de forma consistente **5–25 % de
crecimiento en 8–12 semanas** con protocolos muy distintos) y el factor limitante
real es la adherencia, no la dosis.

**No existe una cifra validada de "volumen máximo recuperable" (MRV) por grupo
muscular.** El concepto es popular en divulgación pero no tiene respaldo
cuantitativo en la literatura revisada por pares. La app no lo usa.

---

## 2. Frecuencia: por qué recomendamos 2 veces por músculo y por semana

Aquí hay que ser honesto, porque la recomendación popular se apoya en un estudio
que su propio autor corrigió después.

- **Schoenfeld, Ogborn & Krieger (2016)**, *Sports Medicine* 46(11):1689–1697.
  10 estudios. ES frecuencia alta **0.49 ± 0.08** vs baja **0.30 ± 0.07** (p = 0.002).
  Conclusión: entrenar 2x/semana supera a 1x/semana.
  https://link.springer.com/article/10.1007/s40279-016-0543-8
- **Schoenfeld, Grgic & Krieger (2019)**, *Journal of Sports Sciences* 37(11):1286–1295.
  25 estudios, más del doble. **"No significant difference between higher and lower
  frequency on a volume-equated basis."** Tampoco al restringir a medidas directas,
  ni a sujetos entrenados, ni por tren superior/inferior.
  https://europepmc.org/article/MED/30558493
- **Pelland et al. (2026)**: frecuencia→hipertrofia, "compatible con efectos
  despreciables" una vez controlado el volumen. En cambio frecuencia→**fuerza** sí
  muestra efecto positivo (probabilidad posterior 100 %).
- **Neves et al. (2022)**, *PLOS ONE* e0276154. Diseño intra-sujeto (una pierna
  1x/sem, otra 3x/sem, 9 semanas, 24 hombres entrenados). Con volumen igualado: sin
  diferencias (1RM p = 0.454; CSA p = 0.310). Sin igualar: ES 1RM 0.51, ES CSA 0.63.
  https://ouci.dntb.gov.ua/en/works/9Zxyv1b4/
- **Saric et al. (2019)**, *JSCR* 33(7S):S122–S129. 3x vs 6x/semana, volumen igualado,
  6 semanas: sin diferencias en fuerza ni grosor.

**Cómo lo reconcilia la app.** El efecto de 2016 era en buena parte un efecto de
volumen disfrazado de frecuencia. Seguimos recomendando **2 sesiones por músculo y
semana**, pero por una razón logística, no fisiológica: repartir 12 series en dos
sesiones de 6 es más tolerable, deja más calidad por serie y encaja mejor en la
semana que hacer 12 de golpe. La app se lo dice al usuario con esas palabras.

**Cuánto descanso entre sesiones del mismo músculo.** La regla de "48–72 horas
fijas" circula atribuida al ACSM; **no la pudimos verificar en el position stand de
2009**, que trata el descanso entre series pero no la recuperación inter-sesión por
músculo. Lo que sí está medido:

- **Morán-Navarro et al. (2017)**, *Eur J Appl Physiol* 117:2387–2399. Los protocolos
  **sin llegar al fallo se recuperaron significativamente más rápido entre 24 y 48 h**
  que el protocolo al fallo. "Training to failure slows down recovery up to 24–48 h
  post-exercise", en tren superior e inferior.
  https://link.springer.com/article/10.1007/s00421-017-3725-7

→ **El descanso necesario depende de la proximidad al fallo y del volumen de la
sesión, no de un número fijo de horas.** Como la app enseña a dejar 1–3 repeticiones
en reserva (ver `progression.md`), 48 h entre sesiones del mismo músculo es holgado.

*Mecanismo que NO usamos como argumento:* la síntesis proteica muscular vuelve a
línea de base antes en entrenados (MacDougall et al. 1995, *Can J Appl Physiol*
20(4):480–486, https://europepmc.org/article/MED/8563679; Damas et al. 2015,
*Sports Medicine* 45:801–807, https://link.springer.com/article/10.1007/s40279-015-0320-0).
Es un mecanismo plausible a favor de frecuencias altas, pero los ensayos con volumen
igualado **no confirman** que se traduzca en más músculo. Mecanismo sin resultado.

---

## 3. El split por número de días

### 3.1 Lo primero: el split, por sí mismo, no cambia el resultado

- **Ramos-Campo, Benito-Peinado, Caravaca, Rojo-Tirado & Rubio-Arias (2024)**,
  *JSCR* 38(7):1330–1340. 14 estudios, 392 sujetos, split vs full body.
  Press banca p = 0.34; tren inferior p = 0.29; extensores del codo p = 0.84;
  flexores del codo p = 0.91; vasto lateral p = 0.93; masa magra p = 0.92.
  **"Does not significantly impact either strength gains or muscle hypertrophy when
  volume is equated."** https://ouci.dntb.gov.ua/en/works/9GAwdoK4/
- **Pedersen, Fimland, Schoenfeld et al. (2022)**, *BMC Sports Sci Med Rehabil* 14:87.
  44 mujeres no entrenadas, 12 semanas, volumen igualado. Full body 2x/sem vs split
  4x/sem: press banca +25.5 % vs +30.0 %, prensa +29.2 % vs +28.3 %, masa muscular
  +1.9 % vs +1.7 % — **ninguna diferencia significativa**.
  https://link.springer.com/article/10.1186/s13102-022-00481-7

**Conclusión que la app comunica:** el split es un **vehículo para repartir tu
volumen semanal**, no una variable mágica. Elige el que puedas cumplir.

### 3.2 Guía oficial

**ACSM (2009), "Progression Models in Resistance Training for Healthy Adults"
(Position Stand)**, *MSSE* 41(3):687–708.
https://tourniquets.org/wp-content/uploads/PDFs/ACSM-Progression-models-in-resistance-training-for-healthy-adults-2009.pdf

- Novato: *"train the entire body 2–3 d·wk⁻¹"*
- Intermedio: 3–4 d/sem; para hipertrofia, cuerpo completo **o 4 d/sem upper/lower**
- Avanzado: *"advanced lifters train 4–6 d·wk⁻¹"*, con splits de **1 a 3 grupos
  musculares por sesión**
- Orden: *"large muscle group exercises before small muscle group exercises,
  multiple-joint exercises before single-joint exercises"*

### 3.3 Lo que la app propone

La app ofrece **solo 3, 4 o 5 días**, y en los tres casos **los días de pierna van
separados de los de torso**. No hay sesiones mixtas.

| Días | Split | Torso / Pierna | Cada músculo | Respaldo |
| --- | --- | --- | --- | --- |
| 3 | **Empuje · Pierna · Tirón** | 2 torso, 1 pierna | 1x | ✅ ACSM 2009 avala 3 d/sem; la separación es consenso práctico |
| 4 | **Torso · Pierna ×2** | 2 torso, 2 pierna | 2x | ✅ Recomendación explícita del ACSM 2009 para 4 d/sem |
| **5 (recomendado)** | **Empuje · Tirón · Pierna · Torso · Pierna** | 3 torso, 2 pierna | ~2x | ⚠️ Consenso práctico |

**Por qué separamos pierna de torso, dicho con honestidad.** No porque produzca más
músculo: Ramos-Campo et al. (2024) no encontró diferencias entre split y cuerpo
completo con volumen igualado, y Pedersen et al. (2022) tampoco. Se separa por dos
razones prácticas que sí se sostienen:

1. **Fatiga.** Una serie dura de prensa o de sentadilla es global, no local. Meter un
   jalón después de eso significa hacerlo peor, con menos carga o menos repeticiones,
   y lo que cuenta es el volumen de calidad (§1).
2. **Duración de la sesión.** Mezclar pierna y torso el mismo día obliga a sesiones
   largas o a recortar volumen en ambos.

**Por qué 3 es el mínimo y 5 el máximo.** Por debajo de 3 días no se puede separar
pierna de torso sin dejar algún grupo sin sitio. Por encima de 5, los días extra solo
sirven para repartir: Saric et al. (2019) comparó 3 contra 6 sesiones semanales con
volumen igualado y no encontró diferencias en fuerza ni en grosor muscular.

**El coste del split de 3 días, dicho claro.** Cada músculo se entrena una vez por
semana, así que esa sesión carga con todo el volumen semanal. Eso funciona —con volumen
igualado, la frecuencia no cambia la hipertrofia (§2)— pero produce sesiones más largas
y exigentes que a 5 días. La app se lo dice al usuario en el texto de la plantilla.

**Por qué 5 días es el que la app marca como recomendado**, siendo honestos con que
no hay ECA que compare esta distribución contra otras a 5 días:

1. Cae dentro del rango que el ACSM avala para intermedios y avanzados (4–6 d/sem).
2. Permite llegar a **10–16 series semanales por grupo** repartidas en 2 sesiones por
   músculo, sin sesiones de más de una hora.
3. Es el punto donde el volumen objetivo y la duración por sesión se cruzan mejor.

No decimos que 5 días produzca más músculo que 4 o 3 a igual volumen. **No lo
produce.** Decimos que a 5 días es más fácil acumular el volumen sin sesiones largas.

---

## 4. Por qué agrupamos pecho + hombros (y espalda + bíceps)

Esta es la pregunta original y merece la respuesta honesta completa, porque tiene
una parte bien respaldada y una parte que es solo costumbre.

### 4.1 La parte con evidencia real: las series indirectas cuentan

Un press de banca no entrena solo el pecho: el tríceps y el deltoides anterior
también trabajan. La pregunta es cuánto cuenta ese trabajo.

**Pelland et al. (2026)** clasificaron cada serie como **directa** o **indirecta**
según su especificidad respecto al músculo medido, y compararon tres formas de
contarlas. El **método fraccional —que pondera las series indirectas con un factor
de 0.5— fue el que mejor ajustó los datos**, por encima de contarlas como 0 o como 1.
La distinción directa/indirecta resultó **esencial** para predecir las adaptaciones.
https://link.springer.com/article/10.1007/s40279-025-02344-w

→ **Una serie de press aporta aproximadamente media serie de volumen al tríceps.**
Este es el argumento cuantitativo sólido para agrupar por patrón de movimiento: si
el día de empuje ya deja ~5 series indirectas al tríceps, sabes cuántas directas
añadir. Si repartes pecho el lunes y tríceps el jueves, ese cómputo se te escapa y
acabas dándole al tríceps más volumen del que crees.

La app usa exactamente esta ponderación (0.5) para calcular el volumen semanal por
grupo que le muestra al usuario.

*Dato compatible:* Baz-Valle (2022) encontró que el tríceps fue **el único** músculo
que se benefició de >20 series/semana. Una lectura plausible es que tolera y
necesita más porque acumula mucho trabajo indirecto — pero **esta interpretación es
nuestra, no una conclusión de los autores.**

### 4.2 La segunda parte con evidencia: agrupar bien ahorra tiempo

**Burke, Hermann, Piñero, Schoenfeld et al. (2024)**, preprint SportRxiv.
43 sujetos entrenados, 8 semanas, 4 series al fallo. Superseries de músculos no
competitivos vs series tradicionales: **mismo grosor muscular** (0.54; rango
0.23–1.3) y **misma fuerza** (0.28), con **sesiones un 36 % más cortas**.
https://sportrxiv.org/index.php/server/preprint/view/419

→ Emparejar músculos que no compiten entre sí es eficiente. Es un preprint (sin
revisión por pares), y así lo etiquetamos.

### 4.3 La parte que es solo costumbre — y lo decimos

**No existe ningún ECA ni meta-análisis que compare una sesión de empuje
(pecho + hombro + tríceps) contra repartir esos músculos en días distintos, con
volumen igualado.** Tampoco existe uno que compare PPL contra upper/lower a igual
número de días y volumen.

Lo más cercano es Ramos-Campo 2024, que compara split genérico vs full body y **no
encuentra diferencias**. Es decir: la evidencia disponible apunta a que **la
agrupación no importa por sí misma**, no a que agrupar agonistas sea superior.

**Lo que la app le dice literalmente al usuario cuando le propone pecho + hombros:**

> Agrupamos pecho, hombros y tríceps porque comparten el mismo patrón de empuje: el
> press ya trabaja los tres, así que juntarlos evita que el tríceps acabe con más
> volumen del que planeaste. Es una forma ordenada de contar tus series, no una
> combinación mágica: no hay estudios que demuestren que agrupar así dé más músculo
> que repartirlo. Si prefieres otra distribución, cámbiala.

### 4.4 Pre-fatiga: no

**Trindade, Prestes, Oliveira Neto et al. (2019)**, *Frontiers in Physiology* 10:1424.
ECA de 9 semanas. La pre-fatiga **redujo el volumen total entre un 37 % y un 50 %**
a partir de la sexta semana, con fuerza e hipertrofia similares.
https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.01424/full

Su efecto documentado es reducir el volumen de carga, no mejorar el resultado. La
app no la propone.

---

## 5. Orden de los ejercicios

**Nunes, Grgic, Cunha, Ribeiro, Schoenfeld, de Salles & Cyrino (2021)**,
*European Journal of Sport Science* 21(2):149–157. 11 estudios.
https://onlinelibrary.wiley.com/doi/abs/10.1080/17461391.2020.1733672

- Fuerza en multiarticulares: mejor cuando se hacen **primero** (ES 0.32; p = 0.034)
- Fuerza en monoarticulares: mejor cuando se hacen **primero** (ES −0.58; p = 0.032)
- **Hipertrofia: sin efecto del orden (ES 0.03; p = 0.862)**

**Traducción:** lo que pongas primero es lo que más mejora **en fuerza**. Para
**hipertrofia da igual el orden**. Corroborado por Bernárdez-Vázquez et al. (2022),
*Frontiers in Sports and Active Living* 4:949021 — *"gains in muscle hypertrophy are
not influenced by the exercise order"*.
https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.949021/full

**Regla por defecto de la app:** compuestos antes que aislamientos, siguiendo al
ACSM 2009 — porque prioriza la fuerza y porque hacer lo pesado con energía es más
seguro. Pero **el usuario puede reordenar libremente**, y si un músculo concreto es
su prioridad, la app le dice que puede ponerlo primero aunque sea un aislamiento,
sin coste para el crecimiento.

---

## 6. Selección de ejercicios por grupo muscular

Cada ejercicio lleva en la base de datos su `evidence_level`, su `evidence_note`
(la razón, en castellano llano) y su `evidence_source` (la cita). La UI muestra las
tres cosas al tocar el ejercicio.

### Marco general: longitudes musculares largas

El principio de "entrenar el músculo en posición estirada" tiene soporte **real y
consistente en músculos biarticulares concretos** (tríceps cabeza larga,
isquiotibiales, gastrocnemio, recto femoral), donde la posición de la articulación
vecina cambia de verdad la longitud del músculo. Como principio universal está
**menos establecido de lo que sugiere la divulgación**:

- A favor: **Strey, Irigoyen, McMahon & Pinto (2026)**, *Sport Sciences for Health*
  22(1):33. Meta-análisis de 8 estudios: parciales a longitud larga > longitud corta
  (ES 0.283; IC95 % 0.04–0.52; p = 0.036). https://doi.org/10.1007/s11332-025-01586-5
- Matiz: **Wolf et al. (2025)**, *PeerJ* 13:e18904. En 25 sujetos entrenados,
  parciales alargadas ≈ ROM completo. https://doi.org/10.7717/peerj.18904
- Matiz: **Schoenfeld & Grgic (2020)**, *SAGE Open Medicine* 8. ROM completo favorece
  al **tren inferior**; en tren superior la evidencia es **no concluyente**.
  https://doi.org/10.1177/2050312120901559
- En contra (preprints, sin revisión por pares): Varovic et al. (2024),
  https://sportrxiv.org/index.php/server/preprint/view/464 ; Jones et al. (2025),
  https://sportrxiv.org/index.php/server/preprint/view/660

Lo aplicamos donde está medido, no como dogma general.

---

### 6.1 Pecho — evidencia ★☆☆ débil

**Vacío declarado:** no existe ningún ensayo de hipertrofia que compare aperturas vs
press, mancuerna vs barra, o máquina vs peso libre para el pectoral.

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Press en máquina | máquina | compuesto | consenso | Permite llegar cerca del fallo con seguridad y controlar la posición estirada | **Sí — el mejor punto de partida** |
| Press inclinado ~30° | mancuerna/barra | compuesto | hipertrofia | Chaves et al. (2020): mayor aumento del grosor del pecho superior que plano o mixto | Sí (mancuernas) |
| Press de banca plano | barra | compuesto | emg | López-Vivancos et al. (2023), meta-análisis: mayor implicación EMG global del pectoral con agarre 150–200 % de la distancia biacromial | Sí, con supervisión |
| Apertura (pec deck) | máquina | aislamiento | consenso | Carga el pectoral en aducción horizontal estirada; sin ECA que lo compare con el press | Sí |
| Press declinado | barra/máquina | compuesto | emg | López-Vivancos et al. (2023): mayor activación de la porción esternocostal que el horizontal | Opcional |

- Chaves SFN, Rocha-Júnior VA, Encarnação IGA, et al. (2020), *International Journal
  of Exercise Science* 13(6):859–872. https://pubmed.ncbi.nlm.nih.gov/32922646/
  ⚠️ *El aumento reportado en pecho superior (>62 %) es un valor atípico frente al
  resto de la literatura y el estudio no ha sido replicado.*
- Rodríguez-Ridao D, et al. (2020), *IJERPH* 17(19):7339 — la activación máxima del
  pectoral clavicular ocurre a **30°**; por encima sube el deltoides anterior y baja
  el pectoral superior. https://doi.org/10.3390/ijerph17197339
- López-Vivancos A, et al. (2023), *Applied Sciences* 13(8):5203.
  https://doi.org/10.3390/app13085203

### 6.2 Hombros — evidencia ★★☆ moderada (lateral)

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Elevación lateral en máquina | máquina | aislamiento | consenso | La más fácil de estabilizar; sin comparación directa publicada | **Sí** |
| Elevación lateral con mancuerna | mancuerna | aislamiento | hipertrofia | Larsen, Wolf, Schoenfeld et al. (2025): +3.3–4.6 % de grosor del deltoides lateral en 8 semanas | Sí |
| Elevación lateral en polea | polea | aislamiento | hipertrofia | Mismo estudio: **idéntica a la mancuerna** (soporte bayesiano "extremo" a la nula). Elige por preferencia, no por perfil de resistencia | Sí |
| Press militar | barra/mancuerna/máquina | compuesto | consenso | Único movimiento compuesto que lleva el hombro a flexión completa por encima de la cabeza | Sí (sentado, en máquina) |
| Pájaro / reverse pec deck | máquina/mancuerna | aislamiento | hipertrofia | Jones et al. (2025, preprint): CSA del deltoides posterior +12.8–26 % en 10 semanas | **Sí** |
| Face pull | polea | aislamiento | consenso | Recomendado en divulgación basada en EMG; sin datos de hipertrofia comparativa | Sí |

- Larsen S, Wolf M, Schoenfeld BJ, et al. (2025), *Frontiers in Physiology* 16:1611468.
  https://doi.org/10.3389/fphys.2025.1611468
- Campos YAC, et al. (2020), *Journal of Human Kinetics* 75(1):5–14.
  https://doi.org/10.2478/hukin-2020-0033 *(existencia verificada; no reproducimos
  cifras que no pudimos leer directamente)*
- Jones et al. (2025), preprint SportRxiv. https://sportrxiv.org/index.php/server/preprint/view/660

**Nota que la app muestra:** el deltoides **anterior** recibe estímulo sustancial de
todo press horizontal y vertical. Rara vez necesita trabajo aislado adicional.

### 6.3 Bíceps — evidencia ★★☆ buena, con resultados nulos

Aquí la narrativa popular de "longitud larga" **no se sostiene con los datos**.

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Curl predicador (Scott) | máquina/barra | aislamiento | hipertrofia | Kassiano et al. (2025): mayor desarrollo de la **porción distal** del brazo | **Sí — la máquina es la más fácil** |
| Curl inclinado (banco 45°) | mancuerna | aislamiento | hipertrofia | Kassiano et al. (2025): mayor crecimiento en la **porción proximal** | Sí |
| Curl de pie con barra Z | barra | aislamiento | consenso | Permite la mayor carga y progresión. Sin evidencia de superioridad | Sí |
| Curl en polea | polea | aislamiento | hipertrofia | Larsen et al. (2026): manipular el ángulo de extensión de hombro **no cambió nada** (~7–9 % en ambas condiciones) | Sí |

- Kassiano W, Costa B, Kunevaliki G, et al. (2025), *International Journal of Sports
  Medicine* 46(5):334–343. https://doi.org/10.1055/a-2517-0509 — las diferencias
  regionales fueron significativas pero "cuantitativamente modestas".
- Attarieh P, Nunes JP, Khani S, et al. (2025), *EJSS* 25(4):e12279.
  https://doi.org/10.1002/ejsc.12279 — predicador (6–7 %) vs Bayesian cable curl
  (9 %): **sin diferencias significativas**. Los autores concluyen que no hay
  evidencia de que el bíceps se beneficie del entrenamiento a longitudes largas.
- Larsen S, et al. (2026), *Frontiers in Physiology* 17:1750722.
  https://doi.org/10.3389/fphys.2026.1750722

**Lo que la app dice:** elige dos curls que te dejen progresar, uno con el hombro
extendido y otro con el hombro flexionado, y no te obsesiones con el ángulo.

### 6.4 Tríceps — evidencia ★★★ fuerte

Es el grupo con la evidencia más clara del catálogo.

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Extensión por encima de la cabeza | polea/mancuerna | aislamiento | hipertrofia | Maeo et al. (2023), MRI, intra-sujeto: **cabeza larga +28.5 % (overhead) vs +19.6 % (pushdown), p<0.001**; cabezas lateral y medial +14.6 % vs +10.5 %, p=0.002 | Sí (polea o mancuerna a dos manos) |
| Pushdown en polea | polea | aislamiento | hipertrofia | Mismo estudio: sí produce crecimiento, solo que menos. Buen segundo ejercicio | **Sí — el más fácil** |
| Press de banca agarre cerrado | barra | compuesto | consenso | Permite carga alta. Sin ensayo comparativo de hipertrofia | Sí, con supervisión |
| Fondos en máquina asistida | máquina | compuesto | consenso | Sin evidencia comparativa | Sí (asistido) |

- Maeo S, Wu Y, Huang M, et al. (2023), *European Journal of Sport Science* 23(7).
  https://doi.org/10.1080/17461391.2022.2100279 — volumen igualado, mismo rango de
  90°; la única diferencia era la posición del hombro.

**Regla que la app aplica:** si solo haces un ejercicio de tríceps, que sea el de
**por encima de la cabeza**.

### 6.5 Antebrazo — evidencia ☆☆☆ nula

**Vacío declarado, y la app lo dice:** no existe ningún estudio que compare
ejercicios de antebrazo entre sí midiendo hipertrofia, ni sobre volumen o método.
Todo lo siguiente es razonamiento anatómico.

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Curl de muñeca | barra/mancuerna | aislamiento | consenso | El compartimento anterior del antebrazo tiene bastante más masa que el posterior, así que la flexión es la vía más eficiente para el volumen visible | Sí |
| Curl inverso / martillo | barra Z/mancuerna | aislamiento | consenso | Braquiorradial. Sin evidencia comparativa | Sí |
| Extensión de muñeca | barra/mancuerna | aislamiento | consenso | Shiomose et al. (2011): 8 semanas de entrenamiento de extensión aumentaron la fuerza de agarre un 19.2 %. **No midieron hipertrofia por imagen** | Sí |
| Farmer's walk | mancuerna | compuesto | consenso | Trabajo isométrico de agarre; se considera menos eficaz que el trabajo dinámico con ROM completo para hipertrofia | Sí |

- Nuckols, G., *The Evidence-Based Guide to Grip Strength Training & Forearm Muscle
  Development*, Stronger by Science. https://www.strongerbyscience.com/grip/
  (10–12 series semanales repartidas en 2–3 sesiones, 10–25 reps — **recomendación
  del autor, no hallazgo experimental**)

### 6.6 Espalda — evidencia ☆☆☆ nula en comparación de ejercicios

**Vacío declarado:** no existe ningún ensayo de hipertrofia que compare jalón al
pecho vs remo (ni dominadas vs jalón) midiendo el grosor o CSA del dorsal ancho. Es
una de las lagunas más llamativas de la literatura. Solo hay EMG agudo.

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Jalón al pecho | polea | compuesto | consenso | Vector vertical con el dorsal en máxima elongación arriba. Andersen et al. (2014): la anchura de agarre **no** produce diferencias prácticas relevantes | **Sí — el mejor primer ejercicio de espalda** |
| Remo sentado en polea | polea | compuesto | emg | Lehman et al. (2004): 37.1 % CVM del dorsal permitiendo la protracción escapular, por encima de los jalones. *Muestra pequeña, EMG agudo* | Sí |
| Remo con apoyo de pecho | máquina | compuesto | consenso | Quita la demanda de estabilización lumbar | **Sí** |
| Dominadas | peso corporal | compuesto | consenso | Sin evidencia de superioridad sobre el jalón | **No** para principiante absoluto — usar asistida |
| Remo con barra | barra | compuesto | consenso | Mayor demanda de estabilización lumbar | No inicialmente |
| Pullover en polea | polea | aislamiento | consenso | Aísla la extensión de hombro sin implicar el codo | Sí |
| Encogimientos (trapecio) | barra/mancuerna | aislamiento | emg | Ekstrom et al. (2003): mayor actividad EMG del trapecio superior de todos los ejercicios comparados | Sí |

- Lehman GJ, Buchan DD, Lundy A, et al. (2004), *Dynamic Medicine* 3:4.
  https://link.springer.com/article/10.1186/1476-5918-3-4
- Ekstrom RA, Donatelli RA, Soderberg GL (2003), *JOSPT* 33(5):247–258.
  https://doi.org/10.2519/jospt.2003.33.5.247
- Andersen V, et al. (2014), *JSCR*. https://pubmed.ncbi.nlm.nih.gov/24662157/

### 6.7 Abdominales — evidencia ☆☆☆ nula en hipertrofia

**Vacío declarado:** no encontramos ningún ensayo de hipertrofia (ecografía/MRI) que
compare ejercicios abdominales entre sí. La literatura existente es EMG aguda y
estudios de dolor lumbar. **Es el grupo con la ordenación menos fundamentada.**

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Crunch (con o sin lastre) | peso corporal/polea | aislamiento | emg | Stenger et al. (2014), estudio ACE: mayor activación del recto abdominal (**68.4 % CVM**); ningún otro ejercicio comparado la superó | Sí |
| Elevación de rodillas en silla romana | máquina | aislamiento | emg | Stenger et al. (2014): supera al crunch en oblicuo externo | Sí |
| Rueda abdominal | rueda | compuesto | emg | Stenger et al. (2014): entre los que superan al crunch en oblicuo externo. También carga el abdomen en posición alargada | No para principiante absoluto (empezar de rodillas) |
| Crunch en banco declinado | banco | aislamiento | emg | Stenger et al. (2014): supera al crunch plano en oblicuo externo | Sí |
| Plancha frontal | peso corporal | isométrico | emg | En el estudio de ACE quedó **por debajo** del crunch para recto abdominal. Es estabilidad, **no** una herramienta prioritaria de hipertrofia | Sí |

- Stenger E, Porcari JP, Camic C, Kovacs A, Foster C (2014), *ACE ProSource* —
  American Council on Exercise / Univ. Wisconsin–La Crosse.
  https://contentcdn.eacefitness.com/certifiednews/images/article/pdfs/ACE%20AbsStudy.pdf

### 6.8 Cuádriceps — evidencia ★★★ buena

**Hallazgo clave: el recto femoral y los vastos responden a ejercicios distintos.**

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Extensión de rodilla | máquina | aislamiento | hipertrofia | Zabaleta-Korta et al. (2021): **la sentadilla no aumentó el recto femoral en ningún sitio; la extensión sí en los tres.** El recto femoral necesita trabajo aislado | **Sí — el más seguro** |
| Prensa de piernas 45° | máquina | compuesto | hipertrofia | Alternativa segura a la sentadilla, con hipertrofia comparable | **Sí** |
| Sentadilla profunda (~120°) | barra/Smith | compuesto | hipertrofia | Bloomquist et al. (2013): profunda (0–120°) **+4–7 % más CSA del muslo anterior** que superficial (0–60°), con volumen igualado | Sí — empezar con goblet o prensa |
| Extensión de rodilla con cadera extendida (~40°) | máquina reclinada | aislamiento | hipertrofia | Larsen et al. (2025): evidencia bayesiana "extrema" a favor de **más hipertrofia del recto femoral a 40° de flexión de cadera** que a 90° | Sí |
| Sentadilla búlgara | mancuerna | compuesto | consenso | Sin ensayo comparativo localizado | No inicialmente (equilibrio) |

- Bloomquist K, Langberg H, Karlsen S, et al. (2013), *Eur J Appl Physiol*
  113(8):2133–2142. https://doi.org/10.1007/s00421-013-2642-7
- Zabaleta-Korta A, et al. (2021), *Journal of Sports Sciences* 39(20):2298–2304.
  https://doi.org/10.1080/02640414.2021.1929736
- Larsen S, et al. (2025), *Journal of Sports Sciences*.
  https://doi.org/10.1080/02640414.2024.2444713
- Kassiano W, et al., *JSCR*. https://doi.org/10.1519/JSC.0000000000005338

**Matiz sobre profundidad:** Kubo, Ikebukuro & Yata (2019), *Eur J Appl Physiol*
119:1933–1942 (https://doi.org/10.1007/s00421-019-04181-y) encontraron que sentadilla
completa y media producen **el mismo crecimiento del cuádriceps** (4.9 % vs 4.6 %); la
ventaja de la profundidad apareció en glúteo y aductores. Bloomquist sí encontró
ventaja en el muslo anterior. **Consenso resultante: llegar al menos a ~90–100° de
flexión de rodilla; más profundidad beneficia sobre todo a cadera y aductores.**

### 6.9 Glúteos — evidencia ★★☆ buena

**Hallazgo contraintuitivo: el hip thrust NO es superior a la sentadilla.**

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Hip thrust con barra | barra/máquina | compuesto | hipertrofia | Plotkin et al. (2023): hipertrofia del glúteo **similar** a la sentadilla. Krause Neto et al. (2025): destaca por ser **específico del glúteo**, y el ROM completo supera al parcial | **Sí — muy fácil de aprender** |
| Sentadilla profunda | barra/máquina | compuesto | hipertrofia | Kubo et al. (2019): completa **+6.7 %** de volumen del glúteo mayor vs **+2.2 %** en media sentadilla. Plotkin (2023): iguala al hip thrust en glúteo **y además** añade +3.6 cm² de cuádriceps | Sí (goblet/prensa primero) |
| Prensa de piernas 45° | máquina | compuesto | hipertrofia | Krause Neto et al. (2025): hipertrofia del glúteo comparable al rango completo | **Sí** |
| Extensión de cadera de rodillas / patada en polea | máquina/polea | aislamiento | hipertrofia | Krause Neto et al. (2025): aumentó el grosor del **glúteo superior**. Efecto moderado | Sí |
| Step-up | cajón + mancuernas | compuesto | emg | Krause Neto et al. (2020): mayor activación del glúteo mayor de la revisión (125.1 % CVIM). **Sin datos longitudinales** | Sí (peso corporal) |

- Plotkin DL, Rodas MA, Vigotsky AD, et al. (2023), *Frontiers in Physiology*
  14:1279170. https://doi.org/10.3389/fphys.2023.1279170
- Krause Neto W, Vieira Krause TL, Gama EF (2025), *Frontiers in Physiology*
  16:1542334. https://doi.org/10.3389/fphys.2025.1542334
- Krause Neto W, et al. (2020), *J Sports Sci Med* 19(1):195–203.
  https://www.jssm.org/jssm-19-195.xml

*Nota:* Plotkin (2023) encontró **poco o ningún crecimiento del glúteo medio/menor**
ni con hip thrust ni con sentadilla. Si se buscan, harían falta abducciones
específicas — pero eso **no está respaldado por ensayos comparativos**.

### 6.10 Isquiotibiales (femorales) — evidencia ★★★ fuerte

**Hallazgo clave: la hipertrofia de isquios es MUY específica del ejercicio.**

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Curl femoral **sentado** | máquina | aislamiento | hipertrofia | Maeo et al. (2021), MRI, intra-sujeto, 12 semanas: **sentado +14.1 % vs tumbado +9.3 %**. Bíceps femoral cabeza larga **+14.4 % vs +6.5 %** (más del doble). La cadera flexionada mantiene los biarticulares en longitud larga | **Sí — muy fácil** |
| Peso muerto rumano | barra/mancuerna | compuesto | hipertrofia | Cubre el patrón de cadera, que el curl no cubre. Morin et al.: mayor crecimiento del semimembranoso que el nórdico | No para principiante absoluto sin técnica supervisada |
| Extensión de cadera a 45° | banco 45° | compuesto | hipertrofia | Bourne et al.: superó al nórdico para cabeza larga del bíceps femoral y semimembranoso | Sí (peso corporal) |
| Curl femoral tumbado | máquina | aislamiento | hipertrofia | Funciona, pero es **la peor variante de curl** (Maeo 2021). Útil como complemento | Sí |
| Curl nórdico | peso corporal | aislamiento | hipertrofia | Maeo et al. (2024): produce crecimiento (+11 %) pero **selectivo** hacia los flexores de rodilla que NO extienden la cadera. Complemento, no base | **No** — muy exigente |

- Maeo S, Huang M, Wu Y, et al. (2021), *MSSE* 53(4):825–837.
  https://doi.org/10.1249/MSS.0000000000002523
- Maeo S, Balshaw TG, Nin DZ, et al. (2024), *MSSE* 56(10):1893–1905.
  https://doi.org/10.1249/MSS.0000000000003490 — entrenamiento excéntrico en estado
  alargado **+18 % vs +11 %** del nórdico; cabeza larga del bíceps femoral
  **+19 % vs +5 %**.
- Nuckols, G., *Exercise selection for the hamstrings*, Stronger by Science
  (recopila Bourne y Morin). https://www.strongerbyscience.com/exercise-selection-hamstrings/

**Regla que la app aplica:** combina **un movimiento de cadera** (RDL o extensión a
45°) con **un curl femoral sentado**. Eso cubre ambos patrones y todas las cabezas.

### 6.11 Pantorrilla — evidencia ★★★ fuerte

| Ejercicio | Equipo | Tipo | Nivel | Razón | Principiante |
| --- | --- | --- | --- | --- | --- |
| Elevación de talón **de pie** | máquina/Smith | aislamiento | hipertrofia | Kinoshita, Maeo et al. (2023), MRI, intra-sujeto: **gastrocnemio lateral +12.4 % (de pie) vs +1.7 % (sentado); medial +9.2 % vs +0.6 %.** La condición sentada **no** produjo hipertrofia significativa del gastrocnemio | **Sí** |
| Elevación de talón de pie enfatizando el rango estirado | máquina/escalón | aislamiento | hipertrofia | Kassiano et al. (2023): ROM estirado (−25° a 0°) **+15.2 %** vs ROM completo **+6.7 %** vs ROM acortado **+3.4 %** (p≤0.009) | Sí |
| Calf press en prensa | máquina | aislamiento | consenso | Rodilla extendida → equivalente funcional a la variante de pie. Sin ensayo específico | **Sí — muy fácil de controlar** |
| Elevación de talón **sentado** | máquina | aislamiento | hipertrofia | Mismo estudio: sóleo **+2.9 % (sentado) vs +2.1 % (de pie), sin diferencia significativa (p=0.410)**. No es superior para el sóleo; es la forma de trabajarlo cuando el gastrocnemio ya está fatigado | Sí |

- Kinoshita M, Maeo S, Kobayashi Y, et al. (2023), *Frontiers in Physiology* 14:1272106.
  https://doi.org/10.3389/fphys.2023.1272106
- Kassiano W, Costa B, Kunevaliki G, et al. (2023), *JSCR* 37(9):1746–1753.
  https://doi.org/10.1519/JSC.0000000000004460

**Regla que la app aplica:** de pie primero, enfatizando el rango estirado (talón por
debajo del nivel del pie). El sentado es volumen extra para el sóleo, no la base.

---

## 7. La sesión de cardio de baja intensidad

El usuario pidió una sesión de cardio de baja intensidad **al inicio o al final,
independientemente de si quiere subir o bajar de peso**, y preguntó por qué eso trae
beneficios. La respuesta honesta tiene tres partes: lo que sí está demostrado, lo
que no, y el riesgo real de interferencia.

### 7.1 Por qué sí, independientemente del objetivo de peso

**La capacidad cardiorrespiratoria predice la mortalidad tan bien como los factores
de riesgo clásicos.** Este es el argumento más fuerte, y no tiene nada que ver con
la báscula.

**Mandsager K, Harb S, Cremer P, Phelan D, Nissen SE, Jaber W (2018)**,
*JAMA Network Open* 1(6):e183605. n = 122.007, seguimiento mediano 8.4 años.
https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428

- Élite vs bajo rendimiento: **HR 0.20 (0.16–0.24), p < 0.001**
- Élite vs alto: HR 0.77 (0.63–0.95), p = 0.02 → **no hay techo aparente de beneficio**
- Comparación en la misma cohorte: tabaquismo HR 1.41; diabetes 1.40; enfermedad
  coronaria 1.29; hipertensión 1.21. **Estar en el cuartil bajo de capacidad
  cardiorrespiratoria conllevó un riesgo comparable o mayor que fumar.**

**Cualquier actividad, incluso ligera, se asocia a menor mortalidad.**

**Ekelund U, Tarp J, Steene-Johannessen J, et al. (2019)**, *BMJ* 366:l4570.
n = 36.383, actividad medida por acelerómetro. https://www.bmj.com/content/366/bmj.l4570
Actividad **ligera**, cuartil más alto vs más bajo: **HR 0.38 (0.28–0.51)**.
Moderada-vigorosa: HR 0.52. *"Any physical activity, regardless of intensity, was
associated with lower risk of mortality."*

**Y el beneficio se estabiliza pronto — no hace falta mucho.**

**Arem H, Moore SC, Patel A, et al. (2015)**, *JAMA Internal Medicine* 175(6):959–967.
n = 661.137, 116.686 muertes, seguimiento mediano 14.2 años.
https://pure.johnshopkins.edu/en/publications/leisure-time-physical-activity-and-mortality-a-detailed-pooled-an-3/
HR frente a inactividad: <1× el mínimo recomendado 0.80; 1–2× 0.69; **3–5× 0.61**;
≥10× 0.69 (sin daño). **Cumplir el mínimo ya captura casi todo el beneficio.**

**Recomendación base — OMS (2020)**, *WHO Guidelines on Physical Activity and
Sedentary Behaviour*. https://www.ncbi.nlm.nih.gov/books/NBK566046/
Adultos 18–64: **150–300 min/semana de intensidad moderada** (recomendación fuerte,
certeza moderada) **más fortalecimiento muscular ≥2 días/semana**.

**Densidad capilar — la única ventaja fisiológica específica del cardio continuo.**

**Mølmen KS, Almquist NW, Skattebo Ø (2025)**, *Sports Medicine* 55(1).
https://link.springer.com/article/10.1007/s40279-024-02120-2
Capilares por fibra: continuo +15 %, HIIT +13 %, SIT +10 %. **La densidad capilar
(por mm²) aumentó solo tras el continuo y el HIIT, con el continuo superior.** Las
ganancias ocurren sobre todo en las primeras <4 semanas.

### 7.2 Lo que NO está demostrado, y la app no afirma

**El "cardio de recuperación" está mal respaldado.** Esto es importante porque es la
justificación que más se repite en el gimnasio.

- **Dupuy O, Douzi W, Theurot D, Bosquet L, Dugué B (2018)**, *Frontiers in
  Physiology* 9:403. 99 estudios. Recuperación activa:
  agujetas SMD **−0.94** (efecto pequeño-moderado, significativo);
  **fatiga percibida 0.64 — no significativo**;
  **creatina quinasa — no significativo**; **marcadores inflamatorios — no
  significativo**. Por comparación, el masaje logró −2.26 en agujetas.
  https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.00403/full
- **Tufano JJ, Brown LE, Coburn JW, et al. (2012)**, *JSCR* 26(10):2777–2782.
  Ciclismo moderado vs ligero vs reposo tras ejercicio excéntrico: **sin diferencias
  significativas en dolor ni en fuerza dinámica**.
  https://journals.lww.com/nsca-jscr/fulltext/2012/10000/effect_of_aerobic_recovery_intensity_on.22.aspx

→ No hay ningún estudio que demuestre que el cardio ligero mejore el rendimiento en
la siguiente sesión de fuerza. El aclaramiento de lactato sí es más rápido con
recuperación activa, pero **el lactato no causa las agujetas ni la fatiga entre
sesiones** — ese mecanismo está obsoleto. La app no lo usa como argumento.

**La "zona 2" no tiene un estatus especial.** Storoschuk KL, Moran-MacDonald A,
Gibala MJ, Gurd BJ (2025), *Sports Medicine*: *"current evidence does not support
Zone 2 training as the optimal intensity for improving mitochondrial or fatty acid
oxidative capacity."* https://link.springer.com/article/10.1007/s40279-025-02261-y

**No se puede extrapolar la prevención de lesiones del FIFA 11+ al gimnasio.** Ese
programa reduce lesiones un 30–46 % en futbolistas (Patel & Shah 2025, *Cureus*,
https://pmc.ncbi.nlm.nih.gov/articles/PMC12856364/), pero es un programa
neuromuscular completo, no "10 minutos de bici". **No encontramos evidencia de que
el calentamiento aeróbico general reduzca lesiones en entrenamiento de fuerza.**

**Casi toda la evidencia de mortalidad es observacional** (cohortes, no ensayos). La
causalidad inversa y la confusión residual no pueden descartarse del todo.

### 7.3 El efecto de interferencia — el matiz honesto

- **Wilson JM, Marin PJ, Rhea MR, et al. (2012)**, *JSCR* 26(8):2293–2307.
  Meta-análisis clásico. ES hipertrofia: solo fuerza 1.23 vs concurrente 0.85.
  Correlaciones: **duración de la sesión de cardio vs hipertrofia r = −0.75**;
  frecuencia vs hipertrofia r = −0.26. Correr produjo decrementos (ES 0.68);
  **pedalear no mostró decrementos significativos**.
  https://journals.lww.com/nsca-jscr/fulltext/2012/08000/concurrent_training__a_meta_analysis_examining.35.aspx
- **Schumann M, Feuerbacher JF, Sünkeler M, et al. (2022)**, *Sports Medicine*
  52(3):601–612. **43 estudios, 1.090 participantes** — el mejor cuerpo de evidencia
  disponible: https://link.springer.com/article/10.1007/s40279-021-01587-7

  | Desenlace | Estudios / n | SMD (IC 95 %) | p | Lectura |
  | --- | --- | --- | --- | --- |
  | Fuerza máxima | 37 / 967 | −0.06 (−0.20 a 0.09) | 0.446 | **Sin interferencia** |
  | Hipertrofia | 15 / 389 | −0.01 (−0.16 a 0.18) | 0.919 | **Sin interferencia** |
  | Fuerza explosiva | 18 / 478 | **−0.28 (−0.48 a −0.08)** | **0.007** | **Interferencia real** |

  Y el hallazgo que más importa para el diseño: la interferencia en fuerza explosiva
  fue significativa **en la misma sesión (p = 0.043)**, pero **separando ≥3 horas
  desapareció (p > 0.05)**. Modalidad (bici vs correr): sin diferencia. Frecuencia
  (>5 vs <5 sesiones/sem): sin diferencia.

  ⚠️ Schumann señala explícitamente que **NO confirma** la relación negativa de
  Wilson entre duración/frecuencia del cardio e hipertrofia. El umbral de volumen del
  que todo el mundo habla descansa sobre un solo meta-análisis de 2012 que el más
  grande y reciente no replicó.
- **Eddens L, van Someren K, Howatson G (2018)**, *Sports Medicine* 48(1):177–188.
  10 estudios. Orden intra-sesión: **fuerza→cardio aporta +6.91 % en fuerza dinámica
  del tren inferior (p = 0.006)**; sin ventaja del orden para **hipertrofia
  (p = 0.40)** ni VO2max (p = 0.83).
  https://link.springer.com/article/10.1007/s40279-017-0784-1
- **Held S, Wolf L, Rappelt L, et al. (2026)**, *Sports Medicine*, revisión paraguas:
  **sin interferencia sustancial**. Hipertrofia y potencia comparables al
  entrenamiento de fuerza solo; adaptaciones de fuerza significativamente mayores que
  el aeróbico solo (SMD 0.59; p < 0.001).
  https://link.springer.com/article/10.1007/s40279-026-02401-y
- **Markov A, Chaabene H, Hauser L, et al. (2022)**, *Sports Medicine* 52(6). Efecto
  **agudo** del cardio inmediatamente previo a las pesas:
  https://link.springer.com/article/10.1007/s40279-021-01615-6

  | Condición | SMD | p |
  | --- | --- | --- |
  | Fuerza global | 0.79 (descenso moderado) | 0.003 |
  | **Baja intensidad** | 0.65 | **0.157 (no significativo)** |
  | Moderada-alta intensidad | 0.65 | 0.020 |
  | **≤30 min** | 0.59 | 0.013 |
  | **>30 min** | **1.02 (descenso grande)** | 0.049 |

  → Si el cardio va antes, **baja intensidad y corto**. Es el único subgrupo que no
  mostró deterioro significativo de la fuerza.

**No existe un umbral de volumen establecido para la interferencia.** Cualquier cifra
concreta que circule ("no más de 3 sesiones de 30 min") es extrapolación práctica.

### 7.4 Lo que la app propone y por qué

| Colocación | Duración | Intensidad | Justificación |
| --- | --- | --- | --- |
| **Al final** (por defecto) | 15–25 min | Test del habla en verde | Eddens 2018: fuerza primero aporta +6.91 % en fuerza dinámica del tren inferior (p=0.006), sin coste para la hipertrofia |
| **Al inicio** (calentamiento) | 5–10 min | Muy suave | Markov 2022: la baja intensidad fue el único subgrupo sin deterioro significativo de la fuerza (p=0.157), y ≤30 min mucho mejor que >30 min |
| **En otro momento del día** (ideal) | 20–40 min | Verde | Schumann 2022: **≥3 h de separación elimina la interferencia** sobre la fuerza explosiva |

**Cómo medimos la intensidad: el test del habla, no el % de FCmáx.**

| Zona | Cómo se siente |
| --- | --- |
| 🟢 Verde | Puedes hablar en frases completas y cómodas. **Aquí es donde queremos estar.** |
| 🟡 Amarillo | "Sí, pero..." — puedes hablar, pero te cuesta. Estás en el umbral ventilatorio |
| 🔴 Rojo | No puedes mantener una conversación |

Preferimos el test del habla al porcentaje de frecuencia cardíaca porque se basa en
la respuesta ventilatoria individual y no en una fórmula poblacional: la estimación
FCmáx = 220 − edad tiene un error estándar amplio (±10–12 lpm), así que las zonas
derivadas son solo orientativas.
— Foster & Porcari, Univ. Wisconsin–La Crosse, vía ACE:
https://www.acefitness.org/certifiednewsarticle/888/
— American Heart Association, moderada 50–70 % FCmáx:
https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates

**Lo que la app le dice literalmente al usuario:**

> El cardio suave está aquí por tu corazón, no por tu peso. Tener buena capacidad
> cardiorrespiratoria se asocia a menos mortalidad con una fuerza comparable a la de
> no fumar (Mandsager 2018), y eso vale igual si estás en volumen o en déficit.
> Lo ponemos al final porque hacer las pesas primero conserva algo más de fuerza en
> el tren inferior. Y no, no acelera tu recuperación: eso se repite mucho pero no
> está demostrado.

### 7.5 Calentamiento

- **El calentamiento aeróbico general no tiene efecto demostrado sobre el rendimiento
  de fuerza.** La literatura es inconclusa: Abad et al. (2011) a favor; Rodrigues et
  al. (2020) y Ribeiro & Romanzini (2014) sin diferencias.
  Ribeiro AS, et al. (2021), IntechOpen: *"there is still little agreement on what
  should be the best warm-up."* https://www.intechopen.com/chapters/75109
- **Lo que sí tiene mejor respaldo es el calentamiento específico**: series de
  aproximación con el propio ejercicio, hasta ~80 % de la carga de trabajo
  (Ribeiro et al. 2020). La app lo incluye por defecto.
- **Estiramiento estático:** el miedo está exagerado. **Chaabene H, Behm DG, Negra Y,
  Granacher U (2019)**, *Frontiers in Physiology* 10:1468 —
  ≤60 s por músculo: deterioro **trivial del 1–2 %**; >60 s: **4.0–7.5 %**. Integrado
  en un calentamiento completo, el estiramiento corto no reduce el rendimiento de
  forma relevante. https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.01468/full
- **RAMP** (Jeffreys 2007) es un **modelo conceptual de práctica profesional**
  publicado en una revista de divulgación técnica, **no un protocolo validado en
  ensayos controlados**. Lo usamos como marco organizativo y lo etiquetamos como tal.

---

## 9. Descansos: entre series y al cambiar de ejercicio

### 9.1 Entre series

**Schoenfeld, Pope, Benik et al. (2016). "Longer Interset Rest Periods Enhance Muscle
Strength and Hypertrophy in Resistance-Trained Men". *Journal of Strength and
Conditioning Research* 30(7):1805–1812.**
https://journals.lww.com/nsca-jscr/fulltext/2016/07000/longer_interset_rest_periods_enhance_muscle.3.aspx

21 hombres entrenados, 8 semanas, 3 sesiones/semana. Descanso de **1 min** contra **3 min**:

| Medida | 1 min | 3 min |
| --- | --- | --- |
| Tríceps (grosor) | menor | **+7.0 %** |
| Bíceps (grosor) | sin aumento significativo | **+5.4 %** |
| Cuádriceps anterior | menor | **+13.3 %** |
| Vasto lateral | menor | **+11.5 %** |
| Press banca 1RM | menor | **+12.7 %** |
| Sentadilla 1RM | **+7.6 %** | **+15.2 %** |

**Grgic, Schoenfeld, Skrepnik, Davies & Mikulic (2017). "Effects of Rest Interval
Duration in Resistance Training on Measures of Muscular Strength: A Systematic Review".
*Sports Medicine* 47:1803–1817.** https://fitgreystrong.com/wp-content/uploads/2019/07/grgic2017.pdf

23 estudios, 491 participantes. En **entrenados** hacen falta **>2 min** para maximizar
la fuerza; en **no entrenados**, **60–120 s** bastan. Los autores añaden que descansos
cortos generan más incomodidad justamente en los multiarticulares (sentadilla, prensa).

**Schoenfeld et al. (2024). "Give it a rest: a systematic review with Bayesian
meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy".
*Frontiers in Sports and Active Living*.**
https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full

9 estudios, 19 mediciones. Corto (≤60 s) contra largo (>60 s): muslo 0.17
(ICr 95 % −0.13 a 0.43), brazo 0.13 (ICr 95 % −0.27 a 0.51), ambos a favor del largo
pero con el intervalo cruzando el cero. Los autores concluyen que hay *"un beneficio
hipertrófico pequeño de descansar más de 60 segundos"* y —clave para el diseño—
**no detectaron diferencias apreciables al descansar más de 90 s**.

**Cómo se resuelve la aparente contradicción.** No es contradicción: son dos cosas
distintas. Para **hipertrofia**, 90 s ya captura el beneficio (Schoenfeld 2024). Para
**fuerza máxima**, y para no perder repeticiones en las últimas series de un compuesto
pesado, hacen falta 2–3 min (Schoenfeld 2016; Grgic 2017).

**La app entrena hipertrofia**, así que el valor por defecto entre series es **90 s**,
que es lo que esa evidencia sostiene. El matiz se muestra en el constructor, no se
esconde: en un compuesto pesado el descanso corto resta fuerza en las series 3 y 4, y
menos fuerza ahí significa menos volumen de calidad. Si al usuario se le caen mucho las
repeticiones de la primera a la última serie, subirlo a 2 min es razonable — por eso
todos los descansos son editables.

**Valores que usa la app** (`exercises.default_rest_seconds`, migración 00013):

| Tipo | Entre series | Al cambiar de ejercicio |
| --- | --- | --- |
| Compuestos | **90 s** | **3 min** |
| Aislamientos | **90 s** | **2 min** |
| Cardio | — | — |

### 9.2 Al cambiar de ejercicio

**Vacío declarado.** No encontramos ningún estudio que investigue el descanso *entre
ejercicios* como variable propia. Toda la literatura de arriba mide el descanso *entre
series del mismo ejercicio*.

Lo que hace la app, y lo dice tal cual: 2–3 minutos, porque en la práctica hay que
montar la máquina, cambiar discos o esperar a que se libere el equipo, y ese tiempo se
va de todos modos. **Es criterio práctico, no evidencia.**

## 10. Agarres, accesorios y dificultad de ejecución

### 10.1 Lo que NO existe (y la app lo dice)

Esta sección empieza por los vacíos porque son el hallazgo principal.

- **Barra Z contra barra recta en el curl: cero estudios.** Se buscó con cinco
  formulaciones distintas. No hay ni un trabajo revisado por pares que las compare en
  activación, biomecánica, hipertrofia o molestia. Tampoco existe ningún estudio que
  cuantifique el estrés en muñeca o codo por la supinación forzada de la barra recta.
  La preferencia por la Z es real y extendida, pero **es confort, no evidencia**, y así
  se etiqueta en la app.
- **Accesorios del pushdown (cuerda, barra en V, barra recta): cero estudios de
  hipertrofia.** El único dato de EMG es Boehler (2011), una **tesis de máster** que
  **no comparó cuerda contra barra estadísticamente**: 74 % ± 22.6 frente a 67 % ± 20.5,
  con una desviación mayor que la diferencia.
  https://www.krigolsonteaching.com/uploads/4/3/8/4/43848243/sampleemg-triceps.pdf
- **Anchura de agarre e hipertrofia a largo plazo: cero estudios**, ni en press de
  banca, ni en jalón, ni en remo. Todo lo publicado es activación y fuerza agudas.
- **Elevación frontal contra press para el deltoides anterior: cero estudios
  comparativos**, ni de EMG ni de crecimiento.
- **Clasificación publicada de dificultad técnica de ejercicios: no existe.** Ni ACSM,
  ni NSCA, ni en revistas. Las etiquetas del catálogo son **criterio editorial**.

### 10.2 Lo que sí está medido sobre agarres

**Coratella, Tornatore, Longo, Esposito & Cè (2023)**, *Sports* 11(3):64.
https://www.mdpi.com/2075-4663/11/3/64
10 culturistas, curl en polea a 8-RM. Fase concéntrica, bíceps braquial: **supinado
supera al pronado en un 19 % ± 7 y al neutro en un 12 % ± 9**. En la fase excéntrica no
hubo diferencias entre agarres.

> ⚠️ **Dato que contradice la creencia popular:** en ese mismo estudio el agarre
> **supinado también excitó más el braquiorradial** que el neutro. La idea de que "el
> curl martillo es el ejercicio del braquiorradial" **no está respaldada**. La app lo
> avisa en la ficha del curl martillo en vez de repetir el mito.

**Villalba, Fujita, Iossi Junior & Gomes (2024)**, *International Journal of Strength
and Conditioning* 4(1). https://journal.iusca.org/index.php/Journal/article/view/250
En el pushdown, el antebrazo supinado con agarre rígido activó más la cabeza larga
(p<0.001) — **pero se completaron significativamente menos repeticiones** (p<0.001).
Más activación por serie y menos volumen tolerado: el balance neto es desconocido.

**Saeterbakken, Stien, Pedersen, Solstad, Cumming & Andersen (2021)**, *IJERPH*
18(12):6444. https://www.mdpi.com/1660-4601/18/12/6444
Press de banca con tres anchuras: **el pectoral se activa igual en las tres**. El agarre
estrecho mueve un 7–8 % menos peso; el ancho reduce el tríceps y sube el bíceps.

**Andersen, Fimland, Wiik, Skoglund & Saeterbakken (2014)**, *JSCR* 28(4):1135–1142.
https://journals.lww.com/nsca-jscr/fulltext/2014/04000/effects_of_grip_width_on_muscle_strength_and.35.aspx
Jalón al pecho: **activación del dorsal similar entre 1× y 2× la anchura de hombros**, y
los autores esperan explícitamente hipertrofia parecida en ese rango.

### 10.3 El patrón que emerge, y que la app aplica

En **los cuatro casos** donde existe hipertrofia medida por MRI o ecografía comparando
variantes del mismo ejercicio —tríceps (Maeo 2023), isquiotibiales (Maeo 2021),
gemelos (Kinoshita 2023) y bíceps (Kassiano 2025)— la variable determinante fue siempre
**la longitud muscular**, es decir el ángulo de la articulación de al lado. **Nunca el
implemento, el accesorio ni la anchura del agarre.**

Por eso la app ordena su catálogo por posición articular y trata los agarres como lo que
son: comodidad y capacidad de carga.

### 10.4 Dificultad de ejecución

La etiqueta es editorial, pero la decisión de recomendar máquinas a quien empieza **sí
está respaldada**, y con lo mejor que hay:

**Haugen, Vårvik, Larsen, Haugen, van den Tillaar & Bjørnsen (2023)**, *BMC Sports
Science, Medicine and Rehabilitation* 15:103.
https://link.springer.com/article/10.1186/s13102-023-00713-4
Meta-análisis de máquinas contra peso libre: **hipertrofia sin diferencia significativa
(SMD −0.055, p = 0.751)**; fuerza sin diferencia cuando cada modalidad se evalúa en su
propio formato (SMD 0.084, p = 0.387). Los autores reconocen que las máquinas pueden ser
más seguras por su menor exigencia técnica.

→ **Empezar en máquina no cuesta absolutamente nada en resultados.** Es la afirmación
más útil de toda esta sección.

**ACSM (2009)**, Position Stand: para principiantes se incluyen **tanto pesos libres
como máquinas** (Evidencia A), y se recomienda empezar al **50–60 % de 1RM** porque
aprender la técnica es prioritario.

**Fisher, Steele, Wolf, Androulakis Korakakis, Smith & Giessing (2022)**, *IJSC* 2(1).
https://journal.iusca.org/index.php/Journal/article/view/101
Efecto moderado de la supervisión sobre la fuerza: **0.40 (IC 95 % 0.06–0.74)**;
despreciable sobre composición corporal. ⚠️ No distingue por nivel de experiencia, así
que no se puede afirmar que beneficie específicamente a los novatos.

**Cómo se aplica en la app.** El nivel viene de `user_profiles.knowledge_level`, que ya
se recogía en el onboarding y **nunca se leía de vuelta**. Ahora:
- El constructor sustituye el ejercicio propuesto por la plantilla si pide más técnica
  de la que el usuario declaró, eligiendo el mejor del mismo grupo que sí encaje.
- La hoja de cambio ordena poniendo primero lo apropiado, **sin esconder el resto**, con
  una línea que explica por qué los demás están abajo.
- Cada ejercicio muestra su etiqueta y, al desplegarlo, qué significa.

## 11. Series al fallo, rango de repeticiones y calentamiento

Esta sección respalda cuatro decisiones de la pantalla de entrenamiento: marcar la
serie 1 como calentamiento y las 3 siguientes como series al fallo, poder saltar el
calentamiento, avisar al llegar a 12 repeticiones, y el suelo de 8 repeticiones.

### 11.1 ¿Hay que llegar al fallo?

**Sí, o muy cerca, si el objetivo es hipertrofia. No, si el objetivo es fuerza.**

La mejor evidencia disponible es una serie de meta-regresiones sobre la relación
dosis-respuesta entre la cercanía al fallo (medida en repeticiones en reserva, RIR) y
los resultados. El hallazgo tiene dos mitades que casi nunca se cuentan juntas:

- **Hipertrofia**: la pendiente de RIR es negativa y su intervalo de confianza no
  incluye el cero. Traducido: cuanto más cerca del fallo, más crecimiento. Es el
  respaldo directo de la decisión del usuario.
- **Fuerza**: el intervalo de confianza de la pendiente **sí** incluye el cero — la
  relación es despreciable. Se gana fuerza igual dejando repeticiones en reserva.

Los autores concluyen que la cercanía óptima al fallo **difiere** según el objetivo, y
piden cautela porque el RIR se estimó de forma heterogénea entre estudios.

> Robinson et al. (2024), *Sports Medicine*. "Exploring the Dose–Response Relationship
> Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle
> Hypertrophy: A Series of Meta-Regressions."
> https://link.springer.com/article/10.1007/s40279-024-02069-2

**El matiz que la app sí debe decir: el fallo no sale gratis.**

Morán-Navarro et al. midieron el curso temporal de la recuperación con y sin llegar al
fallo. Sin fallo, la recuperación mecánica se completa entre las 6 y las 48 h. **Con
fallo, se extiende a 48–72 h**: el salto vertical no volvió a los valores previos hasta
las 72 h, la creatina quinasa siguió elevada a las 6 y 24 h, y el amonio solo se
mantuvo alto en la condición de fallo.

> Morán-Navarro et al. "Time course of recovery following resistance training leading or
> not to failure."
> https://paulogentil.com/pdf/Time%20course%20of%20recovery%20following%20resistance%20training%20leading%20or%20not%20to%20failure.pdf

Por eso el split de la app no repite músculo en 24 h. Con 3 series al fallo por
ejercicio, ese margen deja de ser un lujo y pasa a ser el mínimo.

**Y el matiz que juega a favor del planteamiento para principiantes:** la gente no es
buena estimando cuánto le queda. Un estudio con sujetos novatos y experimentados
encontró que **ambos grupos se quedan cortos**: al apuntar a 1 RIR, los experimentados
pararon a −1.00 reps del fallo real y los novatos a −1.31; al apuntar a 3 RIR, a −1.19
y −1.25. No hubo diferencias significativas entre grupos.

> "Objective Accuracy in Estimating Repetitions in Reserve in the Back Squat: An
> Analysis between Experienced vs. Novice Subjects."
> https://pmc.ncbi.nlm.nih.gov/articles/PMC13215226/

Consecuencia de diseño: decirle a un principiante "para a 2 de fallo" hace que en
realidad pare a 3 o 4, que es donde la señal de hipertrofia se debilita. Decirle "llega
al fallo" lo deja cerca de 0–1 RIR, que es donde se quiere estar. **La instrucción
"siempre al fallo" es defendible para el público de esta app, y no lo sería para un
atleta de fuerza.**

### 11.2 El mínimo de 8 repeticiones no tiene respaldo fisiológico

Aquí la evidencia contradice el planteamiento, y la app no lo disimula.

Schoenfeld, Grgic et al. reexaminaron el "continuo de repeticiones" y concluyen que se
consigue **crecimiento similar en todo el espectro de cargas por encima de ~30 % 1RM**,
es decir de unas 5 a más de 30 repeticiones. No existe una "zona de hipertrofia" de
8–12. Lo que sí es decisivo es el **esfuerzo**: con cargas bajas, el crecimiento solo
aparece cuando las series se llevan cerca del fallo.

> Schoenfeld, Grgic, Van Every & Plotkin (2021), *Sports* 9(2):32. "Loading
> Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A
> Re-Examination of the Repetition Continuum."
> https://www.mdpi.com/2075-4663/9/2/32

**Entonces, ¿por qué la app pone un suelo de 8?** Por dos razones que no son de
hipertrofia y que se declaran como tales:

1. **Técnica.** Bajar de 8 repeticiones obliga a cargas que un principiante todavía no
   controla. El riesgo sube sin que el estímulo mejore.
2. **Medición.** Un rango fijo hace comparable una sesión con la siguiente, que es lo
   que permite la progresión doble (ver 11.3).

Por eso el aviso de "menos de 8 reps" **no bloquea** la serie: fallar en la 7 de la
última serie es exactamente lo que se pide. Solo sugiere bajar el peso.

### 11.3 El aviso al llegar a 12: progresión doble

La regla "si llegas al techo del rango sin que cueste, sube el peso" es **progresión
doble**. Es la práctica estándar y es coherente con todo lo anterior (una serie que
llega a 12 con facilidad está lejos del fallo, y ahí la señal se pierde), pero **no hay
ningún ensayo comparativo publicado que la enfrente a otro esquema de progresión**. Las
fuentes que la describen son manuales y divulgación, no investigación primaria.

Se implementa como **pregunta**, no como automatismo: la app no puede saber si costó,
solo el usuario. El incremento sugerido, +2,5 kg, es el salto más pequeño montable con
discos normales (2 × 1,25 kg) — convención de gimnasio, no un valor estudiado.

### 11.4 Calentamiento: por qué se puede saltar

El dato es incómodo para la costumbre. Un estudio comparó tres condiciones en press de
banca y prensa a 45°: un set de aproximación (3–4 reps al 75 % del 10RM), dos sets
(55 % y 75 %) y **ningún calentamiento específico**. Midió repeticiones, índice de
fatiga, volumen de carga, disposición percibida y esfuerzo percibido.

Resultado: **diferencias de despreciables a pequeñas en todas las variables**. Los
autores concluyen que se puede ganar eficiencia de tiempo prescindiendo del
calentamiento específico cuando se entrena a cargas de ~10RM.

> "Warming up to improved performance? Effects of different specific warm-up protocols
> on neuromuscular performance in trained individuals."
> https://sportrxiv.org/index.php/server/preprint/view/559

Dos límites importantes: la muestra era de **entrenados**, y el desenlace era el
rendimiento de la sesión, no la hipertrofia a largo plazo ni las lesiones.

Cómo lo traduce la app:

- La serie de calentamiento **se ofrece por defecto**, porque en un principiante cumple
  una función que el estudio no midió: ensayar el patrón de movimiento antes de cargar.
- **El botón "Saltar" no es un atajo culposo.** Está respaldado: en cargas de ~10RM el
  calentamiento específico no cambió el rendimiento.
- El calentamiento **se guarda marcado** (`workout_sets.is_warmup`) y **no cuenta** como
  volumen ni como referencia de progresión. Sin eso, "Anterior: 20 kg × 12" podía venir
  de la serie de aproximación y llevar al usuario a cargar la mitad de lo que puede.

## 8. Resumen: qué está sólido y qué es costumbre

**🟢 Sólido (meta-análisis convergentes)**

1. El volumen semanal es el motor principal de la hipertrofia, con rendimientos decrecientes.
2. Con volumen igualado, la frecuencia no cambia la hipertrofia (1 a 6 sesiones/semana).
3. Con volumen igualado, el split no cambia la hipertrofia.
4. El orden de ejercicios no afecta la hipertrofia; sí a la fuerza del que va primero.
5. Las series de multiarticulares aportan ≈0.5 series de volumen a los sinergistas.
6. La pre-fatiga no mejora resultados; reduce el volumen de carga.
7. Ejercicios específicos con ventaja medida: tríceps overhead > pushdown; curl femoral sentado > tumbado; elevación de talón de pie > sentado para gastrocnemio; el recto femoral necesita extensión de rodilla.
8. Cardio y pesas son compatibles: sin interferencia en hipertrofia ni fuerza máxima; sí una interferencia pequeña en fuerza explosiva, que desaparece separando ≥3 h.
9. **Cercanía al fallo**: cuanto más cerca, más hipertrofia (pendiente negativa, IC sin
   el cero). Para **fuerza** la relación es despreciable. Robinson et al. 2024.
10. **No existe una "zona de hipertrofia" de 8–12 reps**: se crece igual de ~5 a 30+ reps
    por encima de ~30 % 1RM, si el esfuerzo es alto. Schoenfeld et al. 2021.
11. **El fallo cuesta 48–72 h de recuperación**, frente a 6–48 h sin fallo. Morán-Navarro et al.
12. **El calentamiento específico no mejoró el rendimiento** de la sesión a cargas de
    ~10RM en entrenados. Por eso "Saltar" es una opción legítima, no un atajo.

**🟡 Razonable con matices**

9. 6–10 series semanales por grupo para principiantes; 12–20 para entrenados.
10. 2 sesiones por músculo y semana — por logística de volumen, no por efecto propio.
11. Recuperación de ~24 h sin llegar al fallo, ~48 h con fallo (Morán-Navarro 2017).
12. Compuestos antes que aislamientos (recomendación de guía, no hallazgo).
13. 90 s entre series para hipertrofia: por encima de eso el beneficio deja de ser
    apreciable. Los 2–3 min que muestran los estudios de fuerza siguen valiendo para
    fuerza máxima, que no es lo que esta app entrena.

**🔴 Consenso práctico sin evidencia directa — y la app lo dice**

13. Que agrupar agonistas (empuje/tirón) sea mejor que repartirlos.
14. Que PPL, upper/lower o full body sean superiores entre sí a igual volumen y días.
15. Los "landmarks" de volumen tipo MEV/MAV/MRV.
16. La regla de "48–72 h fijas entre sesiones del mismo músculo" atribuida al ACSM.
17. Que el cardio ligero acelere la recuperación entre sesiones de fuerza.
18. Toda la ordenación de ejercicios de **antebrazo**, **abdominales** y **espalda**:
    no hay ni un solo ensayo comparativo de hipertrofia para esos tres grupos.
19. El descanso **al cambiar de ejercicio**: nadie lo ha estudiado por separado.
20. **La barra Z contra la barra recta**: cero estudios, en cualquier variable.
21. **Los accesorios del pushdown** (cuerda, V, barra): cero estudios de hipertrofia.
22. **La anchura de agarre y la hipertrofia a largo plazo**: cero estudios.
23. **La elevación frontal**: sin ninguna comparación publicada. Es el ejercicio de
    menor prioridad del catálogo de hombro.
24. **La dificultad técnica de los ejercicios**: no existe ninguna escala publicada; las
    etiquetas del catálogo son criterio editorial.
25. **El suelo de 8 repeticiones**: decisión de la app por técnica y por comparabilidad
    entre sesiones. Fisiológicamente NO hace falta. Por eso avisa y no bloquea.
26. **La progresión doble** ("llegas al techo del rango → sube el peso"): sin ningún
    ensayo comparativo publicado frente a otro esquema.
27. **El incremento de +2,5 kg**: convención de gimnasio (2 discos de 1,25), no un valor
    estudiado.
28. **Que 1 serie de calentamiento sea el número correcto**: no hay evidencia de un
    número óptimo. Es el que pidió el usuario y el que menos tiempo cuesta.

**❓ No verificado (declarado)**

- Las cifras ES = 0.07 / ES = 0.18 del meta-análisis de Schoenfeld 2019 (solo en fuente secundaria).
- Los valores numéricos de EMG de Campos et al. (2020) y Botton et al. (2013) — no reproducimos cifras que no pudimos leer.
- Fradkin, Zazryn & Smoliga (2010) sobre calentamiento — sin acceso al texto completo.
