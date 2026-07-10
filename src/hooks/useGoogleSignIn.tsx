import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';
import { loginWithGoogleBackend } from '../services/googleAuthService';
import { useAuth } from '../context/AuthContext';

let isConfigured = false;

function getDeviceId() {
  return `${Platform.OS}-google-login`;
}

export function useGoogleSignIn() {
  const { signIn } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      GoogleSignin.configure({
        webClientId: GOOGLE_AUTH_CONFIG.webClientId,
      });
      isConfigured = true;
    }
  }, []);

  const googleLogin = async () => {
    try {
      setGoogleLoading(true);

      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();

      const idToken =
        (signInResult as any)?.data?.idToken ||
        (signInResult as any)?.idToken;

      if (!idToken) {
        throw new Error('Google idToken not returned');
      }

      const backendData = await loginWithGoogleBackend({
        id_token: idToken,
        device_id: getDeviceId(),
      });

      await signIn(
        backendData.access_token,
        backendData.refresh_token,
        backendData.user ?? null
      );
    } catch (error: any) {
      // Cases handled silently inside the hook — not surfaced as errors.
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            return; // user backed out, no error
          case statusCodes.IN_PROGRESS:
            return; // already in progress
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            // rethrow with a clear message so the screen can toast it
            throw new Error(
              'Google Play Services is unavailable or outdated on this device.'
            );
        }
      }

      console.error('Google Sign-in error:', error);

      // Normalise the network failure to a friendly message, then rethrow
      // so the calling screen can display it (e.g. via a toast).
      const isNetwork =
        error?.message === 'Network request failed' ||
        error?.message === 'Network Error';

      throw new Error(
        isNetwork
          ? 'Network error. Please check your internet connection.'
          : error?.message || 'Something went wrong while signing in.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return {
    googleLogin,
    googleLoading,
  };
}