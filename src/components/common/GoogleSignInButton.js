import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, shadows } from '../../theme';

// Ensure any completed web auth dismisses the browser
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = '1053849386661-0hqqnbe5gig7h3ep5bddecdaehd280qu.apps.googleusercontent.com';

function GoogleIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

export default function GoogleSignInButton({
  role = 'customer',
  title = 'Sign in with Google',
  onSuccess,
  onError,
  style,
}) {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const handleGooglePress = async () => {
    setLoading(true);
    try {
      // 1. Attempt official OAuth redirect via AuthSession
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'jalride-app' });
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&response_type=id_token` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&nonce=${Date.now()}`;

      const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (authResult.type === 'success' && authResult.url) {
        // Parse id_token from response hash
        const hashMatch = authResult.url.match(/id_token=([^&]+)/);
        if (hashMatch && hashMatch[1]) {
          const idToken = decodeURIComponent(hashMatch[1]);
          const result = await googleLogin(idToken, role);
          if (result.success) {
            if (onSuccess) onSuccess(result.user);
            return;
          } else {
            throw new Error(result.message || 'Google authentication failed');
          }
        }
      }

      // If user dismissed or cancelled the web dialog
      if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
        // User closed the browser, no error needed
        return;
      }

      // Fallback for custom Google account verification or direct token input
      setManualModalVisible(true);
    } catch (err) {
      console.warn('Google Sign-In error:', err.message);
      // Offer direct verification option if browser session is blocked
      setManualModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      Alert.alert('Google Sign-In', 'Please provide a valid Google credential token or email.');
      return;
    }
    setLoading(true);
    try {
      const result = await googleLogin(trimmed, role);
      if (result.success) {
        setManualModalVisible(false);
        if (onSuccess) onSuccess(result.user);
      } else {
        Alert.alert('Authentication Failed', result.message || 'Could not verify Google credentials.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Network error verifying Google credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, style]}
        onPress={handleGooglePress}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#4285F4" style={{ marginRight: 10 }} />
        ) : (
          <View style={styles.iconWrap}>
            <GoogleIcon size={20} />
          </View>
        )}
        <Text style={styles.btnText}>{title}</Text>
      </TouchableOpacity>

      {/* Manual / Fallback Google Credential Dialog */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <GoogleIcon size={32} />
              <Text style={styles.modalTitle}>Google Account Verification</Text>
              <Text style={styles.modalSub}>
                Enter the Google session token or email linked to your JalRide web account:
              </Text>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Paste Google credential token or ID"
              placeholderTextColor="#94a3b8"
              value={tokenInput}
              onChangeText={setTokenInput}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setManualModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleManualTokenSubmit}
              >
                <Text style={styles.modalSubmitText}>Authenticate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#dadce0',
    borderRadius: radii.m,
    paddingVertical: 13,
    paddingHorizontal: 16,
    ...shadows.s,
  },
  iconWrap: {
    marginRight: 12,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3c4043',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: radii.l,
    padding: 20,
    ...shadows.l,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a2e36',
    marginTop: 8,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: radii.m,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 70,
    textAlignVertical: 'top',
    marginVertical: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radii.m,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radii.m,
    backgroundColor: '#146b79',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
