import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

// Screens
import AdminDashboardScreen from '../../screens/admin/AdminDashboardScreen';
import AdminBoatsScreen from '../../screens/admin/AdminBoatsScreen';
import AdminUsersScreen from '../../screens/admin/AdminUsersScreen';
import AdminSettingsScreen from '../../screens/admin/AdminSettingsScreen';
import AdminCommissionSettingsScreen from '../../screens/admin/AdminCommissionSettingsScreen';
import AdminBookingsScreen from '../../screens/admin/AdminBookingsScreen';
import AdminRefundsScreen from '../../screens/admin/AdminRefundsScreen';
import AdminKycScreen from '../../screens/admin/AdminKycScreen';
import AdminSettlementsScreen from '../../screens/admin/AdminSettlementsScreen';
import ProfileScreen from '../../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminTabs() {
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
        tabBarActiveTintColor: colors.sunDeep,
        tabBarInactiveTintColor: isDark ? '#8fd6de' : colors.gray400,
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="AdminOverviewTab"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Console',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👑</Text>,
        }}
      />

      <Tab.Screen
        name="AdminBoatsTab"
        component={AdminBoatsScreen}
        options={{
          tabBarLabel: 'Fleet',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚢</Text>,
        }}
      />

      <Tab.Screen
        name="AdminUsersTab"
        component={AdminUsersScreen}
        options={{
          tabBarLabel: 'Users',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
        }}
      />

      <Tab.Screen
        name="AdminSettingsTab"
        component={AdminSettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="AdminBoats" component={AdminBoatsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="AdminCommissionSettings" component={AdminCommissionSettingsScreen} />
      <Stack.Screen name="AdminBookings" component={AdminBookingsScreen} />
      <Stack.Screen name="AdminRefunds" component={AdminRefundsScreen} />
      <Stack.Screen name="AdminKyc" component={AdminKycScreen} />
      <Stack.Screen name="AdminSettlements" component={AdminSettlementsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
