# JalRide Native Mobile App: Android & iOS Build Verification Report

**Application**: JalRide (जलराइड)  
**Package / Bundle ID**: `com.jalride.app`  
**Expo SDK**: 58.0.0 (React Native 0.88.1, React 19.3.0, Hermes Engine)  
**Target Platforms**: Android (APK/AAB) & iOS (IPA)  
**Build Status**: **ANDROID APK SUCCESSFULLY GENERATED / AVAILABLE FOR PHYSICAL DEVICE TESTING**  

---

## 1. Platform Compilation & Verification Summary

| Verification Step | Target Artifact | Modules / File | Status | Evidence / Artifact Link |
|---|---|:---:|:---:|---|
| **Android Standalone APK** | Direct Installable `.apk` | `L8rjFHZcuYaocIopTf7uDWuHiEqiSDIxE4DDrfvmRx8.apk` | **SUCCESS** | [Direct APK Download](https://expo.dev/artifacts/eas/L8rjFHZcuYaocIopTf7uDWuHiEqiSDIxE4DDrfvmRx8.apk) |
| **EAS Cloud Build** | Build ID `044e73a0-d355-4651-b54d-5e3a0a4233ac` | Android (`preview` profile) | **FINISHED** | [Live EAS Build Logs](https://expo.dev/accounts/prepwave/projects/jalride-app/builds/044e73a0-d355-4651-b54d-5e3a0a4233ac) |
| **Android Local Prebuild** | Native `./android` CNG generation | All | **PASS** | `√ Finished prebuild` (Exit code 0) |
| **Android JS Bytecode** | Hermes Bytecode Bundle | 1,233 modules | **PASS** | Exit Code 0 |
| **iOS JS Bytecode** | Hermes Bytecode Bundle | 1,237 modules | **PASS** | Exit Code 0 |
| **Automated Test Suite** | 7 suites / 12 sub-suites | 31 tests | **PASS** | 31/31 tests passing (100%) |
| **Production AAB** | Google Play Store (`app-bundle`) | Production Profile | **CONFIGURED** | Pinned to Node 22 & latest image in `eas.json` |

---

## 2. Official EAS Production Build Record

```text
Build ID:                 044e73a0-d355-4651-b54d-5e3a0a4233ac
Account:                  prepwave
Project:                  jalride-app
Platform:                 Android
Status:                   finished
Profile:                  preview (Internal Distribution APK)
SDK Version:              58.0.0
Version:                  1.0.0
Version Code:             1
Commit:                   cf7bcd1ea744af130462504e7699fee794408f3f
Fingerprint:              98a1e1465701b161affe1afb48f8c6070943a5f6
Build Started:            19/11/2026, 9:12:27 am IST
Build Finished:           19/11/2026, 9:28:16 am IST
Duration:                 15 minutes 49 seconds
Application Archive URL:  https://expo.dev/artifacts/eas/L8rjFHZcuYaocIopTf7uDWuHiEqiSDIxE4DDrfvmRx8.apk
EAS Build Page:           https://expo.dev/accounts/prepwave/projects/jalride-app/builds/044e73a0-d355-4651-b54d-5e3a0a4233ac
```

---

## 3. Failure Remediation Summary (Build `5c824dd9` -> `044e73a0`)

1. **POSIX Shell Binary Resolution (`sh: 1: expo: not found`)**:
   - Fixed by prefixing all package scripts with `npx expo` so isolated POSIX builder containers locate the local CLI properly.
2. **Missing Native Peer Dependency (`expo-font`)**:
   - Explicitly installed and declared `"expo-font": "~58.0.12"` required by `@expo/vector-icons` for native font linking.
3. **Expo SDK 58 Dependency Alignment**:
   - Aligned `@react-native-async-storage/async-storage` to `2.2.0` and `expo` to `~58.0.26` to satisfy `expo-doctor` integrity validation.
4. **Build Worker Environment Pinning**:
   - Configured `"node": "22.23.1"` and `"image": "latest"` in `eas.json` to ensure the builder image matches Expo SDK 58 engine requirements.
5. **Deterministic Lockfile**:
   - Cleanly regenerated `package-lock.json` with `npm@12.0.1`, guaranteeing identical dependency trees on EAS.

---

## 4. Physical Android Device Installation Instructions

1. **Option A: Direct Download on Physical Android Device**
   - Open Chrome / browser on your Android smartphone.
   - Navigate to: `https://expo.dev/artifacts/eas/L8rjFHZcuYaocIopTf7uDWuHiEqiSDIxE4DDrfvmRx8.apk`
   - Download the APK and tap to install (enable "Install unknown apps" from browser if prompted).

2. **Option B: Scan via Expo Web Page**
   - Open: `https://expo.dev/accounts/prepwave/projects/jalride-app/builds/044e73a0-d355-4651-b54d-5e3a0a4233ac`
   - Scan the on-screen QR code with your mobile camera or barcode scanner.

3. **Option C: Install via ADB (USB Debugging)**
   ```bash
   adb install -r jalride-app.apk
   ```

---

## 5. Native Hardware & Feature Modules Active in APK

The generated APK contains 100% genuine native React Native modules:
* **Camera & Barcode Scanner**: `expo-camera` (`CameraView`) — live scanning for Varanasi ghat standees and digital tickets.
* **Vector QR Code Engine**: `react-native-qrcode-svg` + `react-native-svg` — dynamic ticket generation.
* **Official Website Brand Logo**: Vector SVG mark extracted from official website (`#0a2e36` background, `#e8963c` hull, `#146b79` sail).
* **Payment Gateway**: `react-native-razorpay` — native checkout sheet in Test Mode (`rzp_test_TtJPr253lYWQ3q`).
* **Document Picker & Sharing**: `expo-document-picker` + `expo-sharing` — KYC document uploads and standee PDF exports.
* **Backend Connection**: Connected to live production backend `https://jalride-backend.onrender.com/api`.
* **Zero WebView**: 0 WebViews or iframes used throughout the application.
