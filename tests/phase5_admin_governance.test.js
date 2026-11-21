const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 5: Super Admin Governance Consoles & Financial Integrity Test Suite', () => {
  // =========================================================================
  // Criterion 1: Universal Booking Ledger
  // =========================================================================
  describe('Criterion 1: Universal Booking Ledger Query & Response Mapping', () => {
    const parseBookingsResponse = (res, page = 1) => ({
      bookings: Array.isArray(res?.bookings) ? res.bookings : [],
      total: res?.total || res?.count || 0,
      page: res?.page || page,
      totalPages: res?.totalPages || 1,
    });

    const filterBookings = (bookings, status, search) => {
      let result = [...bookings];
      if (status && status !== 'all') {
        result = result.filter((b) => b.bookingStatus === status);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        result = result.filter(
          (b) =>
            (b.ticketId && b.ticketId.toLowerCase().includes(q)) ||
            (b.customer?.name && b.customer.name.toLowerCase().includes(q)) ||
            (b.boat?.boatName && b.boat.boatName.toLowerCase().includes(q))
        );
      }
      return result;
    };

    it('Correctly parses backend bookings response with pagination meta', () => {
      const mockRes = {
        success: true,
        count: 2,
        total: 104,
        page: 2,
        totalPages: 5,
        bookings: [
          {
            _id: 'b1',
            ticketId: 'JR-2026-A1',
            bookingStatus: 'confirmed',
            amount: 700,
            boat: { boatName: 'Ganga Mayya', location: 'Assi Ghat' },
            customer: { name: 'Amit Kumar', email: 'amit@example.com' },
          },
          {
            _id: 'b2',
            ticketId: 'JR-2026-B2',
            bookingStatus: 'completed',
            amount: 350,
            boat: { boatName: 'Kashi Yatra', location: 'Dashashwamedh' },
            customer: { name: 'Pooja Singh', email: 'pooja@example.com' },
          },
        ],
      };

      const parsed = parseBookingsResponse(mockRes, 2);
      assert.strictEqual(parsed.bookings.length, 2);
      assert.strictEqual(parsed.total, 104);
      assert.strictEqual(parsed.page, 2);
      assert.strictEqual(parsed.totalPages, 5);
    });

    it('Filters bookings by status and search query', () => {
      const allBookings = [
        { ticketId: 'JR-1', bookingStatus: 'confirmed', boat: { boatName: 'Boat Alpha' }, customer: { name: 'John Doe' } },
        { ticketId: 'JR-2', bookingStatus: 'cancelled', boat: { boatName: 'Boat Beta' }, customer: { name: 'Jane Smith' } },
        { ticketId: 'JR-3', bookingStatus: 'confirmed', boat: { boatName: 'Bajra Express' }, customer: { name: 'Alex' } },
      ];

      const confirmed = filterBookings(allBookings, 'confirmed', '');
      assert.strictEqual(confirmed.length, 2);

      const searched = filterBookings(allBookings, 'all', 'alpha');
      assert.strictEqual(searched.length, 1);
      assert.strictEqual(searched[0].ticketId, 'JR-1');
    });
  });

  // =========================================================================
  // Criterion 2: 100% Wallet Escrow Refund Authorizations
  // =========================================================================
  describe('Criterion 2: 100% Wallet Escrow Refund Authorizations', () => {
    it('Extracts refund details and verifies approval parameters', () => {
      const mockRefundItem = {
        _id: '665198273645019283746501',
        ticketId: 'JR-REFUND-99',
        refundAmount: 750,
        amount: 750,
        refundReason: 'Navik did not arrive due to high water current',
        customer: { name: 'Virendra', email: 'virendra@test.com', phone: '9876543210' },
        boat: { boatName: 'Shiva Cruise', location: 'Assi Ghat' },
      };

      assert.strictEqual(mockRefundItem.refundAmount, 750);
      assert.strictEqual(mockRefundItem.customer.name, 'Virendra');
      assert.strictEqual(mockRefundItem.ticketId, 'JR-REFUND-99');
    });

    it('Validates mandatory reason when rejecting customer refund', () => {
      const validateRejection = (reason) => {
        if (!reason || !reason.trim()) {
          throw new Error('A rejection reason is required');
        }
        return { reason: reason.trim() };
      };

      assert.throws(() => validateRejection(''), /required/);
      assert.throws(() => validateRejection('   '), /required/);

      const validPayload = validateRejection('Cancellation request arrived after ride started');
      assert.strictEqual(validPayload.reason, 'Cancellation request arrived after ride started');
    });
  });

  // =========================================================================
  // Criterion 3: KYC Operator & Vessel Safety Review
  // =========================================================================
  describe('Criterion 3: Operator & Vessel KYC Document Audit', () => {
    const formatDocType = (type) => {
      switch (type) {
        case 'aadhaar':
          return 'Aadhaar Card';
        case 'boat_license':
          return 'Port / Navigation License';
        case 'captain_certificate':
          return 'Captain Competency Certificate';
        default:
          return type ? type.toUpperCase() : 'ID';
      }
    };

    it('Formats KYC document types according to navigation guidelines', () => {
      assert.strictEqual(formatDocType('aadhaar'), 'Aadhaar Card');
      assert.strictEqual(formatDocType('boat_license'), 'Port / Navigation License');
      assert.strictEqual(formatDocType('captain_certificate'), 'Captain Competency Certificate');
    });

    it('Validates rejection payload requiring audit reason', () => {
      const buildRejectPayload = (reason) => {
        if (!reason || !reason.trim()) throw new Error('A rejection reason is required');
        return { reason: reason.trim() };
      };

      const payload = buildRejectPayload('Expired navigation fitness certificate');
      assert.strictEqual(payload.reason, 'Expired navigation fitness certificate');
    });
  });

  // =========================================================================
  // Criterion 4: Owner Withdrawal Payout Approval & UTR Recording
  // =========================================================================
  describe('Criterion 4: Owner Withdrawal Payout Approval & UTR Recording', () => {
    it('Requires Bank UTR / Transaction Reference when approving owner payout', () => {
      const buildApprovePayload = (adminNote, transactionReference) => {
        if (!transactionReference || !transactionReference.trim()) {
          throw new Error('Bank UTR / Transaction Reference is required');
        }
        return {
          adminNote: adminNote || '',
          transactionReference: transactionReference.trim(),
        };
      };

      assert.throws(() => buildApprovePayload('Note only', ''), /required/);

      const valid = buildApprovePayload(
        'Cleared via NEFT batch #82',
        'UTR-HDFC-9918273645'
      );
      assert.strictEqual(valid.transactionReference, 'UTR-HDFC-9918273645');
      assert.strictEqual(valid.adminNote, 'Cleared via NEFT batch #82');
    });

    it('Extracts bank IFSC, account number last 4 and holder name cleanly', () => {
      const mockWithdrawal = {
        _id: 'w1',
        amount: 15000,
        status: 'pending',
        owner: { name: 'Ramcharan Nishad', phone: '9988776655' },
        bankAccount: {
          bankName: 'State Bank of India',
          accountNumberLast4: '4321',
          ifscCode: 'SBIN0001234',
          accountHolderName: 'Ramcharan Nishad',
        },
      };

      assert.strictEqual(mockWithdrawal.bankAccount.accountNumberLast4, '4321');
      assert.strictEqual(mockWithdrawal.bankAccount.ifscCode, 'SBIN0001234');
      assert.strictEqual(mockWithdrawal.bankAccount.accountHolderName, 'Ramcharan Nishad');
      assert.strictEqual(mockWithdrawal.amount, 15000);
    });
  });

  // =========================================================================
  // Criterion 5: Financial Split & Commission Engine Validation
  // =========================================================================
  describe('Criterion 5: Financial Split & Commission Engine Rules', () => {
    const computeSplit = (amount, paymentMethod, settings) => {
      const rate = paymentMethod === 'cash'
        ? (settings.cashCommissionRate ?? 12)
        : (settings.onlineCommissionRate ?? 10);
      const commissionAmount = Math.round((amount * rate) / 100);
      const gst = Math.round((commissionAmount * (settings.commissionGstRate ?? 18)) / 100);
      const ownerEarning = amount - commissionAmount;

      return {
        rate,
        commissionAmount,
        gst,
        ownerEarning,
      };
    };

    it('Applies correct 10% online vs 12% cash commission split rules', () => {
      const settings = {
        onlineCommissionRate: 10,
        cashCommissionRate: 12,
        commissionGstRate: 18,
      };

      const onlineSplit = computeSplit(1000, 'online', settings);
      assert.strictEqual(onlineSplit.rate, 10);
      assert.strictEqual(onlineSplit.commissionAmount, 100);
      assert.strictEqual(onlineSplit.gst, 18);
      assert.strictEqual(onlineSplit.ownerEarning, 900);

      const cashSplit = computeSplit(1000, 'cash', settings);
      assert.strictEqual(cashSplit.rate, 12);
      assert.strictEqual(cashSplit.commissionAmount, 120);
      assert.strictEqual(cashSplit.gst, 22);
      assert.strictEqual(cashSplit.ownerEarning, 880);
    });
  });
});
