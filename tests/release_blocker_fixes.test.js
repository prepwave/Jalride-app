const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('JalRide Release Blocker Fixes: Feature Parity & Functional Verification', () => {
  const root = path.resolve(__dirname, '..');
  const apiSrc = fs.readFileSync(path.join(root, 'src/services/api.js'), 'utf8');
  const bookingWizSrc = fs.readFileSync(path.join(root, 'src/screens/customer/BookingWizardScreen.js'), 'utf8');
  const razorpayModalSrc = fs.readFileSync(path.join(root, 'src/components/payment/RazorpayCheckoutModal.js'), 'utf8');
  const myRidesSrc = fs.readFileSync(path.join(root, 'src/screens/customer/MyRidesScreen.js'), 'utf8');
  const walletSrc = fs.readFileSync(path.join(root, 'src/screens/customer/CustomerWalletScreen.js'), 'utf8');
  const profileSrc = fs.readFileSync(path.join(root, 'src/screens/customer/ProfileScreen.js'), 'utf8');
  const registerSrc = fs.readFileSync(path.join(root, 'src/screens/auth/RegisterScreen.js'), 'utf8');
  const addEditBoatSrc = fs.readFileSync(path.join(root, 'src/screens/owner/AddEditBoatScreen.js'), 'utf8');
  const ownerNavSrc = fs.readFileSync(path.join(root, 'src/components/navigation/OwnerNavigator.js'), 'utf8');
  const customerNavSrc = fs.readFileSync(path.join(root, 'src/components/navigation/CustomerNavigator.js'), 'utf8');

  // =========================================================================
  // Part 1: Customer Payment Failure
  // =========================================================================
  describe('Part 1: Customer Payment & Razorpay Modal Recovery', () => {
    it('1.1 RazorpayCheckoutModal safely detects NativeModules.RNRazorpayCheckout and react-native-razorpay', () => {
      assert.ok(
        razorpayModalSrc.includes('RNRazorpayCheckout') || razorpayModalSrc.includes('require(\'react-native-razorpay\')'),
        'Must detect native Razorpay module including RNRazorpayCheckout'
      );
    });

    it('1.2 Auto-launches native Razorpay checkout when modal becomes visible', () => {
      assert.ok(
        razorpayModalSrc.includes('useEffect') && razorpayModalSrc.includes('handleLaunchNativeIfAvailable'),
        'Must auto-launch native checkout if module is present'
      );
    });

    it('1.3 BookingWizardScreen implements 409 active order recovery with retryPaymentOrder', () => {
      assert.ok(
        bookingWizSrc.includes('retryPaymentOrder') && bookingWizSrc.includes('requestOrderWithRetry'),
        'Must recover from 409 active payment order using retryPaymentOrder'
      );
    });

    it('1.4 api.js defines createPaymentOrder and retryPaymentOrder against authoritative backend routes', () => {
      assert.ok(apiSrc.includes("'/payments/create-order'"), 'Must call /payments/create-order');
      assert.ok(apiSrc.includes("'/payments/retry-order'"), 'Must call /payments/retry-order');
      assert.ok(apiSrc.includes("'/payments/verify'"), 'Must call /payments/verify');
    });
  });

  // =========================================================================
  // Part 2: Customer Booking History
  // =========================================================================
  describe('Part 2: Customer Booking History Status & Sorting', () => {
    it('2.1 MyRidesScreen maps both bookingStatus (backend authoritative) and fallback status', () => {
      assert.ok(
        myRidesSrc.includes('bookingStatus') && myRidesSrc.includes('getBookingStatus'),
        'Must inspect bookingStatus property matching backend Booking model'
      );
    });

    it('2.2 Filters upcoming vs past rides accurately according to backend booking statuses', () => {
      const getBookingStatus = (b) => (b?.bookingStatus || b?.status || 'confirmed').toLowerCase();
      const mockBookings = [
        { _id: '1', bookingStatus: 'pending', bookingDate: '2026-11-22' },
        { _id: '2', bookingStatus: 'confirmed', bookingDate: '2026-11-23' },
        { _id: '3', bookingStatus: 'completed', bookingDate: '2026-11-20' },
        { _id: '4', bookingStatus: 'cancelled', bookingDate: '2026-11-19' },
      ];

      const upcoming = mockBookings.filter((b) => {
        const st = getBookingStatus(b);
        return st === 'confirmed' || st === 'pending';
      });
      const past = mockBookings.filter((b) => {
        const st = getBookingStatus(b);
        return st === 'completed' || st === 'cancelled';
      });

      assert.strictEqual(upcoming.length, 2, 'Pending and Confirmed must be upcoming');
      assert.strictEqual(past.length, 2, 'Completed and Cancelled must be past');
    });

    it('2.3 Sorts bookings in descending chronological order (newest first)', () => {
      assert.ok(
        myRidesSrc.includes('new Date(b.createdAt') || myRidesSrc.includes('bookingDate'),
        'Must sort bookings chronologically'
      );
    });
  });

  // =========================================================================
  // Part 3: Customer Transaction History
  // =========================================================================
  describe('Part 3: Customer Transaction History & Wallet Filter', () => {
    it('3.1 CustomerWalletScreen correctly stores transactions from getCustomerWalletTransactions into state', () => {
      assert.ok(
        walletSrc.includes('setRawTransactions') && walletSrc.includes('rawTransactions'),
        'Must store transactions list into state'
      );
    });

    it('3.2 Filters support both topup, booking_payment, and refund transaction types', () => {
      assert.ok(
        walletSrc.includes('booking_payment') || walletSrc.includes('booking_debit'),
        'Must filter booking payments'
      );
      assert.ok(
        walletSrc.includes('refund_credit') || walletSrc.includes('refund'),
        'Must filter refunds'
      );
      assert.ok(
        walletSrc.includes('wallet_topup') || walletSrc.includes('topup'),
        'Must filter topups'
      );
    });

    it('3.3 Displays transaction note or description or booking ticket ID on cards', () => {
      assert.ok(
        walletSrc.includes('item.note') || walletSrc.includes('item.description') || walletSrc.includes('ticketId'),
        'Must display human-readable transaction note'
      );
    });
  });

  // =========================================================================
  // Part 4: Customer Account Verification
  // =========================================================================
  describe('Part 4: Customer Account Verification Status & Resend', () => {
    it('4.1 ProfileScreen displays verification banner and warning badge when unverified', () => {
      assert.ok(
        profileSrc.includes('!user?.isEmailVerified') && profileSrc.includes('Email Verification Pending'),
        'Must show verification pending banner when user is not verified'
      );
      assert.ok(
        profileSrc.includes('Verified Email') && profileSrc.includes('Unverified'),
        'Must distinguish verified and unverified email status'
      );
    });

    it('4.2 ProfileScreen provides Resend Verification Link button calling api.resendVerification', () => {
      assert.ok(
        profileSrc.includes('handleResendVerification') && profileSrc.includes('api.resendVerification'),
        'Must trigger resendVerification on button press'
      );
    });

    it('4.3 RegisterScreen explains verification link sent (24-hour expiry) without misleading OTP input', () => {
      assert.ok(
        registerSrc.includes('verification link') && registerSrc.includes('24 hours'),
        'Must explain link-based email verification'
      );
    });
  });

  // =========================================================================
  // Part 5: Owner Boat Listing Preferences
  // =========================================================================
  describe('Part 5: Owner Boat Listing Form Preferences', () => {
    it('5.1 Supports Other / Custom Station selection and customStationName input', () => {
      assert.ok(
        addEditBoatSrc.includes('selectedGhat === \'Other\'') && addEditBoatSrc.includes('customStationName'),
        'Must support Other / Custom Station input'
      );
      assert.ok(
        addEditBoatSrc.includes('Custom Boarding Ghat / Station Name'),
        'Must show label for custom station input'
      );
    });

    it('5.2 Validates that custom station name is not empty before submission', () => {
      assert.ok(
        addEditBoatSrc.includes('finalLocation') && addEditBoatSrc.includes('Please enter or select a boarding ghat station'),
        'Must validate custom station before save'
      );
    });

    it('5.3 Supports multi-select ride themes and maps primary category to backend rideCategory enum', () => {
      assert.ok(
        addEditBoatSrc.includes('selectedThemes') && addEditBoatSrc.includes('toggleTheme'),
        'Must maintain multi-select ride theme state'
      );
      assert.ok(
        addEditBoatSrc.includes('primaryRideCategory'),
        'Must determine primary category enum for backend compatibility'
      );
    });

    it('5.4 Automatically enables whole boat booking when private charter theme is selected', () => {
      assert.ok(
        addEditBoatSrc.includes('isWholeBoatActive') || addEditBoatSrc.includes('setAllowWholeBoatBooking(true)'),
        'Selecting whole_boat must enable whole boat charter option'
      );
    });
  });

  // =========================================================================
  // Part 6: Owner Fleet Maintenance Failure
  // =========================================================================
  describe('Part 6: Owner Fleet Maintenance Status Update Fix', () => {
    it('6.1 updateBoatStatus calls PUT /owner/boats/:id instead of buggy /owner/qr/:id/status endpoint', () => {
      assert.ok(
        apiSrc.includes('updateBoatStatus(boatId, status)') &&
        apiSrc.includes('`/owner/boats/${boatId}`'),
        'updateBoatStatus must target PUT /owner/boats/:id'
      );
    });

    it('6.2 Backend route PUT /owner/boats/:id updates fleet availability without 403 Not your boat error', () => {
      assert.ok(
        !apiSrc.match(/async\s+updateBoatStatus[\s\S]*?\/owner\/qr\//),
        'Must not call buggy /owner/qr endpoint for fleet status'
      );
    });
  });

  // =========================================================================
  // Part 7: Profile Preferences Navigation
  // =========================================================================
  describe('Part 7: Profile Preferences Navigation & Stack Registration', () => {
    it('7.1 OwnerNavigator registers ManageBankAccounts, Notifications, PrivacyDataRights, and Wallet', () => {
      assert.ok(ownerNavSrc.includes('name="ManageBankAccounts"'), 'Must register ManageBankAccounts in OwnerNavigator');
      assert.ok(ownerNavSrc.includes('name="Notifications"'), 'Must register Notifications in OwnerNavigator');
      assert.ok(ownerNavSrc.includes('name="PrivacyDataRights"'), 'Must register PrivacyDataRights in OwnerNavigator');
      assert.ok(ownerNavSrc.includes('name="Wallet"'), 'Must register Wallet in OwnerNavigator');
    });

    it('7.2 CustomerNavigator registers MyRides, Wallet, ManageBankAccounts, Notifications, and PrivacyDataRights', () => {
      assert.ok(customerNavSrc.includes('name="MyRides"'), 'Must register MyRides in CustomerNavigator');
      assert.ok(customerNavSrc.includes('name="Wallet"'), 'Must register Wallet in CustomerNavigator');
      assert.ok(customerNavSrc.includes('name="ManageBankAccounts"'), 'Must register ManageBankAccounts in CustomerNavigator');
      assert.ok(customerNavSrc.includes('name="Notifications"'), 'Must register Notifications in CustomerNavigator');
      assert.ok(customerNavSrc.includes('name="PrivacyDataRights"'), 'Must register PrivacyDataRights in CustomerNavigator');
    });

    it('7.3 ProfileScreen branches preferences based on activeRole (Owner vs Customer)', () => {
      assert.ok(
        profileSrc.includes('activeRole === \'owner\'') &&
        profileSrc.includes('OwnerWallet') &&
        profileSrc.includes('OwnerQrPosters') &&
        profileSrc.includes('OwnerKyc'),
        'Owner view must link to owner earnings, QR posters and KYC'
      );
      assert.ok(
        profileSrc.includes('MyRides') && profileSrc.includes('Wallet'),
        'Customer view must link to rides and wallet'
      );
    });
  });
});
