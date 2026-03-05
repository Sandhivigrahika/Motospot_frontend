import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://motospotbackend-production.up.railway.app';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [bikes, setBikes] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const [userRes, bikesRes, addressesRes, bookingsRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/me/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/user/my-bikes`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/address/my-addresses`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/bookings/me`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setUser(userRes.data);
      setBikes(bikesRes.data || []);
      setAddresses(addressesRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (error: any) {
      console.error('Profile load error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1BAC4B" />
      </View>
    );
  }

  const phoneDisplay = user?.phones?.[0] || user?.phone || 'No phone added';
  const emailDisplay = user?.emails?.[0] || 'No email added';

  return (
    <ScrollView style={styles.container}>
      {/* Header with Name + Edit */}
      <View style={styles.header}>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Phone Number Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Phone number</Text>
        <Text style={styles.sectionValue}>{phoneDisplay}</Text>
      </View>

      {/* Email Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Email</Text>
        <Text style={styles.sectionValue}>{emailDisplay}</Text>
      </View>

      {/* Added Bikes Section - MAX 2 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Added Bikes</Text>
        {bikes.length === 0 ? (
          <Text style={styles.emptyText}>No bikes added</Text>
        ) : (
          bikes.slice(0, 2).map((bike: any) => (
            <Text key={bike.id} style={styles.listItem}>
              {bike.company_name} {bike.model_name}
            </Text>
          ))
        )}
      </View>

      {/* Addresses Section - MAX 2 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Address</Text>
        {addresses.length === 0 ? (
          <Text style={styles.emptyText}>No addresses added</Text>
        ) : (
          addresses.slice(0, 2).map((address: any) => (
            <Text key={address.id} style={styles.listItem}>
              {address.address1}
              {address.address2 ? `, ${address.address2}` : ''}
            </Text>
          ))
        )}
      </View>

      {/* Previous Bookings Section - MAX 4 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Previous Bookings</Text>
        {bookings.length === 0 ? (
          <Text style={styles.emptyText}>No previous bookings</Text>
        ) : (
          bookings.slice(0, 4).map((booking: any) => (
            <Text key={booking.id} style={styles.listItem}>
              Previous Booking {booking.id}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  sectionValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
  listItem: {
    fontSize: 16,
    color: '#374151',
    marginTop: 8,
    paddingVertical: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomButton: {
    flex: 1,
    backgroundColor: '#1BAC4B',
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
