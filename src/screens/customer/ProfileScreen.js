import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

export default function ProfileScreen({ navigation }) {
  const { user, activeRole, switchRole, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleRoleChange = (role) => {
    switchRole(role);
    Alert.alert(
      'Role Switched',
      `Switched to ${role.toUpperCase()} experience. Bottom navigation and screens updated.`,
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out from JalRide?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header title="My Profile & Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarLetter}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.userName, isDark && styles.textLight]}>{user?.name || 'Aman Sharma'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'aman@example.com'}</Text>
            <View style={styles.badgeRow}>
              <Badge label={`Role: ${activeRole}`} variant="teal" size="small" />
              {user?.isEmailVerified && (
                <Badge label="Verified Email" variant="success" size="small" style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>
        </Card>

        {/* ROLE SWITCHER SECTION (Only if user has elevated permissions) */}
        {(user?.role === 'admin' || user?.role === 'owner') && (
          <>
            <Text style={[styles.sectionHeading, isDark && styles.textLight]}>
              Console Interface Mode
            </Text>
            <Text style={styles.sectionSubtitle}>
              Switch between administrative console and passenger views.
            </Text>

            <View style={styles.roleGrid}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  activeRole === 'customer' && styles.roleCardActive,
                  isDark && activeRole !== 'customer' && styles.roleCardDark,
                ]}
                onPress={() => handleRoleChange('customer')}
              >
                <Text style={styles.roleIcon}>🛶</Text>
                <Text style={[styles.roleTitle, activeRole === 'customer' && styles.roleTextActive]}>
                  Rider View
                </Text>
                <Text style={styles.roleDesc}>Search boats, book rides, wallet</Text>
              </TouchableOpacity>

              {(user?.role === 'owner' || user?.role === 'admin') && (
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    activeRole === 'owner' && styles.roleCardActive,
                    isDark && activeRole !== 'owner' && styles.roleCardDark,
                  ]}
                  onPress={() => handleRoleChange('owner')}
                >
                  <Text style={styles.roleIcon}>⚓</Text>
                  <Text style={[styles.roleTitle, activeRole === 'owner' && styles.roleTextActive]}>
                    Boat Owner
                  </Text>
                  <Text style={styles.roleDesc}>Fleet, dispatch, earnings</Text>
                </TouchableOpacity>
              )}

              {user?.role === 'admin' && user?.email?.toLowerCase().trim() === 'prepwave.pushpendra@gmail.com' && (
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    activeRole === 'admin' && styles.roleCardActive,
                    isDark && activeRole !== 'admin' && styles.roleCardDark,
                  ]}
                  onPress={() => handleRoleChange('admin')}
                >
                  <Text style={styles.roleIcon}>👑</Text>
                  <Text style={[styles.roleTitle, activeRole === 'admin' && styles.roleTextActive]}>
                    Platform Admin
                  </Text>
                  <Text style={styles.roleDesc}>Super-admin platform console</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Preferences Section */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>Preferences</Text>

        <Card style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={[styles.settingLabel, isDark && styles.textLight]}>Dark Mode</Text>
              <Text style={styles.settingSub}>Switch between dark and light themes</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => toggleTheme(val ? 'dark' : 'light')}
              trackColor={{ false: colors.gray300, true: colors.teal }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View>
              <Text style={[styles.settingLabel, isDark && styles.textLight]}>JalRide Wallet & Cards</Text>
              <Text style={styles.settingSub}>Manage bank accounts and top-up cards</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View>
              <Text style={[styles.settingLabel, isDark && styles.textLight]}>Notifications</Text>
              <Text style={styles.settingSub}>Booking updates, Aarti schedules</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* Trust, Security & DPDP Compliance */}
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>Security & Compliance</Text>
        <Card style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Alert.alert('DPDP Privacy Act 2023', 'Your personal data is encrypted and securely held under Indian Digital Personal Data Protection Act regulations. No GPS or biometric data is stored without explicit consent.')}
          >
            <View>
              <Text style={[styles.settingLabel, isDark && styles.textLight]}>Privacy & DPDP Compliance</Text>
              <Text style={styles.settingSub}>Data privacy rights & consent manager</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </Card>

        {/* Log Out Actions */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out of JalRide</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  containerDark: {
    backgroundColor: '#0a1e23',
  },
  textLight: {
    color: '#eaf6f6',
  },
  scroll: {
    padding: spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.l,
    marginBottom: spacing.xl,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  avatarLetter: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h3,
    color: colors.ink,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.ink,
    marginTop: spacing.l,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing.m,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  roleCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.m,
    borderRadius: radii.m,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    alignItems: 'center',
  },
  roleCardDark: {
    backgroundColor: '#12262b',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleCardActive: {
    backgroundColor: colors.tealMist,
    borderColor: colors.teal,
  },
  roleIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  roleTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  roleTextActive: {
    color: colors.teal,
  },
  roleDesc: {
    fontSize: 9,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 2,
  },
  settingsCard: {
    padding: 0,
    marginBottom: spacing.xl,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.l,
  },
  settingLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.ink,
  },
  settingSub: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 16,
    color: colors.gray400,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.line,
  },
  logoutBtn: {
    backgroundColor: colors.dangerMist,
    paddingVertical: 14,
    borderRadius: radii.m,
    alignItems: 'center',
    marginTop: spacing.m,
  },
  logoutText: {
    ...typography.button,
    color: colors.danger,
  },
});
