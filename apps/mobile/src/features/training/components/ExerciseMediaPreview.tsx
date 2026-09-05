import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { TrainingExercise } from '../types/training';

type ExerciseMediaPreviewProps = {
  exercise: TrainingExercise;
};

/**
 * El bloque de técnica del ejercicio.
 *
 * Cuando hay medios reales del CDN, muestra el vídeo o el GIF. Mientras no los hay
 * —hoy, todo el catálogo entra con media_is_placeholder = true— muestra los pasos de
 * técnica, que sí existen en la base de datos.
 *
 * Antes ese espacio lo ocupaba un cartel de 230 px que decía "Vista de técnica ·
 * Video corto · 4 s" y debajo "Demo pendiente de conectar al CDN". Para el usuario
 * objetivo, alguien que no sabe cómo se hace un press inclinado, eso era el hueco más
 * grande de la pantalla: el sitio principal ocupado por un anuncio de contenido que no
 * llega, mientras las tres instrucciones reales se quedaban sin mostrar.
 */
export function ExerciseMediaPreview({ exercise }: ExerciseMediaPreviewProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (exercise.media.isMock) {
    return <TechniqueSteps exercise={exercise} styles={styles} colors={colors} />;
  }

  return (
    <View
      accessible
      accessibilityLabel={`Vista de técnica: ${exercise.name}`}
      accessibilityHint={`Demostración ${exercise.media.type} de ${exercise.media.durationSeconds} segundos.`}
      style={styles.frame}
    >
      {exercise.media.type === 'video' ? (
        <VideoTechniquePreview
          key={exercise.id}
          url={exercise.media.url}
          posterUrl={exercise.media.posterUrl}
          styles={styles}
        />
      ) : (
        <Image source={{ uri: exercise.media.url }} resizeMode="cover" style={styles.image} />
      )}
      <Text style={styles.caption}>Demostración de técnica.</Text>
    </View>
  );
}

function TechniqueSteps({
  exercise,
  styles,
  colors
}: {
  exercise: TrainingExercise;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.stepsFrame}>
      <Eyebrow color={colors.accent}>Cómo se hace</Eyebrow>
      {exercise.instructions.map((step, index) => (
        <View key={`${exercise.id}-step-${index}`} style={styles.step}>
          <View style={styles.stepBullet}>
            <Text style={styles.stepNumber}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function VideoTechniquePreview({
  url,
  posterUrl,
  styles
}: {
  url: string;
  posterUrl: string | null;
  styles: ReturnType<typeof createStyles>;
}) {
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return (
    <View style={styles.videoStage}>
      {posterUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: posterUrl }}
          resizeMode="cover"
          style={[styles.video, styles.poster, hasFirstFrame && styles.posterHidden]}
        />
      ) : null}
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="cover"
        onFirstFrameRender={() => setHasFirstFrame(true)}
        playsInline
        style={styles.video}
        useExoShutter={false}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    frame: { backgroundColor: colors.accentSoft, borderRadius: radii.lg, marginHorizontal: spacing.lg, overflow: 'hidden' },
    videoStage: { height: 230, width: '100%' },
    video: { height: 230, width: '100%' },
    poster: { left: 0, position: 'absolute', top: 0 },
    posterHidden: { opacity: 0 },
    image: { height: 230, width: '100%' },
    caption: {
      backgroundColor: colors.surface,
      borderTopColor: colors.line,
      borderTopWidth: 1,
      color: colors.textMuted,
      fontFamily: typography.body,
      fontSize: 13,
      lineHeight: 19,
      paddingHorizontal: spacing.md,
      paddingVertical: 12
    },

    stepsFrame: {
      backgroundColor: colors.accentSoft,
      borderRadius: radii.lg,
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      padding: spacing.md
    },
    step: { flexDirection: 'row', gap: spacing.sm },
    stepBullet: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 11,
      height: 22,
      justifyContent: 'center',
      marginTop: 1,
      width: 22
    },
    stepNumber: { color: colors.surface, fontFamily: typography.display, fontSize: 12, fontWeight: '800' },
    stepText: { ...type.body, color: colors.text, flex: 1, fontSize: 15, lineHeight: 22, minWidth: 0 }
  });
}
