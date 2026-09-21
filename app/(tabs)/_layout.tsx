import { Redirect, Tabs } from 'expo-router';
import { ChartLine, History, House, PersonStanding } from 'lucide-react-native';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '../../context/AuthContext';
import { C } from '../../constants/theme';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }
  if (!user) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
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
