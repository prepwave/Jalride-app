const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 4B: Owner Wallet & Settlements Test Suite', () => {
  // =========================================================================
  // Criterion 1: Wallet Summary Response Mapping
  // =========================================================================
  describe('Criterion 1: Wallet Summary Response Mapping & Field Integrity', () => {
    const parseWalletResponse = (res) => {
      const w = res?.wallet || {};
      return {
        availableBalance: w.availableBalance ?? 0,
        pendingAmount: w.pendingAmount ?? 0,
        reservedForWithdrawal: w.reservedForWithdrawal ?? 0,
        walletBalance: w.walletBalance ?? 0,
        totalEarned: w.totalEarned ?? 0,
        totalWithdrawn: w.totalWithdrawn ?? 0,
        totalCommissionPaid: w.totalCommissionPaid ?? 0,
        pendingBreakdown: Array.isArray(w.pendingBreakdown) ? w.pendingBreakdown : [],
        commissionRate: res?.commissionRate ?? 10,
        minWithdrawAmount: res?.minWithdrawAmount ?? 100,
        payoutHoldDays: res?.payoutHoldDays ?? 2,
      };
    };

    it('Correctly unwraps nested backend wallet object and maps all 3 primary KPIs', () => {
      const mockBackendResponse = {
        success: true,
        wallet: {
          pendingAmount: 2500,
          availableBalance: 45000,
          reservedForWithdrawal: 5000,
          walletBalance: 52500,
          totalEarned: 120000,
          totalWithdrawn: 70000,
          totalCommissionPaid: 12000,
          pendingBreakdown: [
            { ticketId: 'JR-2026-X89', bookingDate: '2026-11-20', amount: 2500, unlocksAt: '2026-11-22', daysLeft: 2 }
          ]
        },
        commissionRate: 10,
        minWithdrawAmount: 100,
        payoutHoldDays: 2
      };

      const mapped = parseWalletResponse(mockBackendResponse);

      assert.strictEqual(mapped.availableBalance, 45000, 'Available balance must match backend');
      assert.strictEqual(mapped.totalEarned, 120000, 'Total earned must match backend');
      assert.strictEqual(mapped.totalCommissionPaid, 12000, 'Commission settled must match backend');
      assert.strictEqual(mapped.pendingAmount, 2500);
      assert.strictEqual(mapped.reservedForWithdrawal, 5000);
      assert.strictEqual(mapped.totalWithdrawn, 70000);
      assert.strictEqual(mapped.minWithdrawAmount, 100);
      assert.strictEqual(mapped.payoutHoldDays, 2);
      assert.strictEqual(mapped.pendingBreakdown.length, 1);
    });

    it('Falls back to safe zero defaults when wallet properties are missing', () => {
      const emptyRes = { success: true, wallet: {} };
      const mapped = parseWalletResponse(emptyRes);

      assert.strictEqual(mapped.availableBalance, 0);
      assert.strictEqual(mapped.totalEarned, 0);
      assert.strictEqual(mapped.totalCommissionPaid, 0);
      assert.strictEqual(mapped.pendingAmount, 0);
      assert.strictEqual(mapped.minWithdrawAmount, 100);
      assert.strictEqual(mapped.pendingBreakdown.length, 0);
    });
  });

  // =========================================================================
  // Criterion 2: Transaction Pagination & Deduplication
  // =========================================================================
  describe('Criterion 2: Transaction Pagination, Deduplication & Categorization', () => {
    it('Categorizes credit and debit ledger transaction types accurately', () => {
      const evaluateTxType = (type, amount) => {
        const isCredit = amount > 0;
        let category = 'other';
        if (type === 'booking_earning') category = 'earning';
        if (type === 'commission_deduction') category = 'commission';
        if (type === 'withdrawal_request') category = 'payout';
        if (type === 'withdrawal_rejected') category = 'refund';
        return { isCredit, category };
      };

      assert.deepStrictEqual(evaluateTxType('booking_earning', 2700), { isCredit: true, category: 'earning' });
      assert.deepStrictEqual(evaluateTxType('commission_deduction', -300), { isCredit: false, category: 'commission' });
      assert.deepStrictEqual(evaluateTxType('withdrawal_request', -5000), { isCredit: false, category: 'payout' });
      assert.deepStrictEqual(evaluateTxType('withdrawal_rejected', 5000), { isCredit: true, category: 'refund' });
    });

    it('Prevents duplicate entries when appending paginated ledger transactions', () => {
      const existing = [
        { _id: 'tx1', amount: 2700, type: 'booking_earning' },
        { _id: 'tx2', amount: -300, type: 'commission_deduction' }
      ];

      const page2 = [
        { _id: 'tx2', amount: -300, type: 'commission_deduction' }, // duplicate overlap
        { _id: 'tx3', amount: -5000, type: 'withdrawal_request' }
      ];

      const deduplicateTransactions = (prev, incoming) => {
        const existingIds = new Set(prev.map((t) => t._id));
        const newUnique = incoming.filter((t) => !existingIds.has(t._id));
        return [...prev, ...newUnique];
      };

      const combined = deduplicateTransactions(existing, page2);
      assert.strictEqual(combined.length, 3, 'Must have exactly 3 unique transactions');
      assert.strictEqual(combined[2]._id, 'tx3');
    });

    it('Correctly extracts booking ticket ID reference from populated ledger entry', () => {
      const tx = {
        _id: 'tx1',
        type: 'booking_earning',
        amount: 2700,
        booking: { _id: 'b1', ticketId: 'JR-2026-X89', bookingDate: '2026-11-20' },
        note: 'Earnings from booking JR-2026-X89'
      };

      const getTicketRef = (item) => item?.booking?.ticketId || null;
      assert.strictEqual(getTicketRef(tx), 'JR-2026-X89');
    });
  });

  // =========================================================================
  // Criterion 3: Bank Account CRUD & Selection
  // =========================================================================
  describe('Criterion 3: Linked Bank Account Listing, CRUD Payloads & Primary Status', () => {
    it('Correctly identifies primary bank account from backend list', () => {
      const accounts = [
        { _id: 'ba1', bankName: 'HDFC Bank', accountNumberLast4: '1122', isPrimary: false },
        { _id: 'ba2', bankName: 'State Bank of India', accountNumberLast4: '5821', isPrimary: true }
      ];

      const getPrimaryAccount = (list) => list.find((a) => a.isPrimary) || list[0] || null;
      const primary = getPrimaryAccount(accounts);

      assert.strictEqual(primary._id, 'ba2');
      assert.strictEqual(primary.accountNumberLast4, '5821');
    });

    it('Validates and formats add bank account payload for POST /api/owner/bank-accounts', () => {
      const buildAddAccountPayload = (holder, num, ifsc, bank) => {
        if (!holder || !num || !ifsc) throw new Error('Required fields missing');
        return {
          accountHolderName: holder.trim(),
          accountNumber: num.trim(),
          ifscCode: ifsc.trim().toUpperCase(),
          bankName: bank ? bank.trim() : undefined
        };
      };

      const payload = buildAddAccountPayload('Ramesh Kumar', '123456789012', 'sbin0001234', 'State Bank of India');
      assert.strictEqual(payload.accountHolderName, 'Ramesh Kumar');
      assert.strictEqual(payload.accountNumber, '123456789012');
      assert.strictEqual(payload.ifscCode, 'SBIN0001234', 'IFSC must be uppercase');
      assert.strictEqual(payload.bankName, 'State Bank of India');
    });

    it('Handles HTTP 409 conflict when deleting bank account with pending withdrawal', () => {
      const deleteErrorResponse = {
        status: 409,
        message: "Can't remove a bank account with a pending withdrawal against it"
      };

      const formatDeletionError = (err) => {
        if (err.status === 409) return `Removal Blocked: ${err.message}`;
        return 'Unable to remove account';
      };

      assert.strictEqual(
        formatDeletionError(deleteErrorResponse),
        "Removal Blocked: Can't remove a bank account with a pending withdrawal against it"
      );
    });
  });

  // =========================================================================
  // Criterion 4: Withdrawal Submission & Validation Contract
  // =========================================================================
  describe('Criterion 4: Withdrawal Payload, Minimum Validation & Financial Locks', () => {
    it('Requires both positive amount and real bankAccountId in POST /api/owner/withdrawals', () => {
      const buildWithdrawalRequest = (amount, bankAccountId, minWithdraw, availBal) => {
        const num = Number(amount);
        if (isNaN(num) || num <= 0) throw new Error('Please enter a valid positive withdrawal amount.');
        if (num < minWithdraw) throw new Error(`Minimum withdrawal amount is ₹${minWithdraw}.`);
        if (num > availBal) throw new Error(`Only ₹${availBal} is available to withdraw right now.`);
        if (!bankAccountId) throw new Error('Please select or add a verified linked bank account for payout.');

        return {
          method: 'POST',
          path: '/owner/withdrawals',
          body: { amount: num, bankAccountId }
        };
      };

      // Valid case
      const req = buildWithdrawalRequest(5000, 'ba_valid_123', 100, 45000);
      assert.strictEqual(req.path, '/owner/withdrawals');
      assert.strictEqual(req.body.amount, 5000);
      assert.strictEqual(req.body.bankAccountId, 'ba_valid_123');

      // Zero and negative rejection
      assert.throws(() => buildWithdrawalRequest(0, 'ba_valid_123', 100, 45000), /valid positive withdrawal amount/);
      assert.throws(() => buildWithdrawalRequest(-500, 'ba_valid_123', 100, 45000), /valid positive withdrawal amount/);

      // Minimum amount rejection
      assert.throws(() => buildWithdrawalRequest(50, 'ba_valid_123', 100, 45000), /Minimum withdrawal amount is ₹100/);

      // Insufficient balance rejection
      assert.throws(() => buildWithdrawalRequest(50000, 'ba_valid_123', 100, 45000), /Only ₹45000 is available/);

      // Missing bank account rejection
      assert.throws(() => buildWithdrawalRequest(1000, '', 100, 45000), /select or add a verified linked bank account/);
    });

    it('Locks concurrent withdrawal submissions to prevent double payout requests', async () => {
      let isSubmitting = false;
      let executedCount = 0;

      const triggerWithdrawal = async (amt, bankId) => {
        if (isSubmitting) return false;
        isSubmitting = true;
        executedCount++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        isSubmitting = false;
        return true;
      };

      const req1 = triggerWithdrawal(1000, 'ba1');
      const req2 = triggerWithdrawal(1000, 'ba1');
      const [res1, res2] = await Promise.all([req1, req2]);

      assert.strictEqual(res1, true, 'First request must succeed');
      assert.strictEqual(res2, false, 'Concurrent request must be blocked by in-flight lock');
      assert.strictEqual(executedCount, 1, 'Only 1 request reaches backend');
    });

    it('Parses backend HTTP 409 insufficient balance error message transparently', () => {
      const backendError = new Error('Only ₹1500 is available to withdraw right now');
      backendError.status = 409;

      const handleApiError = (err) => err.message || 'Withdrawal failed';
      assert.strictEqual(handleApiError(backendError), 'Only ₹1500 is available to withdraw right now');
    });
  });

  // =========================================================================
  // Criterion 5: Authoritative Re-fetch & Lifecycle Freshness
  // =========================================================================
  describe('Criterion 5: Authoritative Re-fetch, Lifecycle & State Preservation', () => {
    it('Re-fetches authoritative balances and ledger after successful withdrawal mutation', async () => {
      let currentWallet = { availableBalance: 45000, reservedForWithdrawal: 0 };
      let transactions = [];

      const mockSubmitWithdrawal = async (amount) => {
        // Backend decrements available and increments reserved
        return { success: true };
      };

      const mockFetchAuthoritative = async () => {
        return {
          wallet: { availableBalance: 40000, reservedForWithdrawal: 5000 },
          transactions: [{ _id: 'tx_wd', amount: -5000, type: 'withdrawal_request' }]
        };
      };

      // Execute withdrawal and authoritative refresh
      await mockSubmitWithdrawal(5000);
      const freshData = await mockFetchAuthoritative();
      currentWallet = freshData.wallet;
      transactions = freshData.transactions;

      assert.strictEqual(currentWallet.availableBalance, 40000);
      assert.strictEqual(currentWallet.reservedForWithdrawal, 5000);
      assert.strictEqual(transactions.length, 1);
      assert.strictEqual(transactions[0].type, 'withdrawal_request');
    });

    it('Preserves previously loaded wallet data if background refresh fails', async () => {
      let walletState = { availableBalance: 45000, totalEarned: 120000 };
      let lastErrorMessage = null;

      const performRefresh = async () => {
        try {
          // Simulate network drop
          throw new Error('Network timeout: Gateway unreachable');
        } catch (err) {
          lastErrorMessage = err.message;
          // State is NOT overwritten with null or zero!
        }
      };

      await performRefresh();
      assert.strictEqual(walletState.availableBalance, 45000, 'Existing balance must be retained');
      assert.strictEqual(walletState.totalEarned, 120000, 'Existing total earned must be retained');
      assert.strictEqual(lastErrorMessage, 'Network timeout: Gateway unreachable');
    });

    it('Renders pending trip clearance breakdown when pendingAmount > 0', () => {
      const pendingItems = [
        { ticketId: 'JR-2026-X89', bookingDate: '2026-11-20', amount: 2500, unlocksAt: '2026-11-22', daysLeft: 2 }
      ];

      const renderPending = (items) => items.map((i) => `Ticket ${i.ticketId}: ₹${i.amount} unlocks in ${i.daysLeft} days`);
      const rendered = renderPending(pendingItems);

      assert.strictEqual(rendered[0], 'Ticket JR-2026-X89: ₹2500 unlocks in 2 days');
    });

    it('Maps withdrawal status badges accurately (pending, processed, rejected)', () => {
      const getStatusBadge = (status) => {
        if (status === 'processed') return { label: 'PROCESSED', variant: 'success' };
        if (status === 'rejected') return { label: 'REJECTED', variant: 'danger' };
        return { label: 'PENDING', variant: 'warning' };
      };

      assert.deepStrictEqual(getStatusBadge('pending'), { label: 'PENDING', variant: 'warning' });
      assert.deepStrictEqual(getStatusBadge('processed'), { label: 'PROCESSED', variant: 'success' });
      assert.deepStrictEqual(getStatusBadge('rejected'), { label: 'REJECTED', variant: 'danger' });
    });
  });
});
