import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, useFonts } from '@expo-google-fonts/barlow-condensed';
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { router, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Platform, Pressable } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '../context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { C, HIT } from "../constants/theme";

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
          screenOptions={({ navigation }) => ({
            headerStyle: { backgroundColor: C.bg },
            headerTintColor: C.text,
            headerShadowVisible: false,
            // Just the arrow: the label would be the previous screen's route
            // name, which for the tabs is "(tabs)".
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: 'Back',
            // On the web build (the home-screen app) the stock arrow is a black
            // image made light with an SVG filter, which iPhone Safari doesn't
            // apply: the arrow ends up black on the black header. Draw a vector
            // one there instead. Phones keep their native arrow.
            ...(Platform.OS === 'web'
              ? {
                  headerLeft: () => (
                    <Pressable
                      onPress={() => (navigation.canGoBack() ? navigation.goBack() : router.replace('/(tabs)'))}
                      hitSlop={HIT}
                      style={{ paddingLeft: 10, paddingRight: 8, paddingVertical: 4 }}
                      accessibilityRole="button"
                      accessibilityLabel="Back"
                    >
                      <ChevronLeft size={28} color={C.text} />
                    </Pressable>
                  ),
                }
              : {}),
          })}
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
          <Stack.Screen name="calendar" options={{ title: 'Calendar' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
