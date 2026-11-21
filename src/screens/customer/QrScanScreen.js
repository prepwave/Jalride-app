import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';
import Badge from '../../components/common/Badge';
import RazorpayCheckoutModal from '../../components/payment/RazorpayCheckoutModal';

export default function QrScanScreen({ navigation }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [torchOn, setTorchOn] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningActive, setIsScanningActive] = useState(true);
  const isScanningActiveRef = useRef(true);

  // Manual code fallback modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Scanned data for standees or tickets
  const [scannedData, setScannedData] = useState(null);
  const [showWalkinSheet, setShowWalkinSheet] = useState(false);
  const [walkinPassengers, setWalkinPassengers] = useState('2');
  const [walkinPayment, setWalkinPayment] = useState('cash'); // 'cash' | 'upi'
  const [isBooking, setIsBooking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Online Razorpay Payment States for Instant QR Walk-ins
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);
  const [activeQrBooking, setActiveQrBooking] = useState(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const isVerifyingPaymentRef = useRef(false);
  const isMountedRef = useRef(true);
  const retainedSignatureRef = useRef(null);
  const retainedBookingContextRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isScanningActiveRef.current = isScanningActive;
  }, [isScanningActive]);

  // Laser scanner animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 220,
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
    animation.start();
    return () => animation.stop();
  }, [laserAnim]);

  const handleBarcodeScanned = useCallback(async ({ data }) => {
    if (!isScanningActiveRef.current || !data) return;
    isScanningActiveRef.current = false;
    setIsScanningActive(false);

    try {
      // 1. Check if scanned barcode is a customer Boarding Ticket
      if (data.includes('JALRIDE:TICKET') || data.includes('JR-') || data.includes('ticketId')) {
        setIsVerifying(true);
        const verifyRes = await api.verifyTicketQr(data);
        setIsVerifying(false);

        if (verifyRes && verifyRes.success) {
          Alert.alert(
            'Ticket Verified ✓',
            `Passenger: ${verifyRes.booking?.customerName || 'Passenger'}\nTicket: ${verifyRes.booking?.ticketId || data}\nSeats: ${verifyRes.booking?.passengers || 2}\nStatus: Valid & Confirmed for Boarding.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  isScanningActiveRef.current = true;
                  setIsScanningActive(true);
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Invalid Ticket',
            verifyRes?.message || 'This ticket could not be verified by the navigation authority.',
            [
              {
                text: 'Scan Another',
                onPress: () => {
                  isScanningActiveRef.current = true;
                  setIsScanningActive(true);
                },
              },
            ]
          );
        }
        return;
      }

      // 2. Check if scanned barcode is a Boarding Point Standee QR (instant walk-in)
      let boatId = null;
      const trimmed = (data || '').trim();
      if (trimmed.includes('boat=')) {
        const m = trimmed.match(/[?&]boat=([^&#]+)/i);
        if (m && m[1]) boatId = decodeURIComponent(m[1]);
      } else if (trimmed.includes('boatId=')) {
        const m = trimmed.match(/[?&]boatId=([^&#]+)/i);
        if (m && m[1]) boatId = decodeURIComponent(m[1]);
      } else if (/^JAL-[A-Z0-9]{4,16}$/i.test(trimmed)) {
        boatId = trimmed;
      } else if (/^[a-f0-9]{24}$/i.test(trimmed)) {
        boatId = trimmed;
      } else if (trimmed.startsWith('boat-')) {
        boatId = trimmed;
      }

      if (!boatId) {
        throw new Error('Unrecognized QR code format. Please scan a valid JalRide Standee or Boarding Ticket.');
      }

      // Fetch live boat status from backend API
      setIsVerifying(true);
      const statusRes = await api.getLiveBoatStatusForQr(boatId);
      setIsVerifying(false);

      const boat = statusRes.boat || {};

      if (statusRes.canBook === false) {
        Alert.alert(
          'Boarding Unavailable',
          `Boat "${boat.boatName || 'Vessel'}" is currently ${statusRes.statusLabel || statusRes.status || 'not available for boarding'}.\n\nPlease check back shortly or scan another boat.`,
          [
            {
              text: 'OK',
              onPress: () => {
                isScanningActiveRef.current = true;
                setIsScanningActive(true);
              },
            },
          ]
        );
        return;
      }

      setScannedData({
        boatId: boat._id || boatId,
        qrCodeId: boat.qrCodeId || (boatId.startsWith('JAL-') ? boatId : null),
        boatName: boat.boatName || 'Express Waterways Boat',
        boatType: boat.boatType || 'Motor Boat',
        ghat: statusRes.currentGhat || boat.location || 'Boarding Point',
        price: statusRes.effectivePrice || boat.price || 350,
        seatsRemaining: statusRes.availableSeats ?? statusRes.seatsRemaining ?? 10,
        statusLabel: statusRes.statusLabel || 'Ready for Boarding',
      });
      setShowWalkinSheet(true);
    } catch (err) {
      setIsVerifying(false);
      Alert.alert(
        'Scan Error',
        err.message || 'Unable to resolve QR code data. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              isScanningActiveRef.current = true;
              setIsScanningActive(true);
            },
          },
        ]
      );
    }
  }, []);

  const handleManualCodeSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Required', 'Please enter a Ticket ID or Boat Code.');
      return;
    }
    setShowManualModal(false);
    const code = manualCode.trim();
    setManualCode('');
    handleBarcodeScanned({ data: code });
  };

  const handleConfirmWalkin = async () => {
    if (!scannedData || isBooking || isVerifyingPayment) return;
    setIsBooking(true);
    try {
      const pCount = Math.max(1, parseInt(walkinPassengers, 10) || 1);
      const isCash = walkinPayment === 'cash';

      const res = await api.bookInstantQr(scannedData.boatId, {
        passengers: pCount,
        paymentMethod: isCash ? 'cash' : 'online',
        useWalletBalance: !isCash, // Deduct wallet balance if user has sufficient funds
      });

      if (!res || !res.success) {
        throw new Error(res?.message || 'Failed to initiate instant booking');
      }

      // Case 1: Cash on Ghat Booking (Auto-confirmed or Pending Acceptance)
      if (res.isCash || isCash) {
        setShowWalkinSheet(false);
        isScanningActiveRef.current = true;
        setIsScanningActive(true);

        const confirmedBooking = res.booking;
        const paidAmount = confirmedBooking?.amount || (scannedData.price * pCount);

        Alert.alert(
          'Instant Ghat Boarding Pass Generated! ⚡',
          `Your walk-in ride on ${scannedData.boatName} at ${scannedData.ghat} is confirmed.\nHand ₹${paidAmount} cash to the Navik upon boarding.`,
          [
            {
              text: 'View Boarding Pass',
              onPress: () => navigation.navigate('Ticket', { booking: confirmedBooking }),
            },
          ]
        );
        return;
      }

      // Case 2: Fully Paid via Wallet Balance
      if (res.fullyPaid && res.booking) {
        setShowWalkinSheet(false);
        isScanningActiveRef.current = true;
        setIsScanningActive(true);

        Alert.alert(
          'Paid from Wallet! ⚡',
          `Your instant ride on ${scannedData.boatName} is confirmed with wallet balance.`,
          [
            {
              text: 'View Boarding Pass',
              onPress: () => navigation.navigate('Ticket', { booking: res.booking }),
            },
          ]
        );
        return;
      }

      // Case 3: Online Payment via Razorpay
      if (res.order && res.booking) {
        setShowWalkinSheet(false);
        setActiveQrBooking(res.booking);
        retainedBookingContextRef.current = res.booking;
        setActivePaymentOrder({
          order: res.order,
          key: res.razorpayKeyId,
          booking: res.booking,
        });
        setShowRazorpayModal(true);
        return;
      }

      throw new Error('Unexpected response from booking service.');
    } catch (e) {
      Alert.alert('Booking Error', e.message || 'Instant booking failed.');
    } finally {
      setIsBooking(false);
    }
  };

  const executeVerification = async (signaturePayload, bookingToVerify) => {
    if (isVerifyingPaymentRef.current) return;
    isVerifyingPaymentRef.current = true;
    setIsVerifyingPayment(true);
    setShowRazorpayModal(false);

    const bookingContext = bookingToVerify || activeQrBooking || retainedBookingContextRef.current;
    const bookingId = bookingContext?._id || bookingContext?.id;
    const orderId =
      signaturePayload?.razorpay_order_id ||
      signaturePayload?.razorpayOrderId ||
      activePaymentOrder?.order?.id;
    const paymentId =
      signaturePayload?.razorpay_payment_id ||
      signaturePayload?.razorpayPaymentId;
    const signature =
      signaturePayload?.razorpay_signature ||
      signaturePayload?.razorpaySignature;

    if (!orderId || !paymentId || !signature || !bookingId) {
      isVerifyingPaymentRef.current = false;
      if (isMountedRef.current) {
        setIsVerifyingPayment(false);
      }
      Alert.alert('Verification Error', 'Missing required payment verification parameters.');
      return;
    }

    const verifyPayload = {
      bookingId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    };

    // Retain exact original signature payload and booking context for network retry
    retainedSignatureRef.current = verifyPayload;
    retainedBookingContextRef.current = bookingContext;

    try {
      const verifyRes = await api.verifyInstantPayment(verifyPayload);

      if (verifyRes && verifyRes.success) {
        // Clear retained signature recovery state upon confirmed verification
        retainedSignatureRef.current = null;
        retainedBookingContextRef.current = null;

        const verifiedBooking = verifyRes.booking || (await api.getBookingById(bookingId));

        if (isMountedRef.current) {
          isScanningActiveRef.current = true;
          setIsScanningActive(true);
          setActivePaymentOrder(null);
          setActiveQrBooking(null);

          Alert.alert(
            'Payment Successful! ⚡',
            `Your digital boarding pass for ${scannedData?.boatName || 'Boat'} is now ready.`,
            [
              {
                text: 'View Boarding Pass',
                onPress: () => {
                  if (isMountedRef.current) {
                    navigation.navigate('Ticket', { booking: verifiedBooking });
                  }
                },
              },
            ]
          );
        }
      } else {
        throw new Error(verifyRes?.message || 'Payment signature verification failed.');
      }
    } catch (err) {
      const errMsg = err?.message || '';
      const isSignatureRejection =
        errMsg.toLowerCase().includes('signature') ||
        errMsg.toLowerCase().includes('mismatch') ||
        errMsg.toLowerCase().includes('invalid');

      if (isSignatureRejection) {
        // Backend rejected signature: clear retained state and do not offer retry
        retainedSignatureRef.current = null;
        retainedBookingContextRef.current = null;
        setActivePaymentOrder(null);
        setActiveQrBooking(null);

        if (isMountedRef.current) {
          Alert.alert(
            'Payment Verification Failed',
            `Payment signature was rejected by the server (${errMsg}). Please contact support with Order ID: ${orderId}.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  isScanningActiveRef.current = true;
                  setIsScanningActive(true);
                },
              },
            ]
          );
        }
      } else {
        // Network timeout / connection failure: retain payload and offer Retry Verification
        if (isMountedRef.current) {
          Alert.alert(
            'Verification Network Error',
            'Payment succeeded on gateway, but server verification encountered a network error. Tap Retry Verification to verify your pass.',
            [
              {
                text: 'Retry Verification',
                onPress: () => {
                  if (retainedSignatureRef.current) {
                    executeVerification(retainedSignatureRef.current, retainedBookingContextRef.current);
                  }
                },
              },
              {
                text: 'Dismiss',
                style: 'cancel',
                onPress: () => {
                  retainedSignatureRef.current = null;
                  retainedBookingContextRef.current = null;
                  setActivePaymentOrder(null);
                  setActiveQrBooking(null);
                  isScanningActiveRef.current = true;
                  setIsScanningActive(true);
                },
              },
            ]
          );
        }
      }
    } finally {
      isVerifyingPaymentRef.current = false;
      if (isMountedRef.current) {
        setIsVerifyingPayment(false);
      }
    }
  };

  const handleQrPaymentSuccess = async (signaturePayload) => {
    executeVerification(signaturePayload, activeQrBooking);
  };

  const handleQrPaymentCancel = () => {
    setShowRazorpayModal(false);
    retainedSignatureRef.current = null;
    retainedBookingContextRef.current = null;
    setActivePaymentOrder(null);
    setActiveQrBooking(null);
    isScanningActiveRef.current = true;
    setIsScanningActive(true);

    Alert.alert(
      'Payment Incomplete',
      'Payment was cancelled and your pass was not issued. To board this boat, please tap Confirm or re-scan the boat standee QR code.',
      [
        {
          text: 'OK',
          onPress: () => {
            isScanningActiveRef.current = true;
            setIsScanningActive(true);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Live Camera View if permission granted */}
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
        <View style={styles.permissionFallback}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionSubtitle}>
            JalRide requires camera access to scan boat standee posters and digital boarding passes.
          </Text>
          <Button
            title="Grant Camera Access"
            onPress={requestPermission}
            style={{ marginTop: spacing.l, width: 220 }}
          />
          <TouchableOpacity
            style={styles.manualFallbackBtn}
            onPress={() => setShowManualModal(true)}
          >
            <Text style={styles.manualFallbackBtnText}>⌨️ Enter Ticket ID or Boat Code Manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top Header overlay */}
      <View style={styles.headerOverlay}>
        <Header
          title="⚡ Instant Boarding Scanner"
          subtitle="Scan standee poster or digital boarding pass"
          onBack={() => navigation.goBack()}
          transparent
          style={{ paddingTop: 40 }}
          rightAction={
            <TouchableOpacity
              style={styles.torchBtn}
              onPress={() => setTorchOn(!torchOn)}
            >
              <Text style={styles.torchText}>{torchOn ? '🔦 ON' : '🔦 OFF'}</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Viewfinder Target Area */}
      <View style={styles.scannerWrapper} pointerEvents="box-none">
        <View style={styles.viewfinder}>
          {/* 4 Framing Corner Accents */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Animated Laser Sweep Line */}
          <Animated.View
            style={[
              styles.laserLine,
              { transform: [{ translateY: laserAnim }] },
            ]}
          />
        </View>

        <Text style={styles.scannerHint}>
          Align the QR code from the boat standee or boarding ticket inside the frame.
        </Text>

        {/* Manual Recovery Button */}
        <TouchableOpacity
          style={styles.manualEntryBtn}
          onPress={() => setShowManualModal(true)}
        >
          <Text style={styles.manualEntryBtnText}>⌨️ Can't scan? Enter code manually</Text>
        </TouchableOpacity>

        {isVerifying && (
          <View style={styles.verifyingPill}>
            <ActivityIndicator color={colors.teal} size="small" />
            <Text style={styles.verifyingText}>  Verifying with Navigation Registry...</Text>
          </View>
        )}

        {/* Quick Testing Triggers for Ghat Standees */}
        <View style={styles.sampleTriggers}>
          <Text style={styles.sampleLabel}>Test Scanning Active Ghat Standees:</Text>
          <View style={styles.triggerRow}>
            <TouchableOpacity
              style={styles.samplePill}
              onPress={() => handleBarcodeScanned({ data: 'https://jalride.com/qr-book?boatId=boat-001' })}
            >
              <Text style={styles.samplePillText}>📍 Assi Ghat (Bajra)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.samplePill}
              onPress={() => handleBarcodeScanned({ data: 'https://jalride.com/qr-book?boatId=boat-002' })}
            >
              <Text style={styles.samplePillText}>📍 Dashashwamedh (Motor)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Instant Walk-in Booking BottomSheet */}
      <BottomSheet
        visible={showWalkinSheet}
        onClose={() => {
          setShowWalkinSheet(false);
          isScanningActiveRef.current = true;
          setIsScanningActive(true);
        }}
        title="⚡ Walk-In Ghat Boarding"
        subtitle={scannedData ? `${scannedData.boatName} • ${scannedData.ghat}` : ''}
        height={490}
      >
        {scannedData && (
          <View>
            <View style={styles.walkinStatusRow}>
              <Badge label="Boat Ready for Boarding" variant="success" />
              <Text style={styles.walkinFare}>₹{scannedData.price} <Text style={{ fontSize: 12 }}>/ seat</Text></Text>
            </View>

            <Text style={styles.inputLabel}>Number of Passengers</Text>
            <TextInput
              style={styles.inputBox}
              keyboardType="numeric"
              value={walkinPassengers}
              onChangeText={setWalkinPassengers}
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.m }]}>Payment Method on Ghat</Text>

            <TouchableOpacity
              style={[
                styles.payOption,
                walkinPayment === 'cash' && styles.payOptionActive,
              ]}
              onPress={() => setWalkinPayment('cash')}
            >
              <Text style={styles.payOptionEmoji}>💵</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.payOptionName}>Cash on Ghat (Direct to Captain)</Text>
                <Text style={styles.payOptionDesc}>Hand cash directly to the boat captain</Text>
              </View>
              <View style={[styles.radioDot, walkinPayment === 'cash' && styles.radioDotActive]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payOption,
                walkinPayment === 'upi' && styles.payOptionActive,
              ]}
              onPress={() => setWalkinPayment('upi')}
            >
              <Text style={styles.payOptionEmoji}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.payOptionName}>Online UPI / Wallet</Text>
                <Text style={styles.payOptionDesc}>Pay instantly from wallet balance</Text>
              </View>
              <View style={[styles.radioDot, walkinPayment === 'upi' && styles.radioDotActive]} />
            </TouchableOpacity>

            <Button
              title={`Confirm Boarding Pass (₹${scannedData.price * (parseInt(walkinPassengers) || 1)})`}
              onPress={handleConfirmWalkin}
              loading={isBooking}
              style={{ marginTop: spacing.l }}
            />
          </View>
        )}
      </BottomSheet>

      {/* Manual Entry Fallback Modal */}
      <Modal
        visible={showManualModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManualModal(false)}
      >
        <View style={styles.manualModalOverlay}>
          <View style={styles.manualModalCard}>
            <Text style={styles.manualModalTitle}>Manual Verification</Text>
            <Text style={styles.manualModalSubtitle}>
              Enter a Boarding Ticket ID (e.g. JR-123456) or Boat Code to verify or book.
            </Text>

            <TextInput
              style={styles.manualModalInput}
              placeholder="e.g. JR-102938 or boat-001"
              placeholderTextColor={colors.gray400}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
            />

            <View style={styles.manualModalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowManualModal(false)}
                style={{ flex: 1, marginRight: spacing.s }}
              />
              <Button
                title="Verify"
                onPress={handleManualCodeSubmit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Official Razorpay Checkout Modal for QR Instant Rides */}
      <RazorpayCheckoutModal
        visible={showRazorpayModal}
        orderData={activePaymentOrder}
        customer={{
          name: user?.name || 'Pilgrim Devotee',
          email: user?.email || 'pilgrim@jalride.com',
          phone: user?.phone || '9876543210',
        }}
        onSuccess={handleQrPaymentSuccess}
        onCancel={handleQrPaymentCancel}
      />

      {/* Verification in Progress Overlay */}
      {isVerifyingPayment && (
        <View style={styles.verifyingOverlay}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={styles.verifyingOverlayText}>Verifying Payment & Issuing Digital Pass...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1e23',
  },
  permissionFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#0a1e23',
  },
  permissionEmoji: {
    fontSize: 52,
    marginBottom: spacing.m,
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.white,
    textAlign: 'center',
  },
  permissionSubtitle: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: spacing.s,
    lineHeight: 20,
  },
  manualFallbackBtn: {
    marginTop: spacing.l,
    paddingVertical: 12,
    paddingHorizontal: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  manualFallbackBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: 14,
  },
  manualEntryBtn: {
    marginTop: spacing.m,
    backgroundColor: 'rgba(10, 46, 54, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: spacing.l,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  manualEntryBtnText: {
    ...typography.caption,
    color: '#8fd6de',
    fontWeight: '700',
  },
  manualModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  manualModalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.l,
    padding: spacing.xl,
  },
  manualModalTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  manualModalSubtitle: {
    ...typography.caption,
    color: colors.gray600,
    marginBottom: spacing.l,
  },
  manualModalInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    ...typography.bodyMedium,
    marginBottom: spacing.l,
  },
  manualModalBtnRow: {
    flexDirection: 'row',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  torchBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  torchText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  scannerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  viewfinder: {
    width: 250,
    height: 250,
    borderRadius: radii.l,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.teal,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  laserLine: {
    height: 3,
    backgroundColor: colors.sun,
    shadowColor: colors.sun,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scannerHint: {
    ...typography.bodySmall,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: spacing.xl,
    maxWidth: 280,
  },
  verifyingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radii.full,
    marginTop: spacing.m,
  },
  verifyingText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: '600',
  },
  sampleTriggers: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  sampleLabel: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing.s,
  },
  triggerRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  samplePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radii.full,
  },
  samplePillText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  walkinStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  walkinFare: {
    ...typography.h2,
    color: colors.teal,
  },
  inputLabel: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    fontSize: 16,
    color: colors.ink,
  },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    marginBottom: spacing.s,
  },
  payOptionActive: {
    borderColor: colors.teal,
    backgroundColor: 'rgba(0, 168, 150, 0.08)',
  },
  payOptionEmoji: {
    fontSize: 22,
    marginRight: spacing.m,
  },
  payOptionName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  payOptionDesc: {
    ...typography.caption,
    color: colors.gray600,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.gray400,
  },
  radioDotActive: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 30, 35, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  verifyingOverlayText: {
    ...typography.bodyMedium,
    color: colors.white,
    marginTop: spacing.m,
    fontWeight: '600',
  },
});
