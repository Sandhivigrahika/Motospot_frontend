import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  FlatList 
} from 'react-native';
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
  const { signOut, devSignIn, isAuthenticated } = useAuth();
  const {latestAddress, loadingAddresses, fetchAddresses} = useAddress();

  const loadUserAndBikes = async () => { 
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        setLoading(false)
        return;
      }

      fetchAddresses(token);

      const storedUser = await SecureStore.getItemAsync('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));

        const bikesRes = await axios.get(`${API_URL}/user/my-bikes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('MY-BIKES RAW (storedUser):', bikesRes.data);
        setMyBikes(bikesRes.data || []);
        return;
      }

      console.log('Token for my-bikes:', token ? 'present' : 'MISSING');
      const bikesRes = await axios.get(`${API_URL}/user/my-bikes`, {
        headers: {Authorization: `Bearer ${token}`}
      });

      console.log('MY-BIKES RAW:', bikesRes.data);
      setMyBikes(bikesRes.data || []);

      // Refresh user if needed
      const profileRes = await axios.get(`${API_URL}/dashboard/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const freshUser = profileRes.data;
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
    if (isAuthenticated) {
      loadUserAndBikes();
    }
  }, [isAuthenticated]);

  useEffect( () => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (!isAuthenticated) return;
      const token = await SecureStore.getItemAsync('accessToken');
      loadUserAndBikes();
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
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const hasBikes = myBikes.length > 0;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: '#fff' }}>
      <View style={styles.wrapper}>
        <AddressBar
          address={latestAddress}
          loading={loadingAddresses}
          onPress={() => {
          navigation.navigate('AddressList');
        }}
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

          {/* BIKES SECTION */}
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
            <>
              <View style={styles.bikesSection}>
                <Text style={styles.sectionTitle}>Your Bikes ({myBikes.length})</Text>
                <FlatList
                  data={myBikes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.bikeCard}>
                    <View style={{flex : 1}}>
                      <Text style={styles.bikeCompany}>{item.company_name}</Text>
                      <Text style={styles.bikeModel}>{item.model_name}</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                      <Text style={styles.bikeReg}>{item.registration_number}</Text>
                      <Text style={styles.bikeYear}>{item.purchase_year}</Text>
                    </View>
                    </View>
                  )}
                  style={styles.bikesList}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false} // ← prevents ScrollView conflict
                />
                <TouchableOpacity 
                  style={styles.addBikeBtn}
                  onPress={() => navigation.navigate('BikeAdd')}
                >
                  <Text style={styles.addBikeText}>+ Add Another Bike</Text>
                </TouchableOpacity>
              </View>

              {/* Book Service CTA */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ready to book service?</Text>
                <TouchableOpacity style={styles.ctaButton}>
                  <Text style={styles.ctaText}>Book Service</Text>
                </TouchableOpacity>
              </View>
            </>
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
              <TouchableOpacity style={styles.devButton} onPress={async () => {
              const token = await SecureStore.getItemAsync('accessToken');
              const res = await axios.get(`${API_URL}/address/my-addresses`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              console.log('ADDRESSES:', res.data);
            }}>
              <Text>🗺️ Test Addresses</Text>
            </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 18, color: '#64748b', marginBottom: 32 },
  
  // NEW BIKE STYLES
  bikesSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  bikesList: {
    maxHeight: 220,
  },
  bikeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  bikeCompany: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  bikeModel: {
    fontSize: 14,
    color: '#475569',
    //marginTop: 0,
  },
  bikeReg: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
    //marginTop: 0,
  },
  bikeYear: {
    fontSize: 14,
    color: '#64748b',
    //marginTop: 0,
  },
  addBikeBtn: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addBikeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // EXISTING STYLES
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
