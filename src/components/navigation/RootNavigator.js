import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';

import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import OwnerNavigator from './OwnerNavigator';
import AdminNavigator from './AdminNavigator';

const ADMIN_EMAIL = 'prepwave.pushpendra@gmail.com';

export default function RootNavigator() {
  const { user, token, loading, activeRole } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  // Unauthenticated user -> Auth Stack (Login / Register)
  if (!user || !token) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Strict Admin Gate: Only authorized admin email can render AdminNavigator
  const isAuthorizedAdmin =
    user.role === 'admin' &&
    user.email?.toLowerCase().trim() === ADMIN_EMAIL;

  return (
    <NavigationContainer>
      <View style={styles.container}>
        {activeRole === 'admin' && isAuthorizedAdmin ? (
          <AdminNavigator />
        ) : activeRole === 'owner' && (user.role === 'owner' || isAuthorizedAdmin) ? (
          <OwnerNavigator />
        ) : (
          <CustomerNavigator />
        )}
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
});
