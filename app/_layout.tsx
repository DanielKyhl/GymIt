import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '../context/AuthContext';
import { seedPremadeTemplates } from '../lib/storage';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    seedPremadeTemplates();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#111' },
            headerTintColor: '#fff',
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="template/[id]" options={{ title: 'Template' }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="workout-log/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="exercise-progress/[name]" options={{ title: 'Progress' }} />
          <Stack.Screen name="create-template" options={{ title: 'New template' }} />
          <Stack.Screen name="weekly-goal" options={{ title: 'Weekly goal' }} />
          <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
