# JalRide Website-to-Native-App Parity Implementation Roadmap

**Application**: JalRide Native Mobile App (`com.jalride.app`)  
**Target Goal**: 100% Functional Feature Parity with Web Platform (`jalride-oauth-final`)  
**Architecture**: Native Mobile UI / UX (Expo SDK 58, React Native 0.76.7) over Shared Production Backend  
**Audit Status**: Audit Phase Complete — Awaiting Authorization to Begin Implementation  

---

## 1. Roadmap Architecture & Execution Principles

This implementation roadmap establishes the exact sequence of engineering tasks required to elevate the JalRide native mobile application to complete functional parity with the production website.

### Non-Negotiable Implementation Safeguards:
1. **Preserve Shared Backend**: Never modify the existing Express backend or MongoDB schemas unless a critical backward-compatible mobile contract is required.
2. **Untouchable Web Codebase**: The web application repository (`jalride-oauth-final`) must remain 100% untouched.
3. **Native Mobile Design Language**: Never copy web DOM or HTML structures into the mobile app; implement every capability using native React Native components (`FlatList`, `Modal`, `BottomSheet`, `TextInput`, `SafeAreaView`).
4. **Authoritative Backend Data**: Every screen must bind directly to live MongoDB collections via the API service, displaying genuine statistics, bookings, and balances.
5. **No Mock or Fallback Data**: Zero fake numbers, zero hardcoded bank accounts, and zero placeholder `Alert.alert` dialogs for core business consoles.

---

## 2. Phased Implementation Breakdown

```
Phase 1: Foundation & Shared UI Components
    │
    ├──> Phase 2: Customer Feature Parity (Wallet Withdraw, PDF Ticket, Reviews)
    │
    ├──> Phase 3: Boat Owner Operations (Calendar Slots, Revenue Charts, Bank)
    │
    ├──> Phase 4: Super Admin Governance (Universal Bookings, Refunds, KYC, Settlements)
    │
    ├──> Phase 5: Financial Integrity & Payment Signature Reconciliation
    │
    └──> Phase 6: Automated Regression Testing, Build Verification & APK Release
```

---

### Phase 1: Foundation, Shared Components & Navigation Updates (P0)

* **Objective**: Establish native UI components and expand navigation stacks to host all new screens.
* **Tasks**:
  1. **Update Navigators**:
     * In `CustomerNavigator.js`: Register `ManageBankAccountsScreen`, `LoyaltyRewardsScreen`.
     * In `OwnerNavigator.js`: Register `OwnerCalendarScreen`, `OwnerRevenueScreen`, `OwnerReviewsScreen`, `OwnerSupportScreen`.
     * In `AdminNavigator.js`: Register `AdminBookingsScreen`, `AdminRefundsScreen`, `AdminKycScreen`, `AdminSettlementsScreen`, `AdminReportsScreen`.
  2. **Enhance Shared Native Components**:
     * Add `DatePickerModal` supporting local calendar date picking without timezone drift.
     * Add `PdfViewerModal` with native print and export capabilities (`expo-print` + `expo-sharing`).
     * Add `BankDetailsForm` component with real-time IFSC code and account number validation.

---

### Phase 2: Customer Feature Parity (P1)

* **Objective**: Close all functional gaps between the website customer dashboard and native app.
* **Tasks**:
  1. **Customer Wallet Withdrawal & Bank Management**:
     * Implement `CustomerWalletWithdrawModal` in `CustomerWalletScreen.js` connected to `POST /api/customer/wallet/withdrawals`.
     * Build `ManageBankAccountsScreen.js` connected to `GET/POST /api/customer/bank-accounts` allowing riders to save verified payout accounts.
     * Add wallet top-up modal supporting Razorpay wallet pre-funding (`POST /api/customer/wallet/topup/create-order`).
  2. **Official PDF Boarding Pass Export**:
     * In `TicketScreen.js`, integrate `expo-print` and `expo-sharing` to compile the official boarding pass into a downloadable/printable PDF matching `ticket.html`.
  3. **Post-Ride Customer Review & Rating**:
     * In `MyRidesScreen.js` and `TicketScreen.js`, add a "Rate Ride" action for completed bookings opening a native star-rating and comment modal (`POST /api/reviews`).
  4. **Dedicated Loyalty Tier Breakdown**:
     * Build `LoyaltyRewardsScreen.js` displaying Bronze/Silver/Gold tier progression, points redemption rules (`POST /api/loyalty/redeem`), and referral code sharing.

---

### Phase 3: Boat Owner Operations Parity (P0 / P1)

* **Objective**: Give boat owners full fleet operational control from their mobile devices.
* **Tasks**:
  1. **Build `OwnerCalendarScreen.js` (CRITICAL P0)**:
     * Interactive weekly schedule editor for recurring departure slots (`POST /api/availability/:boatId/recurring`).
     * Real-time slot management (add/remove departure times, e.g. `09:30`, `10:30`, `12:30`, `16:20`, `18:20`).
     * Per-date override controls: mark dates as closed/maintenance, set date-specific capacity overrides (`POST /api/availability/:boatId/closed-dates`).
  2. **Build `OwnerRevenueScreen.js` (P1)**:
     * Visual revenue breakdown charts (daily and monthly volume via `GET /api/owner/analytics/dashboard`).
     * Clear accounting separation between Online Gateway collections and Direct Cash-on-ride earnings.
     * Platform commission debt recovery audit log.
  3. **Eliminate Hardcoded Bank Account in `OwnerWalletScreen.js` (P0)**:
     * Remove line 30 fallback string `SBI - A/C No. ...5821`.
     * Connect payout modal to `GET/POST /api/owner/bank-accounts`, allowing owners to select or input their genuine IFSC code and account number.
  4. **Build `OwnerReviewsScreen.js` (P2)**:
     * Screen displaying customer feedback and star ratings with captain response submission.
  5. **Build `OwnerSupportScreen.js` (P2)**:
     * Dedicated dispute ticketing interface for commission inquiries and passenger issues.

---

### Phase 4: Super Administrator Governance Consoles (P0 / P1)

* **Objective**: Replace all temporary `Alert.alert` placeholders with genuine management screens.
* **Tasks**:
  1. **Build `AdminBookingsScreen.js` (P1)**:
     * Universal searchable ledger of all platform bookings (`GET /api/admin/bookings`).
     * Filter by booking status, payment status, boat, customer, or date.
     * Administrative actions: view ticket, force-cancel with refund, or reassign departure time.
  2. **Build `AdminRefundsScreen.js` (CRITICAL P0)**:
     * Replace `Alert.alert('Refunds Queue', ...)` in `AdminDashboardScreen.js`.
     * Dedicated review queue for pending refund requests (`GET /api/admin/refunds`).
     * One-tap "Authorize Refund" executing 100% wallet escrow reversal (`PUT /api/admin/refunds/:id/approve`).
     * One-tap "Reject Refund" with mandatory audit justification (`PUT /api/admin/refunds/:id/reject`).
  3. **Build `AdminKycScreen.js` (CRITICAL P0)**:
     * Replace `Alert.alert('KYC Audit Queue', ...)` in `AdminDashboardScreen.js`.
     * Inspection queue for uploaded boat operator Aadhaar proofs and Captain Licenses (`GET /api/admin/kyc/documents`).
     * Document preview and one-tap "Verify & Grant Badge" (`PUT /api/admin/kyc/documents/:id/approve`).
  4. **Build `AdminSettlementsScreen.js` (P1)**:
     * Owner withdrawal batch processing queue (`GET /api/admin/withdrawals`).
     * Settlement action recording bank UTR transaction reference and marking payouts as disbursed (`PUT /api/admin/withdrawals/:id/approve`).
  5. **Build `AdminReportsScreen.js` (P2)**:
     * Date-range platform financial report generator and CSV audit export.

---

### Phase 5: Financial Accuracy & Payment Reconciliation (P0)

* **Objective**: Ensure 100% mathematical and cryptographic precision across all transactions.
* **Tasks**:
  1. **Dual Commission Enforcement**:
     * Verify online payment transactions enforce 10% commission and cash-on-ride enforces 12%.
     * Verify GST pool calculation strictly evaluates to 18% of earned platform commission.
  2. **Zero Client Convenience Fee Guarantee**:
     * Ensure no client-side screen adds any surcharge or convenience fee (`mode: 'free'`, value ₹0).
  3. **Payment Signature Verification**:
     * Ensure all Razorpay online payments verify HMAC-SHA256 signatures server-side via `POST /api/payments/verify`.
  4. **Escrow Refund Reconciliation**:
     * Verify that pre-departure cancellations refund exactly 100% of the paid fare into customer wallet escrow with zero deductions.

---

### Phase 6: Automated Testing, EAS Build Verification & Delivery (P0)

* **Objective**: Verify the complete application on physical devices and deliver updated production builds.
* **Tasks**:
  1. **Automated Test Suite Expansion**:
     * Expand `tests/financial.test.js` and `tests/parity.test.js` to cover all new screens, routes, and financial calculations.
     * Maintain 100% pass rate across all test suites.
  2. **Hermes Bytecode Compilation**:
     * Execute `npx expo export --platform android` to confirm 0 compilation errors across all modules.
  3. **EAS Cloud APK Build**:
     * Trigger fresh Android Preview build:
       `npx eas-cli build --platform android --profile preview --non-interactive`
     * Deliver direct `.apk` download URL and QR installation link to the user.

---

## 3. Work Allocation & Priority Schedule

| Phase | Core Deliverables | Target Screens / Modules | Priority |
|---|---|---|:---:|
| **Phase 1** | Navigation Stacks & Shared Form Components | `CustomerNavigator`, `OwnerNavigator`, `AdminNavigator`, `BottomSheet`, `BankForm` | **P0** |
| **Phase 2** | Customer Feature Parity | `ManageBankAccountsScreen`, `LoyaltyRewardsScreen`, `TicketScreen` (PDF), Reviews | **P1** |
| **Phase 3** | Boat Owner Operations | `OwnerCalendarScreen`, `OwnerRevenueScreen`, `OwnerWalletScreen` (Real Bank), Reviews | **P0** |
| **Phase 4** | Super Admin Consoles | `AdminBookingsScreen`, `AdminRefundsScreen`, `AdminKycScreen`, `AdminSettlementsScreen` | **P0** |
| **Phase 5** | Financial Integrity & Dual Commission | `api.js`, `financial.test.js`, Razorpay reconciliation | **P0** |
| **Phase 6** | E2E QA & EAS Build Generation | Full test suite execution, APK compilation, EAS release | **P0** |

---

## 4. Current State & Next Steps

* **Audit Status**: ✅ Complete.
* **Deliverable Artifacts**:
  1. [JALRIDE_WEBSITE_FEATURE_INVENTORY.md](file:///c:/Users/yogen/Desktop/jalride%20native%20app/JALRIDE_WEBSITE_FEATURE_INVENTORY.md)
  2. [JALRIDE_NATIVE_APP_AUDIT.md](file:///c:/Users/yogen/Desktop/jalride%20native%20app/JALRIDE_NATIVE_APP_AUDIT.md)
  3. [JALRIDE_FEATURE_PARITY_MATRIX.md](file:///c:/Users/yogen/Desktop/jalride%20native%20app/JALRIDE_FEATURE_PARITY_MATRIX.md)
  4. [JALRIDE_BACKEND_DATA_CONSISTENCY_AUDIT.md](file:///c:/Users/yogen/Desktop/jalride%20native%20app/JALRIDE_BACKEND_DATA_CONSISTENCY_AUDIT.md)
  5. [JALRIDE_IMPLEMENTATION_ROADMAP.md](file:///c:/Users/yogen/Desktop/jalride%20native%20app/JALRIDE_IMPLEMENTATION_ROADMAP.md)

* **Strict Safety Compliance**:
  * As commanded, **no application source code has been modified during this audit phase**.
  * Production backend and web codebases remain completely untouched.
  * We are stopped and awaiting your explicit instruction to proceed with Phase 1 of the implementation roadmap.
