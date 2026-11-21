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

describe('Phase 1: DPDP Registration & Consent Validation', () => {
  function validateRegistration({
    name,
    email,
    phone,
    password,
    confirmPassword,
    isAdult,
    privacyConsent,
    promotionalMarketing = false,
    role = 'customer',
  }) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName || trimmedName.length < 2) {
      return { valid: false, error: 'Please enter your full name (at least 2 characters).' };
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { valid: false, error: 'Please enter a valid email address.' };
    }

    let cleanPhone = trimmedPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(-10);
    }
    if (trimmedPhone && (!/^[6-9]\d{9}$/.test(cleanPhone) || cleanPhone.length !== 10)) {
      return { valid: false, error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' };
    }

    if (!password || password.length < 6) {
      return { valid: false, error: 'Password must be at least 6 characters.' };
    }
    if (password !== confirmPassword) {
      return { valid: false, error: 'Passwords do not match.' };
    }

    if (!isAdult) {
      return { valid: false, error: 'You must confirm you are 18 years of age or older, or traveling under legal guardian supervision.' };
    }

    if (!privacyConsent) {
      return { valid: false, error: 'You must agree to the JalRide Privacy Notice and Terms of Service to register.' };
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      password,
      role: role === 'owner' ? 'owner' : 'customer',
      privacyConsent: true,
      isAdult: true,
      promotionalMarketing: Boolean(promotionalMarketing),
    };
    if (cleanPhone) {
      payload.phone = cleanPhone;
    }

    return { valid: true, payload };
  }

  it('Passes validation when both mandatory checkboxes are selected and fields are valid', () => {
    const res = validateRegistration({
      name: 'Rameshwar Majhi',
      email: 'rameshwar@example.com',
      phone: '9876543210',
      password: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
      isAdult: true,
      privacyConsent: true,
      promotionalMarketing: false,
      role: 'customer',
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.payload.privacyConsent, true);
    assert.strictEqual(res.payload.isAdult, true);
    assert.strictEqual(res.payload.promotionalMarketing, false);
    assert.strictEqual(res.payload.role, 'customer');
    assert.strictEqual(res.payload.phone, '9876543210');
  });

  it('Rejects registration when age affirmation checkbox is unchecked', () => {
    const res = validateRegistration({
      name: 'Rameshwar Majhi',
      email: 'rameshwar@example.com',
      password: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
      isAdult: false,
      privacyConsent: true,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(
      res.error,
      'You must confirm you are 18 years of age or older, or traveling under legal guardian supervision.'
    );
  });

  it('Rejects registration when privacy consent checkbox is unchecked', () => {
    const res = validateRegistration({
      name: 'Rameshwar Majhi',
      email: 'rameshwar@example.com',
      password: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
      isAdult: true,
      privacyConsent: false,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(
      res.error,
      'You must agree to the JalRide Privacy Notice and Terms of Service to register.'
    );
  });

  it('Allows registration with optional promotional marketing unchecked', () => {
    const res = validateRegistration({
      name: 'Kashi Traveler',
      email: 'traveler@example.com',
      password: 'Password999',
      confirmPassword: 'Password999',
      isAdult: true,
      privacyConsent: true,
      promotionalMarketing: false,
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.payload.promotionalMarketing, false);
  });

  it('Allows registration with optional promotional marketing checked', () => {
    const res = validateRegistration({
      name: 'Kashi Traveler',
      email: 'traveler@example.com',
      password: 'Password999',
      confirmPassword: 'Password999',
      isAdult: true,
      privacyConsent: true,
      promotionalMarketing: true,
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.payload.promotionalMarketing, true);
  });

  it('Rejects invalid phone numbers not matching Indian 10-digit standard', () => {
    const res = validateRegistration({
      name: 'Test Rider',
      email: 'test@example.com',
      phone: '12345',
      password: 'Password123',
      confirmPassword: 'Password123',
      isAdult: true,
      privacyConsent: true,
    });

    assert.strictEqual(res.valid, false);
    assert.match(res.error, /10-digit Indian mobile number/);
  });

  it('Rejects password mismatch', () => {
    const res = validateRegistration({
      name: 'Test Rider',
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'PasswordMismatch',
      isAdult: true,
      privacyConsent: true,
    });

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Passwords do not match.');
  });

  it('Allows Boat Owner role registration and generates exact role: owner', () => {
    const res = validateRegistration({
      name: 'Ghat Boatman',
      email: 'boatman@example.com',
      phone: '9812345678',
      password: 'Password123',
      confirmPassword: 'Password123',
      isAdult: true,
      privacyConsent: true,
      role: 'owner',
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.payload.role, 'owner');
  });
});
