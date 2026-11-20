import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

// Screens
import HomeScreen from '../../screens/customer/HomeScreen';
import BoatsScreen from '../../screens/customer/BoatsScreen';
import QrScanScreen from '../../screens/customer/QrScanScreen';
import MyRidesScreen from '../../screens/customer/MyRidesScreen';
import CustomerWalletScreen from '../../screens/customer/CustomerWalletScreen';

import BoatDetailScreen from '../../screens/customer/BoatDetailScreen';
import BookingWizardScreen from '../../screens/customer/BookingWizardScreen';
import TicketScreen from '../../screens/customer/TicketScreen';
import ProfileScreen from '../../screens/customer/ProfileScreen';
import ChatScreen from '../../screens/customer/ChatScreen';
import NotificationsScreen from '../../screens/customer/NotificationsScreen';
import PrivacyDataRightsScreen from '../../screens/customer/PrivacyDataRightsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomerTabs() {
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
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />

      <Tab.Screen
        name="BoatsTab"
        component={BoatsScreen}
        options={{
          tabBarLabel: 'Boats',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🛶</Text>,
        }}
      />

      <Tab.Screen
        name="ScanQRTab"
        component={QrScanScreen}
        options={{
          tabBarLabel: 'Scan QR',
          tabBarIcon: () => (
            <View style={styles.floatingQrBtn}>
              <Text style={{ fontSize: 20 }}>⚡</Text>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="MyRidesTab"
        component={MyRidesScreen}
        options={{
          tabBarLabel: 'My Passes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🎫</Text>,
        }}
      />

      <Tab.Screen
        name="WalletTab"
        component={CustomerWalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👛</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="Boats" component={BoatsScreen} />
      <Stack.Screen name="BoatDetail" component={BoatDetailScreen} />
      <Stack.Screen name="BookingWizard" component={BookingWizardScreen} />
      <Stack.Screen name="Ticket" component={TicketScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ScanQR" component={QrScanScreen} />
      <Stack.Screen name="Wallet" component={CustomerWalletScreen} />
      <Stack.Screen name="MyRides" component={MyRidesScreen} />
      <Stack.Screen name="PrivacyDataRights" component={PrivacyDataRightsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingQrBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sun,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
    shadowColor: colors.sun,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
