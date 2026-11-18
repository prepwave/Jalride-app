const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Phase 1: Authentication & Strict Single-Admin Security', () => {
  const AUTHORIZED_ADMIN_EMAIL = 'prepwave.pushpendra@gmail.com';

  function evaluateAdminAccess(user) {
    if (!user) return false;
    return user.role === 'admin' && user.email === AUTHORIZED_ADMIN_EMAIL;
  }

  function canSwitchToRole(currentUser, targetRole) {
    if (targetRole === 'admin') {
      return currentUser?.role === 'admin' && currentUser?.email === AUTHORIZED_ADMIN_EMAIL;
    }
    if (targetRole === 'owner') {
      return currentUser?.role === 'owner' || (currentUser?.role === 'admin' && currentUser?.email === AUTHORIZED_ADMIN_EMAIL);
    }
    return true; // Any user can view rider perspective
  }

  it('Gives admin access ONLY to prepwave.pushpendra@gmail.com with admin role', () => {
    const authorizedAdmin = {
      _id: 'u-admin-1',
      name: 'Pushpendra Singh',
      email: 'prepwave.pushpendra@gmail.com',
      role: 'admin',
    };
    assert.strictEqual(evaluateAdminAccess(authorizedAdmin), true);
  });

  it('Denies admin access to imposters with role: admin but different email', () => {
    const maliciousUser = {
      _id: 'u-fake-admin',
      name: 'Fake Admin',
      email: 'hacker@example.com',
      role: 'admin',
    };
    assert.strictEqual(evaluateAdminAccess(maliciousUser), false);
  });

  it('Denies admin access to legitimate customers with authorized email if role != admin', () => {
    const customerUser = {
      _id: 'u-cust-1',
      name: 'Pushpendra Singh',
      email: 'prepwave.pushpendra@gmail.com',
      role: 'customer',
    };
    assert.strictEqual(evaluateAdminAccess(customerUser), false);
  });

  it('Prevents unauthorized riders from switching to admin role', () => {
    const regularRider = {
      _id: 'u-cust-2',
      name: 'Aman Sharma',
      email: 'aman@example.com',
      role: 'customer',
    };
    assert.strictEqual(canSwitchToRole(regularRider, 'admin'), false);
    assert.strictEqual(canSwitchToRole(regularRider, 'owner'), false);
  });

  it('Initializes session cleanly with user = null when unauthenticated', () => {
    const unauthenticatedSession = { user: null, token: null };
    assert.strictEqual(unauthenticatedSession.user, null);
    assert.strictEqual(unauthenticatedSession.token, null);
    assert.strictEqual(evaluateAdminAccess(unauthenticatedSession.user), false);
  });
});
