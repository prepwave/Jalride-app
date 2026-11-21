import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function OwnerQrPostersScreen({ navigation }) {
  const { isDark } = useTheme();
  const [posters, setPosters] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadPosters = async () => {
    try {
      setLoading(true);
      const res = await api.getOwnerQrPosters();
      if (Array.isArray(res) && res.length > 0) {
        setPosters(res);
      } else {
        const boats = await api.getOwnerBoats();
        setPosters(boats || []);
      }
    } catch (e) {
      console.warn('Error loading owner QR posters:', e);
      try {
        const boats = await api.getOwnerBoats();
        setPosters(boats || []);
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosters();
  }, []);

  const activeBoat = posters[selectedIndex] || null;

  const standeeUrl = activeBoat
    ? `https://jalride-v1.vercel.app/qr-book.html?boat=${encodeURIComponent(activeBoat.qrCodeId || activeBoat._id)}`
    : '';

  const pdfUrl = activeBoat
    ? `${api.baseUrl}/owner/qr/poster/${activeBoat._id}/pdf`
    : '';

  const handleToggleQrBooking = async () => {
    if (!activeBoat || updating) return;
    setUpdating(true);
    try {
      const res = await api.toggleBoatQrBooking(activeBoat._id);
      const newEnabled = res.qrBookingEnabled !== undefined ? res.qrBookingEnabled : !activeBoat.qrBookingEnabled;
      setPosters((prev) =>
        prev.map((b, idx) => (idx === selectedIndex ? { ...b, qrBookingEnabled: newEnabled } : b))
      );
      Alert.alert(
        'Instant Booking Updated',
        `Instant Ghat QR booking is now ${newEnabled ? 'ACTIVE 🟢' : 'PAUSED ⏸️'} for ${activeBoat.boatName}.`
      );
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Could not toggle instant booking.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!activeBoat || updating || activeBoat.currentRideStatus === newStatus) return;
    setUpdating(true);
    try {
      await api.updateBoatLiveStatus(activeBoat._id, newStatus);
      setPosters((prev) =>
        prev.map((b, idx) => (idx === selectedIndex ? { ...b, currentRideStatus: newStatus } : b))
      );
      Alert.alert('Status Updated', `${activeBoat.boatName} is now marked as ${newStatus.toUpperCase()}.`);
    } catch (err) {
      Alert.alert('Status Change Failed', err.message || 'Could not update boat status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSharePoster = async () => {
    if (!activeBoat) return;
    try {
      await Share.share({
        message: `🪧 JalRide Ghat Standee: Scan QR at ${activeBoat.location || 'Ghat'} to book ${activeBoat.boatName} in 30 seconds!\n${standeeUrl}`,
        title: `JalRide Standee Poster - ${activeBoat.boatName}`,
      });
    } catch (_) {}
  };

  const handleDownloadPdf = async () => {
    if (!activeBoat) return;
    try {
      await Share.share({
        message: `Official High-Resolution Printable A4 Ghat Standee PDF for ${activeBoat.boatName} (${activeBoat.qrCodeId || activeBoat._id}):\n${pdfUrl}`,
        title: `Printable Standee PDF - ${activeBoat.boatName}`,
      });
    } catch (_) {
      Alert.alert('Standee PDF Link', pdfUrl);
    }
  };

  const getStatusBadgeVariant = (st) => {
    if (st === 'available') return 'success';
    if (st === 'maintenance') return 'warning';
    if (st === 'offline') return 'secondary';
    return 'info';
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Ghat QR Standee Posters"
        subtitle="Printable A4 standees for instant walk-up tourists"
        onBack={() => navigation.goBack()}
        rightAction={
          activeBoat ? (
            <TouchableOpacity onPress={handleSharePoster}>
              <Text style={styles.shareText}>Share ↗</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={[styles.loadingText, isDark && styles.textLight]}>
            Loading Fleet Standee QR Posters...
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!activeBoat ? (
            <Card style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🛶</Text>
              <Text
                style={{
                  ...typography.bodyLarge,
                  fontWeight: '700',
                  color: isDark ? '#eaf6f6' : colors.ink,
                  textAlign: 'center',
                  marginBottom: 6,
                }}
              >
                No Vessels in Fleet
              </Text>
              <Text
                style={{
                  ...typography.body,
                  color: colors.gray500,
                  textAlign: 'center',
                  marginBottom: spacing.l,
                }}
              >
                Register a boat in 'My Fleet' to generate your customized QR standee poster for ghat boarding.
              </Text>
              <Button
                title="+ Add Your First Boat"
                onPress={() => navigation.navigate('AddEditBoat')}
              />
            </Card>
          ) : (
            <>
              {/* Boat Selector Tabs if multiple boats */}
              {posters.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.boatPillsContainer}
                >
                  {posters.map((b, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <TouchableOpacity
                        key={b._id || idx}
                        style={[
                          styles.boatPill,
                          isSelected && styles.boatPillActive,
                          isDark && styles.boatPillDark,
                          isSelected && isDark && styles.boatPillActiveDark,
                        ]}
                        onPress={() => setSelectedIndex(idx)}
                      >
                        <Text
                          style={[
                            styles.boatPillText,
                            isSelected && styles.boatPillTextActive,
                          ]}
                        >
                          🛶 {b.boatName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Standee Live Control Strip */}
              <Card style={styles.controlsCard}>
                <View style={styles.controlRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.controlTitle, isDark && styles.textLight]}>
                      Instant Walk-up QR Booking
                    </Text>
                    <Text style={styles.controlSub}>
                      {activeBoat.qrBookingEnabled !== false
                        ? '🟢 Active: Tourists can scan & board immediately'
                        : '⏸️ Paused: Scanners will see instant booking paused'}
                    </Text>
                  </View>
                  <Switch
                    value={activeBoat.qrBookingEnabled !== false}
                    onValueChange={handleToggleQrBooking}
                    trackColor={{ false: colors.gray300, true: colors.teal }}
                    thumbColor={colors.white}
                  />
                </View>

                <View style={styles.divider} />

                {/* Live Status Switcher */}
                <Text style={[styles.statusSectionLabel, isDark && styles.textLight]}>
                  Live Vessel Ghat Status:
                </Text>
                <View style={styles.statusButtonsRow}>
                  {['available', 'maintenance', 'offline'].map((st) => {
                    const isCurrent = (activeBoat.currentRideStatus || 'available') === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusBtn,
                          isCurrent && styles.statusBtnActive,
                          isCurrent && st === 'available' && { backgroundColor: '#e6f7f2', borderColor: colors.teal },
                          isCurrent && st === 'maintenance' && { backgroundColor: '#fff9e6', borderColor: colors.sun },
                          isCurrent && st === 'offline' && { backgroundColor: colors.gray100, borderColor: colors.gray400 },
                        ]}
                        onPress={() => handleUpdateStatus(st)}
                        disabled={updating}
                      >
                        <Text
                          style={[
                            styles.statusBtnText,
                            isCurrent && { fontWeight: '800', color: colors.ink },
                          ]}
                        >
                          {st === 'available' ? '🟢 Ready' : st === 'maintenance' ? '🟡 Maint.' : '⚫ Offline'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Quick Performance Strip */}
                <View style={styles.perfRow}>
                  <View style={styles.perfCol}>
                    <Text style={styles.perfVal}>{activeBoat.totalQrRides || 0}</Text>
                    <Text style={styles.perfLbl}>Standee Rides</Text>
                  </View>
                  <View style={styles.perfDivider} />
                  <View style={styles.perfCol}>
                    <Text style={styles.perfVal}>{activeBoat.capacity || 10}</Text>
                    <Text style={styles.perfLbl}>Max Capacity</Text>
                  </View>
                  <View style={styles.perfDivider} />
                  <View style={styles.perfCol}>
                    <Text style={styles.perfVal}>₹{activeBoat.price || 350}</Text>
                    <Text style={styles.perfLbl}>Fare / Seat</Text>
                  </View>
                </View>
              </Card>

              {/* Printable Standee Preview Card */}
              <Card style={styles.standeeCard}>
                <View style={styles.standeeHeader}>
                  <Text style={styles.standeeBrand}>JALRIDE</Text>
                  <Text style={styles.standeeTag}>⚡ SCAN & BOARD IN 30 SECONDS</Text>
                </View>

                <View style={styles.standeeBody}>
                  <Text style={styles.standeeBoatName}>{activeBoat.boatName}</Text>
                  <Text style={styles.standeeGhat}>
                    📍 Stationed at {activeBoat.location || 'Varanasi Ghat'}
                  </Text>

                  {/* High Contrast Standee QR Graphic */}
                  <View style={styles.qrContainer}>
                    <View style={styles.qrFrame}>
                      <QRCode
                        value={standeeUrl}
                        size={200}
                        color={colors.ink}
                        backgroundColor="#ffffff"
                      />
                    </View>
                    <Text style={styles.qrSubText}>
                      {activeBoat.qrCodeId ? `ID: ${activeBoat.qrCodeId}` : `STAND-${activeBoat._id?.substring(0, 8)?.toUpperCase() || 'PASS'}`}
                    </Text>
                  </View>

                  <View style={styles.rateBadge}>
                    <Text style={styles.rateText}>Verified Fare: ₹{activeBoat.price || 350} / seat</Text>
                  </View>

                  <View style={styles.standeePerks}>
                    <Text style={styles.perkItem}>✓ Verified Safety Life Jackets</Text>
                    <Text style={styles.perkItem}>✓ Scenic River & Aarti View Seats</Text>
                    <Text style={styles.perkItem}>✓ Cash on Ghat or UPI Accepted</Text>
                  </View>
                </View>
              </Card>

              {/* Action Buttons */}
              <View style={styles.actionStack}>
                <Button
                  title="Download Print-Ready PDF Poster 📄"
                  onPress={handleDownloadPdf}
                  variant="primary"
                />

                <Button
                  title="Share Digital Standee Link ↗"
                  onPress={handleSharePoster}
                  variant="outline"
                />
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.gray600,
    marginTop: spacing.m,
  },
  shareText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.l,
  },
  boatPillsContainer: {
    paddingBottom: spacing.m,
    gap: spacing.s,
  },
  boatPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing.s,
  },
  boatPillDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  boatPillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  boatPillActiveDark: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  boatPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  boatPillTextActive: {
    color: colors.white,
  },
  controlsCard: {
    marginBottom: spacing.l,
    padding: spacing.m,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  controlSub: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.m,
  },
  statusSectionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray700,
    marginBottom: spacing.s,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.m,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  statusBtnActive: {
    borderWidth: 2,
  },
  statusBtnText: {
    ...typography.caption,
    color: colors.gray700,
    fontWeight: '600',
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,128,128,0.05)',
    borderRadius: radii.m,
    paddingVertical: spacing.s,
  },
  perfCol: {
    alignItems: 'center',
  },
  perfVal: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.teal,
  },
  perfLbl: {
    ...typography.caption,
    color: colors.gray600,
    fontSize: 10,
    marginTop: 1,
  },
  perfDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.line,
  },
  standeeCard: {
    padding: 0,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.teal,
    ...shadows.lift,
  },
  standeeHeader: {
    backgroundColor: colors.deep,
    padding: spacing.l,
    alignItems: 'center',
  },
  standeeBrand: {
    ...typography.h2,
    color: colors.white,
    letterSpacing: 1,
  },
  standeeTag: {
    ...typography.caption,
    color: colors.sun,
    fontWeight: '800',
    marginTop: 2,
  },
  standeeBody: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  standeeBoatName: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  standeeGhat: {
    ...typography.body,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 2,
  },
  qrContainer: {
    padding: spacing.m,
    backgroundColor: '#ffffff',
    borderRadius: radii.m,
    marginVertical: spacing.l,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.card,
  },
  qrFrame: {
    backgroundColor: colors.white,
    borderRadius: radii.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrSubText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.ink,
    fontSize: 12,
    marginTop: spacing.s,
  },
  rateBadge: {
    backgroundColor: colors.sunMist,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginBottom: spacing.l,
  },
  rateText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.sunDeep,
  },
  standeePerks: {
    width: '100%',
    backgroundColor: colors.paper,
    padding: spacing.m,
    borderRadius: radii.m,
    gap: 4,
  },
  perkItem: {
    ...typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  actionStack: {
    marginTop: spacing.xl,
    gap: spacing.m,
  },
});
