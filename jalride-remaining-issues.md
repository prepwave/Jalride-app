# JalRide Native Mobile App: Remaining Operational Blockers & Launch Checklist

**Application**: JalRide (जलराइड) - True Native Mobile Application  
**Current Code Status**: **0 Code Deficiencies / 31 Automated Tests Passed (100%)**  
**Android APK Status**: **GENERATED & VERIFIED (`preview` profile)**  
**Final Verdict**: **READY FOR PHYSICAL ON-SITE BETA TESTING**  

---

## 1. Technical Audit Defect Status

All functional defects, security vulnerabilities, missing APIs, and UI/UX issues identified during the comprehensive functional audit have been **100% resolved** in branch `feature/native-production-completion`.

| Priority Tier | Initial Audit Defects | Remediated in Code | Remaining Code Defects |
|:---:|:---:|:---:|:---:|
| **P0 (Critical / Blockers)** | 12 | 12 | **0** |
| **P1 (High / Operational)** | 18 | 18 | **0** |
| **P2 (Medium / Enhancements)** | 14 | 14 | **0** |
| **Total** | **44** | **44** | **0** |

---

## 2. Release & Distribution Status

### Item 1: Standalone Installable Android APK
* **Status**: **RESOLVED / AVAILABLE**
* **Build ID**: `044e73a0-d355-4651-b54d-5e3a0a4233ac`
* **Direct APK Download**: [L8rjFHZcuYaocIopTf7uDWuHiEqiSDIxE4DDrfvmRx8.apk](https://expo.dev/artifacts/eas/L8rjFHZcuYaocIopTf7uDWuHiEqiSDIxE4DDrfvmRx8.apk)
* **EAS Build Page**: [Expo Build 044e73a0](https://expo.dev/accounts/prepwave/projects/jalride-app/builds/044e73a0-d355-4651-b54d-5e3a0a4233ac)
* **Resolution**: Resolved EAS prebuild exit code 127 by fixing POSIX shell command resolution, installing `expo-font`, aligning SDK 58 package versions, and configuring Node 22 runner in `eas.json`.

### Item 2: Apple Developer Program Provisioning (iOS Release)
* **Condition**: Apple Developer Team ID and distribution certificates are managed within the Apple Developer Portal and cannot be generated autonomously without account credentials.
* **Impact**: Final release `.ipa` requires automated or manual signing with an Apple Distribution Certificate.
* **Resolution Action**: Release engineer connects Apple ID during `eas build --platform ios`.

### Item 3: Physical Ghat Device & Hardware Field Testing
* **Condition**: Physical installation on Android device at Varanasi ghats.
* **Impact**: Field validation of camera focus on worn standee posters and GPS accuracy under high river embankment walls.
* **Resolution Action**: Install the generated `.apk` directly onto physical Android phones at Dashashwamedh Ghat and Assi Ghat.

---

## 3. Store Release Engineering Checklist

### 3.1 Backend Production Environment Variables (Render Dashboard)
* Switch `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on `https://jalride-backend.onrender.com` from test mode (`rzp_test_...`) to live mode (`rzp_live_...`).
* Confirm `ADMIN_EMAIL=prepwave.pushpendra@gmail.com` is present in Render environment variables.

### 3.2 Google Play Store Submission
1. Register `com.jalride.app` in Google Play Console.
2. Complete Data Safety form:
   * Location: Approximate & Precise (ghat navigation).
   * Camera: Ticket QR scanning.
   * Personal Info: Name, Phone, Email (account & booking).
3. Privacy policy URL: `https://jalride.in/privacy`.
4. Run `eas build --platform android --profile production` to generate Play Store release `.aab`.

### 3.3 Apple App Store Submission
1. Register Bundle ID `com.jalride.app` in App Store Connect.
2. Complete App Privacy Nutrition Label matching `Info.plist` usage descriptions.
3. Run `eas build --platform ios --profile production` to upload `.ipa`.
