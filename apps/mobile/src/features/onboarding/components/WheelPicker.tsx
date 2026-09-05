import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
/** Relleno arriba y abajo para que el primer y el último valor puedan quedar centrados. */
const EDGE_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
/** Sin eventos de scroll durante este tiempo, damos el gesto por terminado. */
const IDLE_MS = 140;

type WheelPickerProps = {
  label: string;
  unit: string;
  min: number;
  max: number;
  /** Valor que se selecciona solo, la primera vez, cuando el formulario viene vacío. */
  initial: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function WheelPicker({ label, unit, min, max, initial, value, onChange, error }: WheelPickerProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const values = useMemo(() => {
    const list: number[] = [];
    for (let current = min; current <= max; current += 1) list.push(current);
    return list;
  }, [max, min]);

  const indexOf = useCallback((raw: string) => {
    const parsed = Number(raw.replace(',', '.'));
    const target = Number.isFinite(parsed) && raw.trim() !== '' ? Math.round(parsed) : initial;
    return Math.max(0, Math.min(values.length - 1, target - min));
  }, [initial, min, values.length]);

  const scrollRef = useRef<ScrollView>(null);
  const [selectedIndex, setSelectedIndex] = useState(() => indexOf(value));

  // La rueda no tiene estado "vacío": si el formulario aún no trae valor, publicamos
  // el inicial para que la validación no falle por algo que el usuario ya está viendo.
  useEffect(() => {
    if (value.trim() === '') onChange(String(values[indexOf('')]));
    // Solo al montar: después manda el gesto del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Posición inicial sin animación. En web hay que esperar al layout, y onLayout
  // vuelve a dispararse al redimensionar: sin este cerrojo la rueda saltaría al
  // valor inicial cada vez que el usuario cambia el tamaño de la ventana.
  const hasPositionedRef = useRef(false);
  const handleLayout = useCallback(() => {
    if (hasPositionedRef.current) return;
    hasPositionedRef.current = true;
    scrollRef.current?.scrollTo({ y: indexOf(value) * ITEM_HEIGHT, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const offsetRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Mientras corregimos la posición se emiten más eventos de scroll: hay que ignorarlos. */
  const isSnappingRef = useRef(false);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const settle = useCallback(() => {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetRef.current / ITEM_HEIGHT)));

    setSelectedIndex(index);
    onChange(String(values[index]));

    const snapped = index * ITEM_HEIGHT;
    if (Math.abs(offsetRef.current - snapped) > 0.5) {
      isSnappingRef.current = true;
      scrollRef.current?.scrollTo({ y: snapped, animated: true });
      setTimeout(() => { isSnappingRef.current = false; }, 300);
    }
  }, [onChange, values]);

  // onMomentumScrollEnd no es fiable en react-native-web, así que el disparador
  // real es la ausencia de eventos: cuando el scroll se queda quieto, enganchamos.
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.y;
    if (isSnappingRef.current) return;

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(settle, IDLE_MS);
  }, [settle]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.frame, error ? styles.frameError : null]}>
        <View pointerEvents="none" style={styles.band} />
        <ScrollView
          ref={scrollRef}
          accessibilityLabel={`${label} en ${unit}`}
          accessibilityValue={{ min, max, now: values[selectedIndex], text: `${values[selectedIndex]} ${unit}` }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onLayout={handleLayout}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={settle}
          contentContainerStyle={styles.track}
        >
          {values.map((item, index) => (
            <View key={item} style={styles.item}>
              <Text style={[styles.itemText, index === selectedIndex && styles.itemTextSelected]}>{item}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.unit}>{unit}</Text>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, minWidth: 0 },
    label: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', letterSpacing: 0.4, marginBottom: spacing.sm, textAlign: 'center', textTransform: 'uppercase' },
    frame: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 16, borderWidth: 1, height: WHEEL_HEIGHT, overflow: 'hidden' },
    frameError: { borderColor: colors.danger },
    band: { backgroundColor: colors.accentSoft, borderRadius: 12, height: ITEM_HEIGHT, left: 6, position: 'absolute', right: 6, top: EDGE_PADDING },
    track: { paddingVertical: EDGE_PADDING },
    item: { alignItems: 'center', height: ITEM_HEIGHT, justifyContent: 'center' },
    itemText: { color: colors.textMuted, fontFamily: typography.display, fontSize: 19, fontWeight: '600' },
    itemTextSelected: { color: colors.text, fontSize: 23, fontWeight: '700' },
    unit: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 18, marginTop: spacing.xs, textAlign: 'center' }
  });
}
