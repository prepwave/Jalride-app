import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radii, spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import BottomSheet from '../../components/common/BottomSheet';
import Badge from '../../components/common/Badge';

export default function QrScanScreen({ navigation }) {
  const { isDark } = useTheme();
  const [torchOn, setTorchOn] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningActive, setIsScanningActive] = useState(true);

  // Scanned data for standees or tickets
  const [scannedData, setScannedData] = useState(null);
  const [showWalkinSheet, setShowWalkinSheet] = useState(false);
  const [walkinPassengers, setWalkinPassengers] = useState('2');
  const [walkinPayment, setWalkinPayment] = useState('cash'); // 'cash' | 'upi'
  const [isBooking, setIsBooking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const handleBarcodeScanned = async ({ data }) => {
    if (!isScanningActive || !data) return;
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
            `Passenger: ${verifyRes.booking?.customerName || 'Pilgrim Devotee'}\nTicket: ${verifyRes.booking?.ticketId || data}\nSeats: ${verifyRes.booking?.passengers || 2}\nStatus: Valid & Confirmed for Boarding.`,
            [
              {
                text: 'OK',
                onPress: () => setIsScanningActive(true),
              },
            ]
          );
        } else {
          Alert.alert(
            'Invalid Ticket',
            verifyRes?.message || 'This ticket could not be verified by the navigation authority.',
            [{ text: 'Scan Another', onPress: () => setIsScanningActive(true) }]
          );
        }
        return;
      }

      // 2. Check if scanned barcode is a Ghat Standee QR (instant walk-in)
      let boatId = 'boat-001';
      if (data.includes('boatId=')) {
        const match = data.match(/boatId=([^&]+)/);
        if (match && match[1]) boatId = match[1];
      } else if (data.includes('boat-') || data.includes('6')) {
        boatId = data.trim();
      }

      // Fetch live boat status from backend API
      const statusRes = await api.getLiveBoatStatusForQr(boatId);
      const boat = statusRes.boat || {};

      setScannedData({
        boatId,
        boatName: boat.boatName || 'Maa Ganga Express Bajra',
        ghat: statusRes.currentGhat || boat.location || 'Assi Ghat',
        price: boat.price || 350,
        seatsRemaining: statusRes.seatsRemaining || 18,
      });
      setShowWalkinSheet(true);
    } catch (err) {
      setIsVerifying(false);
      Alert.alert(
        'Scan Error',
        err.message || 'Unable to resolve QR code data. Please try again.',
        [{ text: 'OK', onPress: () => setIsScanningActive(true) }]
      );
    }
  };

  const handleConfirmWalkin = async () => {
    setIsBooking(true);
    try {
      const pCount = parseInt(walkinPassengers) || 1;
      const res = await api.bookInstantQr(scannedData.boatId, {
        passengers: pCount,
        totalAmount: scannedData.price * pCount,
        paymentMethod: walkinPayment,
      });

      setShowWalkinSheet(false);
      setIsScanningActive(true);
      Alert.alert(
        'Instant Ghat Boarding Pass Generated! ⚡',
        `Your walk-in ride on ${scannedData.boatName} at ${scannedData.ghat} is confirmed. ${walkinPayment === 'cash' ? 'Hand ₹' + (scannedData.price * pCount) + ' cash to the Navik.' : 'Payment completed.'}`,
        [
          {
            text: 'View Boarding Pass',
            onPress: () => navigation.navigate('Ticket', { booking: res.booking }),
          },
        ]
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Instant booking failed.');
    } finally {
      setIsBooking(false);
    }
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
          onBarcodeScanned={isScanningActive ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
      ) : (
        <View style={styles.permissionFallback}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionSubtitle}>
            JalRide requires camera access to scan ghat standee posters and verify digital boarding passes.
          </Text>
          <Button
            title="Grant Camera Access"
            onPress={requestPermission}
            style={{ marginTop: spacing.l, width: 220 }}
          />
        </View>
      )}

      {/* Top Header overlay */}
      <View style={styles.headerOverlay}>
        <Header
          title="⚡ Instant Ghat Boarding"
          subtitle="Scan standee poster at any Varanasi ghat"
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
          Align the QR code from the boat standee or ticket inside the frame.
        </Text>

        {isVerifying && (
          <View style={styles.verifyingPill}>
            <ActivityIndicator color={colors.teal} size="small" />
            <Text style={styles.verifyingText}>  Verifying with Ghat Navigation Registry...</Text>
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
                <Text style={styles.payOptionName}>Cash on Ghat (हाथ में नकद)</Text>
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
});
