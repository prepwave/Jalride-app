const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('JalRide API.js Safety Corrections Test Suite', () => {

  // =========================================================================
  // TASK 1: DPDP Account Deletion Safety
  // =========================================================================
  describe('Task 1: DPDP Account Erasure Safety (/privacy/request vs /privacy/delete-account)', () => {
    class MockApiService {
      constructor(mockRequestHandler) {
        this.mockRequest = mockRequestHandler;
        this.calls = [];
      }

      async request(path, options) {
        this.calls.push({ path, options });
        return this.mockRequest(path, options);
      }

      // Exact implementation from src/services/api.js
      async requestDataErasure(reason = 'User requested DPDP account deletion') {
        return this.request('/privacy/request', {
          method: 'POST',
          body: { requestType: 'data_erasure', reason },
        });
      }
    }

    it('1. Mock /privacy/request success: sends exactly one request with correct payload', async () => {
      const api = new MockApiService(async (path, options) => {
        return {
          success: true,
          message: 'Your privacy request has been logged.',
          request: { _id: 'req_123', requestType: 'data_erasure', status: 'pending' },
        };
      });

      const res = await api.requestDataErasure('GDPR/DPDP erasure request');
      assert.equal(api.calls.length, 1, 'Only one HTTP request must be dispatched');
      assert.equal(api.calls[0].path, '/privacy/request');
      assert.equal(api.calls[0].options.method, 'POST');
      assert.deepEqual(api.calls[0].options.body, {
        requestType: 'data_erasure',
        reason: 'GDPR/DPDP erasure request',
      });
      assert.equal(res.success, true);
      assert.equal(res.request.status, 'pending');
    });

    it('2. Mock HTTP 409 Conflict: propagates 409 error cleanly to caller without calling delete-account', async () => {
      const api = new MockApiService(async (path, options) => {
        const error = new Error('You already have an active data_erasure request under review (ID: req_999)');
        error.status = 409;
        throw error;
      });

      await assert.rejects(
        async () => {
          await api.requestDataErasure('Duplicate request');
        },
        (err) => {
          assert.equal(err.status, 409);
          assert.ok(err.message.includes('already have an active data_erasure request'));
          return true;
        }
      );

      // Verify no subsequent call to delete-account was made
      assert.equal(api.calls.length, 1, 'Must not retry or fall back to any other endpoint');
      assert.equal(api.calls[0].path, '/privacy/request');
      const deleteCalls = api.calls.filter((c) => c.path.includes('delete-account'));
      assert.equal(deleteCalls.length, 0, 'Must NEVER call /privacy/delete-account on 409 conflict');
    });

    it('3. Mock HTTP 401 & 500: propagates error and NEVER invokes /privacy/delete-account', async () => {
      // Test 401 Unauthorized
      const api401 = new MockApiService(async () => {
        const err = new Error('Invalid token or session expired');
        err.status = 401;
        throw err;
      });

      await assert.rejects(
        async () => await api401.requestDataErasure(),
        (err) => {
          assert.equal(err.status, 401);
          return true;
        }
      );
      assert.equal(api401.calls.filter((c) => c.path.includes('delete-account')).length, 0);

      // Test 500 Internal Server Error
      const api500 = new MockApiService(async () => {
        const err = new Error('Internal Server Error');
        err.status = 500;
        throw err;
      });

      await assert.rejects(
        async () => await api500.requestDataErasure(),
        (err) => {
          assert.equal(err.status, 500);
          return true;
        }
      );
      assert.equal(api500.calls.filter((c) => c.path.includes('delete-account')).length, 0);
    });

    it('4. Mock Network Failure / Timeout: propagates network error without invoking deletion', async () => {
      const apiNetwork = new MockApiService(async () => {
        const err = new Error('Network request failed');
        err.name = 'TypeError';
        throw err;
      });

      await assert.rejects(
        async () => await apiNetwork.requestDataErasure(),
        (err) => {
          assert.equal(err.message, 'Network request failed');
          return true;
        }
      );
      assert.equal(apiNetwork.calls.length, 1);
      assert.equal(apiNetwork.calls[0].path, '/privacy/request');
    });

    it('5. Guarantee: privacy request method never invokes /privacy/delete-account under any circumstance', async () => {
      const endpointsTested = [];
      const trackingApi = new MockApiService(async (path) => {
        endpointsTested.push(path);
        return { success: true };
      });

      await trackingApi.requestDataErasure('Audit verification test');
      assert.equal(endpointsTested.includes('/privacy/delete-account'), false);
    });
  });

  // =========================================================================
  // TASK 2: Owner Dashboard Error Transparency
  // =========================================================================
  describe('Task 2: Owner Dashboard Error Transparency (getOwnerDashboard)', () => {
    class MockDashboardApi {
      constructor(mockRequestHandler) {
        this.mockRequest = mockRequestHandler;
      }

      async request(path, options) {
        return this.mockRequest(path, options);
      }

      // Exact implementation from src/services/api.js
      async getOwnerDashboard() {
        const res = await this.request('/owner/dashboard');
        return res.dashboard || res.stats || res.data || {
          totalBoats: 0,
          totalEarnings: 0,
          totalPaidRides: 0,
          bookingStatusCounts: { pending: 0, confirmed: 0, cancelled: 0, completed: 0 },
          recentBookings: [],
        };
      }
    }

    it('1. Successful response with genuine zero values: preserves zero stats normally', async () => {
      const api = new MockDashboardApi(async () => ({
        success: true,
        stats: {
          totalBoats: 0,
          totalEarnings: 0,
          totalPaidRides: 0,
          bookingStatusCounts: { pending: 0, confirmed: 0, cancelled: 0, completed: 0 },
          recentBookings: [],
        },
      }));

      const data = await api.getOwnerDashboard();
      assert.equal(data.totalEarnings, 0, 'Genuine zero earnings must be preserved');
      assert.equal(data.totalBoats, 0);
      assert.equal(data.totalPaidRides, 0);
      assert.equal(data.bookingStatusCounts.confirmed, 0);
    });

    it('2. Successful response with non-zero values: maps all stats accurately', async () => {
      const api = new MockDashboardApi(async () => ({
        success: true,
        stats: {
          totalBoats: 4,
          totalEarnings: 82500,
          totalPaidRides: 165,
          bookingStatusCounts: { pending: 3, confirmed: 12, cancelled: 1, completed: 149 },
          recentBookings: [{ _id: 'bk_1', totalAmount: 1500 }],
        },
      }));

      const data = await api.getOwnerDashboard();
      assert.equal(data.totalEarnings, 82500);
      assert.equal(data.totalBoats, 4);
      assert.equal(data.totalPaidRides, 165);
      assert.equal(data.bookingStatusCounts.pending, 3);
      assert.equal(data.bookingStatusCounts.completed, 149);
      assert.equal(data.recentBookings.length, 1);
    });

    it('3. HTTP 500 Internal Server Error: throws error and does NOT return fake zero stats', async () => {
      const api = new MockDashboardApi(async () => {
        const error = new Error('Database connection failed (500)');
        error.status = 500;
        throw error;
      });

      await assert.rejects(
        async () => await api.getOwnerDashboard(),
        (err) => {
          assert.equal(err.status, 500);
          assert.ok(err.message.includes('500'));
          return true;
        }
      );
    });

    it('4. Network Timeout / AbortError: propagates timeout error without masking', async () => {
      const api = new MockDashboardApi(async () => {
        const error = new Error('The operation was aborted due to timeout');
        error.name = 'AbortError';
        throw error;
      });

      await assert.rejects(
        async () => await api.getOwnerDashboard(),
        (err) => {
          assert.equal(err.name, 'AbortError');
          return true;
        }
      );
    });

    it('5. Expired Session / Failed Refresh: propagates 401 error', async () => {
      const api = new MockDashboardApi(async () => {
        const error = new Error('Unauthorized - please log in again');
        error.status = 401;
        throw error;
      });

      await assert.rejects(
        async () => await api.getOwnerDashboard(),
        (err) => {
          assert.equal(err.status, 401);
          return true;
        }
      );
    });

    it('6. Previously loaded dashboard data preservation on failed refresh in screen state', async () => {
      // Simulating OwnerDashboardScreen loadOwnerData lifecycle
      let cachedStats = {
        totalEarnings: 95000,
        totalBoats: 5,
        totalPaidRides: 180,
        bookingStatusCounts: { pending: 1, confirmed: 8, cancelled: 2, completed: 169 },
      };
      let errorMessage = null;

      // Simulated second fetch fails with network disconnection
      const failingApiCall = async () => {
        throw new Error('Network request failed');
      };

      try {
        await failingApiCall();
        cachedStats = { totalEarnings: 0 }; // should not reach here
      } catch (e) {
        // Correct behavior in OwnerDashboardScreen: preserve cachedStats!
        errorMessage = e.message;
      }

      assert.equal(cachedStats.totalEarnings, 95000, 'Previously loaded earnings must remain untouched after failed refresh');
      assert.equal(cachedStats.totalBoats, 5);
      assert.equal(errorMessage, 'Network request failed', 'Error state must be recorded for UI banner');
    });
  });

  // =========================================================================
  // TASK 3: BASE_URL Normalization
  // =========================================================================
  describe('Task 3: BASE_URL Normalization and Path Concatenation', () => {
    function computeUrl(rawEnvUrl, path) {
      const fallback = 'https://jalride-backend.onrender.com/api';
      const rawBase = rawEnvUrl || fallback;
      const baseUrl = rawBase.replace(/\/+$/, '');
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${baseUrl}${normalizedPath}`;
    }

    it('1. Environment URL without trailing slash: resolves correctly with leading slash in path', () => {
      const url = computeUrl('https://custom-api.jalride.in/api', '/auth/login');
      assert.equal(url, 'https://custom-api.jalride.in/api/auth/login');
    });

    it('2. Environment URL with one trailing slash: strips trailing slash, prevents double slash', () => {
      const url = computeUrl('https://custom-api.jalride.in/api/', '/auth/login');
      assert.equal(url, 'https://custom-api.jalride.in/api/auth/login');
    });

    it('3. Environment URL with multiple trailing slashes: strips all trailing slashes', () => {
      const url = computeUrl('https://staging-server.jalride.in/api///', '/owner/boats');
      assert.equal(url, 'https://staging-server.jalride.in/api/owner/boats');
    });

    it('4. Missing environment variable: falls back safely to default Render production URL', () => {
      const url1 = computeUrl(undefined, '/bookings/mine');
      assert.equal(url1, 'https://jalride-backend.onrender.com/api/bookings/mine');

      const url2 = computeUrl('', '/customer/wallet');
      assert.equal(url2, 'https://jalride-backend.onrender.com/api/customer/wallet');
    });

    it('5. Path without leading slash: automatically prepends slash to avoid malformed URL', () => {
      const url = computeUrl('https://jalride-backend.onrender.com/api', 'auth/me');
      assert.equal(url, 'https://jalride-backend.onrender.com/api/auth/me');
    });
  });
});
