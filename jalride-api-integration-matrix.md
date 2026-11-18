# JalRide Native Mobile App: 53 Backend API Integration Matrix

**Target Backend**: `https://jalride-backend.onrender.com/api`  
**Client Service**: `src/services/api.js`  
**Audit Reference**: `jalride-functional-audit-report.md`  
**Status**: 53 / 53 Backend Endpoints Fully Integrated & Verified

---

## Complete API Integration Matrix

| # | Endpoint URL | Method | Auth / Role | Backend Controller | RN Client Method (`src/services/api.js`) | Invoking UI Screen | Status |
|---|---|---|---|---|---|---|---|
| 1 | `/auth/register` | POST | Public | `authController.register` | `api.register()` | `RegisterScreen.js` | **FULL** |
| 2 | `/auth/login` | POST | Public | `authController.login` | `api.login()` | `LoginScreen.js` | **FULL** |
| 3 | `/auth/me` | GET | Authenticated | `authController.getMe` | `api.getCurrentUser()` | `AuthContext.js` | **FULL** |
| 4 | `/auth/forgot-password` | POST | Public | `authController.forgotPassword` | `api.forgotPassword()` | `ForgotPasswordScreen.js` | **FULL** |
| 5 | `/auth/reset-password` | POST | Public | `authController.resetPassword` | `api.resetPassword()` | `ResetPasswordScreen.js` | **FULL** |
| 6 | `/auth/logout` | POST | Authenticated | `authController.logout` | `api.logout()` | `AuthContext.js` | **FULL** |
| 7 | `/boats` | GET | Public | `boatController.getAllBoats` | `api.getBoats()` | `HomeScreen.js`, `BoatsScreen.js` | **FULL** |
| 8 | `/boats/:id` | GET | Public | `boatController.getBoatById` | `api.getBoat()` | `BoatDetailScreen.js` | **FULL** |
| 9 | `/boats` | POST | Owner / Admin | `boatController.createBoat` | `api.createBoat()` | `AddEditBoatScreen.js` | **FULL** |
| 10 | `/boats/:id` | PUT | Owner / Admin | `boatController.updateBoat` | `api.updateBoat()` | `AddEditBoatScreen.js` | **FULL** |
| 11 | `/boats/:id` | DELETE | Owner / Admin | `boatController.deleteBoat` | `api.deleteBoat()` | `OwnerDashboardScreen.js` | **FULL** |
| 12 | `/bookings` | POST | Customer | `bookingController.createBooking` | `api.createBooking()` | `BookingWizardScreen.js` | **FULL** |
| 13 | `/bookings/my` | GET | Customer | `bookingController.getMyBookings` | `api.getMyBookings()` | `MyRidesScreen.js` | **FULL** |
| 14 | `/bookings/:id` | GET | Authenticated | `bookingController.getBookingById` | `api.getBooking()` | `TicketScreen.js` | **FULL** |
| 15 | `/bookings/:id/cancel` | PUT | Customer | `bookingController.cancelBooking` | `api.cancelBooking()` | `TicketScreen.js` | **FULL** |
| 16 | `/bookings/verify-ticket` | POST | Owner / Admin | `bookingController.verifyTicket` | `api.verifyTicket()` | `QrScanScreen.js` | **FULL** |
| 17 | `/bookings/:id/qr` | GET | Authenticated | `bookingController.getBookingQr` | `api.getBookingQr()` | `TicketScreen.js` | **FULL** |
| 18 | `/payments/create-order` | POST | Customer | `paymentController.createOrder` | `api.createPaymentOrder()` | `BookingWizardScreen.js` | **FULL** |
| 19 | `/payments/verify` | POST | Customer | `paymentController.verifyPayment` | `api.verifyPayment()` | `BookingWizardScreen.js` | **FULL** |
| 20 | `/customer/wallet` | GET | Customer | `customerWalletController.getWallet` | `api.getCustomerWallet()` | `CustomerWalletScreen.js` | **FULL** |
| 21 | `/customer/wallet/topup/create-order` | POST | Customer | `customerWalletController.createTopupOrder` | `api.createWalletTopupOrder()` | `CustomerWalletScreen.js` | **FULL** |
| 22 | `/customer/wallet/topup/verify` | POST | Customer | `customerWalletController.verifyTopup` | `api.verifyWalletTopup()` | `CustomerWalletScreen.js` | **FULL** |
| 23 | `/customer/wallet/transactions` | GET | Customer | `customerWalletController.getTransactions` | `api.getCustomerWalletTransactions()` | `CustomerWalletScreen.js` | **FULL** |
| 24 | `/owner/wallet` | GET | Owner | `ownerWalletController.getWallet` | `api.getOwnerWallet()` | `OwnerWalletScreen.js` | **FULL** |
| 25 | `/owner/wallet/withdraw` | POST | Owner | `ownerWalletController.requestWithdrawal` | `api.requestOwnerWithdrawal()` | `OwnerWalletScreen.js` | **FULL** |
| 26 | `/owner/wallet/transactions` | GET | Owner | `ownerWalletController.getTransactions` | `api.getOwnerWalletTransactions()` | `OwnerWalletScreen.js` | **FULL** |
| 27 | `/owner/bookings` | GET | Owner | `ownerDispatchController.getOwnerBookings` | `api.getOwnerBookings()` | `OwnerDashboardScreen.js` | **FULL** |
| 28 | `/owner/bookings/:id/status` | PUT | Owner | `ownerDispatchController.updateBookingStatus` | `api.updateBookingStatus()` | `OwnerRidesScreen.js` | **FULL** |
| 29 | `/owner/analytics` | GET | Owner | `ownerDispatchController.getOwnerAnalytics` | `api.getOwnerAnalytics()` | `OwnerDashboardScreen.js` | **FULL** |
| 30 | `/owner/cash-commission/settle` | POST | Owner | `ownerDispatchController.settleCashCommission` | `api.settleCashCommission()` | `OwnerWalletScreen.js` | **FULL** |
| 31 | `/kyc/documents` | POST | Owner | `kycController.uploadDocument` | `api.uploadKycDocument()` | `OwnerKycScreen.js` | **FULL** |
| 32 | `/kyc/documents/mine` | GET | Owner | `kycController.getMyDocuments` | `api.getMyKycDocuments()` | `OwnerKycScreen.js` | **FULL** |
| 33 | `/kyc/documents/user/:userId` | GET | Admin | `kycController.getDocumentsByUser` | `api.getUserKycDocuments()` | `AdminUsersScreen.js` | **FULL** |
| 34 | `/kyc/documents/:id/status` | PATCH | Admin | `kycController.updateDocumentStatus` | `api.updateKycStatus()` | `AdminUsersScreen.js` | **FULL** |
| 35 | `/qr/:boatId/standee` | GET | Owner / Public | `qrController.getStandee` | `api.getStandee()` | `OwnerQrPostersScreen.js` | **FULL** |
| 36 | `/qr/:boatId/status` | GET | Public | `qrController.getBoatStatus` | `api.getBoatQrStatus()` | `QrScanScreen.js` | **FULL** |
| 37 | `/qr/verify` | GET | Authenticated | `qrController.verifyQr` | `api.verifyQr()` | `QrScanScreen.js` | **FULL** |
| 38 | `/admin/dashboard` | GET | Admin | `adminController.getDashboardStats` | `api.getAdminDashboard()` | `AdminDashboardScreen.js` | **FULL** |
| 39 | `/admin/boats` | GET | Admin | `adminController.getAllBoats` | `api.getAdminBoats()` | `AdminBoatsScreen.js` | **FULL** |
| 40 | `/admin/boats/:id/approve` | POST | Admin | `adminController.approveBoat` | `api.approveBoat()` | `AdminBoatsScreen.js` | **FULL** |
| 41 | `/admin/boats/:id/reject` | POST | Admin | `adminController.rejectBoat` | `api.rejectBoat()` | `AdminBoatsScreen.js` | **FULL** |
| 42 | `/admin/users` | GET | Admin | `adminController.getUsers` | `api.getAdminUsers()` | `AdminUsersScreen.js` | **FULL** |
| 43 | `/admin/users/:id/toggle-active` | PATCH | Admin | `adminController.toggleUserActive` | `api.toggleUserActive()` | `AdminUsersScreen.js` | **FULL** |
| 44 | `/admin/users/:id/verify-email` | PATCH | Admin | `adminController.verifyUserEmail` | `api.verifyUserEmail()` | `AdminUsersScreen.js` | **FULL** |
| 45 | `/admin/bookings` | GET | Admin | `adminController.getBookings` | `api.getAdminBookings()` | `AdminBookingsScreen.js` | **FULL** |
| 46 | `/admin/settlements` | GET | Admin | `adminController.getSettlements` | `api.getAdminSettlements()` | `AdminSettlementsScreen.js` | **FULL** |
| 47 | `/admin/settlements/:id/process` | POST | Admin | `adminController.processSettlement` | `api.processAdminSettlement()` | `AdminSettlementsScreen.js` | **FULL** |
| 48 | `/admin/settings` | GET | Admin | `adminController.getPlatformSettings` | `api.getAdminSettings()` | `AdminSettingsScreen.js` | **FULL** |
| 49 | `/admin/settings` | PUT | Admin | `adminController.updatePlatformSettings` | `api.updateAdminSettings()` | `AdminSettingsScreen.js` | **FULL** |
| 50 | `/admin/coupons` | GET | Admin | `adminController.getCoupons` | `api.getAdminCoupons()` | `AdminSettingsScreen.js` | **FULL** |
| 51 | `/admin/coupons` | POST | Admin | `adminController.createCoupon` | `api.createAdminCoupon()` | `AdminSettingsScreen.js` | **FULL** |
| 52 | `/admin/coupons/:id` | DELETE | Admin | `adminController.deleteCoupon` | `api.deleteAdminCoupon()` | `AdminSettingsScreen.js` | **FULL** |
| 53 | `/admin/audit-logs` | GET | Admin | `adminController.getAuditLogs` | `api.getAdminAuditLogs()` | `AdminDashboardScreen.js` | **FULL** |

---

## Integration Highlights & Protocol Guarantees

1. **Bearer JWT Token Injected Automatically**: All authenticated endpoints automatically receive `Authorization: Bearer <token>` through the unified `api.js` client request pipeline.
2. **Error Normalization**: Network or backend errors are normalized into human-readable messages (`err.message`) consumed directly by screen error states and alerts.
3. **Multipart Form Upload**: `api.uploadKycDocument` correctly builds native `FormData` with URI, filename, and MIME type to avoid corrupting document uploads on mobile.
4. **Backend Verification First**: No client transaction (payment, refund, KYC, boat status) is presumed successful until the backend returns HTTP 200/201 with verified confirmation data.
