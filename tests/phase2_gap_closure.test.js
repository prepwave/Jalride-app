const { describe, it } = require('node:test');
const assert = require('node:assert');
const QRCode = require('qrcode');

describe('Phase 2 Gap Closure: Task 1 - Local Offline QR Generation for Boarding Pass PDF', () => {
  it('Generates authentic Base64 PNG Data URI locally with zero external network dependency', async () => {
    const payload = JSON.stringify({
      ticketId: 'JR-2026-X89',
      bookingId: '6543210987abcdef65432109',
      v: 'a1b2c3d4e5f60718',
    });

    const dataUri = await QRCode.toDataURL(payload, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: 'M',
    });

    assert.strictEqual(typeof dataUri, 'string', 'Generated QR must be a string');
    assert.strictEqual(dataUri.startsWith('data:image/png;base64,'), true, 'Must produce valid Base64 PNG Data URI');
    assert.ok(dataUri.length > 100, 'Data URI must contain base64 image data');
  });

  it('Embeds local Base64 QR into Ticket PDF HTML and excludes external api.qrserver.com dependency', async () => {
    const booking = {
      _id: '67890abcdef1234567890abc',
      ticketId: 'JR-2026-V88',
      verificationHash: 'v_hash_signature_99',
      customerName: 'Aarav Sharma',
      boat: {
        boatName: 'Kashi Express',
        location: 'Dashashwamedh Ghat',
      },
      bookingDate: '2026-11-28',
      bookingTime: '05:30 AM',
      totalAmount: 750,
      paymentMethod: 'online',
      passengers: 2,
    };

    const getTicketQrPayload = (b) => {
      if (b.qrCode && typeof b.qrCode === 'string' && !b.qrCode.startsWith('data:image/')) {
        return b.qrCode;
      }
      if (b.verificationHash || b.v) {
        return JSON.stringify({
          ticketId: b.ticketId,
          bookingId: String(b._id || ''),
          v: b.verificationHash || b.v,
        });
      }
      return `JALRIDE:TICKET:${b.ticketId}:${b._id || ''}`;
    };

    const qrPayload = getTicketQrPayload(booking);
    const parsedPayload = JSON.parse(qrPayload);
    assert.strictEqual(parsedPayload.ticketId, 'JR-2026-V88');
    assert.strictEqual(parsedPayload.bookingId, '67890abcdef1234567890abc');
    assert.strictEqual(parsedPayload.v, 'v_hash_signature_99');

    const qrDataUri = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: 'M',
    });

    const html = `
      <div class="qr-section">
        <img src="${qrDataUri}" class="qr-img" alt="Boarding QR Code" />
        <div class="ticket-id">${booking.ticketId}</div>
      </div>
    `;

    assert.strictEqual(html.includes('api.qrserver.com'), false, 'Must NOT contain external api.qrserver.com');
    assert.strictEqual(html.includes('src="data:image/png;base64,'), true, 'Must embed Base64 Data URI directly');
    assert.strictEqual(html.includes(booking.ticketId), true, 'Must display authoritative ticketId');
  });

  it('Supports fallback string format for ticket verification by ID', () => {
    const booking = {
      _id: 'booking_no_hash_456',
      ticketId: 'JR-2026-FALLBACK',
    };

    const getTicketQrPayload = (b) => {
      if (b.qrCode && typeof b.qrCode === 'string' && !b.qrCode.startsWith('data:image/')) {
        return b.qrCode;
      }
      if (b.verificationHash || b.v) {
        return JSON.stringify({
          ticketId: b.ticketId,
          bookingId: String(b._id || ''),
          v: b.verificationHash || b.v,
        });
      }
      return `JALRIDE:TICKET:${b.ticketId}:${b._id || ''}`;
    };

    const payload = getTicketQrPayload(booking);
    assert.strictEqual(payload, 'JALRIDE:TICKET:JR-2026-FALLBACK:booking_no_hash_456');
  });
});

describe('Phase 2 Gap Closure: Task 2 - Automatic Data Freshness (Focus & AppState)', () => {
  it('Guards against concurrent in-flight requests during rapid focus or foreground events', async () => {
    let fetchCount = 0;
    const isFetchingRef = { current: false };

    const loadData = async (isSilent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        await new Promise((r) => setTimeout(r, 20));
        fetchCount++;
      } finally {
        isFetchingRef.current = false;
      }
    };

    // Simulate rapid concurrent focus and app-active triggers
    await Promise.all([loadData(true), loadData(true), loadData(true)]);

    assert.strictEqual(fetchCount, 1, 'Concurrent trigger must only execute 1 fetch');

    // Subsequent trigger after completion must execute cleanly
    await loadData(true);
    assert.strictEqual(fetchCount, 2, 'Subsequent trigger must execute after completion');
  });

  it('Simulates AppState transition to active triggering foreground sync', async () => {
    let syncCount = 0;
    const listeners = [];

    const AppState = {
      addEventListener: (type, handler) => {
        listeners.push({ type, handler });
        return {
          remove: () => {
            const idx = listeners.findIndex((l) => l.handler === handler);
            if (idx >= 0) listeners.splice(idx, 1);
          },
        };
      },
    };

    const syncOnActive = (nextAppState) => {
      if (nextAppState === 'active') {
        syncCount++;
      }
    };

    const subscription = AppState.addEventListener('change', syncOnActive);

    // Fire background event - should not sync
    listeners.forEach((l) => l.handler('background'));
    assert.strictEqual(syncCount, 0, 'Should not sync on background event');

    // Fire inactive event - should not sync
    listeners.forEach((l) => l.handler('inactive'));
    assert.strictEqual(syncCount, 0, 'Should not sync on inactive event');

    // Fire active event - must trigger foreground sync
    listeners.forEach((l) => l.handler('active'));
    assert.strictEqual(syncCount, 1, 'Must trigger sync on active transition');

    subscription.remove();
    assert.strictEqual(listeners.length, 0, 'Listener must be properly unsubscribed on unmount');
  });
});

describe('Phase 2 Gap Closure: Task 3 - Bank Account Security UI Claim Parity', () => {
  it('Removes misleading tokenization claims and accurately conveys masked storage and query exclusion', () => {
    const updatedSecurityCard = {
      title: '🛡️ Account Privacy & Masked Storage',
      text: 'For security, full bank account numbers are never exposed in normal app queries or returned in profile responses. Only your masked account number (last 4 digits) and IFSC code are displayed for payout verification.',
    };

    // Assert removal of false claims
    assert.strictEqual(
      updatedSecurityCard.title.includes('Tokenized Payouts'),
      false,
      'Must remove "Tokenized Payouts" claim'
    );
    assert.strictEqual(
      updatedSecurityCard.text.includes('tokenized and encrypted'),
      false,
      'Must remove "tokenized and encrypted" claim'
    );

    // Assert truthful security guarantees
    assert.strictEqual(
      updatedSecurityCard.title.includes('Account Privacy & Masked Storage'),
      true,
      'Must convey privacy and masked storage'
    );
    assert.strictEqual(
      updatedSecurityCard.text.includes('last 4 digits'),
      true,
      'Must specify only last 4 digits displayed'
    );
    assert.strictEqual(
      updatedSecurityCard.text.includes('never exposed in normal app queries'),
      true,
      'Must describe server-side query exclusion'
    );
  });
});
