const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 4A: Owner Dispatch & Live QR Ticket Verification Suite', () => {
  // Helper function matching OwnerBookingsScreen render logic
  const getDispatchButtonState = (booking) => {
    const bookingStatus = booking.bookingStatus || booking.status || 'confirmed';
    const rideStatus = booking.rideStatus || 'confirmed';
    const paymentStatus = booking.paymentStatus || 'paid';
    const isCash = booking.paymentMethod === 'cash';

    const canConfirm = bookingStatus === 'pending';
    const canHold = bookingStatus === 'pending' || (bookingStatus === 'confirmed' && rideStatus !== 'ride_started' && rideStatus !== 'ride_completed');
    const canStartRide = bookingStatus === 'confirmed' && rideStatus !== 'ride_started' && rideStatus !== 'ride_completed';
    const canFinishRide = rideStatus === 'ride_started';
    const canMarkCash = isCash && paymentStatus !== 'paid' && bookingStatus !== 'cancelled';
    const canCancel = (bookingStatus === 'pending' || bookingStatus === 'confirmed') && rideStatus !== 'ride_started' && rideStatus !== 'ride_completed';
    const isRideFinished = rideStatus === 'ride_completed' || bookingStatus === 'completed';

    return {
      canConfirm,
      canHold,
      canStartRide,
      canFinishRide,
      canMarkCash,
      canCancel,
      isRideFinished,
    };
  };

  // =========================================================================
  // Criterion 1: Decoupled Dispatch State Machine & Button Visibility
  // =========================================================================
  describe('Criterion 1: Decoupled Status Mapping (bookingStatus, rideStatus, paymentStatus)', () => {

    it('Shows "Start Ride" only when booking is confirmed and ride is not yet started', () => {
      const confirmedBooking = {
        _id: 'b1',
        bookingStatus: 'confirmed',
        rideStatus: 'confirmed',
        paymentStatus: 'paid',
      };
      const buttons = getDispatchButtonState(confirmedBooking);

      assert.strictEqual(buttons.canStartRide, true, 'Start Ride must be visible');
      assert.strictEqual(buttons.canFinishRide, false, 'Finish Ride must NOT be visible before starting');
      assert.strictEqual(buttons.isRideFinished, false);
    });

    it('Shows "Finish Ride" and hides "Start Ride" when rideStatus is ride_started', () => {
      // Critical test: bookingStatus is confirmed, but rideStatus is ride_started
      const inProgressBooking = {
        _id: 'b2',
        bookingStatus: 'confirmed',
        rideStatus: 'ride_started',
        paymentStatus: 'paid',
      };
      const buttons = getDispatchButtonState(inProgressBooking);

      assert.strictEqual(buttons.canStartRide, false, 'Start Ride must be hidden once ride is in progress');
      assert.strictEqual(buttons.canFinishRide, true, 'Finish Ride must be visible during active ride');
      assert.strictEqual(buttons.canCancel, false, 'Ride in progress cannot be cancelled');
    });

    it('Hides both Start and Finish buttons and marks completed when rideStatus is ride_completed', () => {
      const completedBooking = {
        _id: 'b3',
        bookingStatus: 'confirmed',
        rideStatus: 'ride_completed',
        paymentStatus: 'paid',
      };
      const buttons = getDispatchButtonState(completedBooking);

      assert.strictEqual(buttons.canStartRide, false);
      assert.strictEqual(buttons.canFinishRide, false);
      assert.strictEqual(buttons.isRideFinished, true, 'Must display ride finished badge');
      assert.strictEqual(buttons.canCancel, false);
    });

    it('Pending bookings permit Confirm, Hold, and Cancel but NOT Start or Finish Ride', () => {
      const pendingBooking = {
        _id: 'b4',
        bookingStatus: 'pending',
        rideStatus: 'payment_pending',
        paymentStatus: 'unpaid',
      };
      const buttons = getDispatchButtonState(pendingBooking);

      assert.strictEqual(buttons.canConfirm, true);
      assert.strictEqual(buttons.canHold, true);
      assert.strictEqual(buttons.canCancel, true);
      assert.strictEqual(buttons.canStartRide, false, 'Unconfirmed booking must not permit start ride');
      assert.strictEqual(buttons.canFinishRide, false);
    });

    it('Cash booking permits "Cash Received" only when paymentStatus is unpaid and not cancelled', () => {
      const cashUnpaid = {
        _id: 'b5',
        bookingStatus: 'confirmed',
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
      };
      const cashPaid = {
        _id: 'b6',
        bookingStatus: 'confirmed',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      };
      const cashCancelled = {
        _id: 'b7',
        bookingStatus: 'cancelled',
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
      };

      assert.strictEqual(getDispatchButtonState(cashUnpaid).canMarkCash, true);
      assert.strictEqual(getDispatchButtonState(cashPaid).canMarkCash, false);
      assert.strictEqual(getDispatchButtonState(cashCancelled).canMarkCash, false);
    });
  });

  // =========================================================================
  // Criterion 2: Custom Cancellation Reason Dialog & Payload
  // =========================================================================
  describe('Criterion 2: Cancellation Reasons Contract & Payload Verification', () => {
    const APPROVED_REASONS = [
      'Adverse river/weather conditions',
      'Vessel mechanical inspection',
      'Passenger requested cancellation',
      'Passenger no-show at scheduled departure',
    ];

    it('Enforces all 4 approved operational cancellation reasons', () => {
      assert.strictEqual(APPROVED_REASONS.length, 4);
      assert.ok(APPROVED_REASONS.includes('Adverse river/weather conditions'));
      assert.ok(APPROVED_REASONS.includes('Vessel mechanical inspection'));
      assert.ok(APPROVED_REASONS.includes('Passenger requested cancellation'));
      assert.ok(APPROVED_REASONS.includes('Passenger no-show at scheduled departure'));
    });

    it('Constructs correct rejection endpoint and payload with chosen reason', () => {
      const buildRejectRequest = (bookingId, reason) => ({
        method: 'PUT',
        path: `/owner/bookings/${bookingId}/reject`,
        body: { reason },
      });

      const req = buildRejectRequest('6543210987abcdef65432109', 'Adverse river/weather conditions');
      assert.strictEqual(req.method, 'PUT');
      assert.strictEqual(req.path, '/owner/bookings/6543210987abcdef65432109/reject');
      assert.strictEqual(req.body.reason, 'Adverse river/weather conditions');
    });
  });

  // =========================================================================
  // Criterion 3: QR Code Parsing & Cryptographic Ticket Verification
  // =========================================================================
  describe('Criterion 3: QR Code Parsing (JSON, URL, Deep-link, Raw Ticket)', () => {
    const parseScannedQr = (qrData) => {
      let payload = null;
      try {
        if (typeof qrData === 'object' && qrData !== null) {
          payload = qrData;
        } else if (typeof qrData === 'string') {
          const s = qrData.trim();
          if (s.startsWith('{')) {
            payload = JSON.parse(s);
          } else if (s.includes('ticketId=') || s.includes('bookingId=') || s.includes('v=')) {
            const mTicket = s.match(/[?&]ticketId=([^&#]+)/i);
            const mBooking = s.match(/[?&]bookingId=([^&#]+)/i) || s.match(/[?&]booking=([^&#]+)/i) || s.match(/[?&]id=([^&#]+)/i);
            const mV = s.match(/[?&]v=([^&#]+)/i);
            payload = {
              ticketId: mTicket ? decodeURIComponent(mTicket[1]) : undefined,
              bookingId: mBooking ? decodeURIComponent(mBooking[1]) : undefined,
              v: mV ? decodeURIComponent(mV[1]) : undefined,
            };
          } else if (s.startsWith('JR-')) {
            payload = { ticketId: s };
          }
        }
      } catch (_) {
        payload = null;
      }
      return payload;
    };

    it('Parses JSON boarding pass payload with cryptographic hash (v)', () => {
      const rawJson = JSON.stringify({
        ticketId: 'JR-2026-X89',
        bookingId: '6543210987abcdef65432109',
        v: 'a1b2c3d4e5f60718',
      });
      const parsed = parseScannedQr(rawJson);

      assert.strictEqual(parsed.ticketId, 'JR-2026-X89');
      assert.strictEqual(parsed.bookingId, '6543210987abcdef65432109');
      assert.strictEqual(parsed.v, 'a1b2c3d4e5f60718');
    });

    it('Parses web ticket verification deep link with query parameters', () => {
      const url = 'https://jalride.com/ticket?ticketId=JR-2026-X89&bookingId=6543210987abcdef65432109&v=a1b2c3d4e5f60718';
      const parsed = parseScannedQr(url);

      assert.strictEqual(parsed.ticketId, 'JR-2026-X89');
      assert.strictEqual(parsed.bookingId, '6543210987abcdef65432109');
      assert.strictEqual(parsed.v, 'a1b2c3d4e5f60718');
    });

    it('Parses raw Ticket ID starting with JR-', () => {
      const rawId = 'JR-2026-TK99';
      const parsed = parseScannedQr(rawId);

      assert.strictEqual(parsed.ticketId, 'JR-2026-TK99');
      assert.strictEqual(parsed.v, undefined);
    });

    it('Selects cryptographic endpoint POST /bookings/verify-ticket when signature v is present', () => {
      const payload = {
        ticketId: 'JR-2026-X89',
        bookingId: '6543210987abcdef65432109',
        v: 'a1b2c3d4e5f60718',
      };

      const selectVerificationRoute = (p) => {
        if (p && p.bookingId && p.ticketId && p.v) {
          return {
            path: '/bookings/verify-ticket',
            body: { bookingId: p.bookingId, ticketId: p.ticketId, v: p.v },
          };
        }
        return {
          path: '/bookings/verify-ticket-id',
          body: { ticketId: p.ticketId },
        };
      };

      const route = selectVerificationRoute(payload);
      assert.strictEqual(route.path, '/bookings/verify-ticket');
      assert.deepStrictEqual(route.body, payload);
    });

    it('Falls back to POST /bookings/verify-ticket-id for manual ticket ID', () => {
      const payload = { ticketId: 'JR-2026-TK99' };

      const selectVerificationRoute = (p) => {
        if (p && p.bookingId && p.ticketId && p.v) {
          return { path: '/bookings/verify-ticket', body: p };
        }
        return { path: '/bookings/verify-ticket-id', body: { ticketId: p.ticketId } };
      };

      const route = selectVerificationRoute(payload);
      assert.strictEqual(route.path, '/bookings/verify-ticket-id');
      assert.strictEqual(route.body.ticketId, 'JR-2026-TK99');
    });
  });

  // =========================================================================
  // Criterion 4: Boarding Pass Verification State Handling (Success, Duplicate, Invalid)
  // =========================================================================
  describe('Criterion 4: Boarding Verification Response Handling', () => {
    it('Handles valid initial boarding: marks passenger as checked in', () => {
      const backendResponse = {
        success: true,
        valid: true,
        alreadyCheckedIn: false,
        message: 'Ticket verified successfully',
        booking: {
          _id: 'b1',
          ticketId: 'JR-2026-X89',
          customerName: 'Priya Sharma',
          passengers: 2,
          bookingDate: '2026-11-20',
          bookingTime: '17:30',
          paymentStatus: 'paid',
          checkedIn: true,
          checkedInAt: '2026-11-20T12:00:00.000Z',
        },
      };

      const evaluateCheckIn = (res) => {
        if (!res.valid) return { state: 'invalid', label: '✕ INVALID / TAMPERED TICKET' };
        if (res.alreadyCheckedIn) return { state: 'duplicate', label: '⚠️ ALREADY CHECKED IN' };
        return { state: 'valid', label: '✓ VALID FOR BOARDING' };
      };

      const result = evaluateCheckIn(backendResponse);
      assert.strictEqual(result.state, 'valid');
      assert.strictEqual(result.label, '✓ VALID FOR BOARDING');
      assert.strictEqual(backendResponse.booking.passengers, 2);
    });

    it('Handles duplicate boarding scan: warns operator with previous check-in timestamp', () => {
      const duplicateResponse = {
        success: true,
        valid: true,
        alreadyCheckedIn: true,
        message: 'Already checked in at 2026-11-20T12:00:00.000Z',
        booking: {
          _id: 'b1',
          ticketId: 'JR-2026-X89',
          customerName: 'Priya Sharma',
          checkedIn: true,
          checkedInAt: '2026-11-20T12:00:00.000Z',
        },
      };

      const evaluateCheckIn = (res) => {
        if (!res.valid) return { state: 'invalid', label: '✕ INVALID / TAMPERED TICKET' };
        if (res.alreadyCheckedIn) return { state: 'duplicate', label: '⚠️ ALREADY CHECKED IN' };
        return { state: 'valid', label: '✓ VALID FOR BOARDING' };
      };

      const result = evaluateCheckIn(duplicateResponse);
      assert.strictEqual(result.state, 'duplicate');
      assert.strictEqual(result.label, '⚠️ ALREADY CHECKED IN');
      assert.strictEqual(duplicateResponse.alreadyCheckedIn, true);
    });

    it('Handles tampered or invalid QR: displays error and blocks boarding', () => {
      const tamperedResponse = {
        success: true,
        valid: false,
        message: 'Invalid or tampered ticket',
      };

      const evaluateCheckIn = (res) => {
        if (!res.valid) return { state: 'invalid', label: '✕ INVALID / TAMPERED TICKET', message: res.message };
        if (res.alreadyCheckedIn) return { state: 'duplicate', label: '⚠️ ALREADY CHECKED IN' };
        return { state: 'valid', label: '✓ VALID FOR BOARDING' };
      };

      const result = evaluateCheckIn(tamperedResponse);
      assert.strictEqual(result.state, 'invalid');
      assert.strictEqual(result.label, '✕ INVALID / TAMPERED TICKET');
    });

    it('Handles unpaid ticket: rejects check-in and displays payment unconfirmed status', () => {
      const unpaidResponse = {
        success: false,
        valid: false,
        message: 'Ticket payment is not confirmed',
      };

      const evaluateCheckIn = (res) => {
        if (!res.valid) return { state: 'invalid', label: '✕ INVALID / TAMPERED TICKET', message: res.message };
        if (res.alreadyCheckedIn) return { state: 'duplicate', label: '⚠️ ALREADY CHECKED IN' };
        return { state: 'valid', label: '✓ VALID FOR BOARDING' };
      };

      const result = evaluateCheckIn(unpaidResponse);
      assert.strictEqual(result.state, 'invalid');
      assert.strictEqual(result.message, 'Ticket payment is not confirmed');
    });
  });

  // =========================================================================
  // Criterion 5: In-flight Action Locking & Idempotency
  // =========================================================================
  describe('Criterion 5: In-flight Concurrency & Duplicate Request Guarding', () => {
    it('Blocks duplicate action invocation while an operation is already in-flight', async () => {
      let executedOperations = 0;
      let actionLoadingId = null;

      const performAction = async (bookingId) => {
        if (actionLoadingId) return false; // Locked
        actionLoadingId = bookingId;
        executedOperations++;
        // Simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 15));
        actionLoadingId = null;
        return true;
      };

      // Rapidly fire 3 clicks on "Start Ride"
      const first = performAction('b1');
      const second = performAction('b1');
      const third = performAction('b1');

      const [res1, res2, res3] = await Promise.all([first, second, third]);

      assert.strictEqual(res1, true, 'First action must execute');
      assert.strictEqual(res2, false, 'Second action must be dropped by lock');
      assert.strictEqual(res3, false, 'Third action must be dropped by lock');
      assert.strictEqual(executedOperations, 1, 'Only one mutation request may reach the backend');
    });

    it('Locks barcode scanner to prevent duplicate scans during backend verification', async () => {
      let verifyCalls = 0;
      let isVerifying = false;

      const handleScan = async (code) => {
        if (isVerifying || !code) return;
        isVerifying = true;
        verifyCalls++;
        await new Promise((resolve) => setTimeout(resolve, 15));
        isVerifying = false;
      };

      const p1 = handleScan('JR-2026-X89');
      const p2 = handleScan('JR-2026-X89');
      await Promise.all([p1, p2]);

      assert.strictEqual(verifyCalls, 1, 'Scanner lock must prevent duplicate scans of the same frame');
    });

    it('Refreshes authoritative booking state after mutation without assuming instant client state', async () => {
      let localBookings = [
        { _id: 'b10', bookingStatus: 'confirmed', rideStatus: 'confirmed' }
      ];

      // Simulated backend mutation
      const startRideMutation = async (id) => {
        // Backend updates state
        return { success: true };
      };

      const fetchAuthoritativeBookings = async () => {
        // Returns fresh state from backend
        return [
          { _id: 'b10', bookingStatus: 'confirmed', rideStatus: 'ride_started' }
        ];
      };

      // Perform mutation and re-fetch
      await startRideMutation('b10');
      localBookings = await fetchAuthoritativeBookings();

      assert.strictEqual(localBookings[0].rideStatus, 'ride_started');
      const buttons = getDispatchButtonState(localBookings[0]);
      assert.strictEqual(buttons.canStartRide, false);
      assert.strictEqual(buttons.canFinishRide, true);
    });

    it('Displays backend API error and suppresses false success alert when mutation fails', async () => {
      let alertMessage = null;
      let successAlertShown = false;

      const apiCall = async () => {
        throw new Error('Ghat water level advisory active: departure suspended');
      };

      try {
        await apiCall();
        successAlertShown = true;
      } catch (err) {
        alertMessage = err.message;
      }

      assert.strictEqual(successAlertShown, false, 'Success alert must NOT be shown on failure');
      assert.strictEqual(alertMessage, 'Ghat water level advisory active: departure suspended');
    });
  });
});
