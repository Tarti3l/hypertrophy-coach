# Instrucciones del proyecto — Hypertrophy Coach

Reglas para cualquier agente que trabaje en este repo (Claude Code, Codex).
Leelas antes de tocar código.

## Qué es este producto

App móvil para socios de un gimnasio que empiezan a entrenar desde cero.

**Tres apartados y ni uno más: entrenamiento, descanso, alimentación.**

Sin fines de lucro, al menos por ahora: no hay suscripción, freemium,
entitlements ni RevenueCat. `apps/mobile/src/features/subscription/` está fuera
de alcance.

**Prioridad número uno, por encima de cualquier feature: que sea fácil y sencilla
de usar.** El usuario la abre entre series, con una mano, y no lee instrucciones.

## Reglas de trabajo

1. **Adaptación incremental, no rediseño.** No cambies el stack (Expo, React
   Native, TypeScript, Supabase, pnpm workspaces). No reestructures el monorepo.
   No rehagas módulos que ya funcionan. Si creés que hace falta un cambio grande,
   proponelo y esperá — no lo hagas.

2. **Un item del plan por vez.** El plan vive en `docs/plan.md`. No trabajes
   fuera de él salvo que el dueño lo pida explícitamente.

3. **"Simplificar la UX" no es un criterio de aceptación.** Si tu cambio toca UI,
   decí qué logra un usuario sin ayuda ("un socio nuevo registra una serie
   completa sin salir de la pantalla principal"). Si el cambio suma pantallas,
   pasos u opciones, justificá por qué vale la complejidad.

4. **No agregues librerías** salvo que la tarea sea imposible sin ellas, y
   justificá en el commit por qué no alcanza lo que ya hay.

5. **Verificá antes de decir que terminaste.** `pnpm typecheck` siempre. Si
   tocaste migraciones, `pnpm db:status`. Si tocaste media, `pnpm media:check`.
   Un criterio que no corriste es SKIP con su razón, no PASS.

6. **No inventes datos de salud ni de nutrición.** Las fuentes están en `docs/`.
   Los cálculos de macros son estimaciones educativas, nunca consejo médico ni
   diagnóstico.

7. **Trabajá en una branch**, nunca directo sobre `main`.

## Estado del proyecto

Implementados en `apps/mobile/src/features/`: `onboarding`, `training`,
`progress`, `nutrition`, `recovery`.

Reservados, sin implementar: `notifications`, `subscription`.
Obsoleto: `red-flags` (reemplazado por `recovery`).

Base de datos: 20 migraciones en `supabase/migrations/`.

**`PRODUCT.md` está desactualizado**: describe un producto freemium de consumo
con monetización individual. Este archivo manda sobre él hasta que se corrija.

## Comandos

```bash
pnpm mobile        # arranca la app Expo
pnpm typecheck     # verificación de tipos
pnpm db:push       # aplica migraciones
pnpm db:status     # estado de las migraciones
pnpm media:check   # valida la media de ejercicios
```
