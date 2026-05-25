import React, { useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';

const API_URL = 'https://motospotbackend-production.up.railway.app';

export default function LoginScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [apiError, setApiError] = useState('');

  const { devSignIn } = useAuth();
  const { googleLogin, googleLoading } = useGoogleSignIn();

  const phoneInputRef = useRef<TextInput>(null);

  const validateForm = () => {
    let isValid = true;

    setNameError('');
    setPhoneError('');
    setApiError('');

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
    setApiError('');

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

      setApiError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setApiError('');
    await googleLogin();
  };

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
                  if (apiError) setApiError('');
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
                  if (apiError) setApiError('');
                }}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={sendOTP}
              />
              {!!phoneError && (
                <Text style={styles.fieldErrorText}>{phoneError}</Text>
              )}

              {!!apiError && (
                <View style={styles.apiErrorBox}>
                  <Text style={styles.apiErrorText}>{apiError}</Text>
                </View>
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
  apiErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  apiErrorText: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
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
});