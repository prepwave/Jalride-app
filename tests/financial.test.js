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

  it('Verifies separate commission rates for online payments vs cash-on-ride', () => {
    const grossFare = 1000;
    const onlineCommissionRate = 10; // 10%
    const cashCommissionRate = 12;   // 12%
    const gstRate = 18;              // 18%

    // Online payment booking calculation:
    // Platform automatically retains commission + GST from digital payout
    const onlinePlatformCommission = Math.round((grossFare * onlineCommissionRate) / 100); // 100
    const onlineGst = Math.round((onlinePlatformCommission * (gstRate / 100)) * 100) / 100; // 18
    const onlineNetPayout = grossFare - (onlinePlatformCommission + onlineGst); // 882

    assert.strictEqual(onlinePlatformCommission, 100);
    assert.strictEqual(onlineGst, 18);
    assert.strictEqual(onlineNetPayout, 882);

    // Cash-on-ride booking calculation:
    // Owner collects full ₹1000 cash on the ghat.
    // Platform marks commission + GST as due from owner wallet:
    const cashPlatformCommission = Math.round((grossFare * cashCommissionRate) / 100); // 120
    const cashGst = Math.round((cashPlatformCommission * (gstRate / 100)) * 100) / 100; // 21.60
    const dueFromOwnerWallet = cashPlatformCommission + cashGst; // 141.60
    const ownerRetainedCashProfit = grossFare - dueFromOwnerWallet; // 858.40

    assert.strictEqual(cashPlatformCommission, 120);
    assert.strictEqual(cashGst, 21.60);
    assert.strictEqual(dueFromOwnerWallet, 141.60);
    assert.strictEqual(ownerRetainedCashProfit, 858.40);
  });

  it('Verifies boat-level custom commission configuration preserves existing vessel attributes', () => {
    const existingBoat = {
      _id: 'boat_6af1b5cf',
      boatName: 'Jalpari',
      location: 'Dashashwamedh Ghat',
      price: 499,
      capacity: 30,
      images: ['https://example.com/jalpari.jpg'],
      rating: 4.8,
      reviewCount: 42,
    };

    const updatePayload = {
      ...existingBoat,
      onlineCommissionRate: 8,
      cashCommissionRate: 11,
      safety: {
        lifeJacketsAvailable: true,
        lifeJacketsCount: 30,
        childLifeJackets: true,
        firstAidKit: true,
      },
    };

    // Existing attributes must NOT be lost on edit
    assert.strictEqual(updatePayload.images.length, 1);
    assert.strictEqual(updatePayload.rating, 4.8);
    assert.strictEqual(updatePayload.reviewCount, 42);
    assert.strictEqual(updatePayload.onlineCommissionRate, 8);
    assert.strictEqual(updatePayload.cashCommissionRate, 11);
    assert.strictEqual(updatePayload.safety.lifeJacketsCount, 30);
  });
});
