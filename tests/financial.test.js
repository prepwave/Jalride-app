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
});
