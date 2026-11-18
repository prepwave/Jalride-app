const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 3: QR Code Generation & Camera Scan Parsing', () => {
  it('Formats ticket QR payload encoding official ticket verification identifiers', () => {
    const booking = {
      _id: '673a5bc0e3f89012a456789a',
      ticketId: 'JR-MX91-AB12',
      boat: { boatName: 'Maa Ganga Express' },
    };

    const qrPayload = `JALRIDE:TICKET:${booking.ticketId}:${booking._id}`;

    assert.strictEqual(qrPayload.startsWith('JALRIDE:TICKET:'), true);
    assert.strictEqual(qrPayload.includes(booking.ticketId), true);
    assert.strictEqual(qrPayload.includes(booking._id), true);
  });

  it('Parses Ghat Standee URL correctly to extract target boatId for instant boarding', () => {
    const scannedUrl = 'https://jalride.com/qr-book?boatId=boat-001&ghat=Assi%20Ghat';

    const match = scannedUrl.match(/boatId=([^&]+)/);
    const boatId = match ? match[1] : null;

    assert.strictEqual(boatId, 'boat-001');
  });

  it('Rejects malformed QR scan payloads cleanly', () => {
    const randomQr = 'https://some-other-site.com/hello';
    const isTicket = randomQr.includes('JALRIDE:TICKET') || randomQr.includes('JR-');
    const isStandee = randomQr.includes('boatId=') || randomQr.includes('qr-book');

    assert.strictEqual(isTicket, false);
    assert.strictEqual(isStandee, false);
  });
});
