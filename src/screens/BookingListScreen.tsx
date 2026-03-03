//src/screens/BookingListScreen/tsx

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

const API_URL = 'https://motospotbackend-production.up.railway.app';

interface Booking {
    id: string;
    bike_id: string;
    preferred_date: string;
    preferred_time: string;
    pickup_address_id: string | null;
    manual_address: string | null;
    current_condition: string;
    status: 'confirmed' | 'bike_picked_up' | 'reached_service_centre' | 
          'under_process' | 'bike_left_service_centre' | 'cancelled' | 
          'rejected' | 'delivered' | 'completed';  // ← All your statuses
    notes: string
}

const BookingsListScreen = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

 const loadBookings = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const response = await axios.get(`${API_URL}/bookings/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(response.data);
    } catch (error) {
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
              loadBookings(); // Refresh list
            } catch (error) {
              Alert.alert('Error', 'Cancel failed');
            }
          },
        },
      ]
    );
  };


const renderStatusBadge = (status: string) => {
const statusText = status
.split('_')
.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
.join(' ');

return (
<View style={styles.statusBadge}>
    <Text style={styles.statusText}>{statusText}</Text>
</View>
);
};


const formatDateTime = (date: string, time: string) => {
    return `${date} at ${new Date(time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }



  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.bookingCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.dateText}>{formatDateTime(item.preferred_date, item.preferred_time)}</Text>
            {renderStatusBadge(item.status)}
          </View>
          
          <Text style={styles.conditionText}>Condition: {item.current_condition}</Text>
          
          <Text style={styles.addressText}>
            {item.manual_address || item.pickup_address_id ? 'Address set' : 'No address'}
          </Text>
          
          {item.notes && <Text style={styles.notesText}>Notes: {item.notes}</Text>}
          
          {item.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      style={styles.list}
      contentContainerStyle={styles.container}
    />
  );
};


const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8fafc' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateText: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  conditionText: { fontSize: 16, color: '#6b7280', marginBottom: 8 },
  addressText: { fontSize: 14, color: '#374151', marginBottom: 8 },
  notesText: { fontSize: 14, color: '#4b5563', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 16 },
  cancelButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default BookingsListScreen;
