import React from 'react';
import { ActivityIndicator, Alert, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useAppleSignIn } from '../hooks/useAppleSignIn';

type Props = {
  variant?: 'signIn' | 'continue' | 'signUp';
  appearance?: 'black' | 'white' | 'whiteOutline';
  height?: number;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

const TYPE = {
  signIn: AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN,
  continue: AppleAuthentication.AppleAuthenticationButtonType.CONTINUE,
  signUp: AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP,
} as const;

const STYLE = {
  black: AppleAuthentication.AppleAuthenticationButtonStyle.BLACK,
  white: AppleAuthentication.AppleAuthenticationButtonStyle.WHITE,
  whiteOutline: AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE,
} as const;

export function AppleSignInButton({
  variant = 'continue',
  appearance = 'black',
  height = 50,
  cornerRadius = 12,
  style,
  onSuccess,
  onError,
}: Props) {
  const { appleLogin, appleLoading, appleAvailable } = useAppleSignIn();

  if (!appleAvailable) return null;

  const handlePress = async () => {
    try {
      await appleLogin();
      onSuccess?.();
    } catch (e: any) {
      const message = e?.message ?? 'Something went wrong while signing in.';
      if (onError) onError(message);
      else Alert.alert('Sign in failed', message);
    }
  };

  return (
    <View style={[styles.wrapper, { height }, style]} pointerEvents={appleLoading ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={TYPE[variant]}
        buttonStyle={STYLE[appearance]}
        cornerRadius={cornerRadius}
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
      />
      {appleLoading && (
        <View style={[styles.overlay, { borderRadius: cornerRadius }]}>
          <ActivityIndicator color={appearance === 'black' ? '#fff' : '#000'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,127,127,0.35)',
  },
});