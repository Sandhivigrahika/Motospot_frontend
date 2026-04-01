import React, { useState } from 'react';
import {
  View,
  Button,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://motospotbackend-production.up.railway.app';

export default function LoginScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { devSignIn } = useAuth();

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
      <View style={styles.container}>
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/motopsaot_logo.png')}
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
          />

          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor="#8b8b8b"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Login via OTP'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={loginWithGoogle}
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <View style={styles.devButton}>
              <Button
                title="🔧 Skip Login (Dev Only)"
                onPress={devSignIn}
                color="#84cc16"
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000fa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: '#0000001f',
    justifyContent: 'center',
  },
  logoSection: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10
  },
  logo: {
    width: '200%' ,
    height: 300,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#d4d4d4',
    textAlign: 'center',
    fontWeight: '500',
  },
  formSection: {
    flex: 0.9,
    width: '100%',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 16,
    fontSize: 17,
    backgroundColor: '#000000',
    color: '#ffffff',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#84cc16',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#4b5563',
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#262626',
  },
  orText: {
    fontSize: 14,
    color: '#a3a3a3',
    paddingHorizontal: 12,
    fontWeight: '600',
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#2f2f2f',
    backgroundColor: '#111111',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  devButton: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    paddingTop: 20,
  },
});
