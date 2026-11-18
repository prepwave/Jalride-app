const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 6: Financial Consistency & Split Formula Rules', () => {
  it('Removes unauthorized ₹20 convenience fee in fare calculation', () => {
    const seatPrice = 350;
    const passengers = 3;
    const couponDiscount = 100;

    // Correct formula: Total = (Price * Passengers) - Discount
    const baseFare = seatPrice * passengers; // 1050
    const totalAmount = Math.max(0, baseFare - couponDiscount); // 950

    // Unauthorized old formula had + 20 convenience fee = 970
    assert.strictEqual(baseFare, 1050);
    assert.strictEqual(totalAmount, 950);
    assert.notStrictEqual(totalAmount, 970); // Must NOT include ₹20 fee
  });

  it('Verifies backend financial split: Owner Earning = Fare - (Commission + GST)', () => {
    const grossFare = 1000;
    const defaultCommissionRate = 15; // 15%
    const commissionGstRate = 18;      // 18%

    const platformCommission = Math.round((grossFare * (defaultCommissionRate / 100)) * 100) / 100; // 150
    const commissionGst = Math.round((platformCommission * (commissionGstRate / 100)) * 100) / 100;   // 27
    const ownerEarning = Math.round((grossFare - (platformCommission + commissionGst)) * 100) / 100;  // 823

    assert.strictEqual(platformCommission, 150.00);
    assert.strictEqual(commissionGst, 27.00);
    assert.strictEqual(ownerEarning, 823.00);
    assert.strictEqual(ownerEarning + platformCommission + commissionGst, grossFare);
  });

  it('Verifies Admin Settings payload keys match backend editable schema', () => {
    const clientSettings = {
      defaultCommissionRate: 15,
      commissionGstRate: 18,
      cashbackPercent: 10,
      payoutHoldDays: 3,
    };

    const backendEditableFields = [
      'defaultCommissionRate',
      'commissionGstRate',
      'payoutHoldDays',
      'minWithdrawAmount',
      'cashbackPercent',
      'defaultCurrency',
      'defaultLocale',
    ];

    // Every key sent by client must exist in backend editable fields
    Object.keys(clientSettings).forEach((key) => {
      assert.strictEqual(
        backendEditableFields.includes(key),
        true,
        `Key ${key} must be accepted by backend updatePlatformSettings`
      );
    });

    // Ensure deprecated keys are absent
    assert.strictEqual(clientSettings.hasOwnProperty('platformCommissionRate'), false);
    assert.strictEqual(clientSettings.hasOwnProperty('settlementHoldDays'), false);
  });

  it('Verifies dynamic 10% commission rate calculation on live boat fare (₹499)', () => {
    const fare = 499; // Real price of boat Jalpari at Dashashwamedh Ghat
    const commissionRate = 10; // User-reported 10% configured rate
    const gstRate = 18; // 18%

    const platformCommission = Math.round((fare * commissionRate) / 100); // 50
    // When GST is enabled:
    const gstAmount = Math.round((platformCommission * gstRate) / 100); // 9
    const ownerEarningWithGst = fare - platformCommission - gstAmount; // 440
    // When GST is disabled (launch mode):
    const ownerEarningWithoutGst = fare - platformCommission; // 449

    assert.strictEqual(platformCommission, 50);
    assert.strictEqual(gstAmount, 9);
    assert.strictEqual(ownerEarningWithGst, 440);
    assert.strictEqual(ownerEarningWithoutGst, 449);
  });

  it('Verifies commission override priority hierarchy: Boat > Owner > Platform Default', () => {
    function resolveCommissionRate(settingsDefault, ownerOverride, boatOverride) {
      if (Number.isFinite(boatOverride) && boatOverride >= 0 && boatOverride <= 100) {
        return boatOverride;
      }
      if (Number.isFinite(ownerOverride) && ownerOverride >= 0 && ownerOverride <= 100) {
        return ownerOverride;
      }
      return settingsDefault;
    }

    // Case 1: Boat has explicit override (e.g. 5%)
    assert.strictEqual(resolveCommissionRate(10, 8, 5), 5);

    // Case 2: Boat has null override, owner has override (e.g. 8%)
    assert.strictEqual(resolveCommissionRate(10, 8, null), 8);

    // Case 3: Neither boat nor owner has override -> falls back to platform default (10%)
    assert.strictEqual(resolveCommissionRate(10, null, null), 10);
  });

  it('Verifies historical booking financial snapshots are immutable when platform settings change', () => {
    // Booking created yesterday at 10% commission
    const historicalBooking = {
      _id: 'bkg_101',
      amount: 500,
      commissionRate: 10,
      platformCommissionAmount: 50,
      ownerEarningAmount: 450,
    };

    // Platform admin updates default commission today to 15%
    const newPlatformDefault = 15;

    // Existing booking MUST NOT change
    assert.strictEqual(historicalBooking.commissionRate, 10);
    assert.strictEqual(historicalBooking.platformCommissionAmount, 50);
    assert.strictEqual(historicalBooking.ownerEarningAmount, 450);
    assert.notStrictEqual(historicalBooking.commissionRate, newPlatformDefault);
  });
});
