import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_GHATS } from './mockData';

const BASE_URL = 'https://jalride-backend.onrender.com/api';

const TOKEN_KEY = 'jalride_native_token';
const REFRESH_KEY = 'jalride_native_refresh_token';
const USER_KEY = 'jalride_native_user';

function normalizeBoat(b) {
  if (!b) return b;
  let imgs = [];
  if (Array.isArray(b.images)) {
    imgs = b.images
      .map((img) => {
        if (typeof img === 'string') return img;
        if (img && typeof img.url === 'string') return img.url;
        if (img && typeof img.uri === 'string') return img.uri;
        return null;
      })
      .filter(Boolean);
  }
  if (imgs.length === 0) {
    imgs = ['https://images.unsplash.com/photo-1598977123418-454555aa04f8?w=800&q=80'];
  }
  return {
    ...b,
    boatName: b.boatName || b.name || 'JalRide Boat',
    images: imgs,
    amenities: Array.isArray(b.amenities) ? b.amenities : [],
  };
}

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
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 35000);

      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle 401 token refresh if available (never for login or registration attempts)
        if (response.status === 401 && this.refreshToken && !options._isRetry && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            return this.request(path, { ...options, _isRetry: true });
          }
        }
        const error = new Error(data.message || `Request failed (${response.status})`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      // Automatic single retry for cold start timeouts or transient network hiccups
      if (options._retryCount === undefined && (err.name === 'AbortError' || (err.message && (err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('aborted'))))) {
        console.log(`[JalAPI] Retrying ${path} due to server cold start/network: ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000));
        return this.request(path, { ...options, _retryCount: 1, timeout: 45000 });
      }
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
  // Re-throw network and API errors to preserve authoritative live backend data integrity
  handleFallback(path, options, originalError) {
    throw originalError;
  }

  // ==========================================
  // Auth APIs
  // ==========================================
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email: (email || '').toLowerCase().trim(), password },
      timeout: 45000,
    });
    if (data.token) {
      await this.setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async googleLogin(idToken, role = 'customer') {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: { idToken, role },
      timeout: 45000,
    });
    if (data.token) {
      await this.setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async verifyEmail(token) {
    const data = await this.request('/auth/verify-email', {
      method: 'POST',
      body: { token: (token || '').trim() },
      timeout: 35000,
    });
    if (data.token) {
      await this.setSession(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async resendVerification(email) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: { email: (email || '').toLowerCase().trim() },
      timeout: 35000,
    });
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
      const rawBoats = res.boats || res.data;
      return Array.isArray(rawBoats) ? rawBoats.map(normalizeBoat) : [];
    } catch (e) {
      console.warn('[JalAPI] Error fetching live boats:', e.message);
      return [];
    }
  }

  async getBoatById(id) {
    try {
      const res = await this.request(`/boats/${id}`);
      const raw = res.boat || res.data;
      return raw ? normalizeBoat(raw) : null;
    } catch (e) {
      console.warn(`[JalAPI] Error fetching boat ${id}:`, e.message);
      return null;
    }
  }

  async getBoatCalendar(boatId, month) {
    try {
      const ym = month || new Date().toISOString().slice(0, 7);
      const res = await this.request(`/boats/${boatId}/calendar?month=${ym}`);
      return res || { success: true, days: [] };
    } catch (e) {
      console.warn('[JalAPI] Failed to fetch calendar:', e.message);
      return { success: false, days: [] };
    }
  }

  async getBoatAvailability(boatId, date) {
    try {
      const res = await this.request(`/boats/${boatId}/day?date=${date}`);
      return res || { date, slots: [] };
    } catch (e) {
      console.warn('[JalAPI] Failed to fetch day availability:', e.message);
      return { date, slots: [] };
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
      return res.bookings || res.data || [];
    } catch (e) {
      console.warn('[JalAPI] Error fetching bookings:', e.message);
      return [];
    }
  }

  async getBookingById(id) {
    try {
      const res = await this.request(`/bookings/${id}`);
      return res.booking || res.data || null;
    } catch (e) {
      console.warn(`[JalAPI] Error fetching booking ${id}:`, e.message);
      return null;
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
    if (!code || !code.trim()) {
      throw new Error('Please enter a coupon code.');
    }
    const cleanCode = code.trim().toUpperCase();
    const res = await this.request('/coupons/validate', {
      method: 'POST',
      body: { code: cleanCode, amount: Number(amount) },
    });
    if (res && res.valid) {
      return {
        success: true,
        valid: true,
        code: res.code || cleanCode,
        description: res.description || '',
        discountAmount: res.discount || 0,
        finalAmount: res.finalAmount,
        message: `Coupon ${res.code || cleanCode} applied: saved ₹${res.discount || 0}`,
      };
    }
    throw new Error(res?.message || 'Invalid or inactive coupon code');
  }

  // DPDP Act 2023: Right to Erasure / Personal Data Deletion Request
  async requestDataErasure(reason = 'User requested DPDP account deletion') {
    return this.request('/auth/delete-account', {
      method: 'POST',
      body: { reason },
    });
  }

  // ==========================================
  // Instant Ghat QR Booking (qr-book.html)
  // ==========================================
  async getLiveBoatStatusForQr(boatId) {
    return this.request(`/qr/${boatId}/status`);
  }

  async bookInstantQr(boatId, payload) {
    return this.request(`/qr/${boatId}/book`, {
      method: 'POST',
      body: payload,
    });
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
      return res.wallet || res.data || { balance: 0, cashbackEarned: 0, loyaltyPoints: 0, transactions: [] };
    } catch (e) {
      return { balance: 0, cashbackEarned: 0, loyaltyPoints: 0, transactions: [] };
    }
  }

  async getCustomerWalletTransactions(page = 1) {
    try {
      const res = await this.request(`/customer/wallet/transactions?page=${page}`);
      return res.transactions || res.data || [];
    } catch (e) {
      return [];
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
      return { points: 0, valueInINR: 0, tier: 'Member' };
    }
  }

  // ==========================================
  // Notifications APIs
  // ==========================================
  async getNotifications() {
    try {
      const res = await this.request('/notifications');
      return res.notifications || res.data || [];
    } catch (e) {
      return [];
    }
  }

  async markAllNotificationsRead() {
    try {
      return await this.request('/notifications/read-all', { method: 'PUT' });
    } catch (e) {
      return { success: false };
    }
  }

  // ==========================================
  // Live Chat APIs
  // ==========================================
  async getChatConversation(bookingId) {
    return this.request(`/chat/conversations/booking/${bookingId}`, { method: 'POST' });
  }

  async getChatMessages(conversationId) {
    const res = await this.request(`/chat/conversations/${conversationId}/messages`);
    return res.messages || res.data || [];
  }

  async sendChatMessage(conversationId, text) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { message: text },
    });
  }

  // ==========================================
  // Boat Owner Operations APIs
  // ==========================================
  async getOwnerDashboard() {
    try {
      const res = await this.request('/owner/dashboard');
      return res.stats || res.data || {
        totalEarnings: 0,
        availableBalance: 0,
        pendingWithdrawals: 0,
        todayTrips: 0,
        totalBookings: 0,
        activeBoats: 0,
        dueCommissions: 0,
        rating: 5.0,
      };
    } catch (e) {
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingWithdrawals: 0,
        todayTrips: 0,
        totalBookings: 0,
        activeBoats: 0,
        dueCommissions: 0,
        rating: 5.0,
      };
    }
  }

  async getOwnerBoats() {
    try {
      const res = await this.request('/owner/boats');
      const raw = res.boats || res.data || [];
      return Array.isArray(raw) ? raw.map(normalizeBoat) : [];
    } catch (e) {
      return [];
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
      return res.bookings || res.data || [];
    } catch (e) {
      return [];
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
      const res = await this.request('/owner/wallet');
      return res || { availableBalance: 0, dueCommissions: 0, pendingWithdrawals: 0 };
    } catch (e) {
      return { availableBalance: 0, dueCommissions: 0, pendingWithdrawals: 0 };
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
      return res.stats || res.data || {
        totalRevenue: 0,
        platformCommissionRevenue: 0,
        gstCollected: 0,
        todayBookings: 0,
        activeBoats: 0,
        totalUsers: 0,
      };
    } catch (e) {
      return {
        totalRevenue: 0,
        platformCommissionRevenue: 0,
        gstCollected: 0,
        todayBookings: 0,
        activeBoats: 0,
        totalUsers: 0,
      };
    }
  }

  async getAdminBoats() {
    try {
      const res = await this.request('/admin/boats');
      return res.boats || res.data || [];
    } catch (e) {
      return [];
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
      return res.users || res.data || [];
    } catch (e) {
      return [];
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
      return await this.request('/admin/refunds') || [];
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
      return res.coupons || res.data || [];
    } catch (e) {
      return [];
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
        defaultCommissionRate: 15,
        onlineCommissionRate: 10,
        cashCommissionRate: 12,
        commissionGstRate: 18,
        cashbackPercent: 10,
        payoutHoldDays: 3,
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
