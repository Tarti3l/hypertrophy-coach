import type { ImageSourcePropType } from 'react-native';

/**
 * Un solo lugar donde se resuelven las imágenes del sistema visual.
 *
 * Las claves de `musculo` y `musculoThumb` son exactamente los valores de
 * `MuscleGroupSlug` (`features/training/types/training.ts`). No se importa ese
 * tipo acá a propósito: `theme/` no debe depender de `features/`. Si algún día
 * se agrega un grupo, esto devuelve `undefined` y la interfaz tiene que mostrar
 * el estado sin imagen — ver `docs/diseno.md`, sección 6, regla 3.
 *
 * El revelado y los recortes están documentados en
 * `apps/mobile/assets/images/README.md`.
 */
export const images = {
  /** Foto a sangre de la pantalla de inicio. Va con `scrim.hero`. */
  inicio: require('../../assets/images/inicio.jpg') as ImageSourcePropType,

  /** Tarjeta de grupo muscular, 692 × 368. Va con `scrim.card`. */
  musculo: {
    pecho: require('../../assets/images/musculos/pecho.jpg'),
    espalda: require('../../assets/images/musculos/espalda.jpg'),
    hombros: require('../../assets/images/musculos/hombros.jpg'),
    biceps: require('../../assets/images/musculos/biceps.jpg'),
    triceps: require('../../assets/images/musculos/triceps.jpg'),
    antebrazo: require('../../assets/images/musculos/antebrazo.jpg'),
    abs: require('../../assets/images/musculos/abs.jpg'),
    cuadriceps: require('../../assets/images/musculos/cuadriceps.jpg'),
    femorales: require('../../assets/images/musculos/femorales.jpg'),
    gluteos: require('../../assets/images/musculos/gluteos.jpg'),
    pantorrilla: require('../../assets/images/musculos/pantorrilla.jpg'),
    cardio: require('../../assets/images/musculos/cardio.jpg')
  } as Record<string, ImageSourcePropType | undefined>,

  /** Miniatura de fila, 224 × 224. */
  musculoThumb: {
    pecho: require('../../assets/images/musculos/thumb/pecho.jpg'),
    espalda: require('../../assets/images/musculos/thumb/espalda.jpg'),
    hombros: require('../../assets/images/musculos/thumb/hombros.jpg'),
    biceps: require('../../assets/images/musculos/thumb/biceps.jpg'),
    triceps: require('../../assets/images/musculos/thumb/triceps.jpg'),
    antebrazo: require('../../assets/images/musculos/thumb/antebrazo.jpg'),
    abs: require('../../assets/images/musculos/thumb/abs.jpg'),
    cuadriceps: require('../../assets/images/musculos/thumb/cuadriceps.jpg'),
    femorales: require('../../assets/images/musculos/thumb/femorales.jpg'),
    gluteos: require('../../assets/images/musculos/thumb/gluteos.jpg'),
    pantorrilla: require('../../assets/images/musculos/thumb/pantorrilla.jpg'),
    cardio: require('../../assets/images/musculos/thumb/cardio.jpg')
  } as Record<string, ImageSourcePropType | undefined>
};
