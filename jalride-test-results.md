# JalRide Native Mobile App: Automated Test Execution Report

**Execution Date**: November 18, 2026  
**Test Engine**: Node.js Native Test Runner (`node --test tests/**/*.test.js`)  
**Total Suites**: 6  
**Total Tests**: 19  
**Passing**: **19 (100%)**  
**Failing**: **0**  
**Execution Duration**: ~290 ms  

---

## 1. Test Suite Summary Table

| Suite # | Suite Name | Total Tests | Passed | Failed | Status |
|---|---|:---:|:---:|:---:|:---:|
| 1 | Phase 1: Authentication & Strict Single-Admin Security | 5 | 5 | 0 | **PASS** |
| 2 | Phase 2: Payment Integration & Gateway Verification | 4 | 4 | 0 | **PASS** |
| 3 | Phase 3: QR Code Generation & Camera Scan Parsing | 3 | 3 | 0 | **PASS** |
| 4 | Phase 4: Cancellation & Wallet Escrow Refund Rules | 2 | 2 | 0 | **PASS** |
| 5 | Phase 5: Owner Dispatch & Ride State Transitions | 2 | 2 | 0 | **PASS** |
| 6 | Phase 6: Financial Consistency & Split Formula Rules | 3 | 3 | 0 | **PASS** |
| **Total** | **All Verification Suites** | **19** | **19** | **0** | **100% PASS** |

---

## 2. Detailed Test Case Results

### Suite 1: Phase 1: Authentication & Strict Single-Admin Security (`tests/auth.test.js`)
* **Test 1.1**: *Gives admin access ONLY to prepwave.pushpendra@gmail.com with admin role*
  - **Verdict**: **PASS**
  - **Assertion**: `canAccessAdmin({ role: 'admin', email: 'prepwave.pushpendra@gmail.com' }) === true`
* **Test 1.2**: *Denies admin access to imposters with role: admin but different email*
  - **Verdict**: **PASS**
  - **Assertion**: `canAccessAdmin({ role: 'admin', email: 'imposter@jalride.in' }) === false`
* **Test 1.3**: *Denies admin access to legitimate customers with authorized email if role != admin*
  - **Verdict**: **PASS**
  - **Assertion**: `canAccessAdmin({ role: 'customer', email: 'prepwave.pushpendra@gmail.com' }) === false`
* **Test 1.4**: *Prevents unauthorized riders from switching to admin role*
  - **Verdict**: **PASS**
  - **Assertion**: An unprivileged rider cannot mutate session role to `admin`.
* **Test 1.5**: *Initializes session cleanly with user = null when unauthenticated*
  - **Verdict**: **PASS**
  - **Assertion**: Verified no leftover demo user (e.g. Aman Sharma) is preloaded on fresh app boot.

### Suite 2: Phase 2: Payment Integration & Gateway Verification (`tests/payment.test.js`)
* **Test 2.1**: *Verifies payment HMAC signature matches razorpay_order_id and payment_id*
  - **Verdict**: **PASS**
  - **Assertion**: Verifies cryptographic HMAC-SHA256 signature calculation using Razorpay secret.
* **Test 2.2**: *Rejects payment signature when tampered with*
  - **Verdict**: **PASS**
  - **Assertion**: Tampered signature string throws verification failure.
* **Test 2.3**: *Confirms booking immediately if fully paid from wallet escrow without Razorpay order*
  - **Verdict**: **PASS**
  - **Assertion**: `walletBalance >= totalFare` flags `fullyPaidFromWallet: true` and confirms without external gateway call.
* **Test 2.4**: *Splits payment between wallet and Razorpay when wallet has partial balance*
  - **Verdict**: **PASS**
  - **Assertion**: ₹150 wallet deduction + ₹350 Razorpay online order creation for ₹500 total fare.

### Suite 3: Phase 3: QR Code Generation & Camera Scan Parsing (`tests/qr.test.js`)
* **Test 3.1**: *Formats ticket QR payload encoding official ticket verification identifiers*
  - **Verdict**: **PASS**
  - **Assertion**: Ticket payload matches `JALRIDE:TICKET:<ticketId>:<bookingId>`.
* **Test 3.2**: *Parses Ghat Standee URL correctly to extract target boatId for instant boarding*
  - **Verdict**: **PASS**
  - **Assertion**: `https://jalride.in/ride/board?boatId=boat_varanasi_101` parses boatId `boat_varanasi_101`.
* **Test 3.3**: *Rejects malformed QR scan payloads cleanly*
  - **Verdict**: **PASS**
  - **Assertion**: Invalid barcodes return `null` and do not trigger unexpected navigation or crashes.

### Suite 4: Phase 4: Cancellation & Wallet Escrow Refund Rules (`tests/cancellation.test.js`)
* **Test 4.1**: *Guarantees 100% wallet refund on ride cancellation before departure*
  - **Verdict**: **PASS**
  - **Assertion**: Cancelled booking returns 100% refund amount credited to customer's wallet balance.
* **Test 4.2**: *Prevents duplicate cancellation execution via debouncing guard*
  - **Verdict**: **PASS**
  - **Assertion**: Rapid secondary tap while `isCancelling === true` is discarded.

### Suite 5: Phase 5: Owner Dispatch & Ride State Transitions (`tests/owner_dispatch.test.js`)
* **Test 5.1**: *Validates ride lifecycle state machine (pending -> confirmed -> ride_started -> completed)*
  - **Verdict**: **PASS**
  - **Assertion**: Sequential status transitions succeed; invalid backwards transitions fail.
* **Test 5.2**: *Verifies cash-on-ride commission recovery calculation*
  - **Verdict**: **PASS**
  - **Assertion**: Cash collected ₹800 yields platform commission deduction of ₹80 (10%) from owner pending balance.

### Suite 6: Phase 6: Financial Consistency & Split Formula Rules (`tests/financial.test.js`)
* **Test 6.1**: *Removes unauthorized ₹20 convenience fee in fare calculation*
  - **Verdict**: **PASS**
  - **Assertion**: Base fare ₹600 + GST ₹30 = Total ₹630 (no client ₹20 surcharge).
* **Test 6.2**: *Verifies backend financial split: Owner Earning = Fare - (Commission + GST)*
  - **Verdict**: **PASS**
  - **Assertion**: Fare ₹1000, 10% commission ₹100, 18% GST on commission ₹18. Owner receives ₹882.
* **Test 6.3**: *Verifies Admin Settings payload keys match backend editable schema*
  - **Verdict**: **PASS**
  - **Assertion**: Payload keys match backend: `defaultCommissionRate`, `commissionGstRate`, `payoutHoldDays`, `minWithdrawAmount`, `cashbackPercent`.

---

## 3. Raw TAP Output
```
TAP version 13
# Subtest: Phase 1: Authentication & Strict Single-Admin Security
    ok 1 - Gives admin access ONLY to prepwave.pushpendra@gmail.com with admin role
    ok 2 - Denies admin access to imposters with role: admin but different email
    ok 3 - Denies admin access to legitimate customers with authorized email if role != admin
    ok 4 - Prevents unauthorized riders from switching to admin role
    ok 5 - Initializes session cleanly with user = null when unauthenticated
ok 1 - Phase 1: Authentication & Strict Single-Admin Security
# Subtest: Phase 4: Cancellation & Wallet Escrow Refund Rules
    ok 1 - Guarantees 100% wallet refund on ride cancellation before departure
    ok 2 - Prevents duplicate cancellation execution via debouncing guard
ok 2 - Phase 4: Cancellation & Wallet Escrow Refund Rules
# Subtest: Phase 6: Financial Consistency & Split Formula Rules
    ok 1 - Removes unauthorized ₹20 convenience fee in fare calculation
    ok 2 - Verifies backend financial split: Owner Earning = Fare - (Commission + GST)
    ok 3 - Verifies Admin Settings payload keys match backend editable schema
ok 3 - Phase 6: Financial Consistency & Split Formula Rules
# Subtest: Phase 5: Owner Dispatch & Ride State Transitions
    ok 1 - Validates ride lifecycle state machine (pending -> confirmed -> ride_started -> completed)
    ok 2 - Verifies cash-on-ride commission recovery calculation
ok 4 - Phase 5: Owner Dispatch & Ride State Transitions
# Subtest: Phase 2: Payment Integration & Gateway Verification
    ok 1 - Verifies payment HMAC signature matches razorpay_order_id and payment_id
    ok 2 - Rejects payment signature when tampered with
    ok 3 - Confirms booking immediately if fully paid from wallet escrow without Razorpay order
    ok 4 - Splits payment between wallet and Razorpay when wallet has partial balance
ok 5 - Phase 2: Payment Integration & Gateway Verification
# Subtest: Phase 3: QR Code Generation & Camera Scan Parsing
    ok 1 - Formats ticket QR payload encoding official ticket verification identifiers
    ok 2 - Parses Ghat Standee URL correctly to extract target boatId for instant boarding
    ok 3 - Rejects malformed QR scan payloads cleanly
ok 6 - Phase 3: QR Code Generation & Camera Scan Parsing
1..6
# tests 19
# suites 6
# pass 19
# fail 0
```
