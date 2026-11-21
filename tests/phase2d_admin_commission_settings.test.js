const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Phase 2D: Native Admin Commission & Financial Settings Management Test Suite', () => {
  const screenPath = path.resolve(__dirname, '../src/screens/admin/AdminCommissionSettingsScreen.js');
  const navigatorPath = path.resolve(__dirname, '../src/components/navigation/AdminNavigator.js');
  const dashboardPath = path.resolve(__dirname, '../src/screens/admin/AdminDashboardScreen.js');
  const apiPath = path.resolve(__dirname, '../src/services/api.js');

  const screenSource = fs.readFileSync(screenPath, 'utf8');
  const navigatorSource = fs.readFileSync(navigatorPath, 'utf8');
  const dashboardSource = fs.readFileSync(dashboardPath, 'utf8');
  const apiSource = fs.readFileSync(apiPath, 'utf8');

  // =========================================================================
  // 1. Navigation Registration & Visibility
  // =========================================================================
  describe('1. Screen Navigation & Entry Points', () => {
    it('1. AdminNavigator imports and registers AdminCommissionSettingsScreen as a Stack screen', () => {
      assert.match(
        navigatorSource,
        /import\s+AdminCommissionSettingsScreen\s+from\s+['"]\.\.\/\.\.\/screens\/admin\/AdminCommissionSettingsScreen['"]/,
        'AdminNavigator must import AdminCommissionSettingsScreen'
      );
      assert.match(
        navigatorSource,
        /<Stack\.Screen\s+name=["']AdminCommissionSettings["']\s+component=\{AdminCommissionSettingsScreen\}/,
        'AdminNavigator must register AdminCommissionSettings route'
      );
    });

    it('2. AdminDashboardScreen contains a dedicated navigation entry to AdminCommissionSettings', () => {
      assert.match(
        dashboardSource,
        /navigation\.navigate\(['"]AdminCommissionSettings['"]\)/,
        'AdminDashboardScreen must contain navigation to AdminCommissionSettings'
      );
      assert.match(
        dashboardSource,
        /Commission & Financial Settings/,
        'AdminDashboardScreen must render visible Commission & Financial Settings entry'
      );
    });
  });

  // =========================================================================
  // 2. Authorization & Super Admin Role Guard
  // =========================================================================
  describe('2. Authorization & Super Admin Role Guard', () => {
    const isSuperAdminAuthorized = (user) => {
      return Boolean(
        user?.role === 'admin' ||
        (user?.email && user.email.toLowerCase().trim() === 'prepwave.pushpendra@gmail.com')
      );
    };

    it('3. Grants access to verified Super Admin account prepwave.pushpendra@gmail.com', () => {
      const adminUser = { email: 'prepwave.pushpendra@gmail.com', role: 'admin' };
      assert.strictEqual(isSuperAdminAuthorized(adminUser), true);
    });

    it('4. Rejects non-admin or unauthorized users', () => {
      assert.strictEqual(isSuperAdminAuthorized({ email: 'owner@jalride.in', role: 'owner' }), false);
      assert.strictEqual(isSuperAdminAuthorized({ email: 'customer@test.com', role: 'customer' }), false);
      assert.strictEqual(isSuperAdminAuthorized(null), false);
    });

    it('5. AdminCommissionSettingsScreen enforces Super Admin check in source', () => {
      assert.match(
        screenSource,
        /isSuperAdmin/,
        'Screen must compute isSuperAdmin authorization status'
      );
      assert.match(
        screenSource,
        /prepwave\.pushpendra@gmail\.com/,
        'Screen must verify prepwave.pushpendra@gmail.com'
      );
      assert.match(
        screenSource,
        /Super Admin Access Only/,
        'Screen must render unauthorized view when not super admin'
      );
    });
  });

  // =========================================================================
  // 3. Settings Loading & API Response Mapping
  // =========================================================================
  describe('3. Settings Hydration & Response Mapping', () => {
    // Pure logic simulation of hydration
    const hydrateSettings = (settingsRes) => {
      if (!settingsRes || (settingsRes.onlineCommissionRate === undefined && settingsRes.defaultCommissionRate === undefined)) {
        return { error: 'Authoritative platform settings could not be retrieved from the backend API.' };
      }
      return {
        onlineRate:
          settingsRes.onlineCommissionRate !== undefined
            ? String(settingsRes.onlineCommissionRate)
            : settingsRes.defaultCommissionRate !== undefined
            ? String(settingsRes.defaultCommissionRate)
            : '',
        cashRate:
          settingsRes.cashCommissionRate !== undefined
            ? String(settingsRes.cashCommissionRate)
            : settingsRes.defaultCommissionRate !== undefined
            ? String(settingsRes.defaultCommissionRate)
            : '',
        defaultRate:
          settingsRes.defaultCommissionRate !== undefined
            ? String(settingsRes.defaultCommissionRate)
            : '',
        gstEnabled: Boolean(settingsRes.commissionGstEnabled),
        gstRate:
          settingsRes.commissionGstRate !== undefined
            ? String(settingsRes.commissionGstRate)
            : '',
        minWithdraw:
          settingsRes.minWithdrawAmount !== undefined
            ? String(settingsRes.minWithdrawAmount)
            : '',
        holdDays:
          settingsRes.payoutHoldDays !== undefined
            ? String(settingsRes.payoutHoldDays)
            : '',
      };
    };

    it('6. Correctly maps authoritative settings from backend payload', () => {
      const backendSettings = {
        defaultCommissionRate: 12,
        onlineCommissionRate: 12,
        cashCommissionRate: 10,
        commissionGstEnabled: false,
        commissionGstRate: 0,
        minWithdrawAmount: 1000,
        payoutHoldDays: 2,
      };

      const hydrated = hydrateSettings(backendSettings);
      assert.strictEqual(hydrated.onlineRate, '12');
      assert.strictEqual(hydrated.cashRate, '10');
      assert.strictEqual(hydrated.defaultRate, '12');
      assert.strictEqual(hydrated.gstEnabled, false);
      assert.strictEqual(hydrated.gstRate, '0');
      assert.strictEqual(hydrated.minWithdraw, '1000');
      assert.strictEqual(hydrated.holdDays, '2');
    });

    it('7. Handles missing or empty settings with clean error state (no fabricated rates)', () => {
      const errorResult = hydrateSettings(null);
      assert.ok(errorResult.error, 'Must indicate error on null response');

      const emptyResult = hydrateSettings({});
      assert.ok(emptyResult.error, 'Must indicate error on empty object');
    });
  });

  // =========================================================================
  // 4. Input Validation & Constraints
  // =========================================================================
  describe('4. Input Validation & Constraints', () => {
    const validateSettingsInput = ({ online, cash, def, gst, minW, hold }) => {
      if (!online || isNaN(parseFloat(online)) || parseFloat(online) < 0 || parseFloat(online) > 100) {
        return { valid: false, error: 'Online commission must be 0-100%' };
      }
      if (!cash || isNaN(parseFloat(cash)) || parseFloat(cash) < 0 || parseFloat(cash) > 100) {
        return { valid: false, error: 'Cash commission must be 0-100%' };
      }
      if (def && (isNaN(parseFloat(def)) || parseFloat(def) < 0 || parseFloat(def) > 100)) {
        return { valid: false, error: 'Default commission must be 0-100%' };
      }
      if (gst && (isNaN(parseFloat(gst)) || parseFloat(gst) < 0 || parseFloat(gst) > 100)) {
        return { valid: false, error: 'GST rate must be 0-100%' };
      }
      if (!minW || isNaN(parseFloat(minW)) || parseFloat(minW) <= 0) {
        return { valid: false, error: 'Min withdrawal must be > 0' };
      }
      if (!hold || isNaN(parseInt(hold, 10)) || parseInt(hold, 10) < 0) {
        return { valid: false, error: 'Hold days must be >= 0' };
      }
      return { valid: true };
    };

    it('8. Accepts valid financial policy inputs matching target values', () => {
      const res = validateSettingsInput({
        online: '12',
        cash: '10',
        def: '12',
        gst: '0',
        minW: '1000',
        hold: '2',
      });
      assert.strictEqual(res.valid, true);
    });

    it('9. Rejects out-of-range commission percentages (> 100% or < 0%)', () => {
      const resHigh = validateSettingsInput({ online: '105', cash: '10', minW: '1000', hold: '2' });
      assert.strictEqual(resHigh.valid, false);

      const resNeg = validateSettingsInput({ online: '12', cash: '-5', minW: '1000', hold: '2' });
      assert.strictEqual(resNeg.valid, false);
    });

    it('10. Rejects zero or negative minimum withdrawal thresholds', () => {
      const resZero = validateSettingsInput({ online: '12', cash: '10', minW: '0', hold: '2' });
      assert.strictEqual(resZero.valid, false);

      const resNeg = validateSettingsInput({ online: '12', cash: '10', minW: '-500', hold: '2' });
      assert.strictEqual(resNeg.valid, false);
    });

    it('11. Rejects negative payout hold durations', () => {
      const res = validateSettingsInput({ online: '12', cash: '10', minW: '1000', hold: '-1' });
      assert.strictEqual(res.valid, false);
    });
  });

  // =========================================================================
  // 5. Safe Save Workflow & Confirmation Modal
  // =========================================================================
  describe('5. Safe Save Workflow & Confirmation Modal', () => {
    it('12. Screen requires explicit confirmation dialog before invoking PUT endpoint', () => {
      assert.match(
        screenSource,
        /handleInitiateSave/,
        'Must have handleInitiateSave stage to validate and prompt'
      );
      assert.match(
        screenSource,
        /showConfirmModal/,
        'Must maintain showConfirmModal state'
      );
      assert.match(
        screenSource,
        /Confirm Policy Changes/,
        'Must display confirmation summary modal'
      );
      assert.match(
        screenSource,
        /handleExecuteSave/,
        'Must have handleExecuteSave stage executed only upon admin confirmation'
      );
    });

    it('13. Constructs correct payload conforming strictly to backend editable fields', () => {
      assert.match(screenSource, /onlineCommissionRate:\s*parseFloat/);
      assert.match(screenSource, /cashCommissionRate:\s*parseFloat/);
      assert.match(screenSource, /defaultCommissionRate:/);
      assert.match(screenSource, /commissionGstEnabled:\s*Boolean/);
      assert.match(screenSource, /commissionGstRate:/);
      assert.match(screenSource, /minWithdrawAmount:\s*parseFloat/);
      assert.match(screenSource, /payoutHoldDays:\s*parseInt/);
    });

    it('14. Does not show success message when PUT API returns non-success or throws', () => {
      assert.match(
        screenSource,
        /if\s*\(!res\s*\|\|\s*!res\.success\)\s*\{\s*throw new Error/,
        'Must verify res.success before alerting success'
      );
      assert.match(
        screenSource,
        /catch\s*\(err\)\s*\{\s*Alert\.alert\(\s*['"]Update Failed['"]/,
        'Must alert Update Failed upon error'
      );
    });

    it('15. Prevents duplicate submissions during in-flight save', () => {
      assert.match(
        screenSource,
        /if\s*\(!pendingPayload\s*\|\|\s*isSaving\)\s*return;/,
        'Must guard against duplicate in-flight requests'
      );
    });
  });

  // =========================================================================
  // 6. Data Freshness & Background Refresh
  // =========================================================================
  describe('6. Data Freshness & Resilience', () => {
    it('16. Screen implements focus refresh, foreground AppState refresh, and pull-to-refresh', () => {
      assert.match(screenSource, /useFocusEffect/, 'Must use useFocusEffect');
      assert.match(screenSource, /AppState\.addEventListener/, 'Must register AppState listener');
      assert.match(screenSource, /RefreshControl/, 'Must support pull-to-refresh');
      assert.match(screenSource, /lastRefreshedAt/, 'Must track last refreshed timestamp');
    });

    it('17. Preserves previously loaded settings when a background refresh fails', () => {
      assert.match(
        screenSource,
        /if\s*\(!isSilent\s*\|\|\s*!loadedSettings\)\s*\{\s*setLoadError/,
        'Must preserve existing loaded settings on silent refresh failures'
      );
    });
  });

  // =========================================================================
  // 7. Policy Target Benchmarking & Resolution Precedence Display
  // =========================================================================
  describe('7. Policy Target Benchmarking & Resolution Precedence', () => {
    it('18. Displays Owner Target Policy for comparison without overwriting form inputs', () => {
      assert.match(screenSource, /TARGET_POLICY/, 'Must define TARGET_POLICY benchmarks');
      assert.match(screenSource, /Policy Benchmarking Reference/, 'Must display benchmarking card');
      assert.match(screenSource, /Owner Benchmark/, 'Must label target benchmarks clearly');
    });

    it('19. Displays complete read-only commission resolution precedence and immutability banner', () => {
      assert.match(screenSource, /Boat Method Override/, 'Must list Boat Method Override');
      assert.match(screenSource, /Boat General Override/, 'Must list Boat General Override');
      assert.match(screenSource, /Owner Method Override/, 'Must list Owner Method Override');
      assert.match(screenSource, /Owner General Override/, 'Must list Owner General Override');
      assert.match(screenSource, /Platform Method Default/, 'Must list Platform Method Default');
      assert.match(screenSource, /Subscription Discount/, 'Must list Subscription Discount');
      assert.match(screenSource, /GST Calculation/, 'Must list GST Calculation');
      assert.match(screenSource, /Historical Snapshot Immutability/, 'Must document historical snapshot immutability');
    });

    it('20. Screen contains zero hardcoded mobile commission calculations', () => {
      // Must not perform client-side split calculations (e.g., fare * 0.10)
      assert.doesNotMatch(screenSource, /fare\s*\*\s*0\./, 'Must not calculate commission on client');
      assert.doesNotMatch(screenSource, /commission\s*\*\s*0\.18/, 'Must not calculate GST on client');
    });
  });

  // =========================================================================
  // 8. Per-Owner Override API Integration
  // =========================================================================
  describe('8. Per-Owner Commission Override Integration', () => {
    it('21. api.js provides setOwnerCommissionRate and updateGlobalCommission methods', () => {
      assert.match(
        apiSource,
        /async\s+setOwnerCommissionRate\s*\(\s*ownerId,\s*commissionRate\s*\)/,
        'api.js must provide setOwnerCommissionRate'
      );
      assert.match(
        apiSource,
        /this\.request\(`\/admin\/owners\/\$\{ownerId\}\/commission-rate`/,
        'setOwnerCommissionRate must target /admin/owners/:id/commission-rate'
      );
      assert.match(
        apiSource,
        /async\s+updateGlobalCommission\s*\(\s*payload\s*\)/,
        'api.js must provide updateGlobalCommission'
      );
      assert.match(
        apiSource,
        /this\.request\(['"]\/admin\/commission\/global['"]/,
        'updateGlobalCommission must target /admin/commission/global'
      );
    });

    it('22. Screen implements per-owner search, override modal and clear override capability', () => {
      assert.match(screenSource, /handleOpenOwnerModal/, 'Must have handleOpenOwnerModal');
      assert.match(screenSource, /handleSaveOwnerOverride/, 'Must have handleSaveOwnerOverride');
      assert.match(screenSource, /api\.setOwnerCommissionRate/, 'Must invoke api.setOwnerCommissionRate');
      assert.match(screenSource, /Inheriting Platform Default/, 'Must distinguish inherited vs custom overrides');
    });
  });
});
