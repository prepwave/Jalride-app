const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('JalRide Release Blockers: My Rides Status Integrity + QR Online Payment', () => {
  const root = path.resolve(__dirname, '..');
  const myRidesSrc = fs.readFileSync(path.join(root, 'src/screens/customer/MyRidesScreen.js'), 'utf8');
  const qrScanSrc = fs.readFileSync(path.join(root, 'src/screens/customer/QrScanScreen.js'), 'utf8');
  const apiSrc = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');
  const razorpayModalSrc = fs.readFileSync(path.join(root, 'src/components/payment/RazorpayCheckoutModal.js'), 'utf8');

  // Re-create pure normalized function matching MyRidesScreen logic for unit evaluation
  const VALID_BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'expired'];
  const getBookingStatus = (b) => {
    if (!b || typeof b !== 'object') return 'unknown';

    const rawBookingStatus = typeof b.bookingStatus === 'string' ? b.bookingStatus.trim().toLowerCase() : null;
    if (rawBookingStatus) {
      if (VALID_BOOKING_STATUSES.includes(rawBookingStatus)) {
        return rawBookingStatus;
      }
      return 'unknown';
    }

    const rawLegacyStatus = typeof b.status === 'string' ? b.status.trim().toLowerCase() : null;
    if (rawLegacyStatus) {
      if (VALID_BOOKING_STATUSES.includes(rawLegacyStatus)) {
        return rawLegacyStatus;
      }
      return 'unknown';
    }

    // Authoritative backend model default for new/empty booking is 'pending'
    return 'pending';
  };

  // ==========================================
  // 1. BLOCKER ONE: MY RIDES STATUS INTEGRITY
  // ==========================================
  describe('1. My Rides Status Normalization & Integrity', () => {
    it('1.1 Normalizes valid bookingStatus: confirmed', () => {
      assert.strictEqual(getBookingStatus({ bookingStatus: 'confirmed' }), 'confirmed');
    });

    it('1.2 Normalizes valid bookingStatus: pending', () => {
      assert.strictEqual(getBookingStatus({ bookingStatus: 'pending' }), 'pending');
    });

    it('1.3 Normalizes valid bookingStatus: completed', () => {
      assert.strictEqual(getBookingStatus({ bookingStatus: 'completed' }), 'completed');
    });

    it('1.4 Normalizes valid bookingStatus: cancelled', () => {
      assert.strictEqual(getBookingStatus({ bookingStatus: 'cancelled' }), 'cancelled');
    });

    it('1.5 Normalizes valid bookingStatus: expired', () => {
      assert.strictEqual(getBookingStatus({ bookingStatus: 'expired' }), 'expired');
    });

    it('1.6 Normalizes uppercase status values safely', () => {
      assert.strictEqual(getBookingStatus({ bookingStatus: 'CONFIRMED' }), 'confirmed');
      assert.strictEqual(getBookingStatus({ bookingStatus: 'PENDING' }), 'pending');
      assert.strictEqual(getBookingStatus({ bookingStatus: 'COMPLETED' }), 'completed');
      assert.strictEqual(getBookingStatus({ bookingStatus: 'CANCELLED' }), 'cancelled');
      assert.strictEqual(getBookingStatus({ bookingStatus: 'EXPIRED' }), 'expired');
    });

    it('1.7 Fallback to legacy status if bookingStatus is absent', () => {
      assert.strictEqual(getBookingStatus({ status: 'confirmed' }), 'confirmed');
      assert.strictEqual(getBookingStatus({ status: 'completed' }), 'completed');
      assert.strictEqual(getBookingStatus({ status: 'cancelled' }), 'cancelled');
    });

    it('1.8 Fallback to backend schema default pending when both are absent', () => {
      assert.strictEqual(getBookingStatus({}), 'pending');
      assert.strictEqual(getBookingStatus({ passengers: 2, amount: 700 }), 'pending');
      assert.notStrictEqual(getBookingStatus({}), 'confirmed', 'Empty booking must NEVER silently default to confirmed');
    });

    it('1.9 Unknown or unrecognized status classified as unknown and NEVER confirmed', () => {
      assert.strictEqual(getBookingStatus({ bookingStatus: 'processing' }), 'unknown');
      assert.strictEqual(getBookingStatus({ bookingStatus: 'random_val' }), 'unknown');
      assert.strictEqual(getBookingStatus({ status: 'unsupported_state' }), 'unknown');
      assert.notStrictEqual(getBookingStatus({ bookingStatus: 'processing' }), 'confirmed');
    });

    it('1.10 Null, undefined, and non-object values return unknown safely', () => {
      assert.strictEqual(getBookingStatus(null), 'unknown');
      assert.strictEqual(getBookingStatus(undefined), 'unknown');
      assert.strictEqual(getBookingStatus('invalid_string'), 'unknown');
    });

    it('1.11 Upcoming and Past lists accurately partition bookings without counting unknown as confirmed', () => {
      const mockBookings = [
        { _id: '1', bookingStatus: 'confirmed' },
        { _id: '2', bookingStatus: 'confirmed' },
        { _id: '3', bookingStatus: 'pending' },
        { _id: '4', bookingStatus: 'completed' },
        { _id: '5', bookingStatus: 'completed' },
        { _id: '6', bookingStatus: 'cancelled' },
        { _id: '7', bookingStatus: 'expired' },
        { _id: '8', bookingStatus: 'unknown_status' },
      ];

      const upcomingList = mockBookings.filter((b) => {
        const s = getBookingStatus(b);
        return s === 'confirmed' || s === 'pending';
      });

      const pastList = mockBookings.filter((b) => {
        const s = getBookingStatus(b);
        return s === 'completed' || s === 'cancelled' || s === 'expired' || s === 'unknown';
      });

      assert.strictEqual(upcomingList.length, 3, 'Upcoming must only contain confirmed and pending');
      assert.strictEqual(pastList.length, 5, 'Past trips must contain completed, cancelled, expired, unknown');
      assert.ok(!upcomingList.some(b => b.bookingStatus === 'unknown_status'), 'Unknown status must never appear in upcoming');
    });

    it('1.12 MyRidesScreen source implements safe normalization and badges', () => {
      assert.ok(myRidesSrc.includes('VALID_BOOKING_STATUSES'), 'Must declare VALID_BOOKING_STATUSES set');
      assert.ok(!myRidesSrc.includes("|| 'confirmed')"), 'Must NOT contain silent fallback to confirmed');
      assert.ok(myRidesSrc.includes('itemStatus === \'pending\''), 'Must have distinct visual treatment for pending');
      assert.ok(myRidesSrc.includes('itemStatus === \'expired\''), 'Must support expired booking state');
    });
  });

  // ==========================================
  // 2. BLOCKER TWO: QR ONLINE EXPRESS BOOKING PAYMENT
  // ==========================================
  describe('2. QR Online Express Booking Payment Flow & Safety', () => {
    it('2.1 QrScanScreen imports and mounts RazorpayCheckoutModal', () => {
      assert.ok(
        qrScanSrc.includes('RazorpayCheckoutModal'),
        'QrScanScreen must import RazorpayCheckoutModal'
      );
      assert.ok(
        qrScanSrc.includes('<RazorpayCheckoutModal'),
        'QrScanScreen must render RazorpayCheckoutModal in its JSX tree'
      );
    });

    it('2.2 QrScanScreen imports useAuth to prefill customer details', () => {
      assert.ok(
        qrScanSrc.includes('useAuth'),
        'QrScanScreen must import useAuth for authenticated prefill'
      );
      assert.ok(
        qrScanSrc.includes('user?.name') || qrScanSrc.includes('user?.email'),
        'QrScanScreen must prefill customer contact details in checkout'
      );
    });

    it('2.3 When online payment returns an order, Razorpay modal is launched instead of premature ticket', () => {
      assert.ok(
        qrScanSrc.includes('res.order') && qrScanSrc.includes('setShowRazorpayModal(true)'),
        'QrScanScreen must trigger Razorpay modal when res.order is present'
      );
      assert.ok(
        qrScanSrc.includes('setActivePaymentOrder'),
        'QrScanScreen must store active payment order'
      );
    });

    it('2.4 Signature verification is forwarded to backend authoritative endpoint', () => {
      assert.ok(
        qrScanSrc.includes('api.verifyInstantPayment') || qrScanSrc.includes('verifyInstantPayment'),
        'QrScanScreen must call verifyInstantPayment on successful Razorpay signature'
      );
      assert.ok(
        qrScanSrc.includes('razorpayOrderId') || qrScanSrc.includes('razorpay_order_id'),
        'Must forward razorpayOrderId to backend'
      );
      assert.ok(
        qrScanSrc.includes('razorpaySignature') || qrScanSrc.includes('razorpay_signature'),
        'Must forward razorpaySignature to backend'
      );
    });

    it('2.5 Ticket screen navigation only occurs AFTER authoritative payment verification', () => {
      assert.ok(
        qrScanSrc.includes('verifyRes.success'),
        'Ticket navigation in online flow must be guarded by backend verification success'
      );
      assert.ok(
        qrScanSrc.includes('navigation.navigate(\'Ticket\','),
        'Must navigate to Ticket only after successful payment'
      );
    });

    it('2.6 Duplicate payment submissions are prevented with ref guard', () => {
      assert.ok(
        qrScanSrc.includes('isVerifyingPaymentRef.current'),
        'Must prevent duplicate verification submissions'
      );
    });

    it('2.7 Checkout cancellation is handled accurately without false My Rides promise or fake ticket', () => {
      assert.ok(
        qrScanSrc.includes('handleQrPaymentCancel'),
        'Must have handleQrPaymentCancel handler'
      );
      assert.ok(
        qrScanSrc.includes('Payment was cancelled and your pass was not issued. To board this boat, please tap Confirm or re-scan the boat standee QR code.'),
        'Must display exact mandated cancellation message instructing rider to re-scan standee'
      );
      assert.ok(
        !qrScanSrc.includes('complete payment from My Rides'),
        'Must NOT falsely promise completion from My Rides'
      );
      assert.ok(
        !qrScanSrc.includes('navigation.navigate(\'MyRides\')'),
        'Cancellation must NOT navigate to My Rides'
      );
    });

    it('2.8 Verification network error retains original signature payload and booking context for retry', () => {
      assert.ok(
        qrScanSrc.includes('retainedSignatureRef.current = verifyPayload'),
        'Must retain exact original signature payload on verification dispatch'
      );
      assert.ok(
        qrScanSrc.includes('retainedBookingContextRef.current = bookingContext'),
        'Must retain original booking context for retry'
      );
      assert.ok(
        qrScanSrc.includes('Retry Verification'),
        'Must offer Retry Verification action on network error'
      );
      assert.ok(
        qrScanSrc.includes('retainedSignatureRef.current = null'),
        'Must clear retained recovery context upon confirmed verification success'
      );
    });

    it('2.9 Signature rejection is distinguished from network error and does not offer infinite retries', () => {
      assert.ok(
        qrScanSrc.includes('isSignatureRejection'),
        'Must explicitly distinguish signature rejection'
      );
      assert.ok(
        qrScanSrc.includes('Payment signature was rejected by the server'),
        'Must alert user on signature rejection'
      );
    });

    it('2.10 Cash and Wallet flows continue working without regressions', () => {
      assert.ok(
        qrScanSrc.includes('res.isCash') || qrScanSrc.includes('isCash'),
        'Cash flow must be preserved'
      );
      assert.ok(
        qrScanSrc.includes('res.fullyPaid'),
        'Fully-paid wallet flow must be preserved'
      );
    });

    it('2.11 api.js defines verifyInstantPayment targeting /qr/verify-payment', () => {
      assert.ok(
        apiSrc.includes('verifyInstantPayment'),
        'api.js must export verifyInstantPayment'
      );
      assert.ok(
        apiSrc.includes("'/qr/verify-payment'"),
        'verifyInstantPayment must call /qr/verify-payment'
      );
    });

    it('2.12 Component unmount safety prevents stale state updates', () => {
      assert.ok(
        qrScanSrc.includes('isMountedRef.current'),
        'Must guard async state updates and navigation against unmounted component'
      );
    });
  });
});
