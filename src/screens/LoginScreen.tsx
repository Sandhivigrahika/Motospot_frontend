import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://motospotbackend-production.up.railway.app';

export default function LoginScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { devSignIn } = useAuth();

  const phoneInputRef = useRef<TextInput>(null);

  const loginWithGoogle = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/google/login`);
      await WebBrowser.openBrowserAsync(res.data.auth_url);
    } catch (err) {
      Alert.alert('Error', 'Unable to start Google Login');
    }
  };

  const sendOTP = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Error', 'Enter your name');
      return;
    }

    if (phone.length !== 10) {
      Alert.alert('Error', 'Enter valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
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
      Alert.alert('Success', `OTP sent to ${phone}`);
    } catch (error: any) {
      console.log('SEND OTP ERROR: ', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      Alert.alert(
        'Error',
        error.response?.data?.detail || error.message || 'Failed to send otp.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
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
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#8b8b8b"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => phoneInputRef.current?.focus()}
              />

              <TextInput
                ref={phoneInputRef}
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#8b8b8b"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={sendOTP}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={sendOTP}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Login via OTP'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={loginWithGoogle}
                activeOpacity={0.85}
              >
                <Text style={styles.googleButtonText}>Continue with Google</Text>
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
    marginBottom: 14,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  orText: {
    color: '#8b8b8b',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#111111',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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