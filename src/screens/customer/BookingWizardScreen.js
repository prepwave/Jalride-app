import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import RazorpayCheckoutModal from '../../components/payment/RazorpayCheckoutModal';

export default function BookingWizardScreen({ navigation, route }) {
  const { boat: initialBoat } = route.params || {};
  const { user, bookingDraft, updateBookingDraft, resetBookingDraft } = useAuth();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isWholeBoat, setIsWholeBoat] = useState(false);
  const [passengers, setPassengers] = useState(2);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'upi' | 'card' | 'cash'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Razorpay Checkout Modal state
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);
  const [pendingBookingId, setPendingBookingId] = useState(null);

  const boat = initialBoat || bookingDraft.boat;

  useEffect(() => {
    api.getCustomerWallet().then((w) => {
      if (w && typeof w.balance === 'number') {
        setWalletBalance(w.balance);
      }
    }).catch(() => {});
  }, []);

  // Fetch real availability slots whenever boat or selectedDate changes
  useEffect(() => {
    if (boat?._id && selectedDate) {
      setIsLoadingSlots(true);
      api.getBoatAvailability(boat._id, selectedDate)
        .then((res) => {
          const list = Array.isArray(res?.slots) ? res.slots : [];
          setSlots(list);
          const firstBookable = list.find((s) => s.bookable && !s.isExpired && s.seatsRemaining > 0);
          setSelectedSlot(firstBookable || (list.length > 0 ? list[0] : null));
        })
        .catch((err) => {
          console.warn('[BookingWizard] Failed to fetch slots:', err.message);
          setSlots([]);
          setSelectedSlot(null);
        })
        .finally(() => setIsLoadingSlots(false));
    }
  }, [boat?._id, selectedDate]);

  // Calculate dates for the next 7 days
  const upcomingDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateString: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  // Dynamic Fare calculation (Authoritative backend invariant)
  const unitPrice = selectedSlot?.price || boat?.price || 350;
  const maxAvailableSeats = selectedSlot?.seatsRemaining || boat?.capacity || 30;
  const baseFare = isWholeBoat
    ? (boat?.wholeBoatPrice || unitPrice * (boat?.capacity || 10))
    : unitPrice * passengers;
  const totalAmount = Math.max(0, baseFare - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponMessage('Please enter a coupon code.');
      return;
    }
    try {
      const res = await api.validateCoupon(couponCode, baseFare);
      if (res && res.valid) {
        setCouponDiscount(res.discountAmount || 0);
        setCouponMessage(res.message || `Coupon applied! Saved ₹${res.discountAmount || 0}`);
      }
    } catch (e) {
      setCouponDiscount(0);
      setCouponMessage(e.message || 'Invalid or inactive coupon code');
    }
  };

  const handleConfirmAndPay = async () => {
    if (!isWholeBoat && (!selectedSlot || !selectedSlot.time)) {
      Alert.alert('Slot Required', 'Please select an available departure time slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        boatId: boat?._id,
        bookingDate: selectedDate,
        bookingTime: selectedSlot?.time || '09:30',
        passengers: isWholeBoat ? (boat?.capacity || 10) : passengers,
        charterType: isWholeBoat ? 'whole_boat' : 'shared',
        couponCode: couponDiscount > 0 ? couponCode : undefined,
        paymentMethod,
      };

      const res = await api.createBooking(payload);
      if (!res || !res.booking) {
        throw new Error(res?.message || 'Failed to create booking reservation.');
      }

      const createdBooking = res.booking;
      setPendingBookingId(createdBooking._id);

      // Handle payment flow based on selected method
      if (paymentMethod === 'cash') {
        setCompletedBooking(createdBooking);
        setStep(7);
        setIsSubmitting(false);
        return;
      }

      if (paymentMethod === 'wallet') {
        const orderRes = await api.createPaymentOrder(createdBooking._id, true);
        if (orderRes.fullyPaidFromWallet) {
          setCompletedBooking(orderRes.booking || createdBooking);
          setStep(7);
          setIsSubmitting(false);
          return;
        }

        // Partial wallet payment: remainder needs Razorpay
        if (orderRes.order) {
          setActivePaymentOrder(orderRes);
          setShowRazorpayModal(true);
          setIsSubmitting(false);
          return;
        }
      }

      // Online payment via Razorpay (UPI, Card, Net Banking)
      const orderRes = await api.createPaymentOrder(createdBooking._id, false);
      if (orderRes && orderRes.order) {
        setActivePaymentOrder(orderRes);
        setShowRazorpayModal(true);
      } else {
        throw new Error('Unable to generate payment order from payment gateway.');
      }
    } catch (err) {
      Alert.alert('Booking Error', err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (signaturePayload) => {
    setShowRazorpayModal(false);
    setIsSubmitting(true);
    try {
      const verifyRes = await api.verifyPayment(signaturePayload);
      if (verifyRes && verifyRes.success) {
        setCompletedBooking(verifyRes.booking || { _id: pendingBookingId, status: 'confirmed', totalAmount });
        setStep(7);
      } else {
        throw new Error(verifyRes?.message || 'Payment verification failed with signature mismatch.');
      }
    } catch (err) {
      Alert.alert('Payment Verification Failed', err.message || 'We could not verify your payment. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Header
        title={`Step ${step} of 7: ${getStepTitle(step)}`}
        subtitle={boat?.boatName || 'JalRide Ghat Express'}
        onBack={() => {
          if (step > 1 && step < 7) setStep(step - 1);
          else navigation.goBack();
        }}
      />

      {/* Wizard Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${(step / 7) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 60 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= STEP 1: SELECT DATE ================= */}
        {step === 1 && (
          <View>
            <Text style={[styles.stepHeading, isDark && styles.textLight]}>
              Choose Your Ride Date
            </Text>
            <Text style={styles.stepSub}>
              Select your travel date for this boat journey.
            </Text>

            <View style={styles.dateGrid}>
              {upcomingDates.map((item) => {
                const isSelected = selectedDate === item.dateString;
                return (
                  <TouchableOpacity
                    key={item.dateString}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                      isDark && !isSelected && styles.dateCardDark,
                    ]}
                    onPress={() => setSelectedDate(item.dateString)}
                  >
                    <Text
                      style={[
                        styles.dateMonth,
                        isSelected && styles.dateTextSelected,
                        isDark && !isSelected && styles.textLight,
                      ]}
                    >
                      {item.month}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumber,
                        isSelected && styles.dateTextSelected,
                        isDark && !isSelected && styles.textLight,
                      ]}
                    >
                      {item.dayNumber}
                    </Text>
                    <Text
                      style={[
                        styles.dateDay,
                        isSelected && styles.dateTextSelected,
                        isDark && !isSelected && styles.textLight,
                      ]}
                    >
                      {item.dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.infoNoteBox}>
              <Text style={styles.infoNoteText}>
                💡 Real-time departure slots and seat availability are synced live from the boat operator.
              </Text>
            </View>

            <Button
              title="Proceed to Choose Slot →"
              onPress={() => setStep(2)}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}

        {/* ================= STEP 2: SELECT BOAT / BOARDING POINT ================= */}
        {step === 2 && (
          <View>
            <Text style={[styles.stepHeading, isDark && styles.textLight]}>
              Boat & Boarding Point
            </Text>
            <Text style={styles.stepSub}>
              Review chosen boat details and pickup point.
            </Text>

            <Card style={styles.selectedBoatCard}>
              <View style={styles.rowBetween}>
                <Badge label={boat?.boatType || 'Cruiser'} variant="teal" />
                <Badge label={`📍 ${boat?.location || 'Boarding Point'}`} variant="sun" />
              </View>
              <Text style={styles.boatCardTitle}>{boat?.boatName}</Text>
              <Text style={styles.boatCardDesc}>{boat?.description || 'Water tourism ride.'}</Text>
              <View style={styles.boatCardMeta}>
                <Text style={styles.boatCardPrice}>₹{boat?.price} <Text style={{ fontSize: 12 }}>/ seat</Text></Text>
                <Text style={styles.boatCardCap}>Capacity: {boat?.capacity} seats</Text>
              </View>
            </Card>

            {boat?.allowWholeBoatBooking && (
              <View style={[styles.infoNoteBox, { marginTop: spacing.m }]}>
                <Text style={styles.infoNoteText}>
                  🛥️ Private Charter Available: You can reserve this entire boat in Step 4 for ₹{boat.wholeBoatPrice || boat.price * boat.capacity}.
                </Text>
              </View>
            )}

            <Button
              title="Next: Select Time Slot →"
              onPress={() => setStep(3)}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}

        {/* ================= STEP 3: REAL TIME SLOTS ================= */}
        {step === 3 && (
          <View>
            <Text style={[styles.stepHeading, isDark && styles.textLight]}>
              Select Departure Time Slot
            </Text>
            <Text style={styles.stepSub}>
              Available slots for {selectedDate}.
            </Text>

            {isLoadingSlots ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.teal} />
                <Text style={{ marginTop: 12, color: colors.gray500 }}>
                  Checking live departures for {selectedDate}...
                </Text>
              </View>
            ) : slots.length === 0 ? (
              <Card style={{ padding: spacing.xl, alignItems: 'center', marginVertical: spacing.l }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
                <Text style={[styles.boatCardTitle, { textAlign: 'center' }]}>No Departures on this Date</Text>
                <Text style={[styles.boatCardDesc, { textAlign: 'center', marginVertical: 8 }]}>
                  The boat operator has no departures scheduled for {selectedDate}. Please select another date.
                </Text>
                <Button
                  title="← Pick Another Date"
                  variant="outline"
                  onPress={() => setStep(1)}
                  style={{ marginTop: spacing.m }}
                />
              </Card>
            ) : (
              <View style={styles.slotList}>
                {slots.map((slot, idx) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  const isBookable = slot.bookable && !slot.isExpired && slot.seatsRemaining > 0;
                  return (
                    <TouchableOpacity
                      key={slot.time || idx}
                      disabled={!isBookable}
                      style={[
                        styles.slotItem,
                        isSelected && styles.slotItemSelected,
                        !isBookable && styles.slotItemDisabled,
                        isDark && !isSelected && styles.slotItemDark,
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <View style={styles.slotLeft}>
                        <Text
                          style={[
                            styles.slotTime,
                            isSelected && styles.slotTimeSelected,
                            !isBookable && styles.textDisabled,
                          ]}
                        >
                          🕒 {slot.time}
                        </Text>
                        <Text style={[styles.slotLabel, isSelected && styles.slotLabelSelected]}>
                          {isBookable
                            ? `${slot.seatsRemaining} seats available`
                            : slot.isExpired
                            ? 'Departed'
                            : 'Sold Out'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.slotPriceText, isSelected && { color: colors.teal }]}>
                          ₹{slot.price || boat?.price || 350}
                        </Text>
                        {isBookable ? (
                          <Badge label="Available" variant="success" size="small" />
                        ) : (
                          <Badge
                            label={slot.isExpired ? 'Departed' : 'Full'}
                            variant="warning"
                            size="small"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {slots.length > 0 && (
              <Button
                title={selectedSlot ? `Confirm Slot (${selectedSlot.time}) →` : "Next: Passenger Count →"}
                disabled={!selectedSlot || !selectedSlot.bookable || selectedSlot.isExpired}
                onPress={() => setStep(4)}
                style={{ marginTop: spacing.xl }}
              />
            )}
          </View>
        )}

        {/* ================= STEP 4: PASSENGERS / CHARTER ================= */}
        {step === 4 && (
          <View>
            <Text style={[styles.stepHeading, isDark && styles.textLight]}>
              Passengers & Charter Option
            </Text>
            <Text style={styles.stepSub}>
              Choose individual seats or full private vessel charter.
            </Text>

            {boat?.allowWholeBoatBooking && (
              <View style={styles.charterToggleRow}>
                <TouchableOpacity
                  style={[styles.charterToggleBtn, !isWholeBoat && styles.charterToggleBtnActive]}
                  onPress={() => setIsWholeBoat(false)}
                >
                  <Text style={[styles.charterToggleText, !isWholeBoat && styles.charterToggleTextActive]}>
                    Individual Seats
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.charterToggleBtn, isWholeBoat && styles.charterToggleBtnActive]}
                  onPress={() => setIsWholeBoat(true)}
                >
                  <Text style={[styles.charterToggleText, isWholeBoat && styles.charterToggleTextActive]}>
                    Entire Boat Charter
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isWholeBoat ? (
              <Card style={styles.counterCard}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🛥️</Text>
                <Text style={styles.counterLabel}>Full Boat Private Charter</Text>
                <Text style={[styles.boatCardDesc, { textAlign: 'center' }]}>
                  Entire vessel reserved exclusively for your party (up to {boat?.capacity || 10} passengers).
                </Text>
                <Text style={[styles.farePreviewAmount, { marginTop: 12 }]}>
                  ₹{boat?.wholeBoatPrice || unitPrice * (boat?.capacity || 10)}
                </Text>
              </Card>
            ) : (
              <Card style={styles.counterCard}>
                <Text style={styles.counterLabel}>Number of Seats</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={[styles.counterBtn, passengers <= 1 && styles.counterBtnDisabled]}
                    onPress={() => setPassengers(Math.max(1, passengers - 1))}
                    disabled={passengers <= 1}
                  >
                    <Text style={styles.counterBtnText}>−</Text>
                  </TouchableOpacity>

                  <View style={styles.counterDisplay}>
                    <Text style={styles.counterNumber}>{passengers}</Text>
                    <Text style={styles.counterSub}>Passenger{passengers > 1 ? 's' : ''}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      passengers >= maxAvailableSeats && styles.counterBtnDisabled,
                    ]}
                    onPress={() => setPassengers(Math.min(maxAvailableSeats, passengers + 1))}
                    disabled={passengers >= maxAvailableSeats}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.boatCardCap, { marginTop: 8 }]}>
                  {maxAvailableSeats} seats currently open on this departure
                </Text>
              </Card>
            )}

            <View style={styles.farePreviewCard}>
              <Text style={styles.farePreviewTitle}>
                {isWholeBoat ? 'Private Charter Fare' : `Subtotal for ${passengers} Rider${passengers > 1 ? 's' : ''}`}
              </Text>
              <Text style={styles.farePreviewAmount}>₹{baseFare}</Text>
            </View>

            <Button
              title="Next: Apply Promo Coupon →"
              onPress={() => setStep(5)}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}

        {/* ================= STEP 5: PROMO COUPONS ================= */}
        {step === 5 && (
          <View>
            <Text style={[styles.stepHeading, isDark && styles.textLight]}>
              Discount Coupon
            </Text>
            <Text style={styles.stepSub}>
              Enter an authorized promotional coupon if you have one.
            </Text>

            <Card style={styles.couponCard}>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={[styles.couponInput, isDark && styles.couponInputDark]}
                  placeholder="Enter coupon code"
                  placeholderTextColor={colors.gray400}
                  value={couponCode}
                  onChangeText={(val) => {
                    setCouponCode(val);
                    if (couponDiscount > 0) {
                      setCouponDiscount(0);
                      setCouponMessage('');
                    }
                  }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.applyCouponBtn}
                  onPress={handleApplyCoupon}
                >
                  <Text style={styles.applyCouponText}>Apply</Text>
                </TouchableOpacity>
              </View>

              {couponMessage ? (
                <Text style={[styles.couponMsg, couponDiscount > 0 ? styles.couponSuccess : styles.couponError]}>
                  {couponMessage}
                </Text>
              ) : (
                <Text style={[styles.couponMsg, { color: colors.gray500 }]}>
                  Coupons are issued directly by JalRide administration.
                </Text>
              )}
            </Card>

            <Button
              title="Next: Review & Payment →"
              onPress={() => setStep(6)}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}

        {/* ================= STEP 6: PAYMENT & FARE BREAKDOWN ================= */}
        {step === 6 && (
          <View>
            <Text style={[styles.stepHeading, isDark && styles.textLight]}>
              Review & Payment
            </Text>
            <Text style={styles.stepSub}>
              Choose payment method and confirm reservation.
            </Text>

            {/* Honest Real Fare Breakdown */}
            <Card style={styles.fareBreakdownCard}>
              <Text style={styles.breakdownTitle}>Fare Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  {isWholeBoat
                    ? `Private Vessel Charter`
                    : `Base Fare (${passengers} × ₹${unitPrice})`}
                </Text>
                <Text style={styles.breakdownVal}>₹{baseFare}</Text>
              </View>
              {couponDiscount > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.success }]}>
                    Coupon Discount ({couponCode})
                  </Text>
                  <Text style={[styles.breakdownVal, { color: colors.success }]}>
                    −₹{couponDiscount}
                  </Text>
                </View>
              )}
              <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                <Text style={styles.breakdownTotalLabel}>Total Amount to Pay</Text>
                <Text style={styles.breakdownTotalVal}>₹{totalAmount}</Text>
              </View>
            </Card>

            {/* Payment Method Selector */}
            <Text style={[styles.sectionHeading, isDark && styles.textLight]}>Select Payment Option</Text>

            <TouchableOpacity
              style={[
                styles.payOption,
                paymentMethod === 'wallet' && styles.payOptionActive,
              ]}
              onPress={() => setPaymentMethod('wallet')}
            >
              <View style={styles.payOptionLeft}>
                <Text style={styles.payOptionIcon}>👛</Text>
                <View>
                  <Text style={styles.payOptionTitle}>JalRide Wallet</Text>
                  <Text style={styles.payOptionSub}>
                    Balance: ₹{walletBalance.toFixed(2)} {walletBalance >= totalAmount ? '(Instant 1-Click Pay)' : '(Covers partial fare)'}
                  </Text>
                </View>
              </View>
              <View style={[styles.radio, paymentMethod === 'wallet' && styles.radioActive]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payOption,
                paymentMethod === 'upi' && styles.payOptionActive,
              ]}
              onPress={() => setPaymentMethod('upi')}
            >
              <View style={styles.payOptionLeft}>
                <Text style={styles.payOptionIcon}>📱</Text>
                <View>
                  <Text style={styles.payOptionTitle}>UPI (Google Pay / PhonePe / Paytm)</Text>
                  <Text style={styles.payOptionSub}>Razorpay 256-bit encrypted gateway</Text>
                </View>
              </View>
              <View style={[styles.radio, paymentMethod === 'upi' && styles.radioActive]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.payOption,
                paymentMethod === 'card' && styles.payOptionActive,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <View style={styles.payOptionLeft}>
                <Text style={styles.payOptionIcon}>💳</Text>
                <View>
                  <Text style={styles.payOptionTitle}>Credit / Debit Card / Net Banking</Text>
                  <Text style={styles.payOptionSub}>All Visa, MasterCard, RuPay & Banks</Text>
                </View>
              </View>
              <View style={[styles.radio, paymentMethod === 'card' && styles.radioActive]} />
            </TouchableOpacity>

            <Button
              title={`Confirm & Pay ₹${totalAmount}`}
              onPress={handleConfirmAndPay}
              loading={isSubmitting}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}

        {/* ================= STEP 7: CONFIRMATION & DIGITAL TICKET ================= */}
        {step === 7 && completedBooking && (
          <View style={styles.successContainer}>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeIcon}>✓</Text>
            </View>

            <Text style={[styles.successTitle, isDark && styles.textLight]}>
              Ride Confirmed!
            </Text>
            <Text style={styles.successSub}>
              Your sacred boat ride on the Ganga is successfully reserved.
            </Text>

            {/* Boarding Pass Preview Card */}
            <Card style={styles.ticketStub}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketPlatform}>JALRIDE DIGITAL BOARDING PASS</Text>
                <Badge label="Confirmed" variant="success" size="small" />
              </View>

              <Text style={styles.ticketBoatName}>{completedBooking.boat?.boatName}</Text>
              <Text style={styles.ticketGhat}>Boarding: {completedBooking.boat?.location}</Text>

              <View style={styles.ticketDivider} />

              <View style={styles.ticketRow}>
                <View>
                  <Text style={styles.ticketLbl}>Date</Text>
                  <Text style={styles.ticketVal}>{completedBooking.bookingDate}</Text>
                </View>

                <View>
                  <Text style={styles.ticketLbl}>Departure Slot</Text>
                  <Text style={styles.ticketVal}>{completedBooking.bookingTime}</Text>
                </View>

                <View>
                  <Text style={styles.ticketLbl}>Passengers</Text>
                  <Text style={styles.ticketVal}>{completedBooking.passengers} Seats</Text>
                </View>
              </View>

              <View style={styles.ticketRow}>
                <View>
                  <Text style={styles.ticketLbl}>Ticket ID</Text>
                  <Text style={styles.ticketMono}>{completedBooking.ticketId}</Text>
                </View>

                <View>
                  <Text style={styles.ticketLbl}>Paid Total</Text>
                  <Text style={styles.ticketPrice}>₹{completedBooking.totalAmount}</Text>
                </View>
              </View>

              <View style={styles.qrStubArea}>
                <Text style={styles.qrIcon}>📱</Text>
                <Text style={styles.qrHint}>Ready for instant Ghat QR Boarding</Text>
              </View>
            </Card>

            <View style={styles.successBtnRow}>
              <Button
                title="View Full Boarding Pass →"
                onPress={() => navigation.navigate('Ticket', { booking: completedBooking })}
                style={{ flex: 1, marginRight: spacing.s }}
              />
              <Button
                title="Home"
                variant="outline"
                onPress={() => {
                  resetBookingDraft();
                  navigation.navigate('Home');
                }}
                style={{ width: 90 }}
              />
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Official Razorpay Checkout Modal */}
      <RazorpayCheckoutModal
        visible={showRazorpayModal}
        orderData={activePaymentOrder}
        customer={{
          name: user?.name || 'Pilgrim Devotee',
          email: user?.email || 'pilgrim@jalride.com',
          phone: user?.phone || '9876543210',
        }}
        onSuccess={handlePaymentSuccess}
        onCancel={() => {
          setShowRazorpayModal(false);
          Alert.alert(
            'Payment Pending',
            'Payment was cancelled. You can complete payment for your reserved slot from My Rides anytime.',
            [{ text: 'OK' }]
          );
        }}
      />
    </View>
  );
}

function getStepTitle(step) {
  switch (step) {
    case 1:
      return 'Choose Date';
    case 2:
      return 'Boat & Ghat';
    case 3:
      return 'Time Slot';
    case 4:
      return 'Passengers';
    case 5:
      return 'Coupons';
    case 6:
      return 'Payment';
    case 7:
      return 'Ticket Confirmed';
    default:
      return 'Booking';
  }
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
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.gray200,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.teal,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  stepHeading: {
    ...typography.h2,
    color: colors.ink,
    marginBottom: 4,
  },
  stepSub: {
    ...typography.body,
    color: colors.gray500,
    marginBottom: spacing.xl,
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
  },
  dateCard: {
    width: '30%',
    backgroundColor: colors.white,
    borderRadius: radii.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  dateCardDark: {
    backgroundColor: '#12262b',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dateCardSelected: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  dateMonth: {
    ...typography.caption,
    color: colors.gray500,
  },
  dateNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginVertical: 2,
  },
  dateDay: {
    ...typography.caption,
    color: colors.gray600,
    fontWeight: '600',
  },
  dateTextSelected: {
    color: colors.white,
  },
  infoNoteBox: {
    backgroundColor: colors.sunMist,
    padding: spacing.m,
    borderRadius: radii.m,
    marginTop: spacing.xl,
  },
  infoNoteText: {
    ...typography.bodySmall,
    color: colors.sunDeep,
    lineHeight: 18,
    fontWeight: '500',
  },
  selectedBoatCard: {
    padding: spacing.l,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  boatCardTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 4,
  },
  boatCardDesc: {
    ...typography.bodySmall,
    color: colors.gray600,
    lineHeight: 18,
    marginBottom: spacing.m,
  },
  boatCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.m,
  },
  boatCardPrice: {
    ...typography.h3,
    color: colors.teal,
    fontWeight: '700',
  },
  boatCardCap: {
    ...typography.caption,
    color: colors.gray500,
  },
  slotList: {
    gap: spacing.m,
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  slotItemDark: {
    backgroundColor: '#12262b',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  slotItemSelected: {
    backgroundColor: colors.tealMist,
    borderColor: colors.teal,
  },
  slotItemDisabled: {
    opacity: 0.5,
    backgroundColor: colors.gray100,
  },
  textDisabled: {
    color: colors.gray400,
  },
  slotPriceText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  charterToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray200,
    borderRadius: radii.m,
    padding: 4,
    marginBottom: spacing.l,
  },
  charterToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.s,
  },
  charterToggleBtnActive: {
    backgroundColor: colors.teal,
  },
  charterToggleText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.gray600,
  },
  charterToggleTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  slotLeft: {
    flex: 1,
  },
  slotTime: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  slotTimeSelected: {
    color: colors.teal,
  },
  slotLabel: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  slotLabelSelected: {
    color: colors.deep,
  },
  counterCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  counterLabel: {
    ...typography.bodyLarge,
    color: colors.gray600,
    marginBottom: spacing.l,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
  },
  counterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.tealMist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterBtnText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.teal,
  },
  counterDisplay: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.ink,
  },
  counterSub: {
    ...typography.caption,
    color: colors.gray500,
  },
  farePreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    padding: spacing.l,
    borderRadius: radii.m,
    marginTop: spacing.xl,
  },
  farePreviewTitle: {
    ...typography.bodyMedium,
    color: colors.gray600,
  },
  farePreviewAmount: {
    ...typography.h3,
    color: colors.teal,
    fontWeight: '700',
  },
  couponCard: {
    padding: spacing.l,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  couponInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: radii.m,
    paddingHorizontal: spacing.m,
    ...typography.bodyMedium,
  },
  couponInputDark: {
    borderColor: 'rgba(255,255,255,0.2)',
    color: '#eaf6f6',
    backgroundColor: '#12262b',
  },
  applyCouponBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.m,
  },
  applyCouponText: {
    ...typography.button,
    color: colors.white,
  },
  couponMsg: {
    ...typography.caption,
    marginVertical: 4,
  },
  couponSuccess: {
    color: colors.success,
  },
  couponError: {
    color: colors.danger,
  },
  quickCoupons: {
    marginTop: spacing.m,
    gap: spacing.s,
  },
  couponChip: {
    backgroundColor: colors.mist,
    padding: spacing.m,
    borderRadius: radii.s,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.tealLight,
  },
  couponChipCode: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
  },
  couponChipDesc: {
    ...typography.caption,
    color: colors.gray600,
  },
  fareBreakdownCard: {
    padding: spacing.l,
    marginBottom: spacing.xl,
  },
  breakdownTitle: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    ...typography.body,
    color: colors.gray600,
  },
  breakdownVal: {
    ...typography.body,
    fontWeight: '600',
    color: colors.ink,
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.m,
    marginTop: spacing.s,
  },
  breakdownTotalLabel: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
  },
  breakdownTotalVal: {
    ...typography.h2,
    fontWeight: '800',
    color: colors.teal,
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: spacing.m,
  },
  payOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.l,
    borderRadius: radii.m,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    marginBottom: spacing.m,
  },
  payOptionActive: {
    borderColor: colors.teal,
    backgroundColor: colors.tealMist,
  },
  payOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  payOptionIcon: {
    fontSize: 24,
  },
  payOptionTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.ink,
  },
  payOptionSub: {
    ...typography.caption,
    color: colors.gray500,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray300,
  },
  radioActive: {
    borderColor: colors.teal,
    backgroundColor: colors.teal,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.l,
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  successBadgeIcon: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
  },
  successTitle: {
    ...typography.h1,
    color: colors.ink,
    marginBottom: 4,
  },
  successSub: {
    ...typography.body,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  ticketStub: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderLeftWidth: 6,
    borderLeftColor: colors.teal,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  ticketPlatform: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.teal,
    letterSpacing: 0.5,
  },
  ticketBoatName: {
    ...typography.h3,
    color: colors.ink,
    marginBottom: 2,
  },
  ticketGhat: {
    ...typography.bodySmall,
    color: colors.gray600,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.m,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  ticketLbl: {
    ...typography.caption,
    color: colors.gray500,
  },
  ticketVal: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 2,
  },
  ticketMono: {
    ...typography.mono,
    color: colors.teal,
    marginTop: 2,
  },
  ticketPrice: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  qrStubArea: {
    backgroundColor: colors.gray50,
    padding: spacing.m,
    borderRadius: radii.s,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  qrIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  qrHint: {
    ...typography.caption,
    color: colors.gray600,
    fontWeight: '600',
  },
  successBtnRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: spacing.xl,
  },
});
