const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Step 1: QR Ticket Display Reconciliation Test Suite', () => {
  // Mirror the helper logic implemented in TicketScreen.js
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

  const getTicketQrPayload = (b) => {
    if (!b) return '';
    const signed = getSignedQrPayload(b);
    if (signed) return signed;
    return `JALRIDE:TICKET:${b.ticketId || ''}:${b._id || ''}`;
  };

  // Mirror api.verifyTicketQr dispatch logic
  const parseOwnerScannedTicket = (qrData) => {
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

    if (payload && payload.bookingId && payload.ticketId && payload.v) {
      return {
        targetEndpoint: '/api/bookings/verify-ticket',
        body: {
          bookingId: payload.bookingId,
          ticketId: payload.ticketId,
          v: payload.v,
        },
      };
    }

    let ticketId = payload?.ticketId || (typeof qrData === 'string' ? qrData : '');
    if (ticketId.includes('JALRIDE:TICKET:')) {
      const parts = ticketId.split(':');
      ticketId = parts[2] || parts[1] || ticketId;
    }

    if (ticketId && ticketId.trim()) {
      return {
        targetEndpoint: '/api/bookings/verify-ticket-id',
        body: { ticketId: ticketId.trim() },
      };
    }

    throw new Error('Invalid ticket QR code format.');
  };

  // =========================================================================
  // Case 1: Backend qrDataUrl response
  // =========================================================================
  it('1. Backend qrDataUrl response: resolves official QR image and prevents Base64 string embedding in QRCode component', () => {
    const mockBooking = {
      _id: '665123456789abcdef012345',
      ticketId: 'JR-2026-X89',
      qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAA==',
    };

    const imageUri = getOfficialQrImageUri(mockBooking);
    const signedPayload = getSignedQrPayload(mockBooking);

    assert.strictEqual(imageUri, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAA==');
    assert.strictEqual(signedPayload, null, 'Should not treat data:image URI as a signed payload string');
  });

  // =========================================================================
  // Case 2: Existing qrCode response compatibility
  // =========================================================================
  it('2. Existing qrCode response compatibility: correctly handles legacy data URI vs plain string payload', () => {
    const legacyImageBooking = {
      _id: '665123456789abcdef012345',
      ticketId: 'JR-LEGACY-01',
      qrCode: 'data:image/png;base64,LEGACYDATAURI==',
    };
    assert.strictEqual(getOfficialQrImageUri(legacyImageBooking), 'data:image/png;base64,LEGACYDATAURI==');
    assert.strictEqual(getSignedQrPayload(legacyImageBooking), null);

    const legacyStringBooking = {
      _id: '665123456789abcdef012345',
      ticketId: 'JR-LEGACY-02',
      qrCode: '{"ticketId":"JR-LEGACY-02","bookingId":"665123456789abcdef012345","v":"legacyhash123456"}',
    };
    assert.strictEqual(getOfficialQrImageUri(legacyStringBooking), null);
    assert.strictEqual(
      getSignedQrPayload(legacyStringBooking),
      '{"ticketId":"JR-LEGACY-02","bookingId":"665123456789abcdef012345","v":"legacyhash123456"}'
    );
  });

  // =========================================================================
  // Case 3: Signed QR payload
  // =========================================================================
  it('3. Signed QR payload: preserves JSON with ticketId, bookingId and cryptographic hash v', () => {
    const mockBooking = {
      _id: '665199887766554433221100',
      ticketId: 'JR-SIGNED-99',
      v: 'a1b2c3d4e5f60718',
    };

    const signedPayload = getSignedQrPayload(mockBooking);
    assert.ok(signedPayload, 'Signed payload must be generated');

    const parsed = JSON.parse(signedPayload);
    assert.strictEqual(parsed.ticketId, 'JR-SIGNED-99');
    assert.strictEqual(parsed.bookingId, '665199887766554433221100');
    assert.strictEqual(parsed.v, 'a1b2c3d4e5f60718');
  });

  // =========================================================================
  // Case 4: Ticket ID fallback
  // =========================================================================
  it('4. Ticket ID fallback: produces JALRIDE:TICKET format when no official image or signed payload is present', () => {
    const mockBooking = {
      _id: '665100000000000000000001',
      ticketId: 'JR-FALLBACK-07',
    };

    assert.strictEqual(getOfficialQrImageUri(mockBooking), null);
    assert.strictEqual(getSignedQrPayload(mockBooking), null);
    assert.strictEqual(getTicketQrPayload(mockBooking), 'JALRIDE:TICKET:JR-FALLBACK-07:665100000000000000000001');
  });

  // =========================================================================
  // Case 5: Missing QR data
  // =========================================================================
  it('5. Missing QR data: handles null, undefined and empty booking gracefully without throwing', () => {
    assert.strictEqual(getOfficialQrImageUri(null), null);
    assert.strictEqual(getOfficialQrImageUri(undefined), null);
    assert.strictEqual(getOfficialQrImageUri({}), null);

    assert.strictEqual(getSignedQrPayload(null), null);
    assert.strictEqual(getSignedQrPayload({}), null);

    assert.strictEqual(getTicketQrPayload(null), '');
    assert.strictEqual(getTicketQrPayload({}), 'JALRIDE:TICKET::');
  });

  // =========================================================================
  // Case 6: Owner scanner compatibility
  // =========================================================================
  it('6. Owner scanner compatibility: both signed QR JSON and fallback JALRIDE:TICKET route to appropriate backend verification', () => {
    // 6a. Scanned official signed QR JSON
    const signedQrJson = JSON.stringify({
      ticketId: 'JR-QR-VERIFY-1',
      bookingId: '6651112233445566778899aa',
      v: 'f1e2d3c4b5a69788',
    });
    const dispatchSigned = parseOwnerScannedTicket(signedQrJson);
    assert.strictEqual(dispatchSigned.targetEndpoint, '/api/bookings/verify-ticket');
    assert.strictEqual(dispatchSigned.body.ticketId, 'JR-QR-VERIFY-1');
    assert.strictEqual(dispatchSigned.body.bookingId, '6651112233445566778899aa');
    assert.strictEqual(dispatchSigned.body.v, 'f1e2d3c4b5a69788');

    // 6b. Scanned fallback ticket format
    const fallbackString = 'JALRIDE:TICKET:JR-FALLBACK-2:6651112233445566778899bb';
    const dispatchFallback = parseOwnerScannedTicket(fallbackString);
    assert.strictEqual(dispatchFallback.targetEndpoint, '/api/bookings/verify-ticket-id');
    assert.strictEqual(dispatchFallback.body.ticketId, 'JR-FALLBACK-2');
  });
});
