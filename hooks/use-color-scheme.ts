import { useColorScheme as useRNColorScheme } from 'react-native';

// React Native can also report 'unspecified' (or null). The app only has light
// and dark palettes, so anything that isn't dark is treated as light.
export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
