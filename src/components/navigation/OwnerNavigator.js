import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

// Screens
import OwnerDashboardScreen from '../../screens/owner/OwnerDashboardScreen';
import OwnerFleetScreen from '../../screens/owner/OwnerFleetScreen';
import OwnerBookingsScreen from '../../screens/owner/OwnerBookingsScreen';
import OwnerWalletScreen from '../../screens/owner/OwnerWalletScreen';

import AddEditBoatScreen from '../../screens/owner/AddEditBoatScreen';
import OwnerKycScreen from '../../screens/owner/OwnerKycScreen';
import OwnerQrPostersScreen from '../../screens/owner/OwnerQrPostersScreen';
import ProfileScreen from '../../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function OwnerTabs() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : Math.max(insets.bottom, 12);
  const tabHeight = 60 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#0a1e23' : colors.white,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : colors.line,
          height: tabHeight,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: isDark ? '#8fd6de' : colors.gray400,
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={OwnerDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />

      <Tab.Screen
        name="FleetTab"
        component={OwnerFleetScreen}
        options={{
          tabBarLabel: 'My Fleet',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛶</Text>,
        }}
      />

      <Tab.Screen
        name="BookingsTab"
        component={OwnerBookingsScreen}
        options={{
          tabBarLabel: 'Dispatch',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />

      <Tab.Screen
        name="WalletTab"
        component={OwnerWalletScreen}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💳</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function OwnerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
      <Stack.Screen name="OwnerBookings" component={OwnerBookingsScreen} />
      <Stack.Screen name="OwnerFleet" component={OwnerFleetScreen} />
      <Stack.Screen name="AddEditBoat" component={AddEditBoatScreen} />
      <Stack.Screen name="OwnerWallet" component={OwnerWalletScreen} />
      <Stack.Screen name="OwnerKyc" component={OwnerKycScreen} />
      <Stack.Screen name="OwnerQrPosters" component={OwnerQrPostersScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
