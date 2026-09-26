import { Redirect, Tabs } from 'expo-router';
import { ChartLine, History, House, PersonStanding } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { WorkoutBar } from '@/components/WorkoutBar';
// The stock tab bar, to put the workout bar on top of it. expo-router doesn't
// re-export it, so this is its own copy, the one its Tabs render.
import { BottomTabBar } from 'expo-router/build/react-navigation/bottom-tabs';
import { useAuth } from '../../context/AuthContext';
import { shouldOnboard } from '../../lib/storage';
import { C } from '../../constants/theme';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
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
      tabBar={(props) => (
        <>
          <WorkoutBar />
          <BottomTabBar {...props} />
        </>
      )}
      screenOptions={{
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.raised },
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
