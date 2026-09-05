import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, IconName } from '@/components/ui/Icon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { FoodShortcut, NewFoodShortcut } from '../types/nutrition';

type ShortcutRowProps = {
  shortcuts: FoodShortcut[];
  isSaving: boolean;
  /** Dónde va a caer el atajo. Se muestra en la confirmación. */
  mealLabel: string;
  onUse: (shortcut: FoodShortcut) => void;
  onSave: (shortcut: NewFoodShortcut, id?: string) => void;
  onDelete: (id: string) => void;
};

const EMPTY_DRAFT: NewFoodShortcut = {
  name: 'Batido de proteína',
  icon: 'shaker',
  servingLabel: '1 scoop',
  energyKcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0
};

export function ShortcutRow({ shortcuts, isSaving, mealLabel, onUse, onSave, onDelete }: ShortcutRowProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [editing, setEditing] = useState<FoodShortcut | 'new' | null>(null);
  // Un toque selecciona, el segundo confirma: evita añadir algo por error al rozar la pantalla.
  const [pending, setPending] = useState<FoodShortcut | null>(null);
  const [draft, setDraft] = useState<NewFoodShortcut>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);

  function startEdit(target: FoodShortcut | 'new') {
    setEditing(target);
    setError(null);
    setDraft(target === 'new' ? EMPTY_DRAFT : {
      name: target.name,
      icon: target.icon,
      servingLabel: target.servingLabel,
      energyKcal: target.energyKcal,
      proteinG: target.proteinG,
      carbsG: target.carbsG,
      fatG: target.fatG
    });
  }

  function submit() {
    if (!draft.name.trim()) { setError('Ponle un nombre al atajo.'); return; }
    if (draft.energyKcal <= 0) { setError('Copia las calorías de la etiqueta de tu envase.'); return; }

    onSave(draft, editing === 'new' || editing === null ? undefined : editing.id);
    setEditing(null);
  }

  if (editing) {
    return (
      <Card>
        <Eyebrow>{editing === 'new' ? 'Nuevo atajo' : 'Editar atajo'}</Eyebrow>
        <Text style={styles.help}>
          Copia los valores de la etiqueta de tu envase. Cada marca aporta cosas distintas, así que no ponemos un valor por defecto.
        </Text>

        <Field label="Nombre" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} styles={styles} colors={colors} />
        <Field label="Medida" value={draft.servingLabel ?? ''} placeholder="1 scoop (30 g)" onChange={(value) => setDraft({ ...draft, servingLabel: value })} styles={styles} colors={colors} />

        <View style={styles.grid}>
          <NumberField label="Calorías" value={draft.energyKcal} onChange={(value) => setDraft({ ...draft, energyKcal: value })} styles={styles} colors={colors} />
          <NumberField label="Proteína (g)" value={draft.proteinG} onChange={(value) => setDraft({ ...draft, proteinG: value })} styles={styles} colors={colors} />
        </View>
        <View style={styles.grid}>
          <NumberField label="Carbos (g)" value={draft.carbsG} onChange={(value) => setDraft({ ...draft, carbsG: value })} styles={styles} colors={colors} />
          <NumberField label="Grasas (g)" value={draft.fatG} onChange={(value) => setDraft({ ...draft, fatG: value })} styles={styles} colors={colors} />
        </View>

        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Guardar atajo" onPress={submit} loading={isSaving} style={styles.submit} />
        <View style={styles.editActions}>
          <Pressable accessibilityRole="button" onPress={() => setEditing(null)} style={styles.textButton}>
            <Text style={styles.mutedText}>Cancelar</Text>
          </Pressable>
          {editing !== 'new' ? (
            <Pressable accessibilityRole="button" onPress={() => { onDelete(editing.id); setEditing(null); }} style={styles.textButton}>
              <Text style={styles.mutedText}>Eliminar</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>Atajos</Eyebrow>
      <Text style={styles.help}>Un toque y se suma. Ideal para lo que tomas todos los días igual.</Text>

      <View style={styles.tiles}>
        {shortcuts.map((shortcut) => (
          <View key={shortcut.id} style={styles.tileWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar ${shortcut.name}, ${Math.round(shortcut.energyKcal)} calorías`}
              accessibilityState={{ selected: pending?.id === shortcut.id }}
              onPress={() => setPending((current) => current?.id === shortcut.id ? null : shortcut)}
              style={({ pressed }) => [styles.tile, pending?.id === shortcut.id && styles.tileOn, pressed && styles.pressed]}
            >
              <Icon name={(shortcut.icon as IconName) ?? 'shaker'} color={colors.accent} size={26} />
              <Text numberOfLines={1} style={styles.tileName}>{shortcut.name}</Text>
              <Text style={styles.tileMeta}>{Math.round(shortcut.energyKcal)} kcal · {Math.round(shortcut.proteinG)} g prot</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => startEdit(shortcut)} style={styles.textButton}>
              <Text style={styles.mutedText}>Editar</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Crear un atajo"
          onPress={() => startEdit('new')}
          style={({ pressed }) => [styles.tile, styles.tileNew, pressed && styles.pressed]}
        >
          <Icon name="plus" color={colors.textMuted} size={26} />
          <Text numberOfLines={2} style={styles.tileNewText}>
            {shortcuts.length === 0 ? 'Configura tu batido' : 'Nuevo atajo'}
          </Text>
        </Pressable>
      </View>

      {pending ? (
        <View accessibilityLiveRegion="polite" style={styles.confirm}>
          <Text style={styles.confirmTitle}>
            {pending.servingLabel ? `${pending.name} · ${pending.servingLabel}` : pending.name}
          </Text>
          <Text style={styles.confirmMacros}>
            {Math.round(pending.energyKcal)} kcal · {Math.round(pending.proteinG)} g proteína · {Math.round(pending.carbsG)} g carbos · {Math.round(pending.fatG)} g grasas
          </Text>
          <Text style={styles.confirmTarget}>Se añade a {mealLabel.toLowerCase()}.</Text>

          <PrimaryButton
            label="Añadir"
            icon="check"
            onPress={() => { onUse(pending); setPending(null); }}
            style={styles.submit}
          />
          <Pressable accessibilityRole="button" onPress={() => setPending(null)} style={styles.textButton}>
            <Text style={styles.mutedText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

function Field({ label, value, placeholder, onChange, styles, colors }: {
  label: string; value: string; placeholder?: string;
  onChange: (value: string) => void;
  styles: ReturnType<typeof createStyles>; colors: ThemeColors;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function NumberField({ label, value, onChange, styles, colors }: {
  label: string; value: number;
  onChange: (value: number) => void;
  styles: ReturnType<typeof createStyles>; colors: ThemeColors;
}) {
  // Se guarda el texto aparte para no pelear con el usuario mientras escribe "1," o borra todo.
  const [text, setText] = useState(value === 0 ? '' : String(value));

  return (
    <View style={styles.gridItem}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        inputMode="decimal"
        keyboardType="numeric"
        onChangeText={(next) => {
          setText(next);
          const parsed = Number(next.replace(',', '.'));
          onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
        }}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={text}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    help: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    tileWrap: { alignItems: 'center' },
    tile: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, gap: spacing.xs, justifyContent: 'center', minHeight: 96, paddingHorizontal: spacing.sm, paddingVertical: spacing.md, width: 132 },
    tileOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    tileNew: { borderStyle: 'dashed' },
    confirm: { borderColor: colors.line, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md },
    confirmTitle: { color: colors.text, fontFamily: typography.display, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
    confirmMacros: { color: colors.accent, fontFamily: typography.body, fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: spacing.xs },
    confirmTarget: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    tileName: { color: colors.text, fontFamily: typography.body, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    tileMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, textAlign: 'center' },
    tileNewText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    fieldLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', marginTop: spacing.md },
    input: { borderBottomColor: colors.line, borderBottomWidth: 1.5, color: colors.text, fontFamily: typography.body, fontSize: 16, minHeight: 46, paddingVertical: spacing.sm },
    grid: { flexDirection: 'row', gap: spacing.md },
    gridItem: { flex: 1, minWidth: 0 },
    submit: { marginTop: spacing.lg },
    editActions: { flexDirection: 'row', gap: spacing.lg },
    textButton: { justifyContent: 'center', minHeight: 44 },
    mutedText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600' },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
    pressed: { opacity: 0.78 }
  });
}
