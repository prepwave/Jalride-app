const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

describe('Phase 2: Payment Integration & Gateway Verification', () => {
  const MOCK_RAZORPAY_SECRET = 'rzp_sec_test_dummy_varanasi_12345';

  function verifyHmacSignature(orderId, paymentId, signature, secret) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  }

  it('Verifies payment HMAC signature matches razorpay_order_id and payment_id', () => {
    const orderId = 'order_O100234X';
    const paymentId = 'pay_P9876543';

    const validSignature = crypto
      .createHmac('sha256', MOCK_RAZORPAY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.strictEqual(
      verifyHmacSignature(orderId, paymentId, validSignature, MOCK_RAZORPAY_SECRET),
      true
    );
  });

  it('Rejects payment signature when tampered with', () => {
    const orderId = 'order_O100234X';
    const paymentId = 'pay_P9876543';
    const tamperedSignature = crypto
      .createHmac('sha256', 'wrong_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.strictEqual(
      verifyHmacSignature(orderId, paymentId, tamperedSignature, MOCK_RAZORPAY_SECRET),
      false
    );
  });

  it('Confirms booking immediately if fully paid from wallet escrow without Razorpay order', () => {
    const booking = {
      _id: 'bk-101',
      ticketId: 'JR-WAL-001',
      amount: 700,
      paymentStatus: 'unpaid',
      bookingStatus: 'pending',
    };
    const walletBalance = 1500;

    const useWalletBalance = true;
    let fullyPaidFromWallet = false;
    let razorpayAmountDue = 0;

    if (useWalletBalance) {
      const deduction = Math.min(walletBalance, booking.amount);
      if (deduction >= booking.amount) {
        fullyPaidFromWallet = true;
        booking.paymentStatus = 'paid';
        booking.bookingStatus = 'confirmed';
      } else {
        razorpayAmountDue = booking.amount - deduction;
      }
    }

    assert.strictEqual(fullyPaidFromWallet, true);
    assert.strictEqual(razorpayAmountDue, 0);
    assert.strictEqual(booking.paymentStatus, 'paid');
    assert.strictEqual(booking.bookingStatus, 'confirmed');
  });

  it('Splits payment between wallet and Razorpay when wallet has partial balance', () => {
    const bookingAmount = 1000;
    const walletBalance = 350;
    const useWallet = true;

    const walletDeduction = useWallet ? Math.min(walletBalance, bookingAmount) : 0;
    const razorpayDue = bookingAmount - walletDeduction;

    assert.strictEqual(walletDeduction, 350);
    assert.strictEqual(razorpayDue, 650);
    assert.strictEqual(walletDeduction + razorpayDue, bookingAmount);
  });
});
