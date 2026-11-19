import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import JalRideLogo from '../common/JalRideLogo';

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
        <JalRideLogo size={72} style={{ marginBottom: 16 }} />
        <ActivityIndicator size="small" color="#e8963c" style={{ marginTop: 12 }} />
      </View>
    );
  }

  // Unauthenticated user -> Auth Stack (Login / Register)
  if (!user || !token) {
    return <AuthNavigator />;
  }

  // Strict Admin Gate: Only authorized admin email can render AdminNavigator
  const isAuthorizedAdmin =
    user.role === 'admin' &&
    user.email?.toLowerCase().trim() === ADMIN_EMAIL;

  return (
    <View style={styles.container}>
      {activeRole === 'admin' && isAuthorizedAdmin ? (
        <AdminNavigator />
      ) : activeRole === 'owner' && (user.role === 'owner' || isAuthorizedAdmin) ? (
        <OwnerNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </View>
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
    backgroundColor: '#0a2e36',
  },
});
