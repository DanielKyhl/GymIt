import { createContext, ReactNode, useContext } from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";

// The top of the workout sheet (components/WorkoutSheet.tsx) is what you pull it
// down by: its handle, and the workout's title row under it, which wraps
// itself in <SheetGrip>. The grip tells the sheet where it ends, so a pull
// that starts anywhere above that is the sheet's.
export const SheetGripContext = createContext<((bottom: number) => void) | undefined>(undefined);

// In the browser, a pull that starts here is the sheet's alone: iPhone Safari
// would otherwise take it for scrolling the page and cancel it halfway.
export const grabbable = (Platform.OS === "web" ? { touchAction: "none", userSelect: "none" } : {}) as ViewStyle;

export function SheetGrip({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const report = useContext(SheetGripContext);
  return (
    <View
      onLayout={(e) => report?.(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
      style={[style, report && grabbable]}
    >
      {children}
    </View>
  );
}
