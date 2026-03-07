//src/screens/BookingListScreen.tsx

import React, {useState, useEffect} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://motospotbackend-production.up.railway.app';

interface Booking {
    id: string;
    bike_id: string;
    bike?: {
      model_name: string;
      registration_no: string;
    };
    preferred_date: string;
    preferred_time: string;
    pickup_address_id: string | null;
    manual_address: string | null;
    current_condition: string;
    status: 'confirmed' | 'bike_picked_up' | 'reached_service_centre' | 
            'under_process' | 'bike_left_service_centre' | 'cancelled' | 
            'rejected' | 'delivered' | 'completed';
    notes: string;
}

const formatDateTime = (dateStr: string, timeStr: string): string => {
  const date = new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const time = new Date(`2023-01-01T${timeStr}`).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  return `${date} • ${time}`;
};

const BookingsListScreen = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  // ✅ FIXED: Clean single fetch, no Promise.all bike loop
  const loadBookings = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const response = await axios.get(`${API_URL}/bookings/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(response.data.slice().reverse()); // bike: {model_name, registration_no} already included
    } catch (error) {
      console.log('Bookings load error:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('accessToken');
              await axios.post(
                `${API_URL}/bookings/${bookingId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert('Success', 'Booking cancelled');
              loadBookings();
            } catch (error) {
              Alert.alert('Error', 'Cancel failed');
            }
          },
        },
      ]
    );
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { color: string; bgColor: string }> = {
      confirmed: { color: '#10b981', bgColor: '#d1fae5' },
      bike_picked_up: { color: '#f59e0b', bgColor: '#fef3c7' },
      reached_service_centre: { color: '#f59e0b', bgColor: '#fef3c7' },
      under_process: { color: '#8b5cf6', bgColor: '#ede9fe' },
      bike_left_service_centre: { color: '#3b82f6', bgColor: '#dbeafe' },
      delivered: { color: '#059669', bgColor: '#d1fae5' },
      completed: { color: '#059669', bgColor: '#d1fae5' },
      cancelled: { color: '#dc2626', bgColor: '#fee2e2' },
      rejected: { color: '#dc2626', bgColor: '#fee2e2' },
    };
    return config[status] || { color: '#6b7280', bgColor: '#f3f4f6' };
  };

  const renderStatusBadge = (status: string) => {
    const statusText = status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    const { color, bgColor } = getStatusConfig(status);

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color }]} numberOfLines={1} ellipsizeMode="tail">
          {statusText}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}> 
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshing={loading}
      onRefresh={loadBookings}
      renderItem={({ item }) => (
        <View style={styles.bookingCard}>
          <View style={styles.headerRow}>
            <View style={styles.bikeSection}>
              <Text style={styles.bikeModel} numberOfLines={1} ellipsizeMode="tail">
                {item.bike?.model_name || 'Unknown Bike'}
              </Text>
              <Text style={styles.bikeReg} numberOfLines={1}>
                {item.bike?.registration_no || 'No reg no'}
              </Text>
              <Text style={styles.dateTime}>
                {formatDateTime(item.preferred_date, item.preferred_time)}
              </Text>
            </View>
            {renderStatusBadge(item.status)}
          </View>

          <Text style={styles.conditionText}>Condition: {item.current_condition}</Text>

          <Text style={styles.addressText}>
            {item.manual_address || item.pickup_address_id ? 'Address set' : 'No address'}
          </Text>

          {item.notes ? <Text style={styles.notesText}>Notes: {item.notes}</Text> : null}

          {item.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
            
          )}
        </View>
      )}
      style={styles.list}
      contentContainerStyle={styles.container}
    />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8fafc', flexGrow: 1 },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12,
  },
  bikeSection: { 
    flex: 1, 
    flexShrink: 1, 
    marginRight: 12, // ✅ Gap between text and badge
  },
  bikeModel: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1f2937', 
    marginBottom: 2,
  },
  bikeReg: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#475569', 
    marginBottom: 4,
  },
  dateTime: { fontSize: 14, color: '#6b7280' },
  statusBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    minWidth: 70,
    maxWidth: 120,
    alignItems: 'center',
    alignSelf: 'flex-start', // ✅ Badge doesn't stretch full height
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  conditionText: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  addressText: { fontSize: 14, color: '#374151', marginBottom: 8 },
  notesText: { 
    fontSize: 14, color: '#4b5563', backgroundColor: '#f9fafb', 
    padding: 12, borderRadius: 8, marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default BookingsListScreen;
