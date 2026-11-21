// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  AppState,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';

// Standard operational cancellation reasons matching backend contract
const CANCEL_REASONS = [
  'Adverse river/weather conditions',
  'Vessel mechanical inspection',
  'Passenger requested cancellation',
  'Passenger no-show at scheduled departure',
];

export default function OwnerBookingsScreen({ navigation }) {
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'confirmed' | 'pending' | 'cash' | 'completed'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Data freshness guards
  const isFetchingRef = useRef(false);
  const hasQueuedRefreshRef = useRef(false);

  // Cancellation modal state
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState(CANCEL_REASONS[0]);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // QR & Ticket verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMode, setVerifyMode] = useState('camera'); // 'camera' | 'manual'
  const [permission, requestPermission] = useCameraPermissions();
  const [manualTicketInput, setManualTicketInput] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const isScanningLockedRef = useRef(false);

  // Viewfinder laser sweep animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim;
    if (showVerifyModal && verifyMode === 'camera' && !verifyResult) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 200,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      laserAnim.setValue(0);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [showVerifyModal, verifyMode, verifyResult, laserAnim]);

  const fetchBookings = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current) {
      hasQueuedRefreshRef.current = true;
      return;
    }
    isFetchingRef.current = true;
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const data = await api.getOwnerBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Error fetching owner bookings:', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      if (hasQueuedRefreshRef.current) {
        hasQueuedRefreshRef.current = false;
        fetchBookings(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings(bookings.length > 0);
    }, [fetchBookings, bookings.length])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchBookings(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(false);
  };

  const handleAction = async (actionType, bookingId, customReason) => {
    if (actionLoadingId) return;
    setActionLoadingId(bookingId);
    try {
      if (actionType === 'confirm') {
        await api.acceptOwnerBooking(bookingId);
        Alert.alert('Ride Confirmed', 'Passenger notified and seat reserved on boat.');
      } else if (actionType === 'hold') {
        await api.holdOwnerBooking(bookingId);
        Alert.alert('Put on Hold', 'Slot marked pending readiness confirmation.');
      } else if (actionType === 'cancel') {
        await api.rejectOwnerBooking(bookingId, customReason || 'Operational adjustment');
        Alert.alert('Ride Cancelled', 'Booking cancelled and refund processed according to policy.');
      } else if (actionType === 'cash') {
        await api.markCashReceived(bookingId);
        Alert.alert('Cash Collected', 'Cash payment confirmed and recorded.');
      } else if (actionType === 'start') {
        await api.startRide(bookingId);
        Alert.alert('Ride Started 🚢', 'Vessel is now in progress on the Ganga.');
      } else if (actionType === 'complete') {
        await api.completeRide(bookingId);
        Alert.alert('Ride Completed ✓', 'Trip completed. Earnings credited to your available balance.');
      }
      await fetchBookings(true);
    } catch (err) {
      Alert.alert('Action Failed', err.message || 'Unable to update booking status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openCancelModal = (bookingId) => {
    setCancelBookingId(bookingId);
    setSelectedCancelReason(CANCEL_REASONS[0]);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelBookingId) return;
    const bId = cancelBookingId;
    const reason = selectedCancelReason;
    setShowCancelModal(false);
    setCancelBookingId(null);
    await handleAction('cancel', bId, reason);
  };

  // Ticket verification handler for Camera barcode scan
  const handleBarcodeScanned = async ({ data }) => {
    if (isVerifying || isScanningLockedRef.current || !data) return;
    isScanningLockedRef.current = true;
    setIsVerifying(true);
    try {
      const res = await api.verifyTicketQr(data);
      setVerifyResult(res);
    } catch (err) {
      setVerifyResult({
        valid: false,
        message: err.message || 'Ticket verification failed.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Ticket verification handler for manual Ticket ID
  const handleManualVerify = async () => {
    const cleanId = manualTicketInput.trim().toUpperCase();
    if (!cleanId) {
      Alert.alert('Ticket ID Required', 'Please enter a valid ticket number.');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await api.verifyTicketById(cleanId);
      setVerifyResult(res);
    } catch (err) {
      setVerifyResult({
        valid: false,
        message: err.message || 'Ticket not found or verification failed.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const resetScanner = () => {
    setVerifyResult(null);
    setManualTicketInput('');
    isScanningLockedRef.current = false;
  };

  const closeVerifyModal = () => {
    setShowVerifyModal(false);
    resetScanner();
    fetchBookings(true);
  };

  const filtered = bookings.filter((b) => {
    const bookingStatus = b.bookingStatus || b.status;
    const rideStatus = b.rideStatus;
    if (filter === 'pending') return bookingStatus === 'pending';
    if (filter === 'confirmed') return bookingStatus === 'confirmed' && rideStatus !== 'ride_completed';
    if (filter === 'completed') return bookingStatus === 'completed' || rideStatus === 'ride_completed';
    if (filter === 'cash') return b.paymentMethod === 'cash';
    return true;
  });

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Fleet Dispatch & Bookings"
        subtitle="Live dispatch, ticket check-in & cash collection"
        rightAction={
          <TouchableOpacity
            style={styles.scanPassBtn}
            onPress={() => {
              resetScanner();
              setShowVerifyModal(true);
            }}
          >
            <Text style={styles.scanPassBtnText}>📷 Verify Pass</Text>
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterStrip}>
        {['all', 'confirmed', 'pending', 'cash', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && styles.filterTabActive,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === 'cash' ? '💵 Cash' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id || String(Math.random())}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.teal]}
            tintColor={colors.teal}
          />
        }
        renderItem={({ item }) => {
          // Explicit separation of bookingStatus, rideStatus, paymentStatus
          const bookingStatus = item.bookingStatus || item.status || 'confirmed';
          const rideStatus = item.rideStatus || 'confirmed';
          const paymentStatus = item.paymentStatus || 'paid';
          const isCash = item.paymentMethod === 'cash';

          const customerName = item.customer?.name || item.customerName || 'Devotee / Passenger';
          const customerPhone = item.customer?.phone || item.customerPhone || 'N/A';
          const customerEmail = item.customer?.email || 'N/A';
          const boatName = item.boat?.boatName || item.boatName || 'Assigned Boat';
          const location = item.boat?.location || item.location || 'Varanasi Ghats';
          const totalFare = item.totalAmount ?? item.amount ?? 0;
          const netEarningsDisplay = (item.ownerEarningAmount !== null && item.ownerEarningAmount !== undefined && typeof item.ownerEarningAmount === 'number')
            ? `₹${item.ownerEarningAmount}`
            : (item.ownerEarningAmount != null ? `₹${item.ownerEarningAmount}` : 'N/A');
          const ticketId = item.ticketId || item.bookingNumber || ('JR-' + (item._id ? item._id.slice(-6).toUpperCase() : '0000'));
          const formattedDate = item.bookingDate
            ? new Date(item.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : (item.date || 'Today');
          const timeSlot = item.bookingTime || item.timeSlot || item.time || 'Scheduled Slot';
          const seats = item.passengers || item.seats || item.numberOfPassengers || 1;
          const isActionLoading = actionLoadingId === item._id;

          // Compute accurate badge state based on decoupled statuses
          let badgeLabel = bookingStatus.toUpperCase();
          let badgeVariant = 'default';
          if (bookingStatus === 'cancelled' || bookingStatus === 'rejected') {
            badgeLabel = 'CANCELLED';
            badgeVariant = 'danger';
          } else if (bookingStatus === 'pending') {
            badgeLabel = 'PENDING';
            badgeVariant = 'warning';
          } else if (rideStatus === 'ride_started') {
            badgeLabel = '🚤 IN RIDE';
            badgeVariant = 'accent';
          } else if (rideStatus === 'ride_completed' || bookingStatus === 'completed') {
            badgeLabel = '✓ COMPLETED';
            badgeVariant = 'success';
          } else if (bookingStatus === 'confirmed') {
            badgeLabel = 'CONFIRMED';
            badgeVariant = 'success';
          }

          return (
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, marginRight: spacing.s }}>
                  <Text style={styles.ticketId}>{ticketId}</Text>
                  <Text style={[styles.customerName, isDark && styles.textLight]}>
                    {customerName}
                  </Text>
                  <Text style={styles.customerPhone}>📞 {customerPhone}</Text>
                  {customerEmail !== 'N/A' && (
                    <Text style={styles.customerEmail}>✉️ {customerEmail}</Text>
                  )}
                </View>

                <Badge
                  label={badgeLabel}
                  variant={badgeVariant}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.infoText}>⛵ {boatName}</Text>
                <Text style={styles.infoText}>📍 {location}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.infoText}>📅 {formattedDate} ({timeSlot})</Text>
                <Text style={styles.infoText}>👥 {seats} Seats</Text>
              </View>

              <View style={styles.fareBox}>
                <View>
                  <Text style={styles.fareLabel}>Total Fare: ₹{totalFare}</Text>
                  <Text style={styles.paymentMethodLabel}>
                    Payment: {isCash ? '💵 Cash on Ride' : '💳 Online'} ({paymentStatus})
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.earningLabel}>Owner Net</Text>
                  <Text style={styles.earningHighlight}>{netEarningsDisplay}</Text>
                </View>
              </View>

              {/* Lifecycle Action Buttons */}
              {isActionLoading ? (
                <View style={styles.actionLoadingBox}>
                  <ActivityIndicator size="small" color={colors.teal} />
                  <Text style={styles.actionLoadingText}>Updating ride status...</Text>
                </View>
              ) : (
                <View style={styles.actionGrid}>
                  {/* PENDING ACTIONS */}
                  {bookingStatus === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtnConfirm}
                        onPress={() => handleAction('confirm', item._id)}
                      >
                        <Text style={styles.btnTextWhite}>✓ Confirm</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnHold}
                        onPress={() => handleAction('hold', item._id)}
                      >
                        <Text style={styles.btnTextDark}>⏸ Hold</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnCancel}
                        onPress={() => openCancelModal(item._id)}
                      >
                        <Text style={styles.btnTextDanger}>✕ Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* CONFIRMED & READY TO START */}
                  {bookingStatus === 'confirmed' && rideStatus !== 'ride_started' && rideStatus !== 'ride_completed' && (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtnStart}
                        onPress={() => {
                          Alert.alert(
                            'Start Ride',
                            'Confirm vessel departure on the Ganga for this booking?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Start Ride 🚢', style: 'default', onPress: () => handleAction('start', item._id) },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.btnTextWhite}>🚢 Start Ride</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnHold}
                        onPress={() => handleAction('hold', item._id)}
                      >
                        <Text style={styles.btnTextDark}>⏸ Hold</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnCancel}
                        onPress={() => openCancelModal(item._id)}
                      >
                        <Text style={styles.btnTextDanger}>✕ Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* IN RIDE -> FINISH RIDE */}
                  {rideStatus === 'ride_started' && (
                    <TouchableOpacity
                      style={styles.actionBtnComplete}
                      onPress={() => {
                        Alert.alert(
                          'Finish Ride',
                          'Has the vessel safely completed the ride and docked at the ghat?',
                          [
                            { text: 'Not Yet', style: 'cancel' },
                            { text: 'Confirm Docked 🏁', style: 'default', onPress: () => handleAction('complete', item._id) },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.btnTextWhite}>🏁 Finish Ride</Text>
                    </TouchableOpacity>
                  )}

                  {/* CASH COLLECTION BUTTON */}
                  {isCash && paymentStatus !== 'paid' && bookingStatus !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.actionBtnCash}
                      onPress={() => handleAction('cash', item._id)}
                    >
                      <Text style={styles.btnTextWhite}>💵 Cash Received</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.teal} />
              <Text style={{ ...typography.bodyMedium, color: colors.gray500, marginTop: 12 }}>
                Loading bookings...
              </Text>
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
              <Text style={{ ...typography.bodyMedium, color: colors.gray500, textAlign: 'center' }}>
                No bookings match the selected filter.
              </Text>
            </View>
          )
        }
      />

      {/* CANCELLATION REASONS MODAL */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            <Text style={[styles.modalTitle, isDark && styles.textLight]}>
              Select Reason for Cancellation
            </Text>
            <Text style={styles.modalSubtitle}>
              Passenger will be notified and any payment processed for refund per policy.
            </Text>

            <View style={styles.reasonsList}>
              {CANCEL_REASONS.map((reason) => {
                const isSelected = selectedCancelReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonOption,
                      isSelected && styles.reasonOptionActive,
                    ]}
                    onPress={() => setSelectedCancelReason(reason)}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        isSelected && styles.reasonTextActive,
                        isDark && isSelected && { color: colors.tealLight },
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Keep Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCancel}
              >
                <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OWNER TICKET QR SCANNER & MANUAL CHECK-IN MODAL */}
      <Modal
        visible={showVerifyModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeVerifyModal}
      >
        <View style={[styles.verifyModalContainer, isDark && styles.containerDark]}>
          <StatusBar barStyle="light-content" />

          {/* Modal Header */}
          <View style={styles.verifyHeader}>
            <View>
              <Text style={styles.verifyHeaderTitle}>🎫 Boarding Pass Verification</Text>
              <Text style={styles.verifyHeaderSub}>Scan QR code or verify Ticket ID at ghat</Text>
            </View>
            <TouchableOpacity style={styles.verifyCloseBtn} onPress={closeVerifyModal}>
              <Text style={styles.verifyCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Tabs: Camera vs Manual */}
          {!verifyResult && (
            <View style={styles.verifyTabs}>
              <TouchableOpacity
                style={[styles.verifyTab, verifyMode === 'camera' && styles.verifyTabActive]}
                onPress={() => setVerifyMode('camera')}
              >
                <Text style={[styles.verifyTabText, verifyMode === 'camera' && styles.verifyTabTextActive]}>
                  📷 Scan Ticket QR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verifyTab, verifyMode === 'manual' && styles.verifyTabActive]}
                onPress={() => setVerifyMode('manual')}
              >
                <Text style={[styles.verifyTabText, verifyMode === 'manual' && styles.verifyTabTextActive]}>
                  ⌨️ Enter Ticket ID
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* VIEW: VERIFICATION RESULT CARD */}
          {verifyResult ? (
            <View style={styles.resultContainer}>
              <Card
                style={[
                  styles.resultCard,
                  verifyResult.valid && !verifyResult.alreadyCheckedIn && styles.resultCardSuccess,
                  verifyResult.valid && verifyResult.alreadyCheckedIn && styles.resultCardWarning,
                  !verifyResult.valid && styles.resultCardDanger,
                ]}
              >
                {/* Status Header Banner */}
                {verifyResult.valid && !verifyResult.alreadyCheckedIn && (
                  <View style={styles.resultBannerSuccess}>
                    <Text style={styles.resultBannerTitle}>✓ VALID FOR BOARDING</Text>
                    <Text style={styles.resultBannerSub}>Pass confirmed & passenger checked in</Text>
                  </View>
                )}

                {verifyResult.valid && verifyResult.alreadyCheckedIn && (
                  <View style={styles.resultBannerWarning}>
                    <Text style={styles.resultBannerTitle}>⚠️ ALREADY CHECKED IN</Text>
                    <Text style={styles.resultBannerSub}>
                      Checked in at {verifyResult.booking?.checkedInAt ? new Date(verifyResult.booking.checkedInAt).toLocaleTimeString('en-IN') : 'an earlier time'}
                    </Text>
                  </View>
                )}

                {!verifyResult.valid && (
                  <View style={styles.resultBannerDanger}>
                    <Text style={styles.resultBannerTitle}>✕ INVALID / TAMPERED TICKET</Text>
                    <Text style={styles.resultBannerSub}>
                      {verifyResult.message || 'Signature mismatch or unconfirmed ticket'}
                    </Text>
                  </View>
                )}

                {/* Details Section */}
                {verifyResult.booking && (
                  <View style={styles.resultBody}>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Passenger:</Text>
                      <Text style={styles.resultValueBold}>
                        {verifyResult.booking.customerName || verifyResult.booking.customer?.name || 'Devotee / Passenger'}
                      </Text>
                    </View>

                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Ticket ID:</Text>
                      <Text style={styles.resultValueMono}>{verifyResult.booking.ticketId}</Text>
                    </View>

                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Seats / Passengers:</Text>
                      <Text style={styles.resultValueBold}>{verifyResult.booking.passengers || 1} Passengers</Text>
                    </View>

                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Pickup Ghat:</Text>
                      <Text style={styles.resultValue}>
                        📍 {verifyResult.booking.boat?.location || 'Varanasi Ghat'}
                      </Text>
                    </View>

                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Schedule:</Text>
                      <Text style={styles.resultValue}>
                        📅 {verifyResult.booking.bookingDate} ({verifyResult.booking.bookingTime || 'Scheduled'})
                      </Text>
                    </View>

                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Payment Status:</Text>
                      <Text style={styles.resultValueBold}>
                        {verifyResult.booking.paymentStatus === 'paid' ? '💳 Paid Online' : '💵 Cash on Ride'}
                      </Text>
                    </View>

                    {verifyResult.alreadyCheckedIn && (
                      <View style={styles.warningNotice}>
                        <Text style={styles.warningNoticeText}>
                          ⚠️ Caution: This boarding pass was already scanned. Duplicate boarding is prohibited.
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.resultActions}>
                  <Button
                    title="📷 Scan Next Passenger"
                    onPress={resetScanner}
                    style={{ marginBottom: spacing.m }}
                  />
                  <TouchableOpacity style={styles.doneBtn} onPress={closeVerifyModal}>
                    <Text style={styles.doneBtnText}>Close & Return to Dispatch</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          ) : (
            /* VIEW: SCANNER OR MANUAL INPUT */
            <View style={{ flex: 1 }}>
              {verifyMode === 'camera' ? (
                <View style={styles.cameraContainer}>
                  {permission?.granted ? (
                    <CameraView
                      style={StyleSheet.absoluteFillObject}
                      facing="back"
                      enableTorch={torchOn}
                      onBarcodeScanned={handleBarcodeScanned}
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                      }}
                    />
                  ) : (
                    <View style={styles.permissionBox}>
                      <Text style={{ fontSize: 44, marginBottom: 12 }}>📷</Text>
                      <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                      <Text style={styles.permissionSub}>
                        JalRide requires camera access to scan customer boarding passes at the ghat.
                      </Text>
                      <Button
                        title="Grant Camera Access"
                        onPress={requestPermission}
                        style={{ marginTop: spacing.l, width: 220 }}
                      />
                    </View>
                  )}

                  {/* Viewfinder Overlay */}
                  {permission?.granted && (
                    <View style={styles.viewfinderOverlay} pointerEvents="box-none">
                      <View style={styles.viewfinderFrame}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />

                        <Animated.View
                          style={[
                            styles.laserLine,
                            { transform: [{ translateY: laserAnim }] },
                          ]}
                        />
                      </View>

                      <Text style={styles.viewfinderHint}>
                        Point camera at passenger's digital ticket or PDF printout
                      </Text>

                      <TouchableOpacity
                        style={styles.torchToggleBtn}
                        onPress={() => setTorchOn(!torchOn)}
                      >
                        <Text style={styles.torchToggleText}>{torchOn ? '🔦 Torch ON' : '🔦 Torch OFF'}</Text>
                      </TouchableOpacity>

                      {isVerifying && (
                        <View style={styles.verifyingIndicator}>
                          <ActivityIndicator size="small" color={colors.white} />
                          <Text style={styles.verifyingIndicatorText}>
                            Verifying cryptographic signature...
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                /* MANUAL TICKET ID INPUT */
                <View style={styles.manualContainer}>
                  <Card style={styles.manualCard}>
                    <Text style={[styles.manualTitle, isDark && styles.textLight]}>
                      Verify by Ticket ID
                    </Text>
                    <Text style={styles.manualSub}>
                      Enter the 12-character Ticket ID printed on passenger's boarding pass (e.g. JR-2026-X89).
                    </Text>

                    <TextInput
                      style={[styles.ticketInput, isDark && styles.ticketInputDark]}
                      placeholder="JR-..."
                      placeholderTextColor={colors.gray400}
                      value={manualTicketInput}
                      onChangeText={setManualTicketInput}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />

                    <Button
                      title={isVerifying ? 'Verifying with Registry...' : '🔍 Verify Ticket'}
                      onPress={handleManualVerify}
                      disabled={isVerifying || !manualTicketInput.trim()}
                      style={{ marginTop: spacing.l }}
                    />
                  </Card>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbfb',
  },
  containerDark: {
    backgroundColor: '#0a1e23',
  },
  textLight: {
    color: '#ffffff',
  },
  scanPassBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  scanPassBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  filterStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    gap: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.m,
    borderRadius: radii.full,
    backgroundColor: colors.gray100,
  },
  filterTabActive: {
    backgroundColor: colors.teal,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.gray600,
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.l,
    gap: spacing.l,
    paddingBottom: 40,
  },
  card: {
    padding: spacing.l,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketId: {
    ...typography.mono,
    color: colors.teal,
    fontSize: 12,
  },
  customerName: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  customerPhone: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  customerEmail: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.m,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  fareBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    padding: spacing.m,
    borderRadius: radii.s,
    marginVertical: spacing.m,
  },
  fareLabel: {
    ...typography.bodySmall,
    color: colors.ink,
    fontWeight: '600',
  },
  paymentMethodLabel: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  earningLabel: {
    ...typography.caption,
    color: colors.gray500,
  },
  earningHighlight: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.success,
  },
  actionLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    gap: spacing.s,
  },
  actionLoadingText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  actionBtnConfirm: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnHold: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.warningMist,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnStart: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.teal,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnCash: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.sunDeep,
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnComplete: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: radii.m,
    alignItems: 'center',
  },
  actionBtnCancel: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: radii.m,
    alignItems: 'center',
    backgroundColor: colors.dangerMist,
    marginTop: 4,
  },
  btnTextWhite: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.white,
  },
  btnTextDark: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.warning,
  },
  btnTextDanger: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.danger,
  },

  // Modal styles for Cancellation
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radii.l,
    padding: spacing.xl,
    ...shadows.l,
  },
  modalCardDark: {
    backgroundColor: '#0a2e36',
  },
  modalTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing.l,
  },
  reasonsList: {
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.gray50,
  },
  reasonOptionActive: {
    borderColor: colors.teal,
    backgroundColor: 'rgba(20, 107, 121, 0.08)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.m,
  },
  radioCircleActive: {
    borderColor: colors.teal,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal,
  },
  reasonText: {
    ...typography.bodySmall,
    color: colors.ink,
    flex: 1,
  },
  reasonTextActive: {
    fontWeight: '700',
    color: colors.teal,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.m,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  modalCancelBtnText: {
    ...typography.bodySmall,
    color: colors.gray500,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    backgroundColor: colors.danger,
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
  },
  modalConfirmBtnText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },

  // Verify Modal styles
  verifyModalContainer: {
    flex: 1,
    backgroundColor: '#04151a',
  },
  verifyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingTop: 50,
    paddingBottom: spacing.m,
    backgroundColor: '#0a2e36',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  verifyHeaderTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.white,
  },
  verifyHeaderSub: {
    ...typography.caption,
    color: '#8fd6de',
    marginTop: 2,
  },
  verifyCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyCloseBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  verifyTabs: {
    flexDirection: 'row',
    backgroundColor: '#0a2e36',
    padding: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  verifyTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.m,
  },
  verifyTabActive: {
    backgroundColor: colors.teal,
  },
  verifyTabText: {
    ...typography.bodySmall,
    color: '#8fd6de',
    fontWeight: '600',
  },
  verifyTabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10b981',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  laserLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  viewfinderHint: {
    ...typography.bodySmall,
    color: colors.white,
    marginTop: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  torchToggleBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  torchToggleText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  verifyingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: colors.teal,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    gap: 8,
  },
  verifyingIndicatorText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  permissionSub: {
    ...typography.bodySmall,
    color: colors.gray400,
    textAlign: 'center',
  },
  manualContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  manualCard: {
    padding: spacing.xl,
  },
  manualTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  manualSub: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing.l,
  },
  ticketInput: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.m,
    paddingHorizontal: spacing.l,
    paddingVertical: 12,
    ...typography.mono,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: 1.5,
  },
  ticketInputDark: {
    backgroundColor: '#0a1e23',
    borderColor: 'rgba(255,255,255,0.15)',
    color: colors.white,
  },

  // Result card styling
  resultContainer: {
    flex: 1,
    padding: spacing.l,
    justifyContent: 'center',
  },
  resultCard: {
    padding: 0,
    overflow: 'hidden',
  },
  resultCardSuccess: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  resultCardWarning: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  resultCardDanger: {
    borderWidth: 2,
    borderColor: colors.danger,
  },
  resultBannerSuccess: {
    backgroundColor: colors.success,
    padding: spacing.l,
    alignItems: 'center',
  },
  resultBannerWarning: {
    backgroundColor: colors.warning,
    padding: spacing.l,
    alignItems: 'center',
  },
  resultBannerDanger: {
    backgroundColor: colors.danger,
    padding: spacing.l,
    alignItems: 'center',
  },
  resultBannerTitle: {
    ...typography.bodyLarge,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  resultBannerSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    textAlign: 'center',
  },
  resultBody: {
    padding: spacing.xl,
    gap: spacing.m,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: spacing.s,
  },
  resultLabel: {
    ...typography.bodySmall,
    color: colors.gray500,
  },
  resultValue: {
    ...typography.bodySmall,
    color: colors.ink,
    fontWeight: '500',
  },
  resultValueBold: {
    ...typography.bodySmall,
    color: colors.ink,
    fontWeight: '700',
  },
  resultValueMono: {
    ...typography.mono,
    color: colors.teal,
    fontWeight: '700',
    fontSize: 14,
  },
  warningNotice: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radii.m,
    padding: spacing.m,
    marginTop: spacing.s,
  },
  warningNoticeText: {
    ...typography.caption,
    color: '#92400e',
    fontWeight: '600',
  },
  resultActions: {
    padding: spacing.xl,
    paddingTop: 0,
  },
  doneBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radii.m,
    backgroundColor: colors.gray100,
  },
  doneBtnText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.ink,
  },
});
