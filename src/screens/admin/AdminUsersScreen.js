import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';

export default function AdminUsersScreen({ navigation }) {
  const { isDark } = useTheme();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'customer' | 'owner'

  useEffect(() => {
    api.getAdminUsers().then((res) => setUsers(res || []));
  }, []);

  const loadUsers = () => {
    api.getAdminUsers().then((res) => setUsers(res || [])).catch(() => {});
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await api.toggleUserActive(userId);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: !currentActive } : u))
      );
      Alert.alert('Status Updated', `User account ${!currentActive ? 'Activated' : 'Suspended'}.`);
      loadUsers();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Unable to toggle user active status.');
    }
  };

  const handleManualVerify = async (userId) => {
    try {
      await api.verifyUserEmail(userId);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isEmailVerified: true } : u))
      );
      Alert.alert('Email Verified', 'User email address verified per FR-AUTH-2 specification.');
      loadUsers();
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Unable to verify email address.');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="User & Operator Directory"
        subtitle="Manage customer, navik, and administrator accounts"
        onBack={() => navigation.goBack()}
      />

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or role..."
          placeholderTextColor={colors.gray400}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Role Tabs */}
      <View style={styles.roleTabs}>
        {['all', 'customer', 'owner'].map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.roleTab,
              filterRole === r && styles.roleTabActive,
            ]}
            onPress={() => setFilterRole(r)}
          >
            <Text
              style={[
                styles.roleTabText,
                filterRole === r && styles.roleTabTextActive,
              ]}
            >
              {r === 'all' ? 'All Accounts' : r === 'customer' ? 'Riders' : 'Boat Owners'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <View style={styles.userRow}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.userName, isDark && styles.textLight]}>{item.name}</Text>
                  <Badge
                    label={item.role}
                    variant={item.role === 'admin' ? 'sun' : item.role === 'owner' ? 'teal' : 'default'}
                    size="small"
                  />
                </View>

                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userStatus}>
                  Status: {item.isActive !== false ? '🟢 Active' : '🔴 Suspended'}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  item.isActive === false ? styles.activateBtn : styles.suspendBtn,
                ]}
                onPress={() => handleToggleActive(item._id, item.isActive !== false)}
              >
                <Text style={styles.btnText}>
                  {item.isActive !== false ? 'Suspend Account' : 'Activate Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => handleManualVerify(item._id)}
              >
                <Text style={styles.verifyText}>Verify Email ✓</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
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
  searchBox: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
  },
  searchInput: {
    height: 44,
    backgroundColor: colors.gray100,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    ...typography.body,
    color: colors.ink,
  },
  roleTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    gap: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  roleTab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.m,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  roleTabActive: {
    backgroundColor: colors.teal,
  },
  roleTabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray600,
  },
  roleTabTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
    paddingBottom: 40,
  },
  userCard: {
    padding: spacing.l,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  avatarText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  userEmail: {
    ...typography.caption,
    color: colors.gray500,
  },
  userStatus: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.s,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  suspendBtn: {
    backgroundColor: colors.dangerMist,
  },
  activateBtn: {
    backgroundColor: colors.successMist,
  },
  btnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  verifyBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.m,
    backgroundColor: colors.tealMist,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  verifyText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
  },
});
