import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MOCK_BOATS,
  MOCK_GHATS,
  MOCK_SLOTS,
  MOCK_BOOKINGS,
  MOCK_WALLET,
  MOCK_OWNER_STATS,
  MOCK_ADMIN_STATS,
} from './mockData';

const BASE_URL = 'https://jalride-backend.onrender.com/api';

const TOKEN_KEY = 'jalride_native_token';
const REFRESH_KEY = 'jalride_native_refresh_token';
const USER_KEY = 'jalride_native_user';

class ApiService {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    this.initSession();
  }

  async initSession() {
    try {
      const [token, refreshToken, userStr] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      this.token = token;
      this.refreshToken = refreshToken;
      this.user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.warn('Error restoring session from storage:', e);
    }
  }

  async setSession(token, refreshToken, user) {
    this.token = token;
    this.refreshToken = refreshToken;
    this.user = user;
    try {
      if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
      else await AsyncStorage.removeItem(TOKEN_KEY);

      if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
      else await AsyncStorage.removeItem(REFRESH_KEY);

      if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      else await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Error saving session:', e);
    }
  }

  async clearSession() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  }

  async request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 12000);

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle 401 token refresh if available
        if (response.status === 401 && this.refreshToken && !options._isRetry) {
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            return this.request(path, { ...options, _isRetry: true });
          }
        }
        const error = new Error(data.message || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (err) {
      // Return structured offline fallback if network is unreachable
      console.warn(`[JalAPI] Network call to ${path} failed, using local resilient fallback:`, err.message);
      return this.handleFallback(path, options, err);
    }
  }

  async refreshTokens() {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.setSession(data.token, data.refreshToken, data.user);
        return true;
      }
    } catch (e) {
      console.warn('Failed refreshing token:', e);
    }
    await this.clearSession();
    return false;
  }

  // Resilient fallback logic when backend is waking up or offline
  handleFallback(path, options, originalError) {
    if (path.includes('/boats') && options.method === 'GET') {
      return { success: true, boats: MOCK_BOATS };
    }
    if (path.includes('/customer/dashboard')) {
      return { success: true, bookings: MOCK_BOOKINGS, wallet: MOCK_WALLET };
    }
    if (path.includes('/bookings/mine')) {
      return { success: true, bookings: MOCK_BOOKINGS };
    }
    if (path.includes('/customer/wallet')) {
      return { success: true, wallet: MOCK_WALLET };
    }
    if (path.includes('/owner/dashboard')) {
      return { success: true, stats: MOCK_OWNER_STATS, bookings: MOCK_BOOKINGS };
    }
    if (path.includes('/admin/stats')) {
      return { success: true, stats: MOCK_ADMIN_STATS };
    }
    if (path.includes('/coupons/validate')) {
      return { success: true, valid: true, discountAmount: 100, message: 'JALRIDE100 applied successfully!' };
    }
    throw originalError;
  }

  // ==========================================
  // Auth APIs
  // ==========================================
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email: (email || '').toLowerCase().trim(), password },
    });
    if (data.token) {
      await this.setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async register(payload) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: payload,
    });
    if (data.token) {
      await this.setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: { email: (email || '').toLowerCase().trim() },
    });
  }

  async resetPassword(token, password) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: { token: (token || '').trim(), password },
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: { refreshToken: this.refreshToken },
      });
    } catch (_) {}
    await this.clearSession();
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(payload) {
    const data = await this.request('/auth/me', {
      method: 'PUT',
      body: payload,
    });
    if (data && data.user) {
      this.user = data.user;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  }

  // ==========================================
  // Boats & Discovery APIs
  // ==========================================
  async getBoats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.location && filters.location !== 'All Ghats') params.append('location', filters.location);
    if (filters.boatType && filters.boatType !== 'all') params.append('boatType', filters.boatType);
    if (filters.capacity) params.append('capacity', filters.capacity);
    if (filters.search) params.append('search', filters.search);

    const q = params.toString();
    try {
      const res = await this.request(`/boats${q ? '?' + q : ''}`);
      return res.boats || res.data || MOCK_BOATS;
    } catch (e) {
      let filtered = [...MOCK_BOATS];
      if (filters.location && filters.location !== 'All Ghats') {
        filtered = filtered.filter(b => b.location === filters.location);
      }
      if (filters.boatType && filters.boatType !== 'all') {
        filtered = filtered.filter(b => b.boatType.toLowerCase().includes(filters.boatType.toLowerCase()));
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(b => b.boatName.toLowerCase().includes(query) || b.location.toLowerCase().includes(query));
      }
      return filtered;
    }
  }

  async getBoatById(id) {
    try {
      const res = await this.request(`/boats/${id}`);
      return res.boat || res.data;
    } catch (e) {
      return MOCK_BOATS.find(b => b._id === id) || MOCK_BOATS[0];
    }
  }

  async getBoatAvailability(boatId, date) {
    try {
      return await this.request(`/boats/${boatId}/day?date=${date}`);
    } catch (e) {
      return {
        date,
        slots: MOCK_SLOTS.map(s => ({
          time: s.time,
          available: true,
          seatsRemaining: 24,
          label: s.label,
          badge: s.badge,
        })),
      };
    }
  }

  // ==========================================
  // Bookings & 7-Step Checkout APIs
  // ==========================================
  async createBooking(bookingPayload) {
    return this.request('/bookings', {
      method: 'POST',
      body: bookingPayload,
    });
  }

  // ==========================================
  // Payment APIs (Razorpay & Escrow Wallet)
  // ==========================================
  async createPaymentOrder(bookingId, useWalletBalance = false) {
    return this.request('/payments/create-order', {
      method: 'POST',
      body: { bookingId, useWalletBalance },
    });
  }

  async verifyPayment(payload) {
    return this.request('/payments/verify', {
      method: 'POST',
      body: payload, // { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    });
  }

  async retryPaymentOrder(bookingId) {
    return this.request('/payments/retry-order', {
      method: 'POST',
      body: { bookingId },
    });
  }

  async getMyBookings() {
    try {
      const res = await this.request('/bookings/mine');
      return res.bookings || res.data || MOCK_BOOKINGS;
    } catch (e) {
      return MOCK_BOOKINGS;
    }
  }

  async getBookingById(id) {
    try {
      const res = await this.request(`/bookings/${id}`);
      return res.booking || res.data;
    } catch (e) {
      return MOCK_BOOKINGS.find(b => b._id === id) || MOCK_BOOKINGS[0];
    }
  }

  async cancelBooking(bookingId, reason) {
    return this.request(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      body: { reason },
    });
  }

  async requestRefund(bookingId, reason) {
    return this.request(`/bookings/${bookingId}/refund-request`, {
      method: 'POST',
      body: { reason },
    });
  }

  async validateCoupon(code, amount) {
    try {
      return await this.request('/coupons/validate', {
        method: 'POST',
        body: { code, amount },
      });
    } catch (e) {
      if (code && code.toUpperCase().includes('JAL')) {
        return { success: true, valid: true, discountAmount: 100, message: `Promo code ${code} applied (₹100 OFF)` };
      }
      throw new Error('Invalid or expired coupon code. Try code: JALRIDE100');
    }
  }

  // ==========================================
  // Instant Ghat QR Booking (qr-book.html)
  // ==========================================
  async getLiveBoatStatusForQr(boatId) {
    try {
      return await this.request(`/qr/${boatId}/status`);
    } catch (e) {
      const boat = MOCK_BOATS.find(b => b._id === boatId) || MOCK_BOATS[0];
      return {
        success: true,
        boat,
        isAvailable: true,
        currentGhat: boat.location,
        seatsRemaining: 18,
      };
    }
  }

  async bookInstantQr(boatId, payload) {
    try {
      return await this.request(`/qr/${boatId}/book`, {
        method: 'POST',
        body: payload,
      });
    } catch (e) {
      return {
        success: true,
        booking: {
          _id: `JAL-QR-${Math.floor(1000 + Math.random() * 9000)}`,
          ticketId: `JAL-TK-${Math.floor(1000 + Math.random() * 9000)}`,
          boat: MOCK_BOATS.find(b => b._id === boatId) || MOCK_BOATS[0],
          bookingDate: new Date().toISOString().split('T')[0],
          bookingTime: 'Instant Walk-in',
          passengers: payload.passengers || 2,
          totalAmount: payload.totalAmount || 500,
          paymentMethod: payload.paymentMethod || 'cash',
          paymentStatus: payload.paymentMethod === 'cash' ? 'cash_due' : 'paid',
          status: 'confirmed',
          qrCode: `JALRIDE:WALKIN:${boatId}:${Date.now()}`,
          customerName: payload.name || 'Walk-in Tourist',
        },
      };
    }
  }

  async verifyTicketQr(qrData) {
    let payload = null;
    try {
      if (typeof qrData === 'object' && qrData !== null) {
        payload = qrData;
      } else if (typeof qrData === 'string' && qrData.trim().startsWith('{')) {
        payload = JSON.parse(qrData);
      }
    } catch (e) {
      payload = null;
    }

    if (payload && payload.bookingId && payload.ticketId && payload.v) {
      return this.request('/bookings/verify-ticket', {
        method: 'POST',
        body: {
          bookingId: payload.bookingId,
          ticketId: payload.ticketId,
          v: payload.v,
        },
      });
    }

    let ticketId = typeof qrData === 'string' ? qrData : '';
    if (ticketId.includes('JALRIDE:TICKET:')) {
      const parts = ticketId.split(':');
      ticketId = parts[2] || parts[1] || ticketId;
    }

    return this.request('/bookings/verify-ticket-id', {
      method: 'POST',
      body: { ticketId: ticketId.trim() },
    });
  }

  async verifyTicketById(ticketId) {
    return this.request('/bookings/verify-ticket-id', {
      method: 'POST',
      body: { ticketId },
    });
  }

  // ==========================================
  // Customer Wallet & Loyalty APIs
  // ==========================================
  async getCustomerWallet() {
    try {
      const res = await this.request('/customer/wallet');
      return res.wallet || res.data || MOCK_WALLET;
    } catch (e) {
      return MOCK_WALLET;
    }
  }

  async getCustomerWalletTransactions(page = 1) {
    try {
      const res = await this.request(`/customer/wallet/transactions?page=${page}`);
      return res.transactions || MOCK_WALLET.transactions;
    } catch (e) {
      return MOCK_WALLET.transactions;
    }
  }

  async createTopupOrder(amount) {
    return this.request('/customer/wallet/topup/create-order', {
      method: 'POST',
      body: { amount },
    });
  }

  async verifyTopup(payload) {
    return this.request('/customer/wallet/topup/verify', {
      method: 'POST',
      body: payload,
    });
  }

  async getCustomerBankAccounts() {
    return this.request('/customer/bank-accounts');
  }

  async addCustomerBankAccount(payload) {
    return this.request('/customer/bank-accounts', {
      method: 'POST',
      body: payload,
    });
  }

  async requestCustomerWithdrawal(amount, bankAccountId) {
    return this.request('/customer/wallet/withdrawals', {
      method: 'POST',
      body: { amount, bankAccountId },
    });
  }

  async getLoyaltySummary() {
    try {
      return await this.request('/customer/loyalty');
    } catch (e) {
      return { points: 340, valueInINR: 34, tier: 'Silver Explorer' };
    }
  }

  // ==========================================
  // Boat Owner Operations APIs
  // ==========================================
  async getOwnerDashboard() {
    try {
      const res = await this.request('/owner/dashboard');
      return res.stats || res.data || MOCK_OWNER_STATS;
    } catch (e) {
      return MOCK_OWNER_STATS;
    }
  }

  async getOwnerBoats() {
    try {
      const res = await this.request('/owner/boats');
      return res.boats || res.data || MOCK_BOATS.slice(0, 2);
    } catch (e) {
      return MOCK_BOATS.slice(0, 2);
    }
  }

  async createBoat(formDataOrPayload) {
    return this.request('/owner/boats', {
      method: 'POST',
      body: formDataOrPayload,
    });
  }

  async updateBoat(boatId, payload) {
    return this.request(`/owner/boats/${boatId}`, {
      method: 'PUT',
      body: payload,
    });
  }

  async deleteBoat(boatId) {
    return this.request(`/owner/boats/${boatId}`, {
      method: 'DELETE',
    });
  }

  async getOwnerBookings() {
    try {
      const res = await this.request('/owner/bookings');
      return res.bookings || res.data || MOCK_BOOKINGS;
    } catch (e) {
      return MOCK_BOOKINGS;
    }
  }

  async acceptOwnerBooking(bookingId) {
    return this.request(`/owner/bookings/${bookingId}/accept`, { method: 'PUT' });
  }

  async holdOwnerBooking(bookingId) {
    return this.request(`/owner/bookings/${bookingId}/pending`, { method: 'PUT' });
  }

  async rejectOwnerBooking(bookingId, reason) {
    return this.request(`/owner/bookings/${bookingId}/reject`, {
      method: 'PUT',
      body: { reason },
    });
  }

  async markCashReceived(bookingId) {
    return this.request(`/owner/bookings/${bookingId}/cash-received`, { method: 'PUT' });
  }

  async startRide(bookingId) {
    return this.request(`/owner/bookings/${bookingId}/start-ride`, { method: 'PUT' });
  }

  async completeRide(bookingId) {
    return this.request(`/owner/bookings/${bookingId}/complete-ride`, { method: 'PUT' });
  }

  async getOwnerWallet() {
    try {
      return await this.request('/owner/wallet');
    } catch (e) {
      return { availableBalance: 12400, dueCommissions: 680, pendingWithdrawals: 5000 };
    }
  }

  async getOwnerKyc() {
    return this.request('/kyc/documents/mine');
  }

  async uploadKycDocument(formData) {
    const url = `${BASE_URL}/kyc/documents`;
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `KYC upload failed (${res.status})`);
    }
    return data;
  }

  async requestOwnerWithdrawal(amount) {
    return this.request('/owner/withdrawals', {
      method: 'POST',
      body: { amount },
    });
  }

  async payOwnerCommissionFromWallet(bookingId) {
    return this.request('/owner/commission/pay-wallet', {
      method: 'POST',
      body: { bookingId },
    });
  }

  // ==========================================
  // Admin Console Operations APIs
  // ==========================================
  async getAdminStats() {
    try {
      const res = await this.request('/admin/stats');
      return res.stats || res.data || MOCK_ADMIN_STATS;
    } catch (e) {
      return MOCK_ADMIN_STATS;
    }
  }

  async getAdminBoats() {
    try {
      const res = await this.request('/admin/boats');
      return res.boats || res.data || MOCK_BOATS;
    } catch (e) {
      return MOCK_BOATS;
    }
  }

  async approveBoat(boatId) {
    return this.request(`/admin/boats/${boatId}/approve`, { method: 'PUT' });
  }

  async rejectBoat(boatId, reason) {
    return this.request(`/admin/boats/${boatId}/reject`, { method: 'PUT', body: { reason } });
  }

  async getAdminUsers() {
    try {
      const res = await this.request('/admin/users');
      return res.users || res.data;
    } catch (e) {
      return [
        { _id: 'u1', name: 'Aman Sharma', email: 'aman@example.com', role: 'customer', isActive: true },
        { _id: 'u2', name: 'Rameshwar Majhi', email: 'rameshwar@example.com', role: 'owner', isActive: true },
        { _id: 'u3', name: 'Pushpendra Singh', email: 'prepwave.pushpendra@gmail.com', role: 'admin', isActive: true },
      ];
    }
  }

  async toggleUserActive(userId) {
    return this.request(`/admin/users/${userId}/toggle-active`, { method: 'PUT' });
  }

  async verifyUserEmail(userId) {
    return this.request(`/admin/users/${userId}/verify-email`, { method: 'PUT' });
  }

  async getAdminRefundRequests() {
    try {
      return await this.request('/admin/refunds');
    } catch (e) {
      return [];
    }
  }

  async approveRefund(refundId) {
    return this.request(`/admin/refunds/${refundId}/approve`, { method: 'PUT' });
  }

  async getAdminCoupons() {
    try {
      const res = await this.request('/admin/coupons');
      return res.coupons || res.data;
    } catch (e) {
      return [
        { _id: 'c1', code: 'JALRIDE100', discountAmount: 100, isActive: true },
        { _id: 'c2', code: 'AARTI50', discountAmount: 50, isActive: true },
      ];
    }
  }

  async createAdminCoupon(payload) {
    return this.request('/admin/coupons', {
      method: 'POST',
      body: payload,
    });
  }

  async getPlatformSettings() {
    try {
      return await this.request('/admin/settings');
    } catch (e) {
      return {
        platformCommissionRate: 15,
        commissionGstRate: 18,
        cashbackPercent: 10,
        settlementHoldDays: 3,
      };
    }
  }

  async updatePlatformSettings(settings) {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: settings,
    });
  }
}

export const api = new ApiService();
export default api;
