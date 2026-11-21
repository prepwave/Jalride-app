# JalRide Website-to-Native-App Feature Parity Matrix

**Platform**: JalRide Water Tourism & Transport Platform  
**Reference Codebase**: `jalride-oauth-final` (Production Web & Express Backend)  
**Target Codebase**: `Jalride-app` (React Native / Expo Native Android/iOS App)  
**Statuses Used**: `COMPLETE` | `PARTIAL` | `MISSING` | `BROKEN` | `NOT APPLICABLE`  
**Priorities**: `P0 (Critical)` | `P1 (High)` | `P2 (Medium)` | `P3 (Low)`  

---

## 1. Customer Experience & Booking Lifecycle Matrix

| Module | Website Page | Website Functionality | Native App Screen | Required Backend Endpoint | Current Status | Missing Functionality | Data Accuracy Status | Priority | Recommended Native Implementation |
|---|---|---|---|---|:---:|---|:---:|:---:|---|
| **Auth** | `register.html` | Account registration (Email, Mobile, Password, Role) | `RegisterScreen.js` | `POST /api/auth/register` | **COMPLETE** | None | Authoritative DB | P0 | Native form with input validation and role selection. |
| **Auth** | `login.html` | User login via email & password | `LoginScreen.js` | `POST /api/auth/login` | **COMPLETE** | None | Authoritative DB | P0 | Native password toggle, secure token storage in AsyncStorage. |
| **Auth** | `google-auth.html` | Google OAuth 2.0 1-tap sign-in | `GoogleSignInButton.js` | `POST /api/auth/google` | **COMPLETE** | None | Authoritative DB | P0 | Integrated Google authentication component. |
| **Auth** | `forgot-password.html` | Request password reset link / OTP | `ForgotPasswordScreen.js` | `POST /api/auth/forgot-password` | **COMPLETE** | None | Authoritative DB | P1 | Native email input with error feedback. |
| **Auth** | `reset-password.html` | Reset password using verified token | `ResetPasswordScreen.js` | `POST /api/auth/reset-password` | **COMPLETE** | None | Authoritative DB | P1 | Native secure password reset form. |
| **Auth** | `verify-email.html` | Verify email address via 6-digit OTP | `OtpVerificationScreen.js` | `POST /api/auth/verify-email` | **COMPLETE** | None | Authoritative DB | P1 | 6-digit cell input with auto-advance and timer countdown. |
| **Discovery** | `index.html` | Landing page, ghat pills, search banner, stats | `HomeScreen.js` | `GET /api/boats`, `GET /api/boats/stats/public` | **COMPLETE** | None | Authoritative DB | P0 | River teal banner, horizontal ghat scroll, live stats counter. |
| **Fleet** | `boats.html` | Full fleet catalog, ghat filter, boat type, price sort | `BoatsScreen.js` | `GET /api/boats` | **COMPLETE** | None | Authoritative DB | P0 | Native `FlatList`, search bar, filter bottom sheet. |
| **Fleet** | `boats.html` (Modal) | Boat specifications, capacity, photos, amenities | `BoatDetailScreen.js` | `GET /api/boats/:id` | **COMPLETE** | None | Authoritative DB | P0 | Swipeable image carousel, safety cards, "Book Ride Now" bar. |
| **Booking** | `booking.html` (Step 1) | Select ride date (7-day window) | `BookingWizardScreen.js` (Step 1) | `GET /api/boats/:id/day?date=...` | **COMPLETE** | None | Local timezone formatted | P0 | Horizontal date picker with weekday and date pills. |
| **Booking** | `booking.html` (Step 2) | Verify boat specs & departure ghat | `BookingWizardScreen.js` (Step 2) | `GET /api/boats/:id` | **COMPLETE** | None | Authoritative DB | P0 | Boarding point card with verified safety badges. |
| **Booking** | `booking.html` (Step 3) | Select real departure slot (`09:30`, `10:30`, etc.) | `BookingWizardScreen.js` (Step 3) | `GET /api/boats/:id/day?date=...` | **COMPLETE** | None | Authoritative DB | P0 | Interactive slot pills, seats remaining counter, expired guard. |
| **Booking** | `booking.html` (Step 4) | Passenger counter & Whole Boat Private Charter | `BookingWizardScreen.js` (Step 4) | Client state + DB bounds | **COMPLETE** | None | Authoritative DB | P0 | Native stepper (`+`/`-`) bounded by capacity, charter toggle. |
| **Booking** | `booking.html` (Step 5) | Apply promotional coupon codes | `BookingWizardScreen.js` (Step 5) | `POST /api/coupons/validate` | **COMPLETE** | None | Authoritative DB | P0 | Code input, uppercase auto-format, backend discount validation. |
| **Booking** | `booking.html` (Step 6) | Honest fare breakdown & payment selection | `BookingWizardScreen.js` (Step 6) | `POST /api/payments/create-order` | **COMPLETE** | None | Authoritative DB | P0 | Base fare, free safety pass, coupon deduction, net payable. |
| **Payment** | `booking.html` | JalRide Wallet Escrow instant checkout | `BookingWizardScreen.js` | `POST /api/payments/create-order` | **COMPLETE** | None | Authoritative DB | P0 | 1-Click zero-gateway checkout when wallet balance $\ge$ total. |
| **Payment** | `booking.html` | Razorpay Online Payment (UPI, Card, Net Banking) | `RazorpayCheckoutModal.js` | `POST /api/payments/verify` | **COMPLETE** | None | Backend HMAC verified | P0 | Native Razorpay SDK sheet with signature verification. |
| **Payment** | `booking.html` | Spot Cash payment directly to captain | `BookingWizardScreen.js` | `POST /api/bookings` | **COMPLETE** | None | Authoritative DB | P0 | Cash on ride booking confirmation with ticket generation. |
| **QR Booking** | `qr-book.html` | Instant Ghat standee QR scanning & spot booking | `QrScanScreen.js` | `GET /api/qr/:boatId/status`, `POST /api/qr/:boatId/book` | **COMPLETE** | None | Authoritative DB | P0 | Real-time `expo-camera` scan, manual standee code input. |
| **Ticket** | `ticket.html` | Digital Boarding Pass with dynamic vector QR code | `TicketScreen.js` | `GET /api/bookings/:id` | **PARTIAL** | Native PDF download / print | Authoritative DB | P1 | Integrate `expo-print` and `expo-sharing` to generate official PDF pass. |
| **Ticket** | `ticket.html` | Pre-departure ride cancellation (100% refund) | `TicketScreen.js` | `PUT /api/bookings/:id/cancel` | **COMPLETE** | None | Authoritative DB | P0 | Confirmation dialog triggering 100% wallet escrow reversal. |
| **Rides** | `customer-dashboard.html` | View active passes and past ride history | `MyRidesScreen.js` | `GET /api/bookings/mine` | **COMPLETE** | None | Authoritative DB | P0 | Tabbed list (`Upcoming Passes` vs `Past Journeys`) with pull-to-refresh. |
| **Review** | `customer-dashboard.html` | Submit post-ride rating (1-5 stars) and review | `MyRidesScreen.js` | `POST /api/reviews` | **MISSING** | Post-ride review modal | Authoritative DB | P1 | Add "Rate Ride" action button opening a review bottom sheet. |
| **Wallet** | `wallet.html` | View wallet balance, cashback, loyalty points | `CustomerWalletScreen.js` | `GET /api/customer/wallet` | **COMPLETE** | None | Authoritative DB | P0 | Dynamic balance card, cashback earned, reward points badge. |
| **Wallet** | `wallet-transactions.html`| Transaction ledger (credits, debits, refunds) | `CustomerWalletScreen.js` | `GET /api/customer/wallet/transactions` | **COMPLETE** | None | Authoritative DB | P0 | Transaction item cards with credit/debit indicators. |
| **Wallet** | `wallet-withdraw.html` | Cash out wallet balance to bank account | None | `POST /api/customer/wallet/withdrawals` | **MISSING** | Withdrawal request modal | Authoritative DB | P1 | Implement "Withdraw Funds" bottom sheet in `CustomerWalletScreen`. |
| **Wallet** | `wallet-payment-methods.html`| Saved bank accounts manager (IFSC, Account Number) | None | `GET/POST /api/customer/bank-accounts` | **MISSING** | Bank account management | Authoritative DB | P1 | Add "Manage Bank Accounts" screen for customer payouts. |
| **Chat** | `messages.html` | In-app messaging between rider and boat captain | `ChatScreen.js` | `GET/POST /api/chat/conversations/:id/messages` | **COMPLETE** | None | Authoritative DB | P1 | Real-time message thread, send bar, auto-scrolling list. |
| **Notifications** | `notification-center.js` | In-app notification alerts and unread badges | `NotificationsScreen.js` | `GET /api/notifications`, `PUT /read-all` | **COMPLETE** | None | Authoritative DB | P1 | Notification list with category icons and mark-all-read. |
| **Privacy** | `privacy-center.html` | DPDP Act 2023: Right to Erasure / Data Scrubbing | `PrivacyDataRightsScreen.js` | `POST /api/privacy/delete-account` | **COMPLETE** | None | Authoritative DB | P1 | Verified account deletion request with reason submission. |
| **Privacy** | `privacy-center.html` | DPDP Act 2023: Export personal data archive | `PrivacyDataRightsScreen.js` | `GET /api/privacy/export` | **COMPLETE** | None | Authoritative DB | P1 | Personal data export requester and compliance disclosures. |
| **Loyalty** | `loyalty.html` | Loyalty tier progression (Bronze, Silver, Gold) | `CustomerWalletScreen.js` | `GET /api/loyalty` | **PARTIAL** | Standalone tier progress screen | Authoritative DB | P2 | Expand loyalty card into a dedicated rewards breakdown view. |

---

## 2. Boat Owner Experience & Operations Matrix

| Module | Website Page | Website Functionality | Native App Screen | Required Backend Endpoint | Current Status | Missing Functionality | Data Accuracy Status | Priority | Recommended Native Implementation |
|---|---|---|---|---|:---:|---|:---:|:---:|---|
| **Dashboard** | `owner-dashboard.html` | Owner KPIs (Today Rides, Active Fleet, Revenue, Wallet) | `OwnerDashboardScreen.js` | `GET /api/owner/dashboard` | **COMPLETE** | None | Authoritative DB | P0 | KPI grid, quick action tiles, live bookings feed. |
| **Fleet** | `owner-boats.html` | List owned boats, active/maintenance toggle | `OwnerFleetScreen.js` | `GET /api/owner/boats` | **COMPLETE** | None | Authoritative DB | P0 | Vessel cards with status badges and add vessel shortcut. |
| **Fleet** | `owner-boats.html` (Form) | Add / edit vessel (specs, pricing, capacity, photos) | `AddEditBoatScreen.js` | `POST/PUT /api/owner/boats` | **COMPLETE** | None | Authoritative DB | P0 | Native form with dual commission preview (online % vs cash %). |
| **Calendar** | `owner-calendar.html` | Weekly recurring departure schedules (slots, capacity) | None | `GET/POST /api/availability/:boatId/recurring` | **MISSING** | Departure slot configuration | Authoritative DB | P0 | **Create `OwnerCalendarScreen.js`**: Interactive weekly slot scheduler. |
| **Calendar** | `owner-calendar.html` | Per-date availability overrides (close dates, limits) | None | `POST /api/availability/:boatId/closed-dates` | **MISSING** | Date overrides & maintenance blocks | Authoritative DB | P0 | Date picker with "Mark Closed" or "Custom Capacity" modal. |
| **Dispatch** | `owner-bookings.html` | Filter bookings by status (`pending`, `confirmed`, etc.)| `OwnerBookingsScreen.js` | `GET /api/owner/bookings` | **COMPLETE** | None | Authoritative DB | P0 | Tabbed filter bar, passenger count, fare and payment method. |
| **Dispatch** | `owner-bookings.html` | Verify passenger ticket QR code | `OwnerBookingsScreen.js` | `POST /api/bookings/verify-ticket` | **COMPLETE** | None | Authoritative DB | P0 | Camera scanner button and manual ticket code verification. |
| **Dispatch** | `owner-bookings.html` | "Start Ride" operation | `OwnerBookingsScreen.js` | `PUT /api/owner/bookings/:id/start-ride` | **COMPLETE** | None | Authoritative DB | P0 | Action button setting status to `ride_started`. |
| **Dispatch** | `owner-bookings.html` | "Complete Ride" operation (releases escrow funds) | `OwnerBookingsScreen.js` | `PUT /api/owner/bookings/:id/complete-ride` | **COMPLETE** | None | Authoritative DB | P0 | Action button completing ride and crediting owner wallet. |
| **Dispatch** | `owner-bookings.html` | "Confirm Cash Received" (recovers commission) | `OwnerBookingsScreen.js` | `PUT /api/owner/bookings/:id/cash-received` | **COMPLETE** | None | Authoritative DB | P0 | Action button recording cash and debiting commission debt. |
| **Revenue** | `owner-revenue.html` | Daily/monthly revenue charts & cash vs online split | None | `GET /api/owner/analytics/dashboard` | **MISSING** | Visual financial analytics | Authoritative DB | P1 | **Create `OwnerRevenueScreen.js`**: Graphical revenue breakdown. |
| **Commission**| `owner-commission.html` | Track platform commission cuts and debt balance | `AddEditBoatScreen.js`, `OwnerWalletScreen.js` | `GET /api/owner/commission/summary` | **COMPLETE** | None | Authoritative DB | P1 | Displays active commission rates (online 10%, cash 12%). |
| **Wallet** | `owner-wallet.html` | Available balance, pending payouts, ledger transactions | `OwnerWalletScreen.js` | `GET /api/owner/wallet` | **COMPLETE** | None | Authoritative DB | P0 | Wallet balance card, earnings summary, recent ledger rows. |
| **Payout** | `owner-withdraw.html` | Submit bank payout request to verified bank account | `OwnerWalletScreen.js` (Sheet) | `POST /api/owner/withdrawals` | **PARTIAL** | Hardcoded bank account string (`SBI ...5821`) | Defect | P0 | Replace hardcoded string with real bank accounts from `/api/owner/bank-accounts`. |
| **Bank** | `owner-settings.html` | Add/manage bank account (IFSC, Account No, Name) | None | `GET/POST /api/owner/bank-accounts` | **MISSING** | Bank account management | Authoritative DB | P1 | Add bank account form in `OwnerWalletScreen` / `OwnerSettingsScreen`. |
| **KYC** | `owner-kyc.html` | Upload Aadhaar, Captain License, Boat Registration | `OwnerKycScreen.js` | `POST /api/kyc/documents` | **COMPLETE** | None | Authoritative DB | P0 | Native document picker (`expo-document-picker`) and status badges. |
| **Standees** | `owner-qr-codes.html` | Generate Ghat Standee posters with live boat QR | `OwnerQrPostersScreen.js` | `GET /api/owner/boats`, `GET /api/owner/qr/my-posters` | **COMPLETE** | None | Authoritative DB | P1 | Vector QR poster, verified fare display, OS share sheet. |
| **Reviews** | `owner-reviews.html` | View passenger feedback and post captain replies | None | `GET /api/reviews/boat/:id` | **MISSING** | Owner review manager | Authoritative DB | P2 | **Create `OwnerReviewsScreen.js`**: List reviews with reply form. |
| **Plans** | `owner-subscription.html` | Subscription plans (Free, Pro, Fleet) and limits | None | `GET /api/subscriptions` | **MISSING** | Tier plans screen | Authoritative DB | P3 | **Create `OwnerSubscriptionScreen.js`**: View subscription benefits. |
| **Support** | `owner-support.html` | Submit dispute tickets regarding commission/rides | None | `POST /api/contact` | **MISSING** | Support ticket screen | Authoritative DB | P2 | Add support ticket modal in `OwnerNavigator`. |

---

## 3. Super Administrator Console & Governance Matrix

| Module | Website Page | Website Functionality | Native App Screen | Required Backend Endpoint | Current Status | Missing Functionality | Data Accuracy Status | Priority | Recommended Native Implementation |
|---|---|---|---|---|:---:|---|:---:|:---:|---|
| **Overview** | `admin-dashboard.html` | Executive KPIs (Gross Value, Commission, GST, Rides) | `AdminDashboardScreen.js` | `GET /api/admin/stats` | **COMPLETE** | None | Authoritative DB | P0 | Real-time calculation from live bookings and revenue stats. |
| **Approvals** | `admin-boats.html` | Fleet approvals queue (inspect permits, approve/reject) | `AdminBoatsScreen.js` | `GET /api/admin/boats`, `PUT /approve`, `PUT /reject` | **COMPLETE** | None | Authoritative DB | P0 | Tabbed vessel list with Approve / Reject / Suspend actions. |
| **Users** | `admin-users.html` | Directory of riders and boat owners (toggle active) | `AdminUsersScreen.js` | `GET /api/admin/users`, `PUT /toggle-active` | **COMPLETE** | None | Authoritative DB | P0 | Searchable account list, role filter pills, status toggles. |
| **Settings** | `admin-settings.html` | Global financial settings (Commission, GST, Hold days) | `AdminSettingsScreen.js` | `GET /api/admin/settings`, `PUT /api/admin/settings` | **COMPLETE** | None | Authoritative DB | P0 | Form with online %, cash %, GST 18%, cashback, hold days. |
| **Bookings** | `admin-bookings.html` | Universal bookings ledger across all riders and boats | None | `GET /api/admin/bookings` | **MISSING** | Platform-wide bookings ledger | Authoritative DB | P1 | **Create `AdminBookingsScreen.js`**: Searchable universal bookings table. |
| **Refunds** | `admin-refunds.html` | Review pending refund requests & execute reversals | None (`Alert.alert` placeholder) | `GET /api/admin/refunds`, `PUT /approve`, `PUT /reject` | **BROKEN** | Dedicated refund authorization queue | Defect (`Alert`) | P0 | **Create `AdminRefundsScreen.js`**: Approve 100% wallet escrow reversals. |
| **KYC Queue**| `admin-kyc.html` | Inspect captain licenses & Aadhaar to approve KYC | None (`Alert.alert` placeholder) | `GET /api/admin/kyc/documents`, `PUT /approve` | **BROKEN** | Dedicated KYC verification queue | Defect (`Alert`) | P0 | **Create `AdminKycScreen.js`**: Document viewer with Approve / Reject actions. |
| **Coupons** | `admin-coupons.html` | Create and manage promotional discount coupons | `AdminSettingsScreen.js` (Form) | `GET /api/admin/coupons`, `POST /api/admin/coupons` | **PARTIAL** | Standalone campaign manager | Authoritative DB | P2 | Enhance coupon management with usage caps and expiry dates. |
| **Payouts** | `admin-settlements.html`| Process owner withdrawal batches with bank UTR tracking | None | `GET /api/admin/withdrawals`, `PUT /approve` | **MISSING** | Owner payout settlement queue | Authoritative DB | P1 | **Create `AdminSettlementsScreen.js`**: Disburse payouts and enter UTR. |
| **Reports** | `admin-reports.html` | Generate date-range financial statements and CSV export | None | `GET /api/admin/analytics`, `GET /export` | **MISSING** | Financial reports & exports | Authoritative DB | P2 | **Create `AdminReportsScreen.js`**: Generate and share financial statements. |
| **Support** | `admin-support.html` | Review and resolve customer & owner support tickets | None | `GET /api/admin/chat/reports` | **MISSING** | Dispute resolution console | Authoritative DB | P2 | Add dispute management interface in `AdminNavigator`. |
