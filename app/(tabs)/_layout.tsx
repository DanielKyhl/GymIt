import { Redirect, Tabs } from 'expo-router';
import { ChartLine, History, House, PersonStanding } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/haptic-tab';
import { WorkoutBar } from '@/components/WorkoutBar';
// The stock tab bar, to put the workout bar on top of it. expo-router doesn't
// re-export it, so this is its own copy, the one its Tabs render.
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useTipTarget } from '@/components/Tips';
import { useAuth } from '../../context/AuthContext';
import { shouldOnboard } from '../../lib/storage';
import { C } from '../../constants/theme';

// A tab's padding, icon and label (5 + 28 + 14 + 5), its top border, and a
// little room to spare. The home indicator's inset goes on top of it.
const TAB_BAR = 55;

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  // null while checking whether this is a brand-new account.
  const [onboard, setOnboard] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) shouldOnboard().then(setOnboard);
  }, [user]);

  if (isLoading) {
    return null;
  }
  if (!user) {
    return <Redirect href="/welcome" />;
  }
  // New accounts set up first, so Home never flashes up behind it.
  if (onboard === null) return null;
  if (onboard) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      // A workout pulled down out of the way waits just above the tabs.
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        // The stock 49 is too short for the icon and a label under it: the label
        // got squashed to its font size and lost the tails of its g's and y's.
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.raised, height: TAB_BAR + insets.bottom },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <ChartLine size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recovery"
        options={{
          title: 'Recovery',
          tabBarIcon: ({ color }) => <PersonStanding size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

// The tabs, with the workout bar on top; the tabs are one of the welcome tips.
function TabBar(props: BottomTabBarProps) {
  const tabsRef = useTipTarget('home.tabs');
  return (
    <>
      <WorkoutBar />
      <View ref={tabsRef}>
        <BottomTabBar {...props} />
      </View>
    </>
  );
}
