import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  // Signed in (or just finished signing in): leave the auth screens.
  if (!isLoading && user) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
