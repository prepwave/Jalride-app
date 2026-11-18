# JalRide (जलराइड) — True Native Mobile Application

> **A genuine, mobile-first, React Native application for Varanasi riverine & lacustrine boat transit, fleet dispatch, and on-ghat QR boarding.**

---

## 🌟 Overview & Architecture

JalRide Mobile is a **100% True Native React Native application** built with genuine native components (`View`, `Text`, `TouchableOpacity`, `ScrollView`, `FlatList`, `Modal`, `SafeAreaView`, `StatusBar`, native animations, bottom sheets, and native platform navigation).

It strictly replaces any previous WebView or Capacitor wrapper with a clean, touch-first mobile design system specifically crafted for JalRide pilgrims, boat owners (naviks), and platform administrators.

### Core Guarantees:
1. **Zero WebView**: 100% native React Native component architecture.
2. **Complete Feature Parity**: Maps every feature of the JalRide platform across Customer, Boat Owner, and Admin workflows.
3. **Mobile-First UX**: Native bottom tabs, stack transitions, draggable bottom sheets, pull-to-refresh, haptic feedback hooks, and safe-area insets.
4. **Varanasi Ghats Specialization**: Optimized for on-ghat operations across all 84 holy ghats (Assi Ghat, Dashashwamedh, Manikarnika, Namo Ghat, etc.).

---

## 🎨 Mobile Design System

- **Primary River Ink**: `#0a2e36` (Deep river water)
- **Deep Emerald**: `#0e4550`
- **Working Teal**: `#146b79` (Brand identity)
- **Sunrise Marigold**: `#e8963c` (Inspired by Ganga Aarti diyas and garlands)
- **Paper / Mist**: `#f6faf9` / `#dcedec`
- **Dark Mode Surface**: `#0a1e23` / `#12262b`
- **Native Radii**: `radii.s` (8px), `radii.m` (14px), `radii.l` (20px), `radii.full` (9999px)
- **Platform Elevation**: Native Android `elevation` and iOS `shadowColor`/`shadowOffset`/`shadowRadius`

---

## 🧭 Navigation Architecture

```
                    RootNavigator
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
 CustomerNavigator   OwnerNavigator   AdminNavigator
  (Rider Persona)   (Navik Console)  (Super-Admin)
```

### 1. Customer Experience (Rider)
- **Home Tab**: Hero card, Ganga Aarti countdown, quick action grid, Varanasi ghat filter pills, popular boat carousel, safety guarantee badges.
- **Boats Tab**: Real-time boat search, ghat filters, boat categories (Bajra Luxury, Motor Boat, Hand Boat), pricing, seat capacity, pull-to-refresh.
- **Scan QR Tab**: Instant On-Ghat Walk-In Booking (`qr-book.html`). High-contrast viewfinder with animated laser scan line, instant headcount & cash/online selection.
- **My Rides Tab**: Active and past boarding passes, ticket QR display, direct cancellation & 100% refund action.
- **Wallet Tab**: Balance card, Razorpay UPI top-up, bank account withdrawals, filterable transactions ledger, cashback tracking.
- **Stacked Destinations**:
  - `BoatDetailScreen`: Full photo gallery, amenities checklist, captain verification, cancellation policy.
  - `BookingWizardScreen`: The complete 7-step booking wizard (Date → Boat → Time Slot → Headcount → Coupon → Payment & Fare Breakdown → Confirmation).
  - `TicketScreen`: Digital boarding pass with high-contrast live QR code, boarding instructions, and native sharing.
  - `ChatScreen`: Real-time messaging with the boat captain.
  - `ProfileScreen`: Persona switcher, dark/light theme toggle, KYC badge, DPDP compliance.

### 2. Boat Owner Experience (Fleet Console)
- **Dashboard Tab**: Total net earnings, available balance, cash due commissions, today's trips, quick dispatch actions.
- **Fleet Tab**: My vessels, status toggle (`available`, `maintenance`, `booked`), capacity, fares.
- **Dispatch Tab**: Incoming booking lifecycle:
  - `Confirm (स्वीकारें)`: Reserves boat slot.
  - `Hold (पेंडिंग करें)`: Temporary reservation.
  - `Cancel (रद्द करें)`: Reverses earnings & refunds customer wallet 100%.
  - `Mark Cash Received`: Records on-ghat cash collection & tracks platform commission due.
  - `Start Ride` / `Complete Ride`.
- **Wallet Tab**: Earnings withdrawal requests to bank accounts via RazorpayX.
- **Stacked Destinations**:
  - `AddEditBoatScreen`: Register new vessel with photo upload, ghat selection, and amenities.
  - `OwnerKycScreen`: Aadhaar, boat registration, captain license uploads.
  - `OwnerQrPostersScreen`: Print-ready A4 Ghat Standee PDF posters with QR code.

### 3. Administrator Console (Super-Admin)
- **Overview Tab**: Gross booking value, net platform commission (15%), GST pool (18%), daily ride volumes.
- **Fleet Tab**: Platform-wide vessel listing with 1-click Approve / Reject actions.
- **Users Tab**: Directory of Riders & Boat Owners with active/suspend controls and manual email verification.
- **Settings Tab**: Configuration of Global Commission Rate (15%), GST Rate (18%), Admin-funded Cashback Subsidy (10%), Settlement Hold Period (3 days), and active coupons manager.

---

## 🚀 Running the Application

### Prerequisites:
- Node.js (v18+)
- Expo CLI

### Start Development Server:
```bash
# Start Metro bundler
npm run start

# Launch on Android Device / Emulator
npm run android

# Launch on iOS Simulator / Device (via Expo Go)
npm run ios

# Launch in Mobile Web preview
npm run web
```

---

## 🛡️ Business Logic & Financial Integrity

1. **Strict Single Admin**: Sole administrative overseer is `prepwave.pushpendra@gmail.com`.
2. **Financial Split**:
   $$\text{Owner Earning} = \text{Fare} - (\text{Platform Commission} + \text{Commission GST})$$
3. **Cashback Subsidy**: Funded 100% by the Admin platform wallet into customer wallets.
4. **100% Refund Guarantee**: On-cancellation, funds are immediately credited back to the customer's JalRide wallet, while boat owner earnings are reversed atomically.
5. **Cash on Ghat Settlement**: Commission for physical cash payments is tracked as due and auto-deducted from subsequent digital booking payouts.
