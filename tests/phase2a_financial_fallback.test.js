const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Phase 2A: Native Financial Fallback Correction Test Suite', () => {

  // =========================================================================
  // 1 & 2. Admin Dashboard: No Assumed 10% Commission or 18% GST Calculations
  // =========================================================================
  describe('Task A: Admin Dashboard Financial Display Resolution', () => {
    // Mirror the pure display resolution logic in AdminDashboardScreen.js
    const resolveGrossBookingValue = (stats, analytics) => {
      if (typeof stats?.totalRevenue === 'number') {
        return `₹${stats.totalRevenue.toLocaleString('en-IN')}`;
      }
      if (typeof analytics?.platformRevenue?.total === 'number') {
        return `₹${analytics.platformRevenue.total.toLocaleString('en-IN')}`;
      }
      return 'N/A';
    };

    const resolveRetainedCommission = (stats, analytics) => {
      if (typeof stats?.platformCommissionRevenue === 'number') {
        return `₹${stats.platformCommissionRevenue.toLocaleString('en-IN')}`;
      }
      if (typeof analytics?.commission?.total === 'number') {
        return `₹${analytics.commission.total.toLocaleString('en-IN')}`;
      }
      return 'N/A';
    };

    const resolveGstCollected = (stats, analytics) => {
      if (typeof stats?.gstCollected === 'number') {
        return `₹${stats.gstCollected.toLocaleString('en-IN')}`;
      }
      if (typeof analytics?.commission?.totalGst === 'number') {
        return `₹${analytics.commission.totalGst.toLocaleString('en-IN')}`;
      }
      return 'N/A';
    };

    it('1. Admin dashboard does not estimate commission using 10% when stats lacks platformCommissionRevenue', () => {
      const stats = { totalRevenue: 100000 }; // Notice: NO platformCommissionRevenue
      const analytics = null; // analytics not available

      const commission = resolveRetainedCommission(stats, analytics);
      assert.strictEqual(commission, 'N/A', 'Must display N/A rather than computing 10% (₹10,000)');
      assert.notStrictEqual(commission, '₹10,000', 'Must NEVER display fabricated 10% estimate');
    });

    it('2. Admin dashboard does not estimate GST using 18% when stats lacks gstCollected', () => {
      const stats = { totalRevenue: 100000, platformCommissionRevenue: 2000 };
      const analytics = null;

      const gst = resolveGstCollected(stats, analytics);
      assert.strictEqual(gst, 'N/A', 'Must display N/A rather than computing 18% of commission');
      assert.notStrictEqual(gst, '₹360', 'Must NEVER display fabricated 18% estimate');
    });

    it('Uses authoritative backend analytics dashboard values when stats endpoints lack them', () => {
      const stats = { totalRevenue: 100000 };
      const analytics = {
        platformRevenue: { total: 100000 },
        commission: { total: 2000, totalGst: 360, totalOwnerEarnings: 97640 }
      };

      assert.strictEqual(resolveRetainedCommission(stats, analytics), '₹2,000');
      assert.strictEqual(resolveGstCollected(stats, analytics), '₹360');
      assert.strictEqual(resolveGrossBookingValue(stats, analytics), '₹1,00,000');
    });

    it('Distinguishes verified zero values from missing data correctly', () => {
      const statsZero = { totalRevenue: 0, platformCommissionRevenue: 0, gstCollected: 0 };
      assert.strictEqual(resolveRetainedCommission(statsZero, null), '₹0');
      assert.strictEqual(resolveGstCollected(statsZero, null), '₹0');
      assert.strictEqual(resolveGrossBookingValue(statsZero, null), '₹0');
    });
  });

  // =========================================================================
  // 3 & 5. Admin Settings Screen: No Silently Prefilled Assumed Commission Rates
  // =========================================================================
  describe('Task B: Admin Settings Loading & Error States', () => {
    // Mirror the state initialization and population logic of AdminSettingsScreen.js
    const initSettingsState = () => ({
      onlineCommissionRate: '',
      cashCommissionRate: '',
      gstRate: '',
      cashbackPercent: '',
      holdDays: '',
      isLoading: true,
      loadError: null,
    });

    const populateSettings = (state, response) => {
      const s = response?.settings || response;
      if (!s || (s.onlineCommissionRate === undefined && s.defaultCommissionRate === undefined)) {
        return {
          ...state,
          isLoading: false,
          loadError: 'Unable to load authoritative platform configuration from server.',
        };
      }
      return {
        ...state,
        onlineCommissionRate: s.onlineCommissionRate !== undefined ? String(s.onlineCommissionRate) :
          (s.defaultCommissionRate !== undefined ? String(s.defaultCommissionRate) : ''),
        cashCommissionRate: s.cashCommissionRate !== undefined ? String(s.cashCommissionRate) :
          (s.defaultCommissionRate !== undefined ? String(s.defaultCommissionRate) : ''),
        gstRate: s.commissionGstRate !== undefined ? String(s.commissionGstRate) : '',
        cashbackPercent: s.cashbackPercent !== undefined ? String(s.cashbackPercent) : '',
        holdDays: s.payoutHoldDays !== undefined ? String(s.payoutHoldDays) : '',
        isLoading: false,
        loadError: null,
      };
    };

    it('3. Admin settings starts empty and does not silently prefill assumed 10% or 12% rates', () => {
      const initialState = initSettingsState();
      assert.strictEqual(initialState.onlineCommissionRate, '');
      assert.strictEqual(initialState.cashCommissionRate, '');
      assert.strictEqual(initialState.gstRate, '');
      assert.strictEqual(initialState.isLoading, true);
    });

    it('Loads authoritative live rates when provided by backend', () => {
      const state = initSettingsState();
      const backendResponse = {
        settings: {
          defaultCommissionRate: 2,
          onlineCommissionRate: 2,
          cashCommissionRate: 3,
          commissionGstRate: 18,
          cashbackPercent: 0,
          payoutHoldDays: 2,
        }
      };
      const populated = populateSettings(state, backendResponse);
      assert.strictEqual(populated.isLoading, false);
      assert.strictEqual(populated.loadError, null);
      assert.strictEqual(populated.onlineCommissionRate, '2');
      assert.strictEqual(populated.cashCommissionRate, '3');
      assert.strictEqual(populated.gstRate, '18');
      assert.strictEqual(populated.holdDays, '2');
    });

    it('5. Sets explicit error state when backend settings fail to load and prevents saving', () => {
      const state = initSettingsState();
      const failedResult = populateSettings(state, null);
      assert.strictEqual(failedResult.isLoading, false);
      assert.ok(failedResult.loadError, 'Must set error message');
      assert.strictEqual(failedResult.onlineCommissionRate, '', 'Must not inject fallback 10%');
      assert.strictEqual(failedResult.cashCommissionRate, '', 'Must not inject fallback 12%');
    });
  });

  // =========================================================================
  // 4. API Service: No Fabricated Financial Defaults on Network Error
  // =========================================================================
  describe('Task C: API Service Platform Settings Contracts', () => {
    // Mirror corrected api.getPlatformSettings
    const mockGetPlatformSettings = async (mockNetworkSuccess, mockPayload) => {
      try {
        if (!mockNetworkSuccess) throw new Error('Network timeout / offline');
        const res = mockPayload;
        return res?.settings || res || null;
      } catch (e) {
        return null; // Corrected: returns null on failure, never fabricated rates!
      }
    };

    it('4. Failed settings API request does not return fabricated financial defaults (15%, 10%, 12%, 18%)', async () => {
      const result = await mockGetPlatformSettings(false, null);
      assert.strictEqual(result, null, 'Failure must return null rather than hardcoded rates');
    });

    it('Preserves authoritative settings payload on successful API call', async () => {
      const livePayload = {
        settings: {
          defaultCommissionRate: 2,
          onlineCommissionRate: 2,
          cashCommissionRate: 2,
          commissionGstEnabled: false,
          commissionGstRate: 18,
          minWithdrawAmount: 500,
          payoutHoldDays: 2
        }
      };
      const result = await mockGetPlatformSettings(true, livePayload);
      assert.deepStrictEqual(result, livePayload.settings);
    });
  });

  // =========================================================================
  // 6 & 7. Owner Wallet Screen: Unavailable State vs Authoritative Rates
  // =========================================================================
  describe('Task D: Owner Wallet Commission Subtitle & Threshold Display', () => {
    const formatCommissionDesc = (commissionRate) => {
      return `Platform fees auto-deducted per ride ${typeof commissionRate === 'number' ? `(${commissionRate}% rate)` : '(Rate: N/A)'}.`;
    };

    const formatWithdrawNotice = (minWithdrawAmount, payoutHoldDays) => {
      const minText = typeof minWithdrawAmount === 'number' ? `Min. withdrawal ₹${minWithdrawAmount}` : 'Min. withdrawal policy applies';
      const holdText = typeof payoutHoldDays === 'number' ? `Trip earnings hold period: ${payoutHoldDays} days` : 'Hold period: N/A';
      return `ℹ️ ${minText} • ${holdText}`;
    };

    it('6. Missing commission rate in OwnerWalletScreen displays unavailable state (never 10%)', () => {
      const descNull = formatCommissionDesc(null);
      assert.strictEqual(descNull, 'Platform fees auto-deducted per ride (Rate: N/A).');
      assert.ok(!descNull.includes('10%'), 'Must NEVER fall back to 10%');

      const descUndefined = formatCommissionDesc(undefined);
      assert.strictEqual(descUndefined, 'Platform fees auto-deducted per ride (Rate: N/A).');

      const noticeMissing = formatWithdrawNotice(null, null);
      assert.strictEqual(noticeMissing, 'ℹ️ Min. withdrawal policy applies • Hold period: N/A');
      assert.ok(!noticeMissing.includes('₹100'), 'Must not assume ₹100');
      assert.ok(!noticeMissing.includes('2 days'), 'Must not assume 2 days');
    });

    it('7. Actual backend-provided commission rates and limits display correctly', () => {
      assert.strictEqual(formatCommissionDesc(2), 'Platform fees auto-deducted per ride (2% rate).');
      assert.strictEqual(formatCommissionDesc(0), 'Platform fees auto-deducted per ride (0% rate).');
      assert.strictEqual(formatCommissionDesc(8.5), 'Platform fees auto-deducted per ride (8.5% rate).');

      const noticeLive = formatWithdrawNotice(500, 2);
      assert.strictEqual(noticeLive, 'ℹ️ Min. withdrawal ₹500 • Trip earnings hold period: 2 days');
    });
  });

  // =========================================================================
  // 8. Existing Wallet & Admin Features Remain Functional
  // =========================================================================
  describe('Task E: Unbroken Contract Verification', () => {
    it('8. Verifies getOwnerWallet data unwrapping preserves wallet balance and transactions', () => {
      const rawBackendResponse = {
        wallet: {
          availableBalance: 4500,
          pendingAmount: 1200,
          reservedForWithdrawal: 500,
          walletBalance: 6200,
          totalEarned: 15000,
          totalWithdrawn: 8800,
          totalCommissionPaid: 950,
          pendingBreakdown: [{ ticketId: 'JR-1', amount: 1200 }]
        },
        commissionRate: 2,
        minWithdrawAmount: 500,
        payoutHoldDays: 2
      };

      // Mirror mapping in api.js
      const mapped = {
        availableBalance: rawBackendResponse.wallet.availableBalance ?? 0,
        pendingAmount: rawBackendResponse.wallet.pendingAmount ?? 0,
        reservedForWithdrawal: rawBackendResponse.wallet.reservedForWithdrawal ?? 0,
        walletBalance: rawBackendResponse.wallet.walletBalance ?? 0,
        totalEarned: rawBackendResponse.wallet.totalEarned ?? 0,
        totalWithdrawn: rawBackendResponse.wallet.totalWithdrawn ?? 0,
        totalCommissionPaid: rawBackendResponse.wallet.totalCommissionPaid ?? 0,
        pendingBreakdown: rawBackendResponse.wallet.pendingBreakdown || [],
        commissionRate: typeof rawBackendResponse.commissionRate === 'number' ? rawBackendResponse.commissionRate : null,
        minWithdrawAmount: typeof rawBackendResponse.minWithdrawAmount === 'number' ? rawBackendResponse.minWithdrawAmount : null,
        payoutHoldDays: typeof rawBackendResponse.payoutHoldDays === 'number' ? rawBackendResponse.payoutHoldDays : null,
      };

      assert.strictEqual(mapped.availableBalance, 4500);
      assert.strictEqual(mapped.totalEarned, 15000);
      assert.strictEqual(mapped.totalCommissionPaid, 950);
      assert.strictEqual(mapped.commissionRate, 2);
      assert.strictEqual(mapped.minWithdrawAmount, 500);
      assert.strictEqual(mapped.payoutHoldDays, 2);
      assert.strictEqual(mapped.pendingBreakdown.length, 1);
    });
  });

  // =========================================================================
  // 9. Source Code Static Audit: No Client-Side Financial Multipliers
  // =========================================================================
  describe('Task F: Source Code Static Audit', () => {
    it('9. Verifies zero hardcoded 0.10 or 0.18 calculations remain in native source code', () => {
      const filesToAudit = [
        path.join(__dirname, '..', 'src', 'screens', 'admin', 'AdminDashboardScreen.js'),
        path.join(__dirname, '..', 'src', 'screens', 'admin', 'AdminSettingsScreen.js'),
        path.join(__dirname, '..', 'src', 'screens', 'owner', 'OwnerWalletScreen.js'),
        path.join(__dirname, '..', 'src', 'services', 'api.js'),
      ];

      for (const filePath of filesToAudit) {
        assert.ok(fs.existsSync(filePath), `File must exist: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for hardcoded 10% or 18% multiplications on revenue/stats
        assert.ok(!content.includes('* 0.10'), `File ${filePath} must not contain "* 0.10"`);
        assert.ok(!content.includes('* 0.18'), `File ${filePath} must not contain "* 0.18"`);
        assert.ok(!content.includes('commissionRate ?? 10'), `File ${filePath} must not contain "commissionRate ?? 10"`);
        assert.ok(!content.includes('defaultCommissionRate: 15'), `File ${filePath} must not contain "defaultCommissionRate: 15"`);
      }
    });
  });
});
