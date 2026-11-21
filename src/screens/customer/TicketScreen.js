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
  Image,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import QRCodeUtil from 'qrcode';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import ReviewModal from '../../components/common/ReviewModal';

export default function TicketScreen({ navigation, route }) {
  const { booking: initialBooking } = route.params || {};
  const { isDark } = useTheme();

  const [booking, setBooking] = useState(initialBooking);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userReview, setUserReview] = useState(null);

  useEffect(() => {
    if (booking?._id && !booking.qrDataUrl) {
      api.getBookingById(booking._id).then((fresh) => {
        if (fresh) {
          setBooking((prev) => ({ ...prev, ...fresh }));
        }
      }).catch(() => {});
    }
  }, [booking?._id]);

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

  // 1. Resolve official QR image data URI (backend qrDataUrl or legacy qrCode data URI)
  const getOfficialQrImageUri = (b) => {
    if (!b) return null;
    if (typeof b.qrDataUrl === 'string' && b.qrDataUrl.startsWith('data:image/')) {
      return b.qrDataUrl;
    }
    if (typeof b.qrCode === 'string' && b.qrCode.startsWith('data:image/')) {
      return b.qrCode;
    }
    return null;
  };

  // 2. Resolve signed QR payload (separate payload or cryptographic verification parameters)
  // Preserves signed JSON string containing ticketId, bookingId and v (never a Base64 data:image URI)
  const getSignedQrPayload = (b) => {
    if (!b) return null;
    if (typeof b.signedQrPayload === 'string' && b.signedQrPayload.trim()) {
      return b.signedQrPayload.trim();
    }
    if (typeof b.qrPayload === 'string' && b.qrPayload.trim()) {
      return b.qrPayload.trim();
    }
    if (b.qrPayload && typeof b.qrPayload === 'object') {
      return JSON.stringify(b.qrPayload);
    }
    if (typeof b.qrCode === 'string' && !b.qrCode.startsWith('data:image/') && b.qrCode.trim()) {
      return b.qrCode.trim();
    }
    if ((b.v || b.verificationHash) && b.ticketId) {
      return JSON.stringify({
        ticketId: b.ticketId,
        bookingId: String(b._id || ''),
        v: b.v || b.verificationHash,
      });
    }
    return null;
  };

  // 3. Fallback QR payload for rendering when no official QR image or signed payload is available
  const getTicketQrPayload = (b) => {
    if (!b) return '';
    const signed = getSignedQrPayload(b);
    if (signed) return signed;
    return `JALRIDE:TICKET:${b.ticketId || ''}:${b._id || ''}`;
  };

  // Generate structured HTML for native PDF export with local embedded Base64 QR code
  const buildTicketHtml = async () => {
    let qrDataUri = '';
    const officialImage = getOfficialQrImageUri(booking);
    if (officialImage) {
      qrDataUri = officialImage;
    } else {
      const qrPayload = getTicketQrPayload(booking);
      try {
        qrDataUri = await QRCodeUtil.toDataURL(qrPayload, {
          margin: 1,
          width: 220,
          errorCorrectionLevel: 'M',
        });
      } catch (err) {
        console.warn('Local QR generation error, using fallback:', err);
        qrDataUri = '';
      }
    }

    const passengerName = booking.customerName || booking.customer?.name || 'Devotee / Passenger';
    const boatName = booking.boat?.boatName || 'JalRide Certified Vessel';
    const ghat = booking.boat?.location || 'Varanasi Ghat';
    const date = booking.bookingDate || 'Scheduled';
    const slot = booking.bookingTime || 'Scheduled Slot';
    const fare = booking.totalAmount || booking.amount || 0;
    const payMethod = (booking.paymentMethod || 'Online').toUpperCase();
    const passengers = booking.passengers || 1;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JalRide Boarding Pass - ${booking.ticketId}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 32px 24px;
      background: #f8fafc;
    }
    .pass {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 2px solid #0f766e;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .header {
      background: #0a2e36;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .brand {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #f59e0b;
      margin: 0;
    }
    .subbrand {
      font-size: 13px;
      color: #99f6e4;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      background: #10b981;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 99px;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .qr-section {
      text-align: center;
      padding: 24px 16px;
      border-bottom: 2px dashed #cbd5e1;
      background: #fafcfc;
    }
    .qr-img {
      width: 170px;
      height: 170px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px;
      background: #ffffff;
    }
    .ticket-id {
      font-family: monospace;
      font-size: 18px;
      font-weight: 800;
      color: #0f766e;
      margin-top: 12px;
      letter-spacing: 1px;
    }
    .qr-hint {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
      max-width: 420px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.4;
    }
    .body {
      padding: 24px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .field {
      background: #f1f5f9;
      padding: 12px 14px;
      border-radius: 8px;
    }
    .field-full {
      grid-column: span 2;
      background: #e6fffa;
      border-left: 4px solid #0f766e;
    }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .val {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 4px;
    }
    .safety {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 14px;
      border-radius: 8px;
      font-size: 12px;
      color: #78350f;
      line-height: 1.5;
      margin-top: 16px;
    }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="pass">
    <div class="header">
      <div class="brand">JALRIDE</div>
      <div class="subbrand">Official Varanasi Smart Ghat Transit Digital Boarding Pass</div>
      <div class="badge">Confirmed Booking</div>
    </div>
    <div class="qr-section">
      <img src="${qrDataUri}" class="qr-img" alt="Boarding QR Code" />
      <div class="ticket-id">${booking.ticketId}</div>
      <div class="qr-hint">Present this scannable QR pass to the Boat Captain (Navik) at the ghat for instant boarding check-in.</div>
    </div>
    <div class="body">
      <div class="grid">
        <div class="field field-full">
          <div class="label">Boat & Boarding Ghat</div>
          <div class="val">${boatName} — ${ghat}</div>
        </div>
        <div class="field">
          <div class="label">Travel Date</div>
          <div class="val">${date}</div>
        </div>
        <div class="field">
          <div class="label">Departure Slot</div>
          <div class="val">${slot}</div>
        </div>
        <div class="field">
          <div class="label">Passenger Name</div>
          <div class="val">${passengerName}</div>
        </div>
        <div class="field">
          <div class="label">Passengers</div>
          <div class="val">${passengers} Rider(s)</div>
        </div>
        <div class="field">
          <div class="label">Total Paid Fare</div>
          <div class="val" style="color: #0f766e;">₹${fare}</div>
        </div>
        <div class="field">
          <div class="label">Payment Status</div>
          <div class="val">${payMethod} (PAID)</div>
        </div>
      </div>
      <div class="safety">
        <strong>Mandatory Ghat Boarding Guidelines:</strong><br>
        • Report to ${ghat} at least 15 minutes before scheduled departure.<br>
        • Certified life jackets are provided onboard and must be worn during river transit.<br>
        • Sacred River Ganga: Zero plastic disposal or littering permitted.
      </div>
    </div>
    <div class="footer">
      JalRide Technologies Pvt Ltd • DPDP Act 2023 & Inland Vessels Act Compliant<br>
      Emergency Ghat Helpline: 1800-JALRIDE • Support: support@jalride.com
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleDownloadAndSharePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const html = await buildTicketHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `JalRide Ticket ${booking.ticketId}.pdf`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Generated', `Boarding pass PDF saved to device:\n${uri}`);
      }
    } catch (err) {
      Alert.alert('PDF Generation Failed', err.message || 'Unable to generate ticket PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      const html = await buildTicketHtml();
      await Print.printAsync({ html });
    } catch (err) {
      Alert.alert('Print Error', err.message || 'Unable to connect to printer.');
    }
  };

  const handleShareTicketText = async () => {
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

  // Eligibility check for post-ride reviews
  const isReviewEligible =
    booking.bookingStatus !== 'cancelled' &&
    booking.status !== 'cancelled' &&
    (booking.bookingStatus === 'confirmed' ||
      booking.bookingStatus === 'completed' ||
      booking.status === 'completed' ||
      booking.status === 'confirmed' ||
      booking.paymentStatus === 'paid');

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title="Digital Boarding Pass"
        subtitle={booking.ticketId}
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={handleShareTicketText} style={styles.shareBtn}>
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
              <Text style={styles.jalBrand}>JALRIDE</Text>
              <Text style={styles.govText}>Official Smart Boat Digital Boarding Pass</Text>
            </View>
            <Badge label={booking.status || 'Confirmed'} variant="success" />
          </View>

          <View style={styles.tearLine} />

          {/* Real QR Code Presentation */}
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              {getOfficialQrImageUri(booking) && !getSignedQrPayload(booking) ? (
                <Image
                  source={{ uri: getOfficialQrImageUri(booking) }}
                  style={styles.qrDirectImage}
                  resizeMode="contain"
                  accessibilityLabel="Official Boarding Pass QR Code"
                />
              ) : (
                <QRCode
                  value={getSignedQrPayload(booking) || getTicketQrPayload(booking)}
                  size={160}
                  color={colors.ink}
                  backgroundColor={colors.white}
                />
              )}
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
              <Text style={styles.farePaidValue}>₹{booking.totalAmount || booking.amount}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{(booking.paymentMethod || 'Online').toUpperCase()}</Text>
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

        {/* PDF & Print Action Cards */}
        <View style={styles.pdfActionsRow}>
          <TouchableOpacity
            style={styles.pdfDownloadBtn}
            onPress={handleDownloadAndSharePdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.pdfIcon}>📄</Text>
                <Text style={styles.pdfBtnText}>Download PDF Ticket</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.printBtn}
            onPress={handlePrintPdf}
            disabled={isGeneratingPdf}
          >
            <Text style={styles.printIcon}>🖨️</Text>
            <Text style={styles.printBtnText}>Print</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.btnStack}>
          {/* Rate Boat & Captain Button (Feature 4 Parity) */}
          {isReviewEligible ? (
            <Button
              title={
                userReview
                  ? `★ Rated ${userReview.rating}★ (Edit Review)`
                  : '⭐ Rate Boat & Captain'
              }
              onPress={() => setShowReviewModal(true)}
              variant="secondary"
              style={styles.rateBtn}
              textStyle={{ color: colors.ink, fontWeight: '700' }}
            />
          ) : null}

          <Button
            title="Chat with Boat Captain 💬"
            onPress={() => navigation.navigate('Chat', { bookingId: booking._id })}
            variant="outline"
            style={{ marginTop: spacing.s }}
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

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        booking={booking}
        onClose={() => setShowReviewModal(false)}
        onReviewSubmitted={(rev) => {
          setUserReview(rev);
          setBooking((prev) => ({ ...prev, reviewed: true, userReview: rev }));
        }}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.l,
    backgroundColor: colors.canvas,
  },
  jalBrand: {
    ...typography.h3,
    color: colors.deep,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  govText: {
    ...typography.caption,
    color: colors.gray500,
    fontSize: 10,
    marginTop: 2,
  },
  tearLine: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    marginHorizontal: spacing.l,
  },
  qrContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  qrBox: {
    padding: spacing.m,
    backgroundColor: colors.white,
    borderRadius: radii.l,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrDirectImage: {
    width: 160,
    height: 160,
  },
  ticketSubCode: {
    fontFamily: 'monospace',
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.teal,
    letterSpacing: 1.5,
    marginTop: spacing.m,
  },
  qrInstruction: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
    lineHeight: 16,
  },
  ticketSection: {
    padding: spacing.l,
  },
  sectionHeaderLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.gray400,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  boatTitle: {
    ...typography.h3,
    color: colors.ink,
  },
  ghatPickup: {
    ...typography.bodySmall,
    color: colors.deep,
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.gray400,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  farePaidValue: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.teal,
  },
  safetyBox: {
    backgroundColor: colors.mist,
    padding: spacing.l,
  },
  safetyTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  safetyItem: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 18,
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.l,
  },
  pdfDownloadBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
    paddingVertical: 12,
    borderRadius: radii.m,
    gap: 8,
    ...shadows.soft,
  },
  pdfIcon: {
    fontSize: 18,
  },
  pdfBtnText: {
    ...typography.button,
    color: colors.white,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    borderRadius: radii.m,
    gap: 6,
  },
  printIcon: {
    fontSize: 16,
  },
  printBtnText: {
    ...typography.button,
    color: colors.ink,
  },
  btnStack: {
    marginTop: spacing.m,
  },
  rateBtn: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
});
