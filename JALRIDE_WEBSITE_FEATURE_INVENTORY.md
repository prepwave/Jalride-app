# JalRide Website Feature Inventory & Architecture Specification

**Application**: JalRide Global Smart Boat Booking Platform  
**Target Reference**: Production Web Application (`jalride-main` / `jalride-oauth-final`)  
**Backend Framework**: Node.js / Express.js / MongoDB (Mongoose ODM) / Socket.IO  
**Audit Date**: November 2026  
**Auditor**: Senior React Native Architect & Full-Stack Systems Auditor  

---

## 1. Executive Architecture Overview

The JalRide website is a production-grade water tourism and transport booking platform engineered for rivers, lakes, and waterways globally, with initial operational deployment across Varanasi Ganga Ghats.

### Architecture Stack
* **Frontend Web**: Semantic HTML5, CSS3 (Custom Design System with responsive grid, glassmorphism, and river teal `#0a2e36` branding), Vanilla ES6+ JavaScript modules, Leaflet maps, Socket.IO client, Razorpay Checkout SDK.
* **Backend API**: RESTful Express.js service hosted at `https://jalride-backend.onrender.com/api` (with local staging at `http://localhost:5000/api`).
* **Authoritative Database**: MongoDB Atlas cluster with ACID multi-document transactions for booking concurrency and wallet escrow accounting.
* **Authentication**: JWT (JSON Web Tokens in HttpOnly cookies / Authorization Bearer headers), PBKDF2/bcrypt password hashing, Google OAuth 2.0 (`google-auth.html`), and OTP email verification.
* **Regulatory Compliance**: Digital Personal Data Protection Act (DPDP Act 2023), Indian Inland Vessels Act safety protocols, GST Council 18% tax regulations, and RBI escrow settlement guidelines.

---

## 2. Customer Role: Complete Website Feature Inventory

### 2.1 Public Discovery & Landing Page (`index.html`, `js/main.js`)
* **Hero Search Engine**: Location dropdown (84 holy ghats / worldwide lakes & waterways), ride date picker, passenger counter, boat type filter (Bajra, Motor Boat, Hand Boat, Luxury Cruiser).
* **Live Ghat Standee Quick-Action**: Floating "Scan Ghat QR" shortcut that opens `qr-book.html` for instant dockside boarding.
* **Popular Experiences & Sacred Aarti Highlights**: Fast-booking cards for high-demand experiences (Subah-e-Banaras Sunrise, Evening Ganga Aarti Prime Bajra).
* **Social Proof & Live Stats Counter**: Dynamic platform stats fetched from `GET /api/boats/stats/public` (Verified Vessels, Active Captains, Covered Ghats, Average Rating).
* **Explore by Boarding Ghat**: Quick-filter pills across major stations (Assi Ghat, Dashashwamedh Ghat, Manikarnika Ghat, Namo Ghat, Harishchandra Ghat).
* **Footer Disclosures & Governance**: DPDP Grievance Officer details, terms of service, privacy policy, contact inquiry form.

### 2.2 Fleet Discovery & Filter Catalog (`boats.html`, `js/boats.js`)
* **Dynamic Vessel Grid**: Paginated fleet listings fetched from `GET /api/boats`.
* **Multi-Parameter Filter Toolbar**:
  * Filter by Boarding Ghat / Station location.
  * Filter by Vessel Type (`motor_boat`, `bajra`, `hand_boat`, `luxury_cruiser`, `speed_boat`).
  * Price range slider (Min ₹100 – Max ₹10,000).
  * Sort options: "Price: Low to High", "Price: High to Low", "Top Rated", "Capacity".
  * Safety & Inspection Badges: "Govt Certified", "Equipped with Life Jackets", "Verified Captain".
* **Interactive Vessel Cards**: High-res vessel photography, per-seat base price, whole-boat charter pricing flag, passenger capacity, star rating, and direct "Book Ride" navigation.

### 2.3 Comprehensive 7-Step Booking Engine (`booking.html`, `js/booking-flow.js`)
* **Step 1: Ride Date Selection**: 7-day forward date picker with day-of-week and date strings.
* **Step 2: Vessel & Boarding Location Confirmation**: Display chosen vessel details, departure ghat, captain profile, and verified inspection status.
* **Step 3: Real-Time Departure Slot Selection**:
  * Real-time availability check via `GET /api/boats/:id/day?date=YYYY-MM-DD`.
  * Displays per-slot departure times (e.g. `09:30`, `10:30`, `12:30`, `16:20`, `18:20`).
  * Shows dynamic seats remaining per slot.
  * Auto-disables departed slots (`isExpired: true`) and fully booked slots (`seatsRemaining === 0`).
* **Step 4: Passenger Count & Private Charter Option**:
  * Individual seat counter (`passengers` parameter) with upper bound enforced by `seatsRemaining`.
  * Whole Boat Private Charter toggle (`charterType: 'whole_boat'`): reserves all capacity for a fixed lump-sum price (`boat.wholeBoatPrice`).
* **Step 5: Promotional Coupon Validation**:
  * Coupon input field evaluated against authoritative backend endpoint `POST /api/coupons/validate`.
  * Real-time calculation of discount amounts and minimum booking amount rules.
* **Step 6: Fare Breakdown & Multi-Modal Payment Gateway**:
  * Authoritative fare breakdown: `Base Fare`, `Govt Inland Navigation Safety Pass (Free)`, `Coupon Discount (-₹X)`, and `Total Payable Amount`.
  * Zero client convenience fees (`mode: 'free'`, value ₹0).
  * Payment Method Selection:
    1. **JalRide Wallet Escrow**: Instant 1-click checkout with available wallet balance (`POST /api/payments/create-order` with `useWalletBalance: true`).
    2. **Razorpay Online Gateway**: UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking via native Razorpay Checkout (`POST /api/payments/create-order` -> `POST /api/payments/verify`).
    3. **Cash on Ride**: Spot payment directly to the boat captain at boarding (`paymentMethod: 'cash'`).
* **Step 7: Instant Boarding Pass Generation**: Confirmation screen with Booking Reference ID (`JAL-B...`), digital ticket link, and boarding guidance.

### 2.4 Instant Ghat Dockside QR Booking (`qr-book.html`, `js/qr-book.js`)
* **URL Parameter Resolution**: Resolves vessel identity from URL query `?boat=...` or scanned standee token.
* **Live Vessel Status Verification**: `GET /api/qr/:boatId/status` checks if the vessel is currently docked, active, and taking spot riders.
* **Express Boarding Checkout**: Instant creation of booking pass via `POST /api/qr/:boatId/book`.

### 2.5 Digital Ticket & Boarding Pass (`ticket.html`, `js/ticket.js`)
* **Cryptographic QR Pass**: Vector QR encoding ticket verification payload (`JALRIDE:TICKET:<ticketId>:<bookingId>`).
* **Boarding Information**: Vessel name, captain contact phone, departure ghat, scheduled date and departure time slot, seat count.
* **Status Badges**: `confirmed`, `ride_started`, `completed`, `cancelled`.
* **Print & PDF Export**: Client-side ticket printing and PDF boarding pass generation.
* **100% Wallet Escrow Cancellation**:
  * Pre-departure cancellation button invoking `PUT /api/bookings/:id/cancel`.
  * Guarantees 100% immediate refund back to the customer's JalRide Wallet.

### 2.6 Customer Account, Rides & Wallet Hub (`customer-dashboard.html`, `js/customer-dashboard.js`)
* **My Bookings Ledger**: Tabbed view of Active/Upcoming Passes and Completed Ride History.
* **Live Ride Chat**: In-app messaging shortcut with the assigned boat captain (`messages.html`).
* **Post-Ride Ratings & Reviews**: Modal to submit 1-to-5 star ratings and written reviews (`POST /api/reviews`).
* **Customer Wallet Hub (`wallet.html`, `wallet-transactions.html`, `wallet-withdraw.html`, `wallet-refunds.html`)**:
  * Real-time balance display (`GET /api/customer/wallet`).
  * Total lifetime cashback earned and loyalty reward points.
  * Comprehensive transaction history (credits, debits, refunds, promo rewards).
  * 100% Escrow Refund Tracking: audit trail of cancellations and reversal entries.
  * Wallet Top-Up: Razorpay integration to pre-fund wallet balance (`POST /api/customer/wallet/topup/create-order`).
  * Bank Withdrawal: Request cash-out of wallet balance to bank account (`POST /api/customer/wallet/withdrawals`).
  * Saved Bank Accounts: Manage beneficiary account number and IFSC (`GET/POST /api/customer/bank-accounts`).

### 2.7 In-App Captain Chat (`messages.html`, `js/chat.js`)
* **Booking-Scoped Messaging**: Chat sessions tied to specific active bookings (`POST /api/chat/conversations/booking/:bookingId`).
* **Real-Time Communication**: Socket.IO bi-directional text message delivery and unread count tracking.
* **Safety & Moderation**: User blocking and dispute reporting (`POST /api/chat/conversations/:id/report`).

### 2.8 Loyalty & Referrals Hub (`loyalty.html`, `js/loyalty.js`)
* **Tier Tracking**: Bronze, Silver, Gold status progression.
* **Points Ledger**: Points earned per ride and points redemption rules (`POST /api/loyalty/redeem`).
* **Referral System**: Unique referral code sharing and bonus credits.

### 2.9 Privacy Center & DPDP Compliance (`privacy-center.html`, `privacy.html`)
* **Data Subject Rights**: Download personal data archive (`GET /api/privacy/export`).
* **Right to Erasure**: Submit verified account deletion and data scrubbing request (`POST /api/privacy/delete-account`).
* **Grievance Redressal**: Contact details of Data Protection Officer and compliance audit log.

---

## 3. Boat Owner Role: Complete Website Feature Inventory

### 3.1 Owner Executive Dashboard (`owner-dashboard.html`, `js/owner-overview.js`)
* **KPI Metrics**: Today's Rides, Active Vessels, Gross Revenue, Wallet Escrow Balance, Pending Dispatch Queue.
* **Action Center**: Quick-access shortcuts to Add Vessel, Dispatch Bookings, Scan Rider Ticket, and Request Payout.
* **Recent Ride Activity**: Live feed of incoming customer reservations.

### 3.2 Fleet Management & Vessel CRUD (`owner-boats.html`, `js/owner-boats.js`)
* **Fleet Directory**: List all vessels owned by the authenticated owner (`GET /api/owner/boats`).
* **Vessel Registration Form**: Add new boat with name, type, registration license number, base ghat location, passenger capacity, per-seat fare, whole-boat charter fare.
* **Vessel Image Management**: Upload vessel photos and manage image galleries.
* **Operational Mode Toggle**: Put vessel into "Active" or "Under Maintenance" status.
* **Custom Commission Configuration**: View and configure online payment vs cash-on-ride commission rates.

### 3.3 Dynamic Availability & Departure Calendar (`owner-calendar.html`, `js/owner-calendar.js`)
* **Interactive Visual Calendar**: Month/week calendar view of scheduled departures and booking load.
* **Weekly Recurring Schedules (`POST /api/availability/:boatId/recurring`)**:
  * Set default departure slots for specific weekdays (e.g., Monday to Sunday: `09:30`, `10:30`, `12:30`, `16:20`, `18:20`).
  * Configure custom capacity per schedule.
* **Per-Date Overrides (`POST /api/availability/:boatId/closed-dates`)**:
  * Block specific dates for weather, maintenance, or private events (`status: "closed"`).
  * Date-specific price overrides and booking limits.

### 3.4 Dispatch Operations & Passenger Verification (`owner-bookings.html`, `js/owner-bookings.js`)
* **Booking Operational Queue**: Real-time list of bookings filtered by status (`pending`, `confirmed`, `ride_started`, `completed`, `cancelled`).
* **Live QR Ticket Verification**: Web camera QR scanner and manual ticket code input verifying passenger boarding passes via `POST /api/bookings/verify-ticket`.
* **Ride Lifecycle Dispatch Controls**:
  * "Start Ride" (`PUT /api/owner/bookings/:id/start-ride`): Marks ride in-progress.
  * "Complete Ride" (`PUT /api/owner/bookings/:id/complete-ride`): Marks ride fulfilled and credits owner net earnings to wallet escrow.
  * "Cash Received Confirmation" (`PUT /api/owner/bookings/:id/cash-received`): Records spot cash collection and debits platform commission debt.
  * "No-Show / Cancel": Marks rider absence.

### 3.5 Revenue, Analytics & Financial Settlements (`owner-revenue.html`, `owner-commission.html`, `owner-settlement.html`, `owner-wallet.html`, `owner-withdraw.html`)
* **Revenue Breakdown**: Daily and monthly earnings charts (`GET /api/owner/analytics/dashboard`).
* **Cash vs Online Reconciliation**: Separation of online escrow earnings vs direct cash-on-ride collections.
* **Commission Debt Tracker**: Tracking retained platform commission and automatic recovery from owner wallet escrow.
* **Owner Escrow Wallet Ledger**: Available balance, pending payouts, transaction history (`GET /api/owner/wallet`).
* **Bank Withdrawal Request**: Submit payout request specifying bank account, IFSC code, and withdrawal amount (`POST /api/owner/withdrawals`).
* **Settlement Invoices**: Download settlement receipts and tax invoices.

### 3.6 Vessel Documents & KYC Compliance (`owner-kyc.html`, `owner-documents.html`, `js/owner-kyc.js`)
* **Captain License Verification**: Upload master captain license and certificates (`POST /api/kyc/documents`).
* **Aadhaar Identity Proof**: Secure document upload for government ID verification.
* **Vessel Safety Certificates**: Upload vessel fitness permit, inland waterway navigation certificate, and third-party insurance.
* **Audit Status**: Real-time badge tracking (`pending`, `approved`, `rejected`).

### 3.7 Live Boat Standee QR Posters (`owner-qr-codes.html`, `js/owner-qr-codes.js`)
* **Ghat Standee Generator**: Live preview of high-resolution dockside posters for each boat.
* **Printable PDF Export**: Direct PDF download (`GET /api/owner/qr/poster/:boatId/pdf`) formatted for physical standee printing at Varanasi ghats.
* **Instant Boarding Standee Toggle**: Enable or disable express dockside booking.

### 3.8 Reviews, Subscriptions & Support (`owner-reviews.html`, `owner-subscription.html`, `owner-support.html`)
* **Customer Review Manager**: View passenger feedback, star ratings, and post captain replies.
* **Owner Subscription Plans**: Free, Pro, and Fleet subscription tiers with feature limits.
* **Support Ticket Center**: Create disputes regarding commissions, rider behavior, or technical issues.

---

## 4. Admin Role: Complete Website Feature Inventory

### 4.1 Super Administrator Console (`admin-dashboard.html`, `js/admin-overview.js`)
* **Executive Platform KPIs**: Platform Gross Booking Value, Retained Platform Commission, GST Pool Collected (18%), Today's Total Rides.
* **Actionable Alert Badges**: Pending Boat Approvals, Pending Refund Authorizations, Pending KYC Submissions.
* **Consoles Navigation**: Direct routing to Fleet, Users, Bookings, Finance, and Campaigns.

### 4.2 Fleet Oversight & Vessel Moderation (`admin-boats.html`, `js/admin-boats.js`)
* **Universal Fleet Directory**: View every boat registered on the platform (`GET /api/admin/boats`).
* **Safety Inspection Queue**: Inspect uploaded vessel fitness certificates and insurance policies.
* **Moderation Actions**: Approve vessel (`PUT /api/admin/boats/:id/approve`), reject vessel with reason (`PUT /api/admin/boats/:id/reject`), or suspend vessel.
* **Vessel Commission Override**: Set custom commission rates per vessel.

### 4.3 User & Owner Directory (`admin-users.html`, `admin-owners.html`, `js/admin-users.js`)
* **Account Ledger**: Directory of all registered riders, boat owners, and administrators (`GET /api/admin/users`).
* **Account Controls**: Toggle active/suspended state (`PUT /api/admin/users/:id/toggle-active`), verify email, promote/demote roles.
* **Owner Fleet Audit**: Inspect all boats and revenue metrics associated with a specific owner account.

### 4.4 Universal Bookings Ledger (`admin-bookings.html`, `js/admin-bookings.js`)
* **Global Booking Ledger**: Complete searchable audit trail of every booking on the platform (`GET /api/admin/bookings`).
* **Search & Filters**: Search by Booking ID, Ticket ID, Customer Name, Boat Name, or Date.
* **Administrative Override**: Force cancel booking (`PUT /api/admin/bookings/:id/cancel`) or re-assign departure slots.

### 4.5 Payment & Revenue Reconciliation (`admin-payments.html`, `js/admin-payments.js`)
* **Transaction Audit**: Real-time ledger of Razorpay payment transactions (`GET /api/admin/payments`).
* **Gateway Reconciliation**: Match gateway order IDs against MongoDB booking records.

### 4.6 100% Escrow Refund Management (`admin-refunds.html`, `js/admin-refunds.js`)
* **Refund Authorization Queue**: List all pending cancellation refund requests (`GET /api/admin/refunds`).
* **Approve Refund (`PUT /api/admin/refunds/:id/approve`)**: Executes 100% wallet escrow reversal back to the rider's wallet.
* **Reject Refund (`PUT /api/admin/refunds/:id/reject`)**: Declines refund with mandatory audit justification.

### 4.7 Commission, GST & Platform Settings (`admin-settings.html`, `admin-commission.html`, `js/admin-settings.js`)
* **Commission Rate Rules**: Configure global default commission rate (default 15%), online payment rate (10%), and cash-on-ride rate (12%).
* **Taxation Pool**: Enforce statutory 18% GST calculation on platform commission.
* **Financial Guardrails**: Configure platform convenience fee mode, cashback percentage, and payout hold periods (default 3 days).

### 4.8 Owner Settlements & Payout Disbursements (`admin-settlements.html`, `js/admin-settlements.js`)
* **Withdrawal Requests Queue**: View pending bank payout requests from boat owners (`GET /api/admin/withdrawals`).
* **Approve & Settle Payout**: Mark payout as disbursed with bank UTR transaction reference (`PUT /api/admin/withdrawals/:id/approve`).

### 4.9 KYC Verification Center (`admin-kyc.html`, `js/admin-kyc.js`)
* **Document Audit Queue**: Review captain licenses and Aadhaar cards (`GET /api/admin/kyc/documents`).
* **Verification Decision**: Approve or reject KYC documents with audit log tracking (`PUT /api/admin/kyc/documents/:id/approve`).

### 4.10 Promotional Coupons & Marketing Campaigns (`admin-coupons.html`, `admin-campaigns.html`, `js/admin-coupons.js`)
* **Coupon Creator**: Create discount codes with percentage or flat deduction, minimum booking value, expiration date, and usage caps (`POST /api/admin/coupons`).
* **Promotional Banners**: Manage festival marketing banners and announcements.

### 4.11 Analytics, Audit Reports & Exports (`admin-analytics.html`, `admin-reports.html`)
* **Platform Charts**: Revenue growth, ride frequency, popular boarding ghats, cancellation ratios.
* **Financial Export**: Export CSV financial reports and tax summaries for accounting.

### 4.12 Platform Support & Dispute Resolution (`admin-support.html`)
* **Customer & Owner Inquiries**: Ticket management for ride disputes, payment issues, or safety complaints.

---

## 5. Website Backend API Inventory & Route Mapping

| HTTP Method | Route Endpoint | Purpose / Functional Capability | Website Caller |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new customer or boat owner | `register.html` |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | `login.html` |
| `POST` | `/api/auth/google` | Google OAuth token verification | `google-auth.html` |
| `POST` | `/api/auth/forgot-password` | Send password reset link / OTP | `forgot-password.html` |
| `POST` | `/api/auth/reset-password` | Confirm new password with reset token | `reset-password.html` |
| `GET` | `/api/boats` | Public fleet discovery with filters & sorting | `boats.html`, `index.html` |
| `GET` | `/api/boats/stats/public` | Public counters (boats, ghats, ratings) | `index.html` |
| `GET` | `/api/boats/:id` | Single boat profile & specifications | `booking.html`, `boats.html` |
| `GET` | `/api/boats/:id/day?date=...` | Live departure slots & seat availability | `booking.html`, `availability.html` |
| `POST` | `/api/coupons/validate` | Authoritative promo code verification | `booking.html` |
| `POST` | `/api/bookings` | Create new ride booking reservation | `booking.html` |
| `POST` | `/api/payments/create-order` | Create Razorpay order or wallet checkout | `booking.html` |
| `POST` | `/api/payments/verify` | Verify Razorpay HMAC-SHA256 signature | `booking.html` |
| `GET` | `/api/bookings/mine` | Customer booking history & passes | `customer-dashboard.html` |
| `GET` | `/api/bookings/:id` | Retrieve single booking details & ticket | `ticket.html` |
| `PUT` | `/api/bookings/:id/cancel` | Cancel ride with 100% wallet refund | `ticket.html`, `customer-dashboard.html` |
| `POST` | `/api/bookings/verify-ticket` | Verify digital ticket QR code | `owner-bookings.html` |
| `GET` | `/api/customer/wallet` | Customer escrow wallet balance & points | `wallet.html` |
| `GET` | `/api/customer/wallet/transactions` | Full ledger of wallet transactions | `wallet-transactions.html` |
| `POST` | `/api/customer/wallet/withdrawals` | Submit customer wallet withdrawal | `wallet-withdraw.html` |
| `GET` | `/api/customer/bank-accounts` | List saved bank accounts for payout | `wallet-payment-methods.html` |
| `POST` | `/api/customer/bank-accounts` | Add new bank account (IFSC & Acc No) | `wallet-payment-methods.html` |
| `GET` | `/api/notifications` | In-app user notifications | `notification-center.js` |
| `PUT` | `/api/notifications/read-all` | Mark all notifications as read | `notification-center.js` |
| `POST` | `/api/chat/conversations/booking/:id` | Open or get booking chat room | `messages.html` |
| `GET` | `/api/chat/conversations/:id/messages`| Fetch chat history for booking | `messages.html` |
| `POST` | `/api/chat/conversations/:id/messages`| Send chat message to captain/rider | `messages.html` |
| `GET` | `/api/privacy/export` | Export customer personal data (DPDP) | `privacy-center.html` |
| `POST` | `/api/privacy/delete-account` | Request account erasure (DPDP) | `privacy-center.html` |
| `GET` | `/api/owner/dashboard` | Owner KPIs and ride summaries | `owner-dashboard.html` |
| `GET` | `/api/owner/boats` | List all owner vessels | `owner-boats.html` |
| `POST` | `/api/owner/boats` | Register a new boat | `owner-boats.html` |
| `PUT` | `/api/owner/boats/:id` | Update boat specifications & rates | `owner-boats.html` |
| `GET` | `/api/owner/bookings` | List all bookings for owner fleet | `owner-bookings.html` |
| `PUT` | `/api/owner/bookings/:id/start-ride` | Dispatch & mark ride in-progress | `owner-bookings.html` |
| `PUT` | `/api/owner/bookings/:id/complete-ride`| Complete ride & release escrow | `owner-bookings.html` |
| `PUT` | `/api/owner/bookings/:id/cash-received`| Record spot cash & commission debt | `owner-bookings.html` |
| `GET` | `/api/owner/wallet` | Owner wallet balance & earnings | `owner-wallet.html` |
| `POST` | `/api/owner/withdrawals` | Submit bank withdrawal request | `owner-withdraw.html` |
| `POST` | `/api/kyc/documents` | Upload Aadhaar & Captain license | `owner-kyc.html` |
| `GET` | `/api/kyc/documents/mine` | View owner KYC verification status | `owner-kyc.html` |
| `GET` | `/api/owner/qr/my-posters` | Fetch boat standee poster QR codes | `owner-qr-codes.html` |
| `GET` | `/api/owner/analytics/dashboard` | Financial analytics & charts | `owner-revenue.html` |
| `GET` | `/api/availability/:boatId/calendar` | Monthly departure availability | `owner-calendar.html` |
| `GET` | `/api/availability/:boatId/recurring`| Weekly recurring departure schedules| `owner-calendar.html` |
| `POST` | `/api/availability/:boatId/closed-dates`| Add date overrides / closed blocks | `owner-calendar.html` |
| `GET` | `/api/admin/stats` | Super admin core KPI statistics | `admin-dashboard.html` |
| `GET` | `/api/admin/boats` | Complete vessel directory | `admin-boats.html` |
| `PUT` | `/api/admin/boats/:id/approve` | Approve vessel for public booking | `admin-boats.html` |
| `PUT` | `/api/admin/boats/:id/reject` | Reject vessel with reason | `admin-boats.html` |
| `GET` | `/api/admin/users` | All registered users & roles | `admin-users.html` |
| `PUT` | `/api/admin/users/:id/toggle-active` | Suspend or activate user | `admin-users.html` |
| `GET` | `/api/admin/bookings` | Universal booking ledger | `admin-bookings.html` |
| `GET` | `/api/admin/payments` | Razorpay payment logs | `admin-payments.html` |
| `GET` | `/api/admin/refunds` | Pending refund requests queue | `admin-refunds.html` |
| `PUT` | `/api/admin/refunds/:id/approve` | Authorize 100% wallet refund | `admin-refunds.html` |
| `PUT` | `/api/admin/refunds/:id/reject` | Reject refund request | `admin-refunds.html` |
| `GET` | `/api/admin/settings` | Platform financial settings | `admin-settings.html` |
| `PUT` | `/api/admin/settings` | Update commission, GST, hold days | `admin-settings.html` |
| `GET` | `/api/admin/coupons` | List platform promotional coupons | `admin-coupons.html` |
| `POST` | `/api/admin/coupons` | Create new promotional coupon | `admin-coupons.html` |
| `GET` | `/api/admin/withdrawals` | Pending owner withdrawal requests | `admin-settlements.html` |
| `PUT` | `/api/admin/withdrawals/:id/approve`| Mark owner payout as settled (UTR) | `admin-settlements.html` |
| `GET` | `/api/admin/kyc/documents` | Review queue for owner KYC | `admin-kyc.html` |
| `PUT` | `/api/admin/kyc/documents/:id/approve`| Approve owner KYC | `admin-kyc.html` |
| `PUT` | `/api/admin/kyc/documents/:id/reject` | Reject owner KYC | `admin-kyc.html` |
