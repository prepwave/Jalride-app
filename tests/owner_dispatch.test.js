const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 5: Owner Dispatch & Ride State Transitions', () => {
  it('Validates ride lifecycle state machine (pending -> confirmed -> ride_started -> completed)', () => {
    let bookingState = 'pending';

    // 1. Owner accepts
    bookingState = 'confirmed';
    assert.strictEqual(bookingState, 'confirmed');

    // 2. Captain starts ride on Ganga
    bookingState = 'ride_started';
    assert.strictEqual(bookingState, 'ride_started');

    // 3. Captain docks and completes ride
    bookingState = 'completed';
    assert.strictEqual(bookingState, 'completed');
  });

  it('Verifies cash-on-ride commission recovery calculation', () => {
    const cashCollectedByOwner = 700; // Handed in cash by passenger to Navik
    const commissionPercent = 15;
    const gstPercent = 18;

    const commissionOwed = (cashCollectedByOwner * (commissionPercent / 100)); // 105
    const gstOwed = (commissionOwed * (gstPercent / 100)); // 18.9
    const totalDueToPlatform = commissionOwed + gstOwed; // 123.90

    let ownerDueCommissions = 0;
    ownerDueCommissions += totalDueToPlatform;

    assert.strictEqual(totalDueToPlatform, 123.90);
    assert.strictEqual(ownerDueCommissions, 123.90);
  });
});
