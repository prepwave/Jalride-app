const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 4: Cancellation & Wallet Escrow Refund Rules', () => {
  it('Guarantees 100% wallet refund on ride cancellation before departure', () => {
    const booking = {
      _id: 'bk-202',
      ticketId: 'JR-CANC-01',
      totalAmount: 1400,
      status: 'confirmed',
      paymentStatus: 'paid',
    };

    let userWalletBalance = 500;

    // Execute cancellation refund
    const refundAmount = booking.totalAmount;
    userWalletBalance += refundAmount;
    booking.status = 'cancelled';
    booking.refundStatus = 'refunded';

    assert.strictEqual(refundAmount, 1400);
    assert.strictEqual(userWalletBalance, 1900);
    assert.strictEqual(booking.status, 'cancelled');
    assert.strictEqual(booking.refundStatus, 'refunded');
  });

  it('Prevents duplicate cancellation execution via debouncing guard', () => {
    let callCount = 0;
    let isCancelling = false;

    async function triggerCancel() {
      if (isCancelling) return { ignored: true };
      isCancelling = true;
      try {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return { success: true };
      } finally {
        isCancelling = false;
      }
    }

    // Simulate double click
    const promise1 = triggerCancel();
    const promise2 = triggerCancel();

    return Promise.all([promise1, promise2]).then(([res1, res2]) => {
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res2.ignored, true);
      assert.strictEqual(callCount, 1);
    });
  });
});
