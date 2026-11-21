# JalRide Backend Data & Financial Consistency Audit

**Authoritative Backend Service**: `https://jalride-backend.onrender.com/api`  
**Database**: Production MongoDB Atlas Cluster  
**Transaction Isolation**: ACID Multi-Document Transactions (`session.startTransaction()`)  
**Currency Standard**: Indian Rupee (INR / ₹)  
**Timezone Standard**: Indian Standard Time (`Asia/Kolkata`, UTC+5:30)  
**Audit Date**: November 2026  
**Auditor**: Senior Systems Integration & Financial Security Engineer  

---

## 1. Single Source of Truth & Zero-Duplication Architecture

The JalRide platform is engineered around a strict **Single Source of Truth** paradigm:

```
Android Mobile App ──┐
                     ├──> [Production Backend API] ──> [Authoritative MongoDB Database]
Web Application    ──┘
```

### Architectural Principles:
1. **Shared Database & Unified Identity**:
   * The web application and mobile app communicate with the exact same Express API service and MongoDB collections.
   * A user registered on the web can log into the mobile app without re-registration, preserving their name, email, phone, role, wallet balance, and ride history.
2. **Zero Client-Side Financial Authority**:
   * The mobile app must **never** calculate final payable amounts, commission cuts, taxes, or discounts independently.
   * All prices, discounts, and payouts must originate from authoritative backend endpoints (`POST /api/coupons/validate`, `GET /api/boats/:id/day`, `POST /api/bookings`).
3. **Immutability of Historical Snapshots**:
   * When a booking is created, the backend resolves the per-person fare, discount, platform commission, GST, and owner earnings, freezing them permanently onto the `Booking` document.
   * Subsequent updates to global commission rates or boat prices never alter historical booking records.
4. **Zero Fallback / Zero Mock Rule**:
   * Any network failure or authorization rejection must surface a genuine, user-friendly error message (`ErrorState.js` or `Alert`).
   * Never silently swallow API errors to display fabricated bookings, sample bank accounts, or static statistics.

---

## 2. Multi-Tenant Role Isolation & Authorization

### 2.1 Customer Data Isolation
* **Access Boundary**: Customers can only access their own bookings, tickets, wallet ledger, and notifications.
* **Enforcement**:
  * In `bookingController.js`:
    ```javascript
    const bookings = await Booking.find({ customer: req.user._id }).sort({ createdAt: -1 });
    ```
  * In `customerWalletController.js`:
    ```javascript
    const wallet = await CustomerWallet.findOne({ user: req.user._id });
    ```
* **Mobile Verification**: The mobile app correctly passes the JWT bearer token (`Authorization: Bearer <token>`) in all customer API requests, ensuring strict database isolation.

### 2.2 Boat Owner Fleet & Dispatch Isolation
* **Access Boundary**: Boat owners can only view and dispatch bookings for vessels registered under their account (`boat.owner === req.user._id`).
* **Enforcement**:
  * In `ownerController.js`:
    ```javascript
    const ownedBoats = await Boat.find({ owner: req.user._id }).select("_id");
    const bookings = await Booking.find({ boat: { $in: ownedBoats } }).sort({ createdAt: -1 });
    ```
* **Mobile Verification**: The mobile app correctly segregates owner views (`OwnerNavigator`), preventing owners from accessing other operators' bookings or revenue.

### 2.3 Super Administrator Gate
* **Access Boundary**: Global platform statistics, vessel approvals, user directory status, refund authorizations, and settlement processing are strictly restricted to the authorized administrative email.
* **Enforcement**:
  * In `authMiddleware.js`:
    ```javascript
    if (req.user.role !== 'admin' || req.user.email.toLowerCase() !== 'prepwave.pushpendra@gmail.com') {
      throw new ApiError(403, "Access restricted to authorized platform administrator");
    }
    ```
  * In Mobile `RootNavigator.js`:
    ```javascript
    const isAuthorizedAdmin = user.role === 'admin' && user.email?.toLowerCase().trim() === 'prepwave.pushpendra@gmail.com';
    ```

---

## 3. Financial Calculation Rules & Formulas

### 3.1 Customer Fare & Zero Convenience Fee Standard
* **Base Fare Calculation**:
  $$\text{Gross Fare} = \begin{cases} 
  \text{boat.wholeBoatPrice} & \text{if Whole Boat Charter} \\ 
  \text{effectivePrice} \times \text{passengers} & \text{if Shared Seats} 
  \end{cases}$$
* **Platform Convenience Fee**:
  * In `bookingController.js`, lines 248–250:
    ```javascript
    convenienceFee: 0,
    platformFeeMode: "free",
    platformFeeValue: 0,
    ```
  * The platform charges ₹0 convenience fee. Any client attempt to inject an extra booking fee is an audit violation.
* **Coupon Discount**:
  * Evaluated server-side via `POST /api/coupons/validate`.
  * Net Amount Payable:
    $$\text{Amount Payable} = \max(0, \text{Gross Fare} - \text{Discount Amount})$$

### 3.2 Dual Commission Architecture (Online vs Cash-on-Ride)
* **Standard Global Rates**:
  * **Online Gateway Payment Commission**: 10% (Default rate configured in `PlatformSettings`)
  * **Cash on Ride Spot Payment Commission**: 12% (Compensates for collection overhead and risk)
* **Commission Math**:
  $$\text{Platform Commission} = \text{Fare After Discount} \times \left(\frac{\text{Commission Rate}}{100}\right)$$
  $$\text{GST Collected (18\%)} = \text{Platform Commission} \times 0.18$$
  $$\text{Owner Net Earnings} = \text{Fare After Discount} - \text{Platform Commission}$$
* **Commission Reconciliation**:
  * **Online Payments**: The platform collects 100% upfront through Razorpay/Wallet escrow. Upon ride completion, the platform retains its commission and releases `ownerEarningAmount` to the owner's wallet escrow.
  * **Cash-on-Ride**: The rider pays 100% cash directly to the boat captain at boarding. Upon marking "Confirm Cash Received", the platform debits `platformCommissionAmount` from the owner's wallet balance as recovered commission debt.

### 3.3 100% Wallet Escrow Cancellation & Refund Rules
* **Customer Protection Guarantee**:
  * When a customer cancels a booking prior to departure (`PUT /api/bookings/:id/cancel`), the backend executes an atomic transaction:
    ```javascript
    booking.bookingStatus = "cancelled";
    booking.paymentStatus = "refunded";
    await customerWallet.credit(booking.amount, `100% refund for cancelled ride ${booking.ticketId}`);
    ```
  * Exactly 100% of the paid amount is credited back to the customer's JalRide wallet balance immediately.
  * No cancellation penalty is deducted for pre-departure cancellations.

---

## 4. Date, Timezone & Concurrency Handling

### 4.1 Timezone Standard (`Asia/Kolkata`)
* All boat departure slots operate on Indian Standard Time (`UTC+5:30`).
* **Resolved Date Invariant**:
  * When resolving departure slots via `GET /api/boats/:id/day?date=YYYY-MM-DD`, the date string must represent the local calendar date in Varanasi.
  * In `BookingWizardScreen.js`, the local date formatter:
    ```javascript
    function formatLocalDate(d) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    ```
    prevents UTC midnight rollback where a local date of `Nov 20` could become `2026-11-19T18:30:00Z`.

### 4.2 Booking Slot Concurrency & Overbooking Guard
* The backend enforces ACID transactions using `SlotSeatLock` and `Booking.session(session)`:
  * In `bookingController.js`:
    ```javascript
    const seatsBooked = await seatsBookedForSlot(Booking, boat._id, bookingDate, bookingTime, session);
    const seatsRemaining = capacity - seatsBooked;
    if (count > seatsRemaining) {
      throw new ApiError(409, "Those seats were just booked by someone else — please pick another slot");
    }
    ```
  * If two concurrent riders attempt to reserve the last 2 seats on the `09:30` departure, only the first transaction commits; the second receives HTTP 409 Conflict with a clear seat availability explanation.

---

## 5. API Response Contracts & Payload Schemas

### 5.1 Public Boat Response (`GET /api/boats/:id`)
```json
{
  "success": true,
  "boat": {
    "_id": "6af1b5cf8c33fe65b94fd699",
    "boatName": "Jalpari",
    "boatType": "Motor Boat",
    "location": "Dashashwamedh Ghat",
    "capacity": 30,
    "price": 499,
    "allowWholeBoatBooking": true,
    "wholeBoatPrice": 12500,
    "approvalStatus": "approved",
    "status": "active",
    "averageRating": 4.7,
    "totalReviews": 11,
    "images": ["https://images.unsplash.com/..."]
  }
}
```

### 5.2 Real-Time Day Availability (`GET /api/boats/:id/day?date=2026-11-20`)
```json
{
  "success": true,
  "date": "2026-11-20",
  "status": "open",
  "slots": [
    { "time": "09:30", "seatsRemaining": 30, "price": 499, "isExpired": false, "bookable": true },
    { "time": "10:30", "seatsRemaining": 30, "price": 499, "isExpired": false, "bookable": true },
    { "time": "12:30", "seatsRemaining": 30, "price": 499, "isExpired": false, "bookable": true },
    { "time": "16:20", "seatsRemaining": 30, "price": 499, "isExpired": false, "bookable": true },
    { "time": "18:20", "seatsRemaining": 29, "price": 499, "isExpired": false, "bookable": true }
  ]
}
```

### 5.3 Authoritative Coupon Validation (`POST /api/coupons/validate`)
* **Request Payload**:
  ```json
  { "code": "JALRIDE100", "bookingAmount": 499 }
  ```
* **Authoritative Response**:
  ```json
  {
    "success": true,
    "valid": true,
    "code": "JALRIDE100",
    "discountAmount": 100,
    "finalAmount": 399,
    "message": "Coupon applied! Saved ₹100"
  }
  ```

---

## 6. Audit Violations & Prohibitions Enforced

1. **NO Mock Data in Mobile Source**:
   * Removed all static arrays (`MOCK_BOATS`, `MOCK_SLOTS`, `MOCK_BOOKINGS`, `MOCK_WALLET`, `MOCK_ADMIN_STATS`).
   * Retained only geographic ghat labels (`MOCK_GHATS`) for station discovery pills.
2. **NO Hardcoded Bank Accounts**:
   * Flagged `const [bankAccount, setBankAccount] = useState('SBI - A/C No. ...5821');` in `OwnerWalletScreen.js` for remediation.
3. **NO Simulated Payments in Production**:
   * Removed `Math.random()` fake payment IDs (`pay_...`) and fake signature generators from `RazorpayCheckoutModal.js`.
4. **NO Alert Placeholders for Core Admin Consoles**:
   * Replaced `Alert.alert('Refunds Queue', ...)` and `Alert.alert('KYC Audit Queue', ...)` requirements with dedicated native console screens.
