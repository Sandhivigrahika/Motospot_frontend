/*
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Motospot! 🏍️</Text>
      <Text style={styles.subtitle}>You're logged in</Text>
      
      <Button title="Sign Out" onPress={signOut} color="#ef4444" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 40,
  },
});




*/




import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import {useAuth} from '../context/AuthContext';
import AddressBar from '../components/AddressBar';
import { useAddress } from '../hooks/useAddress';
import {SafeAreaView} from 'react-native-safe-area-context';


const API_URL = 'https://motospotbackend-production.up.railway.app';

export default function HomeScreen({navigation}: any) {
  const [user, setUser] = useState<{name: string, phone: string} | null>(null);
  const [myBikes, setMyBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut, devSignIn, isAuthenticated } = useAuth();  // Last

  //address hook
  const {latestAddress, loadingAddresses, fetchAddresses} = useAddress();

  const loadUserAndBikes = async () => { 
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        //token missing  = session invalid
        //await signOut();
        setLoading(false)
        return;
      }

      fetchAddresses(token);

      const storedUser = await SecureStore.getItemAsync('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));

        const bikesRes = await axios.get(`${API_URL}/user/my-bikes`, {
          headers: { Authorization: `Bearer ${token}`},
        });
        setMyBikes(bikesRes.data.data || []);
        return;
      }

      //fetchbikes endpoint
      const bikesRes = await axios.get(`${API_URL}/user/my-bikes`, {
        headers: {Authorization: `Bearer ${token}`}
      });

      //DEBUG
      console.log("Bikes Response:", bikesRes.data);
      console.log("Bikes Data", bikesRes.data.data);

      setMyBikes(bikesRes.data.data || []);

       // Refresh user if needed (your /dashboard/me/)
      const profileRes = await axios.get(`${API_URL}/dashboard/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const freshUser = profileRes.data;  // Update from server
      setUser(freshUser);
      await SecureStore.setItemAsync('user', JSON.stringify(freshUser));


    } catch (err:any) {
      console.error('Load error:', err.response?.data || err.message);
      Alert.alert('Error', 'Failed to load your data. Pull to refresh or try again')
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    if (isAuthenticated) {        // ← only fires when auth is confirmed
      loadUserAndBikes();
    }
  }, [isAuthenticated]);          // ← runs when this value changes


  // re-fetch address when returning from AddressScreen
  // error: this fired on every focus, including before the login is complete
  useEffect( () => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (!isAuthenticated) return; //guard
      const token = await SecureStore.getItemAsync('accessToken');
      loadUserAndBikes();
      //if (!token) return; // guard
      //fetchAddresses(token); //pass token explicitly
    });
    return unsubscribe;
  }, [navigation, isAuthenticated]);
  

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading your bikes...</Text>
      </View>
    );
  }

  if (!user) {
    return  (
    <View style={styles.container}>
      <Text>Loading…</Text>
    </View>
  );
  }

  const hasBikes = myBikes.length > 0;



 return (
    //Wrap in a plain View so AddressBar sits ABOVE the ScrollView
    <SafeAreaView style= {{ flex:1, backgroundColor: '#fff'}} >
    <View style={styles.wrapper}>

      {/* Zomato-style address bar — always visible at top */}
      <AddressBar
        address={latestAddress}
        loading={loadingAddresses}
        onPress={() => navigation.navigate('Address')}
      />

      <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadUserAndBikes}
          colors={['#10b981']}
          tintColor="#10b981"
        />
        }
      >
        <Text style={styles.title}>Welcome, {user.name}!</Text>
        <Text style={styles.subtitle}>Phone: {user.phone}</Text>
        

        {myBikes.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏍️ Add Your First Bike</Text>
            <Text style={styles.cardText}>Enter bike details to book services.</Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('BikeAdd')}
            >
              <Text style={styles.ctaText}>+ Add Bike</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Bikes ({myBikes.length})</Text>
            <Text style={styles.cardText}>Ready to book service?</Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaText}>Book Service</Text>
            </TouchableOpacity>
          </View>
        )}

        {__DEV__ && (
          <View style={styles.devSection}>
            <TouchableOpacity style={styles.devButton} onPress={devSignIn}>
              <Text>🔧 Dev Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.devButton, styles.logoutButton]} onPress={signOut}>
              <Text>🚪 Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.devButton} onPress={loadUserAndBikes}>
              <Text>🔄 Reload</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8fafc' }, // ✅ New outer wrapper
  container: { flex: 1, padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 18, color: '#64748b', marginBottom: 32 },
  card: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#1e293b' },
  cardText: { fontSize: 16, color: '#64748b', marginBottom: 16 },
  ctaButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: 'white', fontSize: 18, fontWeight: '600' },
  devSection: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  devButton: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButton: { backgroundColor: '#fee2e2' },
});