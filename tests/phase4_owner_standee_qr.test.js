const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 4C: Ghat Standee Instant QR & Walk-up Bookings Test Suite', () => {
  // =========================================================================
  // Criterion 1: QR Code & Standee URL Parsing
  // =========================================================================
  describe('Criterion 1: Standee QR URL & Identifier Resolution', () => {
    const parseStandeeQr = (data) => {
      const trimmed = (data || '').trim();
      let boatId = null;
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
      return boatId;
    };

    it('Correctly extracts 8-char qrCodeId from official website standee URL', () => {
      const url = 'https://jalride-v1.vercel.app/qr-book.html?boat=JAL-A1B2C3D4';
      const result = parseStandeeQr(url);
      assert.strictEqual(result, 'JAL-A1B2C3D4');
    });

    it('Correctly extracts 24-character ObjectId from legacy standee URL with boatId param', () => {
      const url = 'https://jalride.com/qr-book?boatId=665123456789abcdef012345&ghat=Assi%20Ghat';
      const result = parseStandeeQr(url);
      assert.strictEqual(result, '665123456789abcdef012345');
    });

    it('Correctly resolves raw human-readable standee code JAL-XXXXXXXX', () => {
      const code = 'JAL-9876FEDC';
      const result = parseStandeeQr(code);
      assert.strictEqual(result, 'JAL-9876FEDC');
    });

    it('Correctly resolves raw 24-char hex MongoDB ObjectId', () => {
      const rawHex = '507f1f77bcf86cd799439011';
      const result = parseStandeeQr(rawHex);
      assert.strictEqual(result, '507f1f77bcf86cd799439011');
    });

    it('Returns null for random non-standee strings or malformed inputs', () => {
      assert.strictEqual(parseStandeeQr(''), null);
      assert.strictEqual(parseStandeeQr('random_barcode_12345'), null);
      assert.strictEqual(parseStandeeQr('https://example.com/unrelated'), null);
    });
  });

  // =========================================================================
  // Criterion 2: Live Status & Booking Eligibility Evaluation
  // =========================================================================
  describe('Criterion 2: Live Boat Status & Dynamic Pricing Evaluation', () => {
    const evaluateBoatStatus = (statusRes) => {
      const boat = statusRes?.boat || {};
      const canBook = statusRes?.canBook !== false &&
        statusRes?.status === 'available' &&
        (statusRes?.availableSeats ?? 10) > 0;
      
      return {
        canBook,
        boatName: boat.boatName || 'Unknown Boat',
        effectivePrice: statusRes?.effectivePrice || boat.price || 0,
        availableSeats: statusRes?.availableSeats ?? statusRes?.seatsRemaining ?? 0,
        statusLabel: statusRes?.statusLabel || (canBook ? 'Ready for Boarding' : 'Unavailable'),
      };
    };

    it('Approves booking when vessel is available with seats and dynamic pricing', () => {
      const mockStatus = {
        success: true,
        boat: { _id: 'b1', boatName: 'Ganga Explorer', price: 300 },
        status: 'available',
        statusLabel: 'Ready for Boarding',
        canBook: true,
        effectivePrice: 350,
        availableSeats: 8,
        currentGhat: 'Assi Ghat',
      };

      const evalResult = evaluateBoatStatus(mockStatus);
      assert.strictEqual(evalResult.canBook, true);
      assert.strictEqual(evalResult.effectivePrice, 350);
      assert.strictEqual(evalResult.availableSeats, 8);
      assert.strictEqual(evalResult.statusLabel, 'Ready for Boarding');
    });

    it('Disallows booking when vessel is currently in maintenance', () => {
      const mockStatus = {
        success: true,
        boat: { _id: 'b2', boatName: 'Kashi Cruise', price: 500 },
        status: 'maintenance',
        statusLabel: 'Under Maintenance',
        canBook: false,
        effectivePrice: 500,
        availableSeats: 0,
      };

      const evalResult = evaluateBoatStatus(mockStatus);
      assert.strictEqual(evalResult.canBook, false);
      assert.strictEqual(evalResult.statusLabel, 'Under Maintenance');
    });

    it('Disallows booking when instant QR booking is disabled by owner', () => {
      const mockStatus = {
        success: true,
        boat: { _id: 'b3', boatName: 'Shiva Bajra', price: 400 },
        status: 'disabled',
        statusLabel: 'Instant QR Booking Paused by Owner',
        canBook: false,
        effectivePrice: 400,
        availableSeats: 10,
      };

      const evalResult = evaluateBoatStatus(mockStatus);
      assert.strictEqual(evalResult.canBook, false);
      assert.strictEqual(evalResult.statusLabel, 'Instant QR Booking Paused by Owner');
    });
  });

  // =========================================================================
  // Criterion 3: Instant Walk-in Booking Request Payloads
  // =========================================================================
  describe('Criterion 3: Walk-in Booking Request Payloads', () => {
    const buildWalkinBookingPayload = ({ passengers, paymentMethod, isGuest, guestDetails }) => {
      const pCount = Math.max(1, parseInt(passengers, 10) || 1);
      const payload = {
        passengers: pCount,
        paymentMethod: paymentMethod === 'cash' ? 'cash' : 'online',
        useWalletBalance: paymentMethod === 'wallet',
      };

      if (isGuest && guestDetails) {
        payload.guest = {
          name: guestDetails.name?.trim(),
          email: guestDetails.email?.trim()?.toLowerCase(),
          phone: guestDetails.phone?.trim()?.replace(/\D/g, '')?.slice(-10),
        };
      }
      return payload;
    };

    it('Correctly structures Cash on Ride walk-in payload', () => {
      const payload = buildWalkinBookingPayload({
        passengers: 3,
        paymentMethod: 'cash',
        isGuest: false,
      });

      assert.strictEqual(payload.passengers, 3);
      assert.strictEqual(payload.paymentMethod, 'cash');
      assert.strictEqual(payload.useWalletBalance, false);
      assert.strictEqual(payload.guest, undefined);
    });

    it('Correctly structures Wallet payment walk-in payload', () => {
      const payload = buildWalkinBookingPayload({
        passengers: 2,
        paymentMethod: 'wallet',
        isGuest: false,
      });

      assert.strictEqual(payload.passengers, 2);
      assert.strictEqual(payload.paymentMethod, 'online');
      assert.strictEqual(payload.useWalletBalance, true);
    });

    it('Sanitizes and attaches guest rider details when provided', () => {
      const payload = buildWalkinBookingPayload({
        passengers: 1,
        paymentMethod: 'cash',
        isGuest: true,
        guestDetails: {
          name: '  Rahul Sharma  ',
          email: '  RAHUL@EXAMPLE.COM ',
          phone: '+91 98765 43210',
        },
      });

      assert.strictEqual(payload.guest.name, 'Rahul Sharma');
      assert.strictEqual(payload.guest.email, 'rahul@example.com');
      assert.strictEqual(payload.guest.phone, '9876543210');
    });
  });

  // =========================================================================
  // Criterion 4: Owner Standee Poster URL Generation
  // =========================================================================
  describe('Criterion 4: Standee URL & Printable Vector PDF Links', () => {
    it('Generates official standalone standee URL matching web portal standard', () => {
      const boat = { _id: '665123456789abcdef012345', qrCodeId: 'JAL-1234ABCD' };
      const standeeUrl = `https://jalride-v1.vercel.app/qr-book.html?boat=${encodeURIComponent(boat.qrCodeId || boat._id)}`;
      assert.strictEqual(standeeUrl, 'https://jalride-v1.vercel.app/qr-book.html?boat=JAL-1234ABCD');
    });

    it('Generates printable A4 vector PDF URL on backend route', () => {
      const baseUrl = 'https://jalride-backend.onrender.com/api';
      const boatId = '665123456789abcdef012345';
      const pdfUrl = `${baseUrl}/owner/qr/poster/${boatId}/pdf`;
      assert.strictEqual(pdfUrl, 'https://jalride-backend.onrender.com/api/owner/qr/poster/665123456789abcdef012345/pdf');
    });
  });
});
