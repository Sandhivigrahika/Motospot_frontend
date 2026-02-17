import React, {useState} from 'react';  // Removed unused useEffect
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store'; 
import {useAuth} from '../context/AuthContext';



const API_URL = 'https://motospotbackend-production.up.railway.app';  // Your backend url

export default function OTPScreen({ route, navigation }: any) {  // Simplified props
    const {phone} = route.params;
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const {signIn} = useAuth(); //React hook should be at the top level

    const verifyOTP = async () => {
        if (otp.length !== 4) {
            Alert.alert('Error', "Enter valid 4-digit OTP");
            return;
        }
        console.log('Sending OTP Verify:', {phone: otp}); //debug
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/auth/verify-otp`, {  
                phone,
                otp,
            }, {
                timeout: 10000,
                headers: {'Content-Type': 'application/json'}
            });

            console.log('OTP Success:', res.data); //debug
            
            

            // Save token
            await signIn(
                res.data.access_token,
                res.data.refresh_token,
                res.data.user
            );

            /*That’s it.

React re-renders → AuthStack disappears → AppStack appears → Home shows.

No navigation involved.*/
            
            
            
            //navigation.navigate('App', {
                screen:'Home'
            //}); //❌ OTP sCREEN navigating to auth - classic trap - You authenticate 
            // 
                /*You push App on top of Auth

                Auth is still alive underneath

                State becomes inconsistent

                App feels “stuck”*/
            
        } catch (error: any) {
            console.log('Full OTP Error:', error.response?.data || error.message); //debug
            Alert.alert('Error', error.response?.data?.detail || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Sent to {phone}</Text>

            <TextInput
                style={styles.input}
                placeholder="Enter 4 digit OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType='number-pad'
                maxLength={6}
            />

            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={verifyOTP}
                disabled={loading}
            >
                <Text style={styles.buttonText}>  {/* Fixed styles.buttonText */}
                    {loading ? 'Verifying...': 'Verify OTP'}
                </Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
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
    textAlign: 'center',
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
});
