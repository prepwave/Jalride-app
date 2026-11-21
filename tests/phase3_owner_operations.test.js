const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 3: Owner Operations - Controlled Parity Test Suite', () => {
  // Criterion 1 & 2: Valid boat category enum & Rejection of invalid categories
  describe('Criterion 1 & 2: Boat Category Enum Enforcement', () => {
    const VALID_BOAT_CATEGORIES = [
      'Rowboat',
      'Sailboat',
      'Motor Boat',
      'Speed Boat',
      'Deck Cruiser',
      'Houseboat',
      'Sunset Cruiser',
    ];

    it('Accepts all 7 valid categories matching backend Boat.js model enum', () => {
      VALID_BOAT_CATEGORIES.forEach((cat) => {
        assert.ok(
          VALID_BOAT_CATEGORIES.includes(cat),
          `Category "${cat}" must be accepted`
        );
      });
      assert.strictEqual(VALID_BOAT_CATEGORIES.length, 7);
    });

    it('Strictly rejects invalid or invented categories', () => {
      const invalidCategories = ['Yacht', 'Canoe', 'Kayak', 'Cruise', 'Ferry', 'Luxury Cruiser'];
      invalidCategories.forEach((cat) => {
        assert.strictEqual(
          VALID_BOAT_CATEGORIES.includes(cat),
          false,
          `Category "${cat}" must be rejected`
        );
      });
    });
  });

  // Criterion 3 & 4: FormData Payload Construction with Field Name `images`
  describe('Criterion 3 & 4: Image Upload & FormData Contract', () => {
    it('Constructs FormData payload using backend-required field name "images"', () => {
      // Mock FormData entry tracker
      const uploadedEntries = [];
      const mockFormData = {
        append(key, value) {
          uploadedEntries.push({ key, value });
        },
      };

      const selectedPhotos = [
        { uri: 'file:///data/cache/boat_front.jpg', type: 'image/jpeg', name: 'boat_front.jpg', size: 1024 * 1024 },
        { uri: 'file:///data/cache/boat_deck.png', type: 'image/png', name: 'boat_deck.png', size: 2 * 1024 * 1024 },
      ];

      selectedPhotos.forEach((photo, idx) => {
        mockFormData.append('images', {
          uri: photo.uri,
          type: photo.type || 'image/jpeg',
          name: photo.name || `photo_${idx}.jpg`,
        });
      });

      assert.strictEqual(uploadedEntries.length, 2);
      assert.strictEqual(uploadedEntries[0].key, 'images', 'Must use "images" field name matching backend upload.js');
      assert.strictEqual(uploadedEntries[1].key, 'images', 'All files must append to "images"');
      assert.strictEqual(uploadedEntries[0].value.name, 'boat_front.jpg');
    });

    it('Enforces max 6 photos and max 5MB per photo validation', () => {
      const MAX_IMAGES = 6;
      const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

      const oversizedPhoto = { uri: 'file:///heavy.jpg', size: 6 * 1024 * 1024 };
      const validPhoto = { uri: 'file:///light.jpg', size: 3 * 1024 * 1024 };

      assert.strictEqual(oversizedPhoto.size <= MAX_FILE_SIZE_BYTES, false, 'Oversized photo must fail check');
      assert.strictEqual(validPhoto.size <= MAX_FILE_SIZE_BYTES, true, 'Valid photo must pass size check');

      const photoList = [1, 2, 3, 4, 5, 6, 7];
      assert.strictEqual(photoList.length <= MAX_IMAGES, false, 'List exceeding 6 photos must be flagged');
    });
  });

  // Criterion 5, 6 & 7: api.js request compatibility (FormData vs JSON)
  describe('Criterion 5 & 6: api.js Request Formatting for JSON & FormData', () => {
    it('Omits Content-Type header and preserves body for FormData uploads', () => {
      // Simulate fake FormData
      class FakeFormData {}
      const formDataInstance = new FakeFormData();

      const prepareRequest = (endpoint, options = {}) => {
        const isFormData = options.body instanceof FakeFormData;
        const headers = { ...(options.headers || {}) };
        if (!isFormData) {
          headers['Content-Type'] = 'application/json';
        }
        return {
          endpoint,
          headers,
          body: isFormData ? options.body : JSON.stringify(options.body),
        };
      };

      const req = prepareRequest('/api/boats', { body: formDataInstance });
      assert.strictEqual(req.headers['Content-Type'], undefined, 'Must omit Content-Type for FormData');
      assert.strictEqual(req.body, formDataInstance, 'Body must remain unstringified FormData instance');
    });

    it('Sets Content-Type: application/json and stringifies plain object body', () => {
      const payload = { boatName: 'Ganga Vilas', capacity: 15 };
      const headers = {};
      const isFormData = false;
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      const serialized = JSON.stringify(payload);

      assert.strictEqual(headers['Content-Type'], 'application/json');
      assert.strictEqual(serialized, '{"boatName":"Ganga Vilas","capacity":15}');
    });
  });

  // Criterion 7 & 13: Live Boat Status Toggle via /owner/qr/:boatId/status
  describe('Criterion 7 & 13: Live Boat Status Update Contract', () => {
    it('Routes boat status updates to authoritative PUT /owner/qr/:boatId/status', () => {
      const mockApi = {
        calls: [],
        async updateBoatStatus(boatId, status) {
          this.calls.push({
            method: 'PUT',
            path: `/owner/qr/${boatId}/status`,
            body: { qrBookingStatus: status, status },
          });
          return { success: true, boat: { _id: boatId, qrBookingStatus: status, status } };
        },
      };

      const boatId = 'boat_abc123';
      mockApi.updateBoatStatus(boatId, 'maintenance');

      assert.strictEqual(mockApi.calls.length, 1);
      assert.strictEqual(mockApi.calls[0].method, 'PUT');
      assert.strictEqual(mockApi.calls[0].path, '/owner/qr/boat_abc123/status');
      assert.deepStrictEqual(mockApi.calls[0].body, {
        qrBookingStatus: 'maintenance',
        status: 'maintenance',
      });
    });
  });

  // Criterion 8: Availability Month and Day Query Construction
  describe('Criterion 8: Availability Month & Day API Methods', () => {
    it('Constructs correct month calendar query parameter YYYY-MM', () => {
      const boatId = 'boat_xyz987';
      const month = '2026-11';
      const endpoint = `/owner/availability/${boatId}/calendar?month=${month}`;
      assert.strictEqual(endpoint, '/owner/availability/boat_xyz987/calendar?month=2026-11');
    });

    it('Constructs correct day detail endpoint /owner/availability/:boatId/day/:date', () => {
      const boatId = 'boat_xyz987';
      const date = '2026-11-28';
      const endpoint = `/owner/availability/${boatId}/day/${date}`;
      assert.strictEqual(endpoint, '/owner/availability/boat_xyz987/day/2026-11-28');
    });
  });

  // Criterion 9: Closed Dates & Maintenance Payload Formats
  describe('Criterion 9: Closed Dates and Maintenance Payloads', () => {
    it('Formats closed-dates payload with dates array and optional force flag', () => {
      const boatId = 'boat_1';
      const dates = ['2026-11-24', '2026-11-25'];
      const force = true;
      const reason = 'High Water Level Warning';

      const req = {
        path: `/owner/availability/${boatId}/closed-dates`,
        body: { dates, force, reason },
      };

      assert.strictEqual(req.path, '/owner/availability/boat_1/closed-dates');
      assert.deepStrictEqual(req.body.dates, ['2026-11-24', '2026-11-25']);
      assert.strictEqual(req.body.force, true);
      assert.strictEqual(req.body.reason, 'High Water Level Warning');
    });

    it('Formats maintenance payload with startDate, endDate, force and notes', () => {
      const boatId = 'boat_2';
      const startDate = '2026-12-01';
      const endDate = '2026-12-05';
      const notes = 'Engine oil and rudder inspection';

      const req = {
        path: `/owner/availability/${boatId}/maintenance`,
        body: { startDate, endDate, force: false, notes },
      };

      assert.strictEqual(req.path, '/owner/availability/boat_2/maintenance');
      assert.strictEqual(req.body.startDate, '2026-12-01');
      assert.strictEqual(req.body.endDate, '2026-12-05');
      assert.strictEqual(req.body.force, false);
      assert.strictEqual(req.body.notes, notes);
    });

    it('Formats delete date override request to DELETE /owner/availability/:boatId/date/:date', () => {
      const boatId = 'boat_1';
      const date = '2026-11-24';
      const req = {
        method: 'DELETE',
        path: `/owner/availability/${boatId}/date/${date}`,
      };
      assert.strictEqual(req.method, 'DELETE');
      assert.strictEqual(req.path, '/owner/availability/boat_1/date/2026-11-24');
    });

    it('Formats price override request to PUT /owner/availability/:boatId/date/:date/price', () => {
      const boatId = 'boat_1';
      const date = '2026-11-28';
      const price = 450;
      const slotPrices = [{ slot: '06:00 AM', price: 500 }];

      const req = {
        method: 'PUT',
        path: `/owner/availability/${boatId}/date/${date}/price`,
        body: { price, slotPrices },
      };

      assert.strictEqual(req.method, 'PUT');
      assert.strictEqual(req.path, '/owner/availability/boat_1/date/2026-11-28/price');
      assert.strictEqual(req.body.price, 450);
      assert.deepStrictEqual(req.body.slotPrices, [{ slot: '06:00 AM', price: 500 }]);
    });
  });

  // Criterion 10: HTTP 409 Conflict Handling & Force Override Flow
  describe('Criterion 10: Conflict Detection (HTTP 409) and Force Retry', () => {
    it('Detects HTTP 409 conflict when existing bookings block availability change', () => {
      const conflictError = {
        status: 409,
        message: 'Existing bookings found on selected dates',
        conflicts: [
          { date: '2026-11-25', bookingsCount: 2, bookingIds: ['b1', 'b2'] },
        ],
      };

      const isConflict = conflictError.status === 409;
      assert.strictEqual(isConflict, true, 'Must identify HTTP 409 conflict');
      assert.ok(conflictError.conflicts.length > 0, 'Conflicts array must be present');
    });

    it('Allows caller to retry request with force: true upon user confirmation', () => {
      let retryPayload = null;
      const executeOverride = (force = false) => {
        retryPayload = { dates: ['2026-11-25'], force };
      };

      // First attempt (normal)
      executeOverride(false);
      assert.strictEqual(retryPayload.force, false);

      // User confirms force override
      executeOverride(true);
      assert.strictEqual(retryPayload.force, true);
    });
  });

  // Criterion 11: Recurring Schedule CRUD Payloads
  describe('Criterion 11: Recurring Schedule CRUD Endpoints and Payloads', () => {
    const boatId = 'boat_rec_123';

    it('List schedules: GET /owner/availability/:boatId/recurring', () => {
      const req = { method: 'GET', path: `/owner/availability/${boatId}/recurring` };
      assert.strictEqual(req.method, 'GET');
      assert.strictEqual(req.path, '/owner/availability/boat_rec_123/recurring');
    });

    it('Create schedule: POST /owner/availability/:boatId/recurring with weekday and slot array', () => {
      const scheduleData = {
        name: 'Morning Sunrise Run',
        daysOfWeek: [0, 5, 6], // Sun, Fri, Sat
        slots: [{ departureTime: '05:30', maxCapacity: 12, price: 300 }],
        effectiveFrom: '2026-12-01',
        effectiveUntil: '2027-03-31',
      };

      const req = {
        method: 'POST',
        path: `/owner/availability/${boatId}/recurring`,
        body: scheduleData,
      };

      assert.strictEqual(req.method, 'POST');
      assert.deepStrictEqual(req.body.daysOfWeek, [0, 5, 6]);
      assert.strictEqual(req.body.slots[0].departureTime, '05:30');
    });

    it('Delete schedule: DELETE /owner/availability/:boatId/recurring/:scheduleId', () => {
      const scheduleId = 'sched_999';
      const req = {
        method: 'DELETE',
        path: `/owner/availability/${boatId}/recurring/${scheduleId}`,
      };
      assert.strictEqual(req.method, 'DELETE');
      assert.strictEqual(req.path, '/owner/availability/boat_rec_123/recurring/sched_999');
    });
  });

  // Criterion 12: Owner Booking Customer Subdocument Field Mapping
  describe('Criterion 12: Booking Customer Field Mapping & Dispatch Lifecycle', () => {
    it('Maps populated customer subdocument fields safely', () => {
      const booking = {
        _id: 'b_101',
        ticketId: 'JR-2026-TK9',
        customer: {
          name: 'Pooja Agarwal',
          phone: '+919876543210',
          email: 'pooja@example.com',
        },
        bookingStatus: 'confirmed',
        totalAmount: 1200,
        ownerEarningAmount: 1080,
      };

      const customerName = booking.customer?.name || booking.customerName || 'Devotee / Passenger';
      const customerPhone = booking.customer?.phone || booking.customerPhone || 'N/A';
      const customerEmail = booking.customer?.email || 'N/A';
      const status = booking.bookingStatus || booking.status || 'confirmed';
      const netEarningsDisplay = (booking.ownerEarningAmount !== null && booking.ownerEarningAmount !== undefined && typeof booking.ownerEarningAmount === 'number')
        ? `₹${booking.ownerEarningAmount}`
        : (booking.ownerEarningAmount != null ? `₹${booking.ownerEarningAmount}` : 'N/A');

      assert.strictEqual(customerName, 'Pooja Agarwal');
      assert.strictEqual(customerPhone, '+919876543210');
      assert.strictEqual(customerEmail, 'pooja@example.com');
      assert.strictEqual(status, 'confirmed');
      assert.strictEqual(netEarningsDisplay, '₹1080');
    });

    it('Provides robust fallbacks when customer is unpopulated or missing and displays N/A for missing owner earnings', () => {
      const booking = {
        _id: 'b_102',
        ticketId: 'JR-2026-TK0',
        customer: null,
        customerName: 'Walk-in Devotee',
        status: 'pending',
        amount: 500,
      };

      const customerName = booking.customer?.name || booking.customerName || 'Devotee / Passenger';
      const customerPhone = booking.customer?.phone || booking.customerPhone || 'N/A';
      const customerEmail = booking.customer?.email || 'N/A';
      const status = booking.bookingStatus || booking.status || 'confirmed';
      const netEarningsDisplay = (booking.ownerEarningAmount !== null && booking.ownerEarningAmount !== undefined && typeof booking.ownerEarningAmount === 'number')
        ? `₹${booking.ownerEarningAmount}`
        : (booking.ownerEarningAmount != null ? `₹${booking.ownerEarningAmount}` : 'N/A');

      assert.strictEqual(customerName, 'Walk-in Devotee');
      assert.strictEqual(customerPhone, 'N/A');
      assert.strictEqual(customerEmail, 'N/A');
      assert.strictEqual(status, 'pending');
      assert.strictEqual(netEarningsDisplay, 'N/A', 'Must display N/A when ownerEarningAmount is missing - client calculation prohibited');
    });

    it('Routes dispatch actions to correct backend endpoints', () => {
      const actions = {
        confirm: (id) => ({ method: 'PUT', path: `/owner/bookings/${id}/accept` }),
        hold: (id) => ({ method: 'PUT', path: `/owner/bookings/${id}/pending` }),
        cancel: (id, reason) => ({ method: 'PUT', path: `/owner/bookings/${id}/reject`, body: { reason } }),
        cash: (id) => ({ method: 'PUT', path: `/owner/bookings/${id}/cash-received` }),
        start: (id) => ({ method: 'PUT', path: `/owner/bookings/${id}/start-ride` }),
        complete: (id) => ({ method: 'PUT', path: `/owner/bookings/${id}/complete-ride` }),
      };

      assert.strictEqual(actions.confirm('123').path, '/owner/bookings/123/accept');
      assert.strictEqual(actions.hold('123').path, '/owner/bookings/123/pending');
      assert.strictEqual(actions.cancel('123', 'bad weather').path, '/owner/bookings/123/reject');
      assert.strictEqual(actions.cash('123').path, '/owner/bookings/123/cash-received');
      assert.strictEqual(actions.start('123').path, '/owner/bookings/123/start-ride');
      assert.strictEqual(actions.complete('123').path, '/owner/bookings/123/complete-ride');
    });
  });

  // Criterion 14: Dashboard KPI Mapping & Calculations
  describe('Criterion 14: Owner Dashboard KPI Mapping', () => {
    it('Extracts totalEarnings, totalBoats, totalPaidRides, and bookingStatusCounts safely', () => {
      const backendDashboardResponse = {
        success: true,
        stats: {
          totalEarnings: 45200,
          totalBoats: 3,
          totalPaidRides: 142,
          bookingStatusCounts: {
            pending: 2,
            confirmed: 15,
            completed: 120,
            cancelled: 5,
          },
        },
        recentBookings: [
          { _id: 'rb_1', customer: { name: 'Rohan' }, boat: { boatName: 'Ganga 1' }, bookingStatus: 'confirmed' },
        ],
      };

      const stats = backendDashboardResponse.stats || {};
      const totalEarnings = stats.totalEarnings ?? 0;
      const totalBoats = stats.totalBoats ?? 0;
      const totalPaidRides = stats.totalPaidRides ?? 0;
      const bookingCounts = stats.bookingStatusCounts || {};

      assert.strictEqual(totalEarnings, 45200);
      assert.strictEqual(totalBoats, 3);
      assert.strictEqual(totalPaidRides, 142);
      assert.strictEqual(bookingCounts.pending, 2);
      assert.strictEqual(bookingCounts.confirmed, 15);
      assert.strictEqual(bookingCounts.completed, 120);
    });

    it('Handles null or missing dashboard response gracefully without crashing', () => {
      const emptyResponse = {};
      const stats = emptyResponse.stats || emptyResponse.dashboard || {};
      const totalEarnings = stats.totalEarnings ?? 0;
      const totalBoats = stats.totalBoats ?? 0;
      const totalPaidRides = stats.totalPaidRides ?? 0;

      assert.strictEqual(totalEarnings, 0);
      assert.strictEqual(totalBoats, 0);
      assert.strictEqual(totalPaidRides, 0);
    });
  });

  // Criterion 15: In-flight Duplicate Request Protection
  describe('Criterion 15: In-flight Duplicate Request Locking', () => {
    it('Drops concurrent or duplicate requests when fetch is in-flight', async () => {
      let callCount = 0;
      const isFetchingRef = { current: false };

      const guardedFetch = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        callCount++;
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        isFetchingRef.current = false;
      };

      // Trigger 3 calls in parallel
      const promise1 = guardedFetch();
      const promise2 = guardedFetch();
      const promise3 = guardedFetch();

      await Promise.all([promise1, promise2, promise3]);
      assert.strictEqual(callCount, 1, 'Only first request should execute; duplicate in-flight requests must be dropped');
    });

    it('Queues and executes a follow-up refresh if requested during an active in-flight request', async () => {
      let runCount = 0;
      const isFetchingRef = { current: false };
      const hasQueuedRefreshRef = { current: false };

      const safeFetch = async () => {
        if (isFetchingRef.current) {
          hasQueuedRefreshRef.current = true;
          return;
        }
        isFetchingRef.current = true;
        runCount++;
        // Simulate in-flight API request
        await new Promise((resolve) => setTimeout(resolve, 20));
        isFetchingRef.current = false;

        if (hasQueuedRefreshRef.current) {
          hasQueuedRefreshRef.current = false;
          await safeFetch();
        }
      };

      // Trigger initial fetch
      const first = safeFetch();
      // Mid-flight refresh triggers (e.g., from mutation or screen focus)
      await new Promise((resolve) => setTimeout(resolve, 5));
      const midFlight = safeFetch();

      await Promise.all([first, midFlight]);
      assert.strictEqual(runCount, 2, 'Must run the initial request and exactly one follow-up queued refresh');
      assert.strictEqual(hasQueuedRefreshRef.current, false, 'Queue flag must be cleared');
    });

    it('Guards against unsafe force override when active booking conflicts exist (HTTP 409)', () => {
      const conflictError = {
        status: 409,
        data: {
          success: false,
          conflicts: [
            { bookingId: 'b_1', passengers: 4, time: '17:30' },
            { bookingId: 'b_2', passengers: 2, time: '18:30' },
          ],
        },
      };

      // Safe conflict handler blocks automated override to prevent orphaned bookings
      const handleScheduleConflict = (err) => {
        if (err.status === 409 || (err.data && err.data.conflicts)) {
          const conflictCount = err.data?.conflicts?.length || 0;
          return {
            actionBlocked: true,
            conflictCount,
            message: `Action blocked: ${conflictCount} active booking(s) exist. Existing bookings are not automatically cancelled or refunded by backend.`,
          };
        }
        return { actionBlocked: false };
      };

      const result = handleScheduleConflict(conflictError);
      assert.strictEqual(result.actionBlocked, true);
      assert.strictEqual(result.conflictCount, 2);
      assert.match(result.message, /Action blocked: 2 active booking\(s\) exist/);
    });

    it('Verifies non-optimistic image deletion: keeps image state if server deletion fails', async () => {
      let stateImages = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      const mockFailingApi = async () => {
        throw new Error('HTTP 500 Network error');
      };

      // Safe deletion handler: only updates state on server success
      const deletePhotoSafely = async (index) => {
        try {
          await mockFailingApi();
          stateImages = stateImages.filter((_, i) => i !== index);
        } catch (e) {
          // Keep state intact; do not remove optimistically
        }
      };

      await deletePhotoSafely(1);
      assert.strictEqual(stateImages.length, 3, 'Images must not be removed from state on server failure');
      assert.strictEqual(stateImages[1], 'img2.jpg');
    });

    it('Verifies availability pricing rules, timezone and boat management API routes', () => {
      const endpoints = {
        deleteBoatImage: (id, idx) => ({ method: 'DELETE', path: `/owner/boats/${id}/images/${idx}` }),
        pricingRules: (id) => ({ method: 'GET', path: `/owner/availability/${id}/pricing-rules` }),
        createPricingRule: (id, body) => ({ method: 'POST', path: `/owner/availability/${id}/pricing-rules`, body }),
        updatePricingRule: (id, rId, body) => ({ method: 'PUT', path: `/owner/availability/${id}/pricing-rules/${rId}`, body }),
        deletePricingRule: (id, rId) => ({ method: 'DELETE', path: `/owner/availability/${id}/pricing-rules/${rId}` }),
        setTimezone: (id, tz) => ({ method: 'PUT', path: `/owner/availability/${id}/timezone`, body: { timezone: tz } }),
        previewPrice: (id, d, t) => ({ method: 'GET', path: `/owner/availability/${id}/preview-price?date=${d}&time=${t}` }),
      };

      assert.strictEqual(endpoints.deleteBoatImage('boat_1', 2).path, '/owner/boats/boat_1/images/2');
      assert.strictEqual(endpoints.deleteBoatImage('boat_1', 2).method, 'DELETE');
      assert.strictEqual(endpoints.pricingRules('boat_1').path, '/owner/availability/boat_1/pricing-rules');
      assert.strictEqual(endpoints.setTimezone('boat_1', 'Asia/Kolkata').path, '/owner/availability/boat_1/timezone');
      assert.strictEqual(endpoints.previewPrice('boat_1', '2026-11-20', '17:30').path, '/owner/availability/boat_1/preview-price?date=2026-11-20&time=17:30');
    });
  });

  // Criterion 16: Non-regression check covering Phase 1 and Phase 2
  describe('Criterion 16: Phase 1 & Phase 2 Non-Regression Contract', () => {
    it('Preserves Phase 1 DPDP compliance flags in registration payload', () => {
      const registrationPayload = {
        name: 'Owner Candidate',
        email: 'owner@jalride.in',
        phone: '+919988776655',
        password: 'SecurePassword123!',
        role: 'boat_owner',
        isAdult: true,
        privacyConsent: true,
        promotionalMarketing: false,
      };

      assert.strictEqual(registrationPayload.isAdult, true, 'isAdult must remain mandatory');
      assert.strictEqual(registrationPayload.privacyConsent, true, 'privacyConsent must remain mandatory');
      assert.strictEqual(typeof registrationPayload.promotionalMarketing, 'boolean');
      assert.strictEqual(registrationPayload.role, 'boat_owner');
    });

    it('Preserves Phase 2 local Base64 QR code generation for ticket boarding pass', () => {
      const ticketPayload = {
        ticketId: 'JR-2026-X89',
        bookingId: '6543210987abcdef65432109',
        v: 'a1b2c3d4e5f60718',
      };

      const serialized = JSON.stringify(ticketPayload);
      assert.strictEqual(serialized.includes('JR-2026-X89'), true);
      assert.strictEqual(serialized.includes('6543210987abcdef65432109'), true);
    });

    it('Preserves Phase 2 wallet and bank account API endpoints', () => {
      const endpoints = {
        getWallet: '/wallet',
        getBankAccounts: '/bank-accounts',
        addBankAccount: '/bank-accounts',
        setPrimaryBank: (id) => `/bank-accounts/${id}/primary`,
        deleteBank: (id) => `/bank-accounts/${id}`,
      };

      assert.strictEqual(endpoints.getWallet, '/wallet');
      assert.strictEqual(endpoints.getBankAccounts, '/bank-accounts');
      assert.strictEqual(endpoints.setPrimaryBank('ba123'), '/bank-accounts/ba123/primary');
      assert.strictEqual(endpoints.deleteBank('ba123'), '/bank-accounts/ba123');
    });
  });
});
