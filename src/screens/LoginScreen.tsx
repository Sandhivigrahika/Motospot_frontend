import React, { useState,  useEffect } from 'react'; //React basics + state/effect hooks
import {
  View,
  Button,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native'; //UI Components

import axios from 'axios';  // Install: npm install axios //makes http requests to you FASTAPI Backend
import * as WebBrowser from 'expo-web-browser'; // Opens external browser for google login
import * as SecureStore from 'expo-secure-store';  //encrypted storage for JWT Tokens
import {useAuth} from '../context/AuthContext';




const API_URL = 'https://motospotbackend-production.up.railway.app';  // Your FastAPI backend

export default function LoginScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const {signIn} = useAuth();
  const {devSignIn} = useAuth();

  //Google auth setup
  const loginWithGoogle = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/google/login`);
      await WebBrowser.openBrowserAsync(res.data.auth_url)
    } catch (err) {
      Alert.alert('Error', 'Unable to start Google Login')
    }
  }

  // request= "Is google Ready?" (true/false)
  //response= "What did google return" (success/error/null)
  //promptAsync = "Function to start Google Login"

  const sendOTP = async () => {

  if (name.trim().length<2) {
    Alert.alert('Error', 'Enter your name');
    return;
  }

  if (phone.length !== 10) {
    Alert.alert('Error', 'Enter valid 10-digit phone number');
    return;
  }
  setLoading(true);

  try {
    const res = await axios.post(`${API_URL}/auth/send-otp`, 
      { name: name.trim(),
        phone, },
      {
        timeout: 15000,
        headers: {'Content-Type': 'application/json'}
      }
    );

    console.log('SEND OTP SUCCESS:', res.data); //debug
    Alert.alert('Success', `OTP sent to ${phone}`);
    navigation.navigate('OTP', {phone});
  } catch (error: any) {
    console.log('SEND OTP ERROR: ',  {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    }); //debug
    Alert.alert('Error', error.response?.data?.detail || error.message || 'Failed to send otp.');
  } finally {
    setLoading(false)
  }
};

  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Motospot </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"

      />
      
      <TextInput
        style={styles.input}
        placeholder="Enter phone number"
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
        <Text style={styles.orText}> OR </Text>
      </View>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={loginWithGoogle}

        >
          <Text style ={styles.googleButtonText}> Continue with Google</Text>
      </TouchableOpacity>


      {__DEV__ && (
                <View style={styles.devButton}>
                    <Button
                        title="🔧 Skip Login (Dev Only)"
                        onPress={devSignIn}
                        color="#FF6B35"
                    />
                </View>
      ) }
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
   devButton: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    backgroundColor: 'white',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 24, 
  },
  orText: {
    fontSize: 16,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
  },
  googleButton: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b'
  }
}); 