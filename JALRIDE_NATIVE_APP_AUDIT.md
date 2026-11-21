# JalRide Native Mobile App Audit & Technical Assessment

**Application**: JalRide Native Mobile Application (`Jalride-app-main` / `jalride-app`)  
**Framework**: React Native 0.76.7 / Expo SDK 58.0.0 (Hermes Engine, Continuous Native Generation)  
**Package Identifier**: `com.jalride.app`  
**Platforms**: Android (APK/AAB) & iOS (IPA)  
**Audit Date**: November 2026  
**Auditor**: Senior React Native Architect & Systems QA Engineer  

---

## 1. Mobile Architecture & Foundation Audit

### 1.1 Dependency & Runtime Baseline
* **Expo SDK Version**: `58.1.20`
* **React Native Core**: `0.76.7`
* **JavaScript Engine**: Hermes (Bytecode compiled `.hbc` for Android & iOS)
* **Navigation Architecture**: `@react-navigation/native-stack` + `@react-navigation/bottom-tabs`
* **Hardware & Device Modules**:
  * `expo-camera` (`CameraView`): Real-time barcode & QR scanning.
  * `react-native-qrcode-svg` & `react-native-svg`: Crisp vector rendering of boarding tickets & standee posters.
  * `react-native-safe-area-context`: Safe area insets protection against Android 3-button navigation bars and camera cutouts.
  * `expo-document-picker`: Native file and PDF picking for KYC document uploads.
  * `expo-sharing`: Native OS share sheet integration.
  * `react-native-razorpay`: Native Android/iOS Razorpay checkout sheet.
  * `@react-native-async-storage/async-storage`: Secure persistence of JWT bearer tokens and active user profile.
* **WebView & Iframe Audit**:
  * Zero `WebView` usage across all 28 screens.
  * Zero `<iframe>` elements.
  * 100% genuine React Native native components.

---

## 2. Screen-by-Screen Functional Audit

### 2.1 Customer Experience Screens

#### 1. `HomeScreen.js` (`src/screens/customer/HomeScreen.js`)
* **Equivalent Website Page**: `index.html`
* **Connected API**: `GET /api/boats` (with location filter)
* **Response Mapping**: Correctly maps vessel records, pricing, capacity, and ratings.
* **UI/UX Implementation**: River teal `#0a2e36` banner, ghat filter pills, "Instant QR" shortcut, "Book Boat" shortcut, verified fleet carousel, pull-to-refresh (`RefreshControl`), safe area insets.
* **Status**: **COMPLETE**
* **Findings**:
  * Clean integration with backend.
  * Location pills dynamically filter the live boat list.
  * Tapping a boat card cleanly opens `BoatDetailScreen`.

#### 2. `BoatsScreen.js` (`src/screens/customer/BoatsScreen.js`)
* **Equivalent Website Page**: `boats.html`
* **Connected API**: `GET /api/boats`
* **Response Mapping**: Correctly parses boat items, images, ghat tags, and amenities.
* **UI/UX Implementation**: Search bar for instant text filtering, boat type filter chips (`All`, `Bajra`, `Motor`, `Hand`), sorting bottom sheet, pull-to-refresh.
* **Status**: **COMPLETE**
* **Findings**:
  * Search and filter logic operate seamlessly in real time.
  * Empty state (`EmptyState.js`) renders when no boats match filters.

#### 3. `BoatDetailScreen.js` (`src/screens/customer/BoatDetailScreen.js`)
* **Equivalent Website Page**: `boats.html` (modal / single view)
* **Connected API**: `GET /api/boats/:id`
* **Response Mapping**: Accurately maps vessel specs, safety badges, captain info, and fare per person.
* **UI/UX Implementation**: Image carousel, 3-point feature highlights (Max Rider Capacity, Certified Govt Inspection, Equipped Life Jackets), captain card, 100% Instant Refund Policy disclosure, floating bottom checkout bar.
* **Status**: **COMPLETE**
* **Findings**:
  * "Book Ride Now" button updates `bookingDraft` in `AuthContext` and transitions to `BookingWizardScreen`.

#### 4. `BookingWizardScreen.js` (`src/screens/customer/BookingWizardScreen.js`)
* **Equivalent Website Page**: `booking.html`
* **Connected APIs**:
  * `GET /api/boats/:id/day?date=...`: Real-time departure slots.
  * `POST /api/coupons/validate`: Authoritative coupon discount validation.
  * `POST /api/bookings`: Create booking reservation.
  * `POST /api/payments/create-order`: Gateway order creation.
  * `POST /api/payments/verify`: Payment signature verification.
  * `GET /api/customer/wallet`: Customer wallet balance.
* **Response Mapping**: Accurately validates seat availability, slot expiration, whole-boat charter pricing, and coupon discounts.
* **UI/UX Implementation**: 7-Step sequential wizard (Date $\rightarrow$ Vessel $\rightarrow$ Live Slots $\rightarrow$ Passenger/Charter $\rightarrow$ Coupon $\rightarrow$ Payment $\rightarrow$ Ticket).
* **Status**: **COMPLETE**
* **Findings**:
  * Timezone fix with `formatLocalDate(d)` prevents UTC date drift in IST.
  * Correctly rejects expired or sold-out slots.
  * Supports 1-click JalRide Wallet Escrow checkout, Razorpay Gateway, and Cash-on-ride.

#### 5. `QrScanScreen.js` (`src/screens/customer/QrScanScreen.js`)
* **Equivalent Website Page**: `qr-book.html`
* **Connected API**: `GET /api/qr/:boatId/status`
* **Hardware Integration**: `expo-camera` (`CameraView`) with torch toggle, camera permission rationale, and real-time barcode listener.
* **Status**: **COMPLETE**
* **Findings**:
  * Includes manual 6-character standee code input fallback for low-light or damaged QR posters.
  * Prevents duplicate scans using a debouncing guard (`isProcessingScan`).

#### 6. `TicketScreen.js` (`src/screens/customer/TicketScreen.js`)
* **Equivalent Website Page**: `ticket.html`
* **Connected APIs**:
  * `GET /api/bookings/:id`
  * `PUT /api/bookings/:id/cancel`: 100% wallet escrow cancellation.
* **Response Mapping**: Renders digital boarding pass with cryptographic vector QR code (`react-native-qrcode-svg`).
* **Status**: **PARTIAL**
* **Missing Functionality**:
  * Website supports downloading official PDF ticket (`/api/bookings/:id/ticket`). The app currently has an OS text share button (`Share.share`), but lacks direct PDF ticket compilation/export using `expo-print`.
  * After ride completion, the website displays a rating modal to leave a review (`POST /api/reviews`). The app currently lacks a post-ride review submission component on `TicketScreen`.

#### 7. `MyRidesScreen.js` (`src/screens/customer/MyRidesScreen.js`)
* **Equivalent Website Page**: `customer-dashboard.html` (Rides section)
* **Connected API**: `GET /api/bookings/mine`
* **Response Mapping**: Separates bookings into "Upcoming Passes" and "Past Journeys".
* **Status**: **COMPLETE**
* **Findings**:
  * Pull-to-refresh enabled.
  * Tapping a pass navigates directly to `TicketScreen`.

#### 8. `CustomerWalletScreen.js` (`src/screens/customer/CustomerWalletScreen.js`)
* **Equivalent Website Pages**: `wallet.html`, `wallet-transactions.html`, `wallet-withdraw.html`, `wallet-refunds.html`
* **Connected APIs**:
  * `GET /api/customer/wallet`
  * `GET /api/customer/wallet/transactions`
* **Response Mapping**: Displays wallet balance, cashback earned, loyalty reward points, and transaction history.
* **Status**: **PARTIAL**
* **Missing Functionality**:
  * The website provides a wallet withdrawal modal (`POST /api/customer/wallet/withdrawals`) allowing riders to cash out their balance to a bank account.
  * The website allows adding money to wallet via Razorpay (`POST /api/customer/wallet/topup/create-order`).
  * The website provides a bank accounts manager (`GET/POST /api/customer/bank-accounts`).
  * In the mobile app, `CustomerWalletScreen` is currently read-only (displays balance & transaction history, but lacks "Add Funds" and "Withdraw" modals).

#### 9. `ChatScreen.js` (`src/screens/customer/ChatScreen.js`)
* **Equivalent Website Page**: `messages.html`
* **Connected APIs**:
  * `POST /api/chat/conversations/booking/:bookingId`
  * `GET /api/chat/conversations/:id/messages`
  * `POST /api/chat/conversations/:id/messages`
* **Status**: **COMPLETE**
* **Findings**:
  * Live messaging with boat captain for active reservations.
  * Clean empty state and auto-scrolling message list.

#### 10. `NotificationsScreen.js` (`src/screens/customer/NotificationsScreen.js`)
* **Equivalent Website Page**: `notification-center.js`
* **Connected APIs**:
  * `GET /api/notifications`
  * `PUT /api/notifications/read-all`
* **Status**: **COMPLETE**
* **Findings**:
  * Real-time notification feed with category badges and mark-all-read action.

#### 11. `ProfileScreen.js` & `PrivacyDataRightsScreen.js`
* **Equivalent Website Pages**: `customer-dashboard.html`, `privacy-center.html`
* **Connected APIs**:
  * `GET /api/auth/me`
  * `GET /api/privacy/export`
  * `POST /api/privacy/delete-account`
* **Status**: **COMPLETE**
* **Findings**:
  * Fully compliant with DPDP Act 2023.
  * Includes role-switching trigger for authorized owners and administrators.

---

### 2.2 Boat Owner Experience Screens

#### 1. `OwnerDashboardScreen.js` (`src/screens/owner/OwnerDashboardScreen.js`)
* **Equivalent Website Page**: `owner-dashboard.html`
* **Connected APIs**:
  * `GET /api/owner/dashboard`
  * `GET /api/owner/bookings`
* **Response Mapping**: Live KPI cards (Today Rides, Active Boats, Gross Revenue, Wallet Escrow), Quick Action Cards, and recent booking feed.
* **Status**: **COMPLETE**

#### 2. `OwnerFleetScreen.js` & `AddEditBoatScreen.js`
* **Equivalent Website Page**: `owner-boats.html`
* **Connected APIs**:
  * `GET /api/owner/boats`
  * `POST /api/owner/boats`
  * `PUT /api/owner/boats/:id`
* **Response Mapping**: Renders vessel cards, active/maintenance toggles, capacity, pricing, and dual commission previews (online % vs cash %).
* **Status**: **COMPLETE**

#### 3. `OwnerBookingsScreen.js` (`src/screens/owner/OwnerBookingsScreen.js`)
* **Equivalent Website Page**: `owner-bookings.html`
* **Connected APIs**:
  * `GET /api/owner/bookings`
  * `PUT /api/owner/bookings/:id/start-ride`
  * `PUT /api/owner/bookings/:id/complete-ride`
  * `PUT /api/owner/bookings/:id/cash-received`
  * `POST /api/bookings/verify-ticket`
* **Status**: **COMPLETE**
* **Findings**:
  * Status filter tabs (`All`, `Pending`, `Confirmed`, `Cash on Ride`).
  * Passenger verification with digital ticket check.
  * Ride lifecycle triggers release wallet escrow funds upon completion.

#### 4. `OwnerWalletScreen.js` (`src/screens/owner/OwnerWalletScreen.js`)
* **Equivalent Website Pages**: `owner-wallet.html`, `owner-withdraw.html`, `owner-settlement.html`
* **Connected APIs**:
  * `GET /api/owner/wallet`
  * `POST /api/owner/withdrawals`
* **Status**: **PARTIAL**
* **Identified Defects & Incomplete Logic**:
  * Line 30 contains a hardcoded fallback string:
    `const [bankAccount, setBankAccount] = useState('SBI - A/C No. ...5821');`
  * The payout bottom sheet does not fetch the owner's actual verified bank accounts from `GET /api/owner/bank-accounts`.
  * The owner cannot enter their IFSC code, bank account number, and account holder name to add/update bank accounts.
  * Settlement history invoice downloads (`GET /api/owner/settlements`) are not surfaced in the UI.

#### 5. `OwnerKycScreen.js` (`src/screens/owner/OwnerKycScreen.js`)
* **Equivalent Website Page**: `owner-kyc.html`
* **Connected APIs**:
  * `POST /api/kyc/documents`
  * `GET /api/kyc/documents/mine`
* **Hardware Integration**: `expo-document-picker` for selecting PDF/JPEG certificates from Android storage.
* **Status**: **COMPLETE**

#### 6. `OwnerQrPostersScreen.js` (`src/screens/owner/OwnerQrPostersScreen.js`)
* **Equivalent Website Page**: `owner-qr-codes.html`
* **Connected APIs**: `GET /api/owner/boats`, `GET /api/owner/qr/my-posters`
* **Status**: **COMPLETE**
* **Findings**:
  * Renders vector QR code standees and triggers native OS share sheet.

#### 7. Missing Boat Owner Screens in Mobile App
1. **`OwnerCalendarScreen.js` (MISSING — CRITICAL PRIORITY)**:
   * Website counterpart: `owner-calendar.html` / `js/owner-calendar.js`.
   * The owner cannot manage their departure slots (`09:30`, `10:30`, etc.), set recurring schedules (`/api/availability/:boatId/recurring`), or block maintenance dates (`/api/availability/:boatId/closed-dates`) from the mobile app.
2. **`OwnerRevenueAnalyticsScreen.js` (MISSING — HIGH PRIORITY)**:
   * Website counterpart: `owner-revenue.html` / `owner-analytics.html`.
   * Missing graphical revenue charts and cash-vs-online collection breakdown.
3. **`OwnerReviewsScreen.js` (MISSING — MEDIUM PRIORITY)**:
   * Website counterpart: `owner-reviews.html`.
   * Missing interface to read customer reviews and post replies.
4. **`OwnerSubscriptionScreen.js` (MISSING — LOW PRIORITY)**:
   * Website counterpart: `owner-subscription.html`.
   * Missing view of subscription tiers (Free, Pro, Fleet).
5. **`OwnerSupportScreen.js` (MISSING — MEDIUM PRIORITY)**:
   * Website counterpart: `owner-support.html`.
   * Missing support dispute ticketing interface.

---

### 2.3 Super Administrator Experience Screens

#### 1. `AdminDashboardScreen.js` (`src/screens/admin/AdminDashboardScreen.js`)
* **Equivalent Website Page**: `admin-dashboard.html`
* **Connected APIs**:
  * `GET /api/admin/stats`
  * `GET /api/admin/boats`
  * `GET /api/admin/users`
  * `GET /api/admin/refunds`
* **Status**: **PARTIAL**
* **Identified Defects & Incomplete Logic**:
  * Line 165: "Refund Authorizations" button displays a popup placeholder:
    `Alert.alert('Refunds Queue', ...)`
    instead of opening a dedicated `AdminRefundsScreen`.
  * Line 177: "KYC Review Queue" button displays a popup placeholder:
    `Alert.alert('KYC Audit Queue', ...)`
    instead of opening a dedicated `AdminKycScreen`.
  * No navigation link to view platform-wide bookings (`admin-bookings.html`).
  * No navigation link to view owner settlement disbursements (`admin-settlements.html`).

#### 2. `AdminBoatsScreen.js` (`src/screens/admin/AdminBoatsScreen.js`)
* **Equivalent Website Page**: `admin-boats.html`
* **Connected APIs**:
  * `GET /api/admin/boats`
  * `PUT /api/admin/boats/:id/approve`
  * `PUT /api/admin/boats/:id/reject`
* **Status**: **COMPLETE**

#### 3. `AdminUsersScreen.js` (`src/screens/admin/AdminUsersScreen.js`)
* **Equivalent Website Page**: `admin-users.html`
* **Connected APIs**:
  * `GET /api/admin/users`
  * `PUT /api/admin/users/:id/toggle-active`
* **Status**: **COMPLETE**

#### 4. `AdminSettingsScreen.js` (`src/screens/admin/AdminSettingsScreen.js`)
* **Equivalent Website Page**: `admin-settings.html`, `admin-commission.html`
* **Connected APIs**:
  * `GET /api/admin/settings`
  * `PUT /api/admin/settings`
  * `GET /api/admin/coupons`
  * `POST /api/admin/coupons`
* **Status**: **COMPLETE**
* **Findings**:
  * Configures online commission %, cash commission %, GST %, cashback %, and payout hold days.

#### 5. Missing Admin Screens in Mobile App
1. **`AdminBookingsScreen.js` (MISSING — HIGH PRIORITY)**:
   * Website counterpart: `admin-bookings.html` / `js/admin-bookings.js`.
   * Admin cannot inspect universal bookings or trigger administrative overrides.
2. **`AdminRefundsScreen.js` (MISSING — HIGH PRIORITY)**:
   * Website counterpart: `admin-refunds.html` / `js/admin-refunds.js`.
   * Admin cannot inspect pending refund requests or execute 100% wallet escrow reversals.
3. **`AdminKycScreen.js` (MISSING — HIGH PRIORITY)**:
   * Website counterpart: `admin-kyc.html` / `js/admin-kyc.js`.
   * Admin cannot review uploaded captain licenses and Aadhaar proofs to grant verification badges.
4. **`AdminSettlementsScreen.js` (MISSING — MEDIUM PRIORITY)**:
   * Website counterpart: `admin-settlements.html`.
   * Admin cannot process owner withdrawal batches and record bank UTR settlement numbers.
5. **`AdminReportsScreen.js` (MISSING — MEDIUM PRIORITY)**:
   * Website counterpart: `admin-reports.html` / `admin-analytics.html`.
   * Admin cannot export financial reports and audit logs.

---

## 3. Summary of Implementation Status

| Role | Total Web Pages | Native Screens Implemented | Complete Features | Partial Features | Missing Features |
|---|:---:|:---:|:---:|:---:|:---:|
| **Customer** | 23 | 12 | 10 | 2 (Wallet Withdraw/Bank, Ticket PDF/Review) | 0 |
| **Boat Owner** | 16 | 7 | 5 | 2 (Wallet Withdraw/Bank, Docs) | 5 (Calendar, Revenue Charts, Reviews, Subscriptions, Support) |
| **Super Admin** | 17 | 4 | 3 | 1 (Dashboard Actions) | 5 (Bookings Ledger, Refunds Queue, KYC Queue, Settlements, Reports) |
| **Total Platform** | **56** | **23** | **18** | **5** | **10** |
