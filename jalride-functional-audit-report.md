# JalRide (जलराइड) Native Mobile App — End-to-End Functional Audit Report

> **Audit Date:** 18 November 2026  
> **Target Workspace:** `c:\Users\yogen\Desktop\jalride native app`  
> **Reference Production Backend:** `e:\jalride-oauth-final`  
> **Backend Endpoint:** `https://jalride-backend.onrender.com/api`  
> **Audit Status:** COMPLETED (Read-Only, 0 Code Modifications Made)

---

## Executive Summary

A comprehensive, line-by-line functional audit of the **JalRide React Native Mobile Application** was conducted across all 45 source files, 22 mobile screens, theme tokens, navigators, API services, and backend controller implementations.

### Overall Audit Verdict: **NOT PRODUCTION READY**
While the visual presentation, theme architecture, native navigation, and React Native component structure strictly adhere to the "No WebView" mandate and compile cleanly with Metro/Hermes for Android and iOS, **critical production capabilities remain mocked, simulated, or disconnected from the backend**:
1. **Authentication Screens Missing**: No login or registration UI exists; the app runs on a hardcoded demo user with an open, ungated role switcher.
2. **Payment Gateway Absent**: `react-native-razorpay` is not installed; payments are simulated, bypassing order creation and HMAC-SHA256 signature verification.
3. **Camera & QR Scanning Simulated**: No native camera module (`expo-camera`); QR scanning is simulated via on-screen buttons.
4. **24 Dead API Methods**: More than 45% of defined `api.*` methods are never called by screens (screens mutate local React state or show Alert dialogs instead).
5. **Zero Automated Tests**: 0 test suites, no Jest setup, 0% test coverage.

---

## 1. Feature-by-Feature Functional Audit Matrix

| Audit Area | Scope / Feature | Status | Exact Source File(s) | Underlying API / Backend Route | Evidence & Findings |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **1. Customer** | User Registration & Login | **FAIL** | `src/context/AuthContext.js`<br>`src/services/api.js` | `POST /api/auth/login`<br>`POST /api/auth/register` | No `LoginScreen.js` or `RegisterScreen.js` exists in the UI. App auto-boots with hardcoded demo session (`Aman Sharma`, `usr-demo-01`). |
| | Boat Discovery & Filtering | **PASS** | `src/screens/customer/HomeScreen.js`<br>`src/screens/customer/BoatsScreen.js`<br>`src/screens/customer/BoatDetailScreen.js` | `GET /api/boats`<br>`GET /api/boats/:id` | Functional search, ghat pill filters, vessel categories (Bajra, Motor, Hand), photo carousel, pull-to-refresh, and safety checklist. |
| | 7-Step Booking Wizard | **PARTIAL** | `src/screens/customer/BookingWizardScreen.js` | `POST /api/bookings`<br>`POST /api/coupons/validate` | 7 steps navigable; coupon validation works. BUT slots use hardcoded `MOCK_SLOTS` instead of `/api/boats/:id/availability`, and payment jumps directly to ticket confirmation without charging real rails. |
| | Payment Processing | **FAIL** | `src/screens/customer/BookingWizardScreen.js`<br>`package.json` | `POST /api/payments/create-order`<br>`POST /api/payments/verify` | `react-native-razorpay` is NOT installed. `handleConfirmAndPay` creates an unpaid booking or mock ticket without Razorpay checkout or HMAC signature verification. |
| | Digital QR Boarding Pass | **PARTIAL** | `src/screens/customer/TicketScreen.js` | `GET /api/bookings/:id/ticket`<br>`GET /api/bookings/:id/qr.png` | Ticket layout, metadata, and native sharing (`Share.share`) work. BUT QR code is a CSS-styled View frame, not a scannable 2D barcode. |
| | Customer Wallet & Top-up | **PARTIAL** | `src/screens/customer/CustomerWalletScreen.js` | `GET /api/customer/wallet`<br>`POST /api/customer/wallet/topup/create-order` | Balance card, transaction list, and quick chips render. BUT top-up is a fake `setTimeout(1000)` simulation that increments local state without hitting Razorpay. |
| | Cancellation & Refunds | **FAIL** | `src/screens/customer/TicketScreen.js`<br>`src/screens/customer/MyRidesScreen.js` | `PUT /api/bookings/:id/cancel`<br>`POST /api/bookings/:id/refund-request` | "Cancel & Refund" button displays a mock `Alert.alert` and navigates Home. `api.cancelBooking` is NEVER called; booking remains active on backend. |
| **2. Boat Owner** | Owner Authentication | **FAIL** | `src/components/navigation/RootNavigator.js`<br>`src/screens/customer/ProfileScreen.js` | `POST /api/auth/login` | No owner login form; accessed by tapping the public role pill `⚓ Owner`. |
| | Earnings Dashboard | **PARTIAL** | `src/screens/owner/OwnerDashboardScreen.js` | `GET /api/owner/dashboard` | Displays Net Earnings, Available Balance, and Cash Due. BUT dashboard quick action buttons (`Confirm`, `Hold`, `Cash`) only trigger mock Alerts. |
| | Fleet Vessel Management | **PARTIAL** | `src/screens/owner/OwnerFleetScreen.js`<br>`src/screens/owner/AddEditBoatScreen.js` | `GET /api/owner/boats`<br>`POST /api/owner/boats`<br>`PUT /api/owner/boats/:id` | Fleet listing works. BUT status toggle mutates local state only. `AddEditBoatScreen` saves via `setTimeout(800)` and never calls `api.createBoat` or `api.updateBoat`. |
| | Bookings & Dispatch | **PASS** | `src/screens/owner/OwnerBookingsScreen.js` | `PUT /api/owner/bookings/:id/accept`<br>`PUT /api/owner/bookings/:id/pending`<br>`PUT /api/owner/bookings/:id/reject`<br>`PUT /api/owner/bookings/:id/cash-received`<br>`PUT /api/owner/bookings/:id/start-ride`<br>`PUT /api/owner/bookings/:id/complete-ride` | All dispatch actions properly invoke corresponding backend endpoints (`accept`, `pending`, `reject`, `cash-received`, `start-ride`, `complete-ride`). |
| | Cash Commission Tracking | **PARTIAL** | `src/screens/owner/OwnerWalletScreen.js` | `GET /api/owner/wallet`<br>`POST /api/owner/commission/pay-wallet` | Explains cash-on-ghat commission auto-settlement. BUT manual wallet settlement endpoint is not wired to a button. |
| | Operator & Vessel KYC | **FAIL** | `src/screens/owner/OwnerKycScreen.js` | `GET /api/kyc/documents/mine`<br>`POST /api/kyc/documents` | Renders hardcoded `const KYC_DOCS`. Document upload is an Alert dialog with no file picker and no network upload. |
| | Ghat Standee QR Posters | **PARTIAL** | `src/screens/owner/OwnerQrPostersScreen.js` | `GET /api/owner/qr/poster/:boatId/pdf` | A4 preview and native text sharing work. BUT "Download Print-Ready PDF" is an Alert placeholder; no PDF is downloaded. |
| **3. Admin** | Admin Authentication & Gate | **FAIL** | `src/components/navigation/RootNavigator.js`<br>`src/services/api.js` | N/A | Strict single-admin rule (`prepwave.pushpendra@gmail.com`) is bypassed. ANY user can tap `👑 Admin` in the top floating pill and gain full super-admin access. |
| | Platform KPI Dashboard | **PARTIAL** | `src/screens/admin/AdminDashboardScreen.js` | `GET /api/admin/stats` | Renders Gross Booking Value, Retained Commission (15%), and GST pool. Attention tiles for Refunds and KYC only open Alert popups. |
| | Boat Approvals | **PARTIAL** | `src/screens/admin/AdminBoatsScreen.js` | `PUT /api/admin/boats/:id/approve`<br>`PUT /api/admin/boats/:id/reject` | UI has approve and reject buttons, but handlers only mutate local React state (`setBoats(...)`); `api.approveBoat` is never called. |
| | User Directory & Verify | **PARTIAL** | `src/screens/admin/AdminUsersScreen.js` | `PUT /api/admin/users/:id/toggle-active`<br>`PUT /api/admin/users/:id/verify-email` | Directory search and role filter work. BUT "Toggle Active" and "Manual Email Verify" mutate local state without hitting backend APIs. |
| | Settings & Commission Rates | **PARTIAL** | `src/screens/admin/AdminSettingsScreen.js` | `GET /api/admin/settings`<br>`PUT /api/admin/settings` | Form fields load correctly. BUG: Sends `platformCommissionRate` and `settlementHoldDays` instead of backend's `defaultCommissionRate` and `payoutHoldDays`. Coupons added in UI are never saved to server. |

---

## 2. Backend API Endpoint Verification (51 Client Methods vs 223 Backend Routes)

| Category | Endpoint in `api.js` | HTTP Method | Backend Route Matched? | Called by Screen? | Verification Status | Defect / Note |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Auth** | `/auth/login` | POST | Yes | Yes (Context) | **PARTIAL** | Method wired in `AuthContext.js`, but no UI screen calls it. |
| | `/auth/register` | POST | Yes | Yes (Context) | **PARTIAL** | Method wired in `AuthContext.js`, but no UI screen calls it. |
| | `/auth/logout` | POST | Yes | Yes (`ProfileScreen`) | **PASS** | Successfully clears AsyncStorage session and calls backend. |
| | `/auth/me` | GET | Yes | No (0 files) | **PARTIAL** | Dead code in `api.js`. |
| | `/auth/me` | PUT | Yes | Yes (`ProfileScreen`) | **PASS** | Updates user profile and AsyncStorage. |
| **Boats** | `/boats` | GET | Yes | Yes (`HomeScreen`, `BoatsScreen`) | **PASS** | Correctly maps filters (`location`, `boatType`, `search`). |
| | `/boats/:id` | GET | Yes | Yes (`BoatDetailScreen`) | **PASS** | Fetches boat details and reviews. |
| | `/boats/:id/day` | GET | Yes | No (0 files) | **PARTIAL** | Dead code; `BookingWizard` uses hardcoded slots. |
| **Bookings**| `/bookings` | POST | Yes | Yes (`BookingWizardScreen`) | **PARTIAL** | Creates UNPAID booking; does not trigger Razorpay order. |
| | `/bookings/mine` | GET | Yes | Yes (`MyRidesScreen`) | **PASS** | Loads customer bookings with status badges. |
| | `/bookings/:id` | GET | Yes | No (0 files) | **PARTIAL** | Dead code; screens pass booking object in route params. |
| | `/bookings/:id/cancel` | PUT | Yes | No (0 files) | **FAIL** | Dead code; `TicketScreen` does not call this method. |
| | `/bookings/:id/refund-request` | POST | Yes | No (0 files) | **PARTIAL** | Dead code. |
| | `/coupons/validate` | POST | Yes | Yes (`BookingWizardScreen`) | **PASS** | Validates coupon codes (`JALRIDE100`). |
| **Instant QR**| `/qr/:boatId/status` | GET | Yes | No (0 files) | **PARTIAL** | Dead code; `QrScanScreen` uses local mock data. |
| | `/qr/:boatId/book` | POST | Yes | Yes (`QrScanScreen`) | **PASS** | Creates instant walk-in booking for cash/online. |
| | `/bookings/verify-ticket` | POST | Yes | No (0 files) | **PARTIAL** | Dead code. |
| | `/bookings/verify-ticket-id` | POST | Yes | No (0 files) | **PARTIAL** | Dead code. |
| **Wallet** | `/customer/wallet` | GET | Yes | Yes (`CustomerWalletScreen`) | **PASS** | Loads balance and ledger history. |
| | `/customer/wallet/transactions` | GET | Yes | No (0 files) | **PARTIAL** | Dead code; transactions extracted from wallet payload. |
| | `/customer/wallet/topup/create-order` | POST | Yes | No (0 files) | **FAIL** | Dead code; top-up uses simulated `setTimeout`. |
| | `/customer/wallet/topup/verify` | POST | Yes | No (0 files) | **FAIL** | Dead code; top-up verification never called. |
| | `/customer/bank-accounts` | GET | Yes | No (0 files) | **PARTIAL** | Dead code. |
| | `/customer/bank-accounts` | POST | Yes | No (0 files) | **PARTIAL** | Dead code. |
| | `/customer/wallet/withdrawals` | POST | Yes | No (0 files) | **FAIL** | Dead code; withdrawal uses local state mutation. |
| | `/customer/loyalty` | GET | Yes | No (0 files) | **PARTIAL** | Dead code. |
| **Owner** | `/owner/dashboard` | GET | Yes | Yes (`OwnerDashboardScreen`) | **PASS** | Loads earnings, available balance, and cash due. |
| | `/owner/boats` | GET | Yes | Yes (`OwnerFleetScreen`) | **PASS** | Loads owner's vessels. |
| | `/owner/boats` | POST | Yes | No (0 files) | **FAIL** | Dead code; `AddEditBoatScreen` uses `setTimeout`. |
| | `/owner/boats/:id` | PUT | Yes | No (0 files) | **FAIL** | Dead code; `AddEditBoatScreen` uses `setTimeout`. |
| | `/owner/boats/:id` | DELETE | Yes | No (0 files) | **PARTIAL** | Dead code. |
| | `/owner/bookings` | GET | Yes | Yes (`OwnerBookings`, `OwnerDashboard`) | **PASS** | Loads fleet dispatch queue. |
| | `/owner/bookings/:id/accept` | PUT | Yes | Yes (`OwnerBookingsScreen`) | **PASS** | Confirms booking and notifies passenger. |
| | `/owner/bookings/:id/pending` | PUT | Yes | Yes (`OwnerBookingsScreen`) | **PASS** | Puts booking on operational hold. |
| | `/owner/bookings/:id/reject` | PUT | Yes | Yes (`OwnerBookingsScreen`) | **PASS** | Rejects booking and triggers refund. |
| | `/owner/bookings/:id/cash-received` | PUT | Yes | Yes (`OwnerBookingsScreen`) | **PASS** | Confirms cash collection and logs due commission. |
| | `/owner/bookings/:id/start-ride` | PUT | Yes | Yes (`OwnerBookingsScreen`) | **PASS** | Marks boat underway on Ganga. |
| | `/owner/bookings/:id/complete-ride` | PUT | Yes | Yes (`OwnerBookingsScreen`) | **PASS** | Completes trip and releases owner earnings. |
| | `/owner/wallet` | GET | Yes | Yes (`OwnerWalletScreen`) | **PASS** | Loads owner available balance and due cash commissions. |
| | `/kyc/documents/mine` | GET | Yes | No (0 files) | **FAIL** | Dead code; `OwnerKycScreen` uses hardcoded array. |
| **Admin** | `/admin/stats` | GET | Yes | Yes (`AdminDashboardScreen`) | **PASS** | Loads platform gross volume and retained commission. |
| | `/admin/boats` | GET | Yes | Yes (`AdminBoatsScreen`) | **PASS** | Loads platform fleet for oversight. |
| | `/admin/boats/:id/approve` | PUT | Yes | No (0 files) | **FAIL** | Dead code; `AdminBoatsScreen` mutates local state only. |
| | `/admin/boats/:id/reject` | PUT | Yes | No (0 files) | **FAIL** | Dead code; `AdminBoatsScreen` mutates local state only. |
| | `/admin/users` | GET | Yes | Yes (`AdminUsersScreen`) | **PASS** | Loads user and operator directory. |
| | `/admin/users/:id/toggle-active` | PUT | Yes | No (0 files) | **FAIL** | Dead code; `AdminUsersScreen` mutates local state only. |
| | `/admin/refunds` | GET | Yes | No (0 files) | **PARTIAL** | Dead code. |
| | `/admin/refunds/:id/approve` | PUT | Yes | No (0 files) | **PARTIAL** | Dead code. |
| | `/admin/coupons` | GET | Yes | Yes (`AdminSettingsScreen`) | **PASS** | Loads active promo campaigns. |
| | `/admin/settings` | GET | Yes | Yes (`AdminSettingsScreen`) | **PASS** | Loads default platform commission and GST rate. |
| | `/admin/settings` | PUT | Yes | Yes (`AdminSettingsScreen`) | **PARTIAL** | Called, BUT sends mismatched field names (`platformCommissionRate`, `settlementHoldDays`). |

---

## 3. Financial & Accounting Verification

### 3.1 Financial Split Engine
- **Formula**:
  $$\text{Owner Earning} = \text{Fare} - (\text{Platform Commission} + \text{Commission GST})$$
  $$\text{Platform Commission} = \frac{\text{Fare} \times \text{Commission Rate}}{100}$$
  $$\text{Commission GST} = \frac{\text{Platform Commission} \times \text{GST Rate}}{100}$$
- **Verification**:
  - The backend (`e:/jalride-oauth-final/backend/utils/commission.js`) strictly computes this formula during booking creation and settlement.
  - The mobile app displays this formula in documentation and mock stats.
  - **Mismatch Detected**: In `BookingWizardScreen.js` (line 338), the mobile app injects a client-side ₹20 convenience fee (`convenienceFee = 20; totalAmount = baseFare + convenienceFee - discount`). The backend explicitly enforces `convenienceFee: 0` and `platformFeeMode: "free"`, as JalRide's commission is funded entirely from the owner settlement, not as an add-on tourist charge.

### 3.2 Wallet Escrow & Instant Refunds
- **Rule**: 100% instant refund into the customer wallet upon ride cancellation; owner earnings clawed back if booking was confirmed.
- **Verification**:
  - The backend (`e:/jalride-oauth-final/backend/utils/refund.js`) implements `processAutoWalletRefund` in an ACID MongoDB transaction.
  - **Mobile App Flaw**: `TicketScreen.js` (lines 53-58) intercepts the cancellation button and merely shows an Alert with a success message. It does not call `api.cancelBooking` or `PUT /api/bookings/:id/cancel`.

### 3.3 Cash on Ride Commission Auto-Recovery
- **Rule**: For walk-in bookings where cash was collected on the ghat, platform commission is marked as `commissionStatus: "due"` and auto-deducted from subsequent online booking credits.
- **Verification**:
  - `OwnerBookingsScreen.js` has a working `markCashReceived` action that calls `PUT /api/owner/bookings/:id/cash-received`.
  - `OwnerWalletScreen.js` correctly displays the due commission badge and explanation.

---

## 4. UI/UX, Navigation & Mobile Primitives Audit

| Component / Pattern | Status | Observations |
| :--- | :---: | :--- |
| **No WebView Guarantee** | **PASS** | Verified across all 45 source files. Zero `<WebView>`, zero iframes. 100% React Native native components. |
| **Navigation Architecture** | **PASS** | Native bottom tabs (`@react-navigation/bottom-tabs`) and stack headers (`@react-navigation/native-stack`) with back buttons. |
| **Buttons & Pressables** | **PASS** | `Button.js` provides 6 variants, loading spinners, and touch target size $\ge 48\text{dp}$. |
| **Input Fields & Forms** | **PASS** | Focus states, password toggles, numeric keyboards, and label typography properly handled. |
| **Loading Skeletons** | **PARTIAL** | `LoadingSkeleton.js` with looping opacity animation is implemented, but only used on 3 screens (`HomeScreen`, `BoatsScreen`, `MyRidesScreen`). |
| **Empty States** | **PARTIAL** | `EmptyState.js` implemented, but only used on 2 screens (`BoatsScreen`, `MyRidesScreen`). Missing on 6 other list screens. |
| **Error States** | **FAIL** | `ErrorState.js` was created, but is **0% used** across all 22 screens. Screens rely on standard `Alert.alert`. |
| **Toast Notifications** | **FAIL** | `Toast.js` was created, but is **0% used** across all screens. |
| **Safe Area Insets** | **PARTIAL** | `SafeAreaProvider` is wrapped in `App.js`. However, `RootNavigator.js` floating pill uses hardcoded `top: 48`, risking overlap with device notches. |

---

## 5. Native Device Capabilities & Permissions

1. **Android Permissions (`app.json`)**:
   - `android.permissions` is **completely empty** in `app.json`.
   - Missing required declarations for `CAMERA`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`.
2. **Camera & QR Viewfinder**:
   - `QrScanScreen.js` simulates scanning using an `Animated.Value` laser line and touch buttons (`Simulate Scan`).
   - `expo-camera` is not installed; no actual camera feed can be opened.
3. **QR Code Generation**:
   - `TicketScreen.js` and `OwnerQrPostersScreen.js` do NOT use `react-native-qrcode-svg`. They render simulated CSS boxes with text labels, which cannot be scanned by barcode readers.
4. **Native Sharing**:
   - `Share.share` from `react-native` is properly integrated on `TicketScreen` and `OwnerQrPostersScreen`.

---

## 6. Automated Testing Audit

- **Test Framework**: None installed (No Jest, no `@testing-library/react-native` in `package.json`).
- **Test Scripts**: `npm test` script does not exist.
- **Test Files**: 0 test files in `src/`.
- **Test Coverage**: **0%**.

---

## 7. Production-Readiness Issue Classification

### 🔴 P0 — Critical Showstoppers (Blockers for Store Submission & Production Launch)

1. **[P0-1] Missing User Authentication Screens & Open Admin Vulnerability**
   - **File:** `src/context/AuthContext.js`, `src/components/navigation/RootNavigator.js`
   - **Defect:** No Login or Registration screens exist. App auto-authenticates into a demo user. The persistent floating pill (`👑 Admin`) allows any user to access the Super Administrator console without entering credentials.
   - **Remediation Required:** Implement `LoginScreen.js` and `RegisterScreen.js`. Restrict admin navigation to authenticated users whose email strictly equals `prepwave.pushpendra@gmail.com`.

2. **[P0-2] Missing Native Razorpay Payment Gateway & Signature Verification**
   - **File:** `src/screens/customer/BookingWizardScreen.js`, `src/screens/customer/CustomerWalletScreen.js`, `package.json`
   - **Defect:** `react-native-razorpay` is not installed. Checkout creates unpaid bookings without collecting funds or verifying HMAC SHA-256 signatures via `POST /api/payments/verify`.
   - **Remediation Required:** Install `react-native-razorpay`, implement order creation (`POST /api/payments/create-order`), launch Razorpay checkout, and verify payments before confirming bookings.

3. **[P0-3] Camera & QR Scanning is 100% Simulated**
   - **File:** `src/screens/customer/QrScanScreen.js`, `app.json`, `package.json`
   - **Defect:** Tourists cannot scan physical standee QR posters on Varanasi ghats because no camera library is installed.
   - **Remediation Required:** Install `expo-camera`, declare `android.permission.CAMERA` in `app.json`, and mount `CameraView` with onBarcodeScanned handler.

4. **[P0-4] Broken Ride Cancellation & Wallet Refund Execution**
   - **File:** `src/screens/customer/TicketScreen.js`
   - **Defect:** "Cancel & Refund" button shows a confirmation dialog but never calls `api.cancelBooking` (`PUT /api/bookings/:id/cancel`). The booking remains active and unrefunded on the server.
   - **Remediation Required:** Wire the confirmation button to `api.cancelBooking(booking._id, reason)` and refresh wallet balances.

---

### 🟡 P1 — High Priority (Workflow Failures & Data Divergence)

1. **[P1-1] 24 Declared API Methods Never Invoked by Screens**
   - **Files:** `AdminBoatsScreen.js`, `AdminUsersScreen.js`, `AddEditBoatScreen.js`, `OwnerWalletScreen.js`, `OwnerKycScreen.js`
   - **Defect:** Screen actions update local component state (`setBoats`, `setUsers`) or use `setTimeout` rather than calling their corresponding `api.*` methods. Server data is never updated.
   - **Remediation Required:** Connect screen actions directly to `api.approveBoat`, `api.rejectBoat`, `api.toggleUserActive`, `api.createBoat`, and `api.requestCustomerWithdrawal`.

2. **[P1-2] Parameter Name Mismatch in Platform Settings API**
   - **File:** `src/screens/admin/AdminSettingsScreen.js`
   - **Defect:** Screen sends `platformCommissionRate` and `settlementHoldDays`, whereas the backend controller expects `defaultCommissionRate` and `payoutHoldDays`. The backend silently ignores commission updates.
   - **Remediation Required:** Rename payload keys to match `defaultCommissionRate` and `payoutHoldDays`.

3. **[P1-3] Unauthorized ₹20 Convenience Fee Added on Mobile Client**
   - **File:** `src/screens/customer/BookingWizardScreen.js`
   - **Defect:** Mobile wizard adds a ₹20 convenience fee, conflicting with backend business rules where `convenienceFee = 0`.
   - **Remediation Required:** Remove the ₹20 client fee and match backend fare calculations.

4. **[P1-4] QR Codes Rendered as Non-Scannable CSS Divs**
   - **Files:** `src/screens/customer/TicketScreen.js`, `src/screens/owner/OwnerQrPostersScreen.js`
   - **Defect:** Boarding passes and standees render decorative CSS corners with text, which scanners cannot read.
   - **Remediation Required:** Install `react-native-qrcode-svg` and render valid 2D barcode data.

---

### 🟢 P2 — Medium Priority (Robustness, Polish & Testing)

1. **[P2-1] 0% Automated Test Coverage**
   - **Defect:** No Jest test suites or automated UI tests exist.
   - **Remediation Required:** Configure Jest with `@testing-library/react-native` and write unit tests for financial calculations and navigation.

2. **[P2-2] Unused ErrorState and Toast Components**
   - **Files:** `src/components/common/ErrorState.js`, `src/components/common/Toast.js`
   - **Defect:** Both components are dead code; all screens use standard `Alert.alert`.
   - **Remediation Required:** Integrate `ErrorState` on API failures and `Toast` for confirmation messages.

3. **[P2-3] Hardcoded Safe Area Insets**
   - **File:** `src/components/navigation/RootNavigator.js`
   - **Defect:** Hardcoded `top: 48` for floating bar risks clipping on devices with dynamic islands or notches.
   - **Remediation Required:** Use `useSafeAreaInsets().top` for dynamic spacing.
