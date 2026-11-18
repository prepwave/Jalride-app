import React, { useState } from 'react';
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
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

export default function TicketScreen({ navigation, route }) {
  const { booking } = route.params || {};
  const { isDark } = useTheme();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!booking) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Header title="Boarding Pass" onBack={() => navigation.goBack()} />
        <View style={styles.centerBox}>
          <Text style={{ color: colors.gray500 }}>No active ticket data found.</Text>
        </View>
      </View>
    );
  }

  const handleShareTicket = async () => {
    try {
      await Share.share({
        message: `🚢 JalRide Digital Boarding Pass\nTicket ID: ${booking.ticketId}\nBoat: ${booking.boat?.boatName || 'Ghat Express'}\nGhat: ${booking.boat?.location || 'Varanasi'}\nDate: ${booking.bookingDate} at ${booking.bookingTime}\nPassengers: ${booking.passengers}\nStatus: Confirmed`,
        title: `JalRide Ticket ${booking.ticketId}`,
      });
    } catch (_) {}
  };

  const handleCancelTicket = () => {
    Alert.alert(
      'Cancel Boat Ride',
      'Are you sure you want to cancel this booking? 100% of the booking amount will be instantly refunded to your JalRide wallet escrow.',
      [
        { text: 'Keep Ticket', style: 'cancel' },
        {
          text: 'Yes, Cancel & Refund',
          style: 'destructive',
          onPress: async () => {
            if (isCancelling) return;
            setIsCancelling(true);
            try {
              const res = await api.cancelBooking(booking._id, 'Customer cancellation requested via mobile app');
              Alert.alert(
                'Ride Cancelled & Refunded',
                res?.message || `₹${booking.totalAmount || booking.amount} has been credited to your JalRide Wallet balance.`,
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
              );
            } catch (err) {
              Alert.alert('Cancellation Failed', err.message || 'Unable to process cancellation at this time.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Digital Boarding Pass"
        subtitle={booking.ticketId}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleShareTicket} style={styles.shareBtn}>
            <Text style={styles.shareText}>Share ↗</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Ticket Container */}
        <Card style={styles.ticketCard}>
          {/* Top Notch & Header */}
          <View style={styles.ticketTopBar}>
            <View>
              <Text style={styles.jalBrand}>JALRIDE (जलराइड)</Text>
              <Text style={styles.govText}>Govt. Approved Ghat Navigation Pass</Text>
            </View>
            <Badge label={booking.status || 'Confirmed'} variant="success" />
          </View>

          <View style={styles.tearLine} />

          {/* Real QR Code Presentation */}
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QRCode
                value={booking.qrCode || `JALRIDE:TICKET:${booking.ticketId}:${booking._id || ''}`}
                size={160}
                color={colors.ink}
                backgroundColor={colors.white}
              />
            </View>
            <Text style={styles.ticketSubCode}>TICKET: {booking.ticketId}</Text>
            <Text style={styles.qrInstruction}>
              Show this official QR pass to the Boat Captain (Navik) at the ghat for instant boarding check-in.
            </Text>
          </View>

          <View style={styles.tearLine} />

          {/* Boat & Ghat Details */}
          <View style={styles.ticketSection}>
            <Text style={styles.sectionHeaderLabel}>VESSEL & PICKUP POINT</Text>
            <Text style={styles.boatTitle}>{booking.boat?.boatName}</Text>
            <Text style={styles.ghatPickup}>📍 Boarding Ghat: {booking.boat?.location}</Text>
          </View>

          {/* Grid of Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{booking.bookingDate}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Departure Slot</Text>
              <Text style={styles.detailValue}>{booking.bookingTime}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Passengers</Text>
              <Text style={styles.detailValue}>{booking.passengers} Adults</Text>
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Passenger Name</Text>
              <Text style={styles.detailValue}>{booking.customerName || 'Aman Sharma'}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Fare Paid</Text>
              <Text style={styles.farePaidValue}>₹{booking.totalAmount}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{booking.paymentMethod?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.tearLine} />

          {/* Boarding Safety Checklist */}
          <View style={styles.safetyBox}>
            <Text style={styles.safetyTitle}>Mandatory Ghat Instructions:</Text>
            <Text style={styles.safetyItem}>• Please arrive at {booking.boat?.location} 15 minutes before departure.</Text>
            <Text style={styles.safetyItem}>• Life jackets are provided free and must be worn at all times on the water.</Text>
            <Text style={styles.safetyItem}>• Keep river clean: Do not dispose plastic into holy Mother Ganga.</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.btnStack}>
          <Button
            title="Chat with Boat Captain 💬"
            onPress={() => navigation.navigate('Chat', { bookingId: booking._id })}
            variant="outline"
          />

          <Button
            title="Cancel Ride & 100% Refund ✕"
            onPress={handleCancelTicket}
            variant="ghost"
            textStyle={{ color: colors.danger }}
            style={{ marginTop: spacing.s }}
          />
        </View>

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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.tealMist,
  },
  shareText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.xl,
  },
  ticketCard: {
    padding: 0,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.lift,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ticketTopBar: {
    padding: spacing.xl,
    backgroundColor: colors.deep,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jalBrand: {
    ...typography.h3,
    color: colors.white,
    letterSpacing: 0.5,
  },
  govText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  tearLine: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.l,
    marginHorizontal: spacing.l,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  qrContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  qrBox: {
    padding: spacing.m,
    backgroundColor: '#ffffff',
    borderRadius: radii.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.m,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.card,
  },
  ticketSubCode: {
    fontFamily: 'monospace',
    fontWeight: '700',
    color: colors.ink,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  qrGraphic: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.s,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  qrCornerTL: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderWidth: 6,
    borderColor: colors.ink,
  },
  qrCornerTR: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderWidth: 6,
    borderColor: colors.ink,
  },
  qrCornerBL: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 32,
    height: 32,
    borderWidth: 6,
    borderColor: colors.ink,
  },
  qrCenterDot: {
    width: 14,
    height: 14,
    backgroundColor: colors.teal,
    marginBottom: 4,
  },
  qrText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: 1,
  },
  qrSubText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: colors.gray600,
    marginTop: 2,
  },
  qrInstruction: {
    ...typography.bodySmall,
    color: colors.gray600,
    textAlign: 'center',
    marginTop: spacing.s,
    lineHeight: 18,
  },
  ticketSection: {
    paddingHorizontal: spacing.xl,
  },
  sectionHeaderLabel: {
    ...typography.caption,
    color: colors.gray500,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  boatTitle: {
    ...typography.h2,
    color: colors.ink,
    marginTop: 4,
  },
  ghatPickup: {
    ...typography.body,
    color: colors.teal,
    fontWeight: '600',
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.m,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.gray500,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.ink,
    fontWeight: '600',
    marginTop: 2,
  },
  farePaidValue: {
    ...typography.h3,
    color: colors.teal,
    fontWeight: '700',
    marginTop: 2,
  },
  safetyBox: {
    backgroundColor: colors.paper,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: colors.line,
  },
  safetyTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  safetyItem: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 18,
    marginBottom: 2,
  },
  btnStack: {
    marginTop: spacing.xl,
    gap: spacing.m,
  },
});
