import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { loginWithAppleBackend } from '../services/appleAuthService';
import { useAuth } from '../context/AuthContext';

export function useAppleSignIn() {
  const { signIn } = useAuth();
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Only iOS 13+ with an Apple ID signed in. Android/web → stays false, button hidden.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const appleLogin = async () => {
    if (appleLoading) return; // ignore double taps

    try {
      setAppleLoading(true);

      // Apple gets SHA-256(rawNonce); backend gets rawNonce and re-hashes to compare.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken || !credential.authorizationCode) {
        throw new Error('Apple did not return a sign-in token');
      }

      // Apple only sends the name on the very first sign-in for this Apple ID.
      const fullName =
        [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(' ') || null;

      const backendData = await loginWithAppleBackend({
        identity_token: credential.identityToken,
        authorization_code: credential.authorizationCode,
        raw_nonce: rawNonce,
        full_name: fullName,
      });

      await signIn(backendData.access_token, backendData.refresh_token, {
        ...backendData.user,
        needs_phone_verification: backendData.needs_phone_verification,
      });
    } catch (error: any) {
      // User closed the Apple sheet — not an error.
      if (error?.code === 'ERR_REQUEST_CANCELED') return;

      console.error('Apple Sign-in error:', error);

      const status = error?.response?.status;
      const isNetwork =
        error?.message === 'Network request failed' ||
        error?.message === 'Network Error';

      throw new Error(
        isNetwork
          ? 'Network error. Please check your internet connection.'
          : status === 409
          ? error?.response?.data?.detail ??
            'An account with this email already exists. Sign in with your original method.'
          : status === 401
          ? 'Apple sign-in failed. Please try again.'
          : error?.message || 'Something went wrong while signing in.'
      );
    } finally {
      setAppleLoading(false);
    }
  };

  return {
    appleLogin,
    appleLoading,
    appleAvailable,
  };
}