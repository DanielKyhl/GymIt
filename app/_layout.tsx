import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '../context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { C } from "../constants/theme";

export const unstable_settings = {
  anchor: '(auth)',
};

// Keep the splash up until the number font has loaded, so timers and stats
// never flash in the fallback font first.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({ BarlowCondensed_600SemiBold, BarlowCondensed_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // If the font fails to load the app still starts, with the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: C.bg },
            headerTintColor: C.text,
            headerShadowVisible: false,
            // Just the arrow: the label would be the previous screen's route
            // name, which for the tabs is "(tabs)".
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="template/[id]" options={{ title: 'Template' }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="workout-log/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="exercise-progress/[name]" options={{ title: 'Progress' }} />
          <Stack.Screen name="create-template" options={{ title: 'New template' }} />
          <Stack.Screen name="workout-summary" options={{ headerShown: false }} />
          <Stack.Screen name="weekly-goal" options={{ title: 'Weekly goal' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
