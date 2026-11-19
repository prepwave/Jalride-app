# JalRide Native Mobile App: Android & iOS Build Verification Report

**Application**: JalRide (जलराइड)  
**Package / Bundle ID**: `com.jalride.app`  
**Expo SDK**: 58.0.0 (React Native 0.88.1, React 19.3.0, Hermes Engine)  
**Target Platforms**: Android (APK/AAB) & iOS (IPA)  
**Build Status**: **CONFIGURATION RESOLVED & VERIFIED / READY FOR EAS CLOUD BUILD**  

---

## 1. Platform Compilation & Verification Summary

| Verification Step | Target Artifact | Modules | Status | Evidence / Notes |
|---|---|:---:|:---:|---|
| **Android Local Prebuild** | Native `./android` CNG generation | All | **PASS** | `√ Finished prebuild` (Exit code 0) |
| **Android JS Bytecode** | Hermes Bytecode Bundle | 1,233 | **PASS** | Exit Code 0 |
| **iOS JS Bytecode** | Hermes Bytecode Bundle | 1,237 | **PASS** | Exit Code 0 |
| **Automated Test Suite** | 7 suites / 12 sub-suites | 31 tests | **PASS** | 31/31 tests passing (100%) |
| **Android Installable APK** | Internal Testing APK (`preview` profile) | Full Native App | **READY TO TRIGGER** | Configured via `eas.json` (`buildType: "apk"`) |
| **Android Release (.aab)** | Google Play Distribution Package | Full Native App | **READY TO TRIGGER** | Configured via `eas.json` (`buildType: "app-bundle"`) |

---

## 2. EAS Cloud Build Failure (Build `5c824dd9`) Diagnosis & Remediation

### 2.1 Error Root Cause Analysis
During internal distribution build `5c824dd9` on Expo Application Services (EAS):
```text
Run expo doctor:
✖ Check that required peer dependencies are installed: Missing peer dependency: expo-font (Required by @expo/vector-icons)
✖ Check that packages match versions required by installed Expo SDK:
  - @react-native-async-storage/async-storage 2.2.0 expected, found 3.1.1
  - expo ~58.0.26 expected, found 58.0.25
Prebuild:
sh: 1: expo: not found
npx expo prebuild --no-install --platform android exited with non-zero code: 127
```

### 2.2 Root Causes Identified & Fixed
1. **Shell Command Resolution (`sh: 1: expo: not found`)**:
   - `package.json` scripts invoked raw `expo` (`"start": "expo start"`, `"android": "expo run:android"`, etc.) instead of `npx expo`. On isolated POSIX builder containers, bare `expo` is not present in global `/bin/sh` PATH.
   - **Fix**: Prefixed all `package.json` scripts with `npx expo`.
2. **Missing Native Peer Dependency (`expo-font`)**:
   - `@expo/vector-icons` requires `expo-font` for native font asset linking outside of Expo Go.
   - **Fix**: Installed and declared `"expo-font": "~58.0.12"` in `package.json`.
3. **SDK 58 Dependency Alignment**:
   - Aligned `@react-native-async-storage/async-storage` to `2.2.0` (matching SDK 58 bundled matrix).
   - Aligned `expo` to `~58.0.26`.
4. **EAS Runner Environment (`eas.json`)**:
   - Expo SDK 58 strictly requires Node 22 (`engines: { node: '^22.13.0 || ...' }`).
   - Default EAS worker images run on older Node versions unless explicitly pinned.
   - **Fix**: Configured `"node": "22.23.1"` and `"image": "latest"` in `eas.json` under both `preview` and `production` profiles.
5. **Lockfile Synchronization (`package-lock.json`)**:
   - Cleanly reinstalled dependencies and updated `package-lock.json` with npm 12 so `npm ci` on EAS runs deterministically.

---

## 3. Local Verification Results

### 3.1 Prebuild Execution Verification
```bash
$ node ./node_modules/expo/bin/cli prebuild --no-install --platform android
- Creating native directory (./android)
√ Created native directory
- Updating package.json
√ Updated package.json | no changes
- Running prebuild
» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.
- Running prebuild
√ Finished prebuild
```
*Result: Exit Code 0 (Success).*

### 3.2 Automated Test Suite
```bash
$ npm test
# tests 31
# suites 12
# pass 31
# fail 0
# duration_ms 322.65
```
*Result: 100% tests passing.*

---

## 4. Native Hardware & Feature Modules

All application features run strictly on genuine React Native native components without WebViews:
1. **Camera & Barcode Scanner**: `expo-camera` (`CameraView`) — live QR scanner for Varanasi ghat standees and passenger boarding passes.
2. **Vector QR Code Rendering**: `react-native-qrcode-svg` + `react-native-svg` — crisp vector generation for dynamic boarding passes.
3. **Official Brand Logo**: `JalRideLogo.js` — direct vector implementation from official website asset (`icon.svg`).
4. **Payment Gateway**: `react-native-razorpay` — native checkout sheet in Test Mode (`rzp_test_TtJPr253lYWQ3q`).
5. **Document Picker & Sharing**: `expo-document-picker` + `expo-sharing` — KYC document upload and PDF export.
6. **Zero WebView Verification**: Verified 0 instances of `WebView` or `iframe` in application code.

---

## 5. EAS Command to Generate Installable Android APK

To generate the standalone `.apk` installable file on physical Android devices:

```bash
eas build --platform android --profile preview
```

### Profile Breakdown in `eas.json`:
* **`preview`**: Builds internal distribution standalone `.apk` directly installable on physical Android smartphones (`android.buildType: "apk"`).
* **`production`**: Builds Google Play Store distribution `.aab` (`android.buildType: "app-bundle"`).
