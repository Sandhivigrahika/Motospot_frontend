import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

const API_URL = 'https://motospotbackend-production.up.railway.app';

/* ---------------- Toast ---------------- */

type ToastType = 'error' | 'info';

function Toast({
  message,
  type = 'error',
  onHide,
}: {
  message: string;
  type?: ToastType;
  onHide: () => void;
}) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onHide();
    });
  }, [onHide, translateY, opacity]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(hide, 3500);
    return () => clearTimeout(timer);
  }, [hide, translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        type === 'info' && styles.toastInfo,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hide} style={styles.toastInner}>
        <Text style={styles.toastText}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ---------------- Screen ---------------- */

export default function LoginScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // transient toast (network / server / google errors)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const { devSignIn } = useAuth();
  const { googleLogin, googleLoading } = useGoogleSignIn();

  const phoneInputRef = useRef<TextInput>(null);

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    // replace any existing toast
    setToast(null);
    requestAnimationFrame(() => setToast({ message, type }));
  }, []);

  const validateForm = () => {
    let isValid = true;

    setNameError('');
    setPhoneError('');

    if (name.trim().length < 2) {
      setNameError('Please enter at least 2 characters');
      isValid = false;
    }

    if (!/^\d{10}$/.test(phone)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      isValid = false;
    }

    return isValid;
  };

  const sendOTP = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const res = await api.post(
        `${API_URL}/auth/send-otp`,
        {
          name: name.trim(),
          phone,
        },
        {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log('SEND OTP SUCCESS:', res.data);
      navigation.navigate('OTP', { phone });
    } catch (error: any) {
      console.log('SEND OTP ERROR:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const serverMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (error.response?.status === 500
          ? 'Something went wrong on our side. Please try again.'
          : null) ||
        (error.code === 'ECONNABORTED'
          ? 'Request timed out. Please check your connection and try again.'
          : null) ||
        (error.message === 'Network Error'
          ? 'Network error. Please check your internet connection.'
          : null) ||
        'Failed to send OTP. Please try again.';

      showToast(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    
    try {
      await googleLogin();
    } catch (error: any) {
      const msg =
        error?.message === 'Network request failed' || error?.message === 'Network Error'
          ? 'Network error. Please check your internet connection.'
          : 'Google sign-in failed. Please try again.';
      showToast(msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}

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
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/motospot_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.formSection}>
              <TextInput
                style={[styles.input, !!nameError && styles.inputError]}
                placeholder="Enter your name"
                placeholderTextColor="#8b8b8b"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError('');
                }}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => phoneInputRef.current?.focus()}
              />
              {!!nameError && (
                <Text style={styles.fieldErrorText}>{nameError}</Text>
              )}

              <TextInput
                ref={phoneInputRef}
                style={[styles.input, !!phoneError && styles.inputError]}
                placeholder="Enter phone number"
                placeholderTextColor="#8b8b8b"
                value={phone}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setPhone(cleaned);
                  if (phoneError) setPhoneError('');
                }}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={sendOTP}
              />
              {!!phoneError && (
                <Text style={styles.fieldErrorText}>{phoneError}</Text>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={sendOTP}
                disabled={loading || googleLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Login via OTP'}
                </Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
                onPress={handleGoogleLogin}
                disabled={googleLoading || loading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                )}
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  style={styles.devLoginButton}
                  onPress={devSignIn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.devLoginText}>🔧 Skip Login (Dev Only)</Text>
                </TouchableOpacity>
              )}
            </View>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  logo: {
    width: 400,
    height: 300,
  },
  formSection: {
    width: '100%',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2f2f2f',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#111111',
    color: '#ffffff',
    marginBottom: 6,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldErrorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#9bf542',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  buttonDisabled: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  dividerText: {
    color: '#8b8b8b',
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  googleButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2f2f2f',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  devLoginButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#84cc16',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devLoginText: {
    color: '#84cc16',
    fontSize: 15,
    fontWeight: '700',
  },
  /* toast */
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#7f1d1d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastInfo: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(148,163,184,0.4)',
  },
  toastInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});