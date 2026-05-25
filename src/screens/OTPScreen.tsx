import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://motospotbackend-production.up.railway.app';
const OTP_LENGTH = 4;
const RETRY_DELAY = 60;

export default function OTPScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const { signIn } = useAuth();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RETRY_DELAY);
  const [errorMessage, setErrorMessage] = useState('');

  const inputRef = useRef<TextInput>(null);
  

  const verifyOTP = async () => {
    if (loading) return;

    if (otp.length !== OTP_LENGTH) {
      setErrorMessage('Enter the 4-digit code');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.post(
        `${API_URL}/auth/verify-otp`,
        { phone, otp },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      await signIn(
        res.data.access_token,
        res.data.refresh_token,
        res.data.user
      );
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (error.response?.status === 500
          ? 'Something went wrong. Please try again.'
          : null) ||
        'Incorrect code. Please try again.';

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeOTP = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(cleaned);

    if (errorMessage) {
      setErrorMessage('');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);



  const handleRetry = () => {
    if (secondsLeft > 0) return;
    navigation.goBack();
  };

  const renderOtpBoxes = () => {
    return Array.from({ length: OTP_LENGTH }).map((_, index) => {
      const digit = otp[index] ?? '';
      const isActive = index === otp.length && otp.length < OTP_LENGTH;
      const isFilled = !!digit;

      return (
        <View
          key={index}
          style={[
            styles.otpBox,
            isFilled && styles.otpBoxFilled,
            isActive && styles.otpBoxActive,
            !!errorMessage && styles.otpBoxError,
          ]}
        >
          <Text style={styles.otpDigit}>{digit}</Text>
        </View>
      );
    });
  };

  const isRetryDisabled = secondsLeft > 0;
  const retryLabel = isRetryDisabled ? `Retry in ${secondsLeft}s` : 'Retry';
  const canSubmit = otp.length === OTP_LENGTH && !loading;


  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={80}
          extraHeight={100}
          keyboardOpeningTime={0}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Sent to {phone}</Text>

            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpBoxesContainer}
            >
              {renderOtpBoxes()}
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={handleChangeOTP}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              returnKeyType="done"
              onSubmitEditing={verifyOTP}
              autoFocus
              autoCorrect={false}
              caretHidden
              contextMenuHidden={false}
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
              importantForAutofill="yes"
              accessible
              accessibilityLabel="One-time password input"
              style={styles.hiddenInput}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : (
              <Text style={styles.helperText}>
                Enter the 4-digit code sent to your phone
              </Text>
            )}

            <TouchableOpacity
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={verifyOTP}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              disabled={isRetryDisabled}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.retryButtonText,
                  isRetryDisabled && styles.retryButtonTextDisabled,
                ]}
              >
                {retryLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8b8b8b',
    textAlign: 'center',
    marginBottom: 28,
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  otpBox: {
    flex: 1,
    height: 62,
    borderWidth: 1.5,
    borderColor: '#2f2f2f',
    borderRadius: 14,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: '#84cc16',
  },
  otpBoxActive: {
    borderColor: '#9bf542',
  },
  otpBoxError: {
    borderColor: '#ef4444',
  },
  otpDigit: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: 1,
    height: 1,
  },
  helperText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 12,
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#9bf542',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  buttonDisabled: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  retryButton: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#84cc16',
    fontSize: 15,
    fontWeight: '600',
  },
  retryButtonTextDisabled: {
    color: '#6b7280',
  },
});