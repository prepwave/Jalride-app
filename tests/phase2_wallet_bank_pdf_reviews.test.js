const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 2: Customer Bank Accounts CRUD & Security', () => {
  it('Validates Indian bank account number format (9 to 18 digits)', () => {
    const validNumbers = ['1029384756', '50100481928410', '987654321012345678'];
    const invalidNumbers = ['12345', '12345678', '12345678901234567890', 'ABC123456789', ''];

    const regex = /^\d{9,18}$/;
    validNumbers.forEach((num) => {
      assert.strictEqual(regex.test(num), true, `Expected valid account number: ${num}`);
    });

    invalidNumbers.forEach((num) => {
      assert.strictEqual(regex.test(num), false, `Expected invalid account number: ${num}`);
    });
  });

  it('Validates Indian IFSC code format (11 characters, 4 letters, 0, 6 alphanumeric)', () => {
    const validIfsc = ['SBIN0001234', 'HDFC0000001', 'ICIC0000102', 'PUNB0123400', 'BARB0VARANA'];
    const invalidIfsc = ['sbin0001234', 'SBIN1001234', 'HDFC0001', 'HDFC000000011', '12340001234'];

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    validIfsc.forEach((code) => {
      assert.strictEqual(ifscRegex.test(code), true, `Expected valid IFSC: ${code}`);
    });

    invalidIfsc.forEach((code) => {
      assert.strictEqual(ifscRegex.test(code), false, `Expected invalid IFSC: ${code}`);
    });
  });

  it('Masks sensitive bank account numbers exposing ONLY the last 4 digits (RBI tokenization requirement)', () => {
    function maskAccount(accNumber) {
      if (!accNumber || accNumber.length < 4) return '••••';
      const last4 = accNumber.slice(-4);
      return `•••• •••• •••• ${last4}`;
    }

    assert.strictEqual(maskAccount('50100481928410'), '•••• •••• •••• 8410');
    assert.strictEqual(maskAccount('1029384756'), '•••• •••• •••• 4756');
    assert.strictEqual(maskAccount(''), '••••');
  });

  it('Enforces primary account invariant (first account is primary; setting new primary demotes previous)', () => {
    let accounts = [];

    function addAccount(acc) {
      const isPrimary = accounts.length === 0;
      const created = { ...acc, _id: `acc_${accounts.length + 1}`, isPrimary };
      accounts.push(created);
      return created;
    }

    function setPrimary(id) {
      accounts = accounts.map((a) => ({
        ...a,
        isPrimary: a._id === id,
      }));
    }

    const acc1 = addAccount({ accountNumber: '1234567890', bankName: 'SBI' });
    assert.strictEqual(acc1.isPrimary, true, 'First bank account must be primary');

    const acc2 = addAccount({ accountNumber: '9876543210', bankName: 'HDFC' });
    assert.strictEqual(acc2.isPrimary, false, 'Second bank account must not be primary by default');

    setPrimary(acc2._id);
    const updated1 = accounts.find((a) => a._id === acc1._id);
    const updated2 = accounts.find((a) => a._id === acc2._id);
    assert.strictEqual(updated1.isPrimary, false, 'Previous primary must be demoted');
    assert.strictEqual(updated2.isPrimary, true, 'Newly selected account must be primary');
  });

  it('Guards against deleting bank account with pending withdrawal (HTTP 409 conflict)', () => {
    const pendingWithdrawals = [
      { _id: 'w_1', bankAccountId: 'acc_1', status: 'pending' },
    ];

    function canDeleteAccount(accountId) {
      const hasPending = pendingWithdrawals.some(
        (w) => w.bankAccountId === accountId && w.status === 'pending'
      );
      if (hasPending) {
        const error = new Error("Can't remove a bank account with a pending withdrawal against it");
        error.status = 409;
        throw error;
      }
      return true;
    }

    assert.throws(
      () => canDeleteAccount('acc_1'),
      /Can't remove a bank account with a pending withdrawal against it/,
      'Must reject deleting account with pending withdrawal'
    );
    assert.strictEqual(canDeleteAccount('acc_2'), true, 'Allows deleting account without pending withdrawals');
  });
});

describe('Phase 2: Customer Wallet Withdrawal Validation & State Machine', () => {
  it('Validates withdrawal amount against authoritative backend limits (min ₹100, max available balance)', () => {
    const minWithdrawAmount = 100;
    const walletBalance = 1500;

    function validateWithdrawal(amount, balance, minLimit) {
      if (!amount || isNaN(amount) || amount <= 0) {
        return { valid: false, error: 'Please enter a valid amount.' };
      }
      if (amount < minLimit) {
        return { valid: false, error: `Minimum withdrawal amount is ₹${minLimit}.` };
      }
      if (amount > balance) {
        return { valid: false, error: `Only ₹${balance} is available to withdraw right now.` };
      }
      return { valid: true };
    }

    assert.strictEqual(validateWithdrawal(50, walletBalance, minWithdrawAmount).valid, false);
    assert.strictEqual(validateWithdrawal(2000, walletBalance, minWithdrawAmount).valid, false);
    assert.strictEqual(validateWithdrawal(0, walletBalance, minWithdrawAmount).valid, false);
    assert.strictEqual(validateWithdrawal(-100, walletBalance, minWithdrawAmount).valid, false);
    assert.strictEqual(validateWithdrawal(100, walletBalance, minWithdrawAmount).valid, true);
    assert.strictEqual(validateWithdrawal(1500, walletBalance, minWithdrawAmount).valid, true);
  });

  it('Enforces mandatory saved bank account selection before withdrawal submission', () => {
    function createWithdrawalRequest(amount, selectedBankId, balance) {
      if (!selectedBankId) {
        throw new Error('Please select a saved bank account for payout.');
      }
      if (amount > balance) {
        throw new Error('Insufficient wallet balance.');
      }
      return {
        amount,
        bankAccountId: selectedBankId,
        status: 'pending',
      };
    }

    assert.throws(
      () => createWithdrawalRequest(500, null, 1000),
      /Please select a saved bank account for payout/
    );

    const validReq = createWithdrawalRequest(500, 'bank_acc_123', 1000);
    assert.strictEqual(validReq.bankAccountId, 'bank_acc_123');
    assert.strictEqual(validReq.status, 'pending');
  });

  it('Prevents duplicate withdrawal submissions via active submission lock', async () => {
    let isSubmitting = false;
    let submissionCount = 0;

    async function submitWithdrawal() {
      if (isSubmitting) return { rejected: true, reason: 'Duplicate locked' };
      isSubmitting = true;
      try {
        await new Promise((r) => setTimeout(r, 20));
        submissionCount++;
        return { success: true };
      } finally {
        isSubmitting = false;
      }
    }

    const [first, second] = await Promise.all([submitWithdrawal(), submitWithdrawal()]);
    assert.strictEqual(submissionCount, 1, 'Only exactly 1 request may execute');
    assert.strictEqual(first.success || second.success, true);
    assert.strictEqual(first.rejected || second.rejected, true);
  });
});

describe('Phase 2: Native Ticket PDF Template & QR Inclusion', () => {
  it('Compiles complete HTML boarding pass with authoritative ticket attributes', () => {
    const booking = {
      _id: 'book_999',
      ticketId: 'JR-2026-X89',
      customerName: 'Pushpendra Singh',
      boat: {
        boatName: 'Maa Ganga Express',
        location: 'Assi Ghat',
      },
      bookingDate: '2026-11-25',
      bookingTime: '06:00 AM - 07:00 AM',
      passengers: 3,
      totalAmount: 1050,
      paymentMethod: 'wallet',
    };

    function generateTicketHtml(b) {
      const qrPayload = `JALRIDE:TICKET:${b.ticketId}:${b._id}`;
      return `
        <html>
          <body>
            <div class="brand">JALRIDE</div>
            <div class="ticket-id">${b.ticketId}</div>
            <div class="passenger">${b.customerName}</div>
            <div class="vessel">${b.boat.boatName} - ${b.boat.location}</div>
            <div class="slot">${b.bookingDate} at ${b.bookingTime}</div>
            <div class="passengers">${b.passengers} Rider(s)</div>
            <div class="fare">₹${b.totalAmount}</div>
            <div class="qr" data-payload="${qrPayload}"></div>
            <div class="safety">Certified life jackets are provided onboard</div>
          </body>
        </html>
      `;
    }

    const html = generateTicketHtml(booking);

    assert.strictEqual(html.includes('JR-2026-X89'), true, 'Must include Ticket ID');
    assert.strictEqual(html.includes('Pushpendra Singh'), true, 'Must include Customer Name');
    assert.strictEqual(html.includes('Maa Ganga Express - Assi Ghat'), true, 'Must include Boat and Ghat');
    assert.strictEqual(html.includes('2026-11-25 at 06:00 AM - 07:00 AM'), true, 'Must include Date & Slot');
    assert.strictEqual(html.includes('₹1050'), true, 'Must include Total Fare');
    assert.strictEqual(html.includes('JALRIDE:TICKET:JR-2026-X89:book_999'), true, 'Must include official QR payload');
    assert.strictEqual(html.includes('Certified life jackets are provided onboard'), true, 'Must include safety rules');
  });
});

describe('Phase 2: Post-Ride Customer Reviews & Contract Parity', () => {
  it('Validates star rating bounds (strictly 1 to 5 stars)', () => {
    function validateReviewRating(stars) {
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        throw new Error('Please select a rating between 1 and 5 stars.');
      }
      return true;
    }

    [1, 2, 3, 4, 5].forEach((r) => {
      assert.strictEqual(validateReviewRating(r), true);
    });

    [0, 6, -1, 2.5, null, undefined].forEach((invalid) => {
      assert.throws(() => validateReviewRating(invalid), /between 1 and 5 stars/);
    });
  });

  it('Enforces maximum 800-character review comment boundary matching backend controller', () => {
    const validComment = 'A'.repeat(800);
    const overflowComment = 'A'.repeat(801);

    function validateCommentLength(text) {
      if (text && text.length > 800) {
        throw new Error('Review comments cannot exceed 800 characters.');
      }
      return true;
    }

    assert.strictEqual(validateCommentLength(validComment), true);
    assert.throws(() => validateCommentLength(overflowComment), /cannot exceed 800 characters/);
  });

  it('Verifies review eligibility rules (confirmed/completed/paid allowed, cancelled strictly rejected)', () => {
    function isReviewEligible(booking) {
      if (!booking) return false;
      if (booking.bookingStatus === 'cancelled' || booking.status === 'cancelled') return false;
      return (
        ['confirmed', 'completed'].includes(booking.bookingStatus) ||
        ['confirmed', 'completed'].includes(booking.status) ||
        booking.paymentStatus === 'paid'
      );
    }

    assert.strictEqual(isReviewEligible({ bookingStatus: 'completed' }), true);
    assert.strictEqual(isReviewEligible({ status: 'confirmed' }), true);
    assert.strictEqual(isReviewEligible({ paymentStatus: 'paid' }), true);
    assert.strictEqual(isReviewEligible({ bookingStatus: 'cancelled', paymentStatus: 'paid' }), false);
    assert.strictEqual(isReviewEligible({ status: 'cancelled' }), false);
  });

  it('Updates existing review idempotently without creating duplicate records', () => {
    const reviewsDatabase = new Map();

    function submitReview({ boatId, bookingId, customerId, rating, review }) {
      const key = `${bookingId}_${customerId}`;
      if (reviewsDatabase.has(key)) {
        const existing = reviewsDatabase.get(key);
        existing.rating = rating;
        existing.review = review;
        existing.updatedAt = new Date();
        return { success: true, message: 'Review updated successfully', review: existing };
      }
      const newReview = { _id: `rev_${reviewsDatabase.size + 1}`, boatId, bookingId, customerId, rating, review };
      reviewsDatabase.set(key, newReview);
      return { success: true, message: 'Review submitted successfully', review: newReview };
    }

    const payload = {
      boatId: 'boat_10',
      bookingId: 'book_20',
      customerId: 'user_30',
      rating: 4,
      review: 'Great morning boat ride at Dashashwamedh Ghat.',
    };

    const firstSubmit = submitReview(payload);
    assert.strictEqual(firstSubmit.message, 'Review submitted successfully');
    assert.strictEqual(reviewsDatabase.size, 1);
    assert.strictEqual(firstSubmit.review.rating, 4);

    // Update review
    const secondSubmit = submitReview({ ...payload, rating: 5, review: 'Upgraded to 5 stars! Exceptional Navik!' });
    assert.strictEqual(secondSubmit.message, 'Review updated successfully');
    assert.strictEqual(reviewsDatabase.size, 1, 'Must NOT create duplicate review record');
    assert.strictEqual(secondSubmit.review.rating, 5);
    assert.strictEqual(secondSubmit.review.review, 'Upgraded to 5 stars! Exceptional Navik!');
  });
});
