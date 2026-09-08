import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Icon, IconName } from '@/components/ui/Icon';
import { palette, typography } from '@/theme/tokens';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Inicio', icon: 'home' },
  { name: 'training', title: 'Entrenamiento', icon: 'dumbbell' },
  { name: 'nutrition', title: 'Alimentación', icon: 'bowl' },
  { name: 'recovery', title: 'Recuperación', icon: 'moon' }
];

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: typography.body, fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8
        }
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={String(color)} size={23} />,
            // "Entrenamiento" se oculta de la barra (ver docs/plan-diseno.md): a la
            // pantalla se llega desde "Empezar entrenamiento" en Inicio, no tocando acá.
            // `href: null` saca la pestaña de la barra sin sacar la ruta ni la pantalla.
            ...(tab.name === 'training' ? { href: null } : null)
          }}
        />
      ))}
    </Tabs>
  );
}
