// src/screens/BookingScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';
import axios, {AxiosError} from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; // Assuming you have this
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
//import BookingsListScreen from './BookingListScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootTabParamList = {
  Home: undefined;
  Book: undefined;
  Bookings: undefined;
  BikeForm: undefined;
  AddressList: undefined;
  AddressForm: undefined;
};

interface Bike {
    id: number | string;
    registration_number: string;
    //add any other field from the api response
  }

  interface Address {
    id: number | string;
    label? : string;
    address_line?: string;
    //other fields
  }

  
const BIKES_KEY = 'motospot_my_bikes_cache';
const ADDRESS_KEY = 'motospot_my_address_cache';
const API_URL = 'https://motospotbackend-production.up.railway.app';

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}




const BookingScreen = () => {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  //const { user } = useAuth(); // Or get from context
  
  // Form state
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedBike, setSelectedBike] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState('7:00');
  const [currentCondition, setCurrentCondition] = useState<'running condition' | 'dead condition'>('running condition'); // From schema
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBikeModal, setShowBikeModal] =useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);


  


  // Load bikes and addresses
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  try {
    // ── Try cache first ──────────────────────────────────────
    const [cachedBikes, cachedAddresses] = await Promise.all([
      AsyncStorage.getItem(BIKES_KEY),
      AsyncStorage.getItem(ADDRESS_KEY),
    ]);

    if (cachedBikes)   setBikes(JSON.parse(cachedBikes));
    if (cachedAddresses) setAddresses(JSON.parse(cachedAddresses));

    // ── Then fetch fresh from API ────────────────────────────
    const token = await SecureStore.getItemAsync('accessToken');
    const [bikeRes, addrRes] = await Promise.all([
      axios.get<Bike[]>(`${API_URL}/user/my-bikes`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get<Address[]>(`${API_URL}/address/my-addresses`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    setBikes(bikeRes.data);
    setAddresses(addrRes.data);

    // ── Update cache with fresh data ─────────────────────────
    await Promise.all([
      AsyncStorage.setItem(BIKES_KEY, JSON.stringify(bikeRes.data)),
      AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(addrRes.data)),
    ]);

  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load bikes/addresses');
    }
  }
};

/*App opens
  → Cache se instantly bikes/addresses   (fast ⚡)
  → Background mein API call
  → Fresh data aaye toh UI update + cache refresh */

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0'); //  hour and minute slots
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const selectedBikeName = bikes.find(b => b.id === selectedBike)?.registration_number || 'Tap to select bike';

  const selectedAddressName = addresses.find(a => a.id === selectedAddressId)?.label || addresses.find(a => a.id === selectedAddressId)?.address_line || 'Tap to select address';


  const handleBook = async () => {
    if (!selectedBike || !pincode) {
      Alert.alert('Error', 'Select bike and pincode');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const payload = {
        bike_id: selectedBike,
        pincode,
        preferred_date: formatDate(preferredDate),
        preferred_time: selectedTime,
        ...(useManualAddress ? { manual_address: manualAddress } : { address_id: selectedAddressId || null }),
        current_condition: currentCondition,
        notes: notes || undefined,
      };

      console.log('paylod:', JSON.stringify(payload))

      const response = await axios.post(`${API_URL}/bookings/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
  
      });

      if (response.status === 201 || response.status===200) {
        Alert.alert('Success', 'Booking Created');
        navigation.navigate('Bookings');
      } else {
      console.log('Non critical error:', response.status, response.data);
      Alert.alert('Success', 'Booking created!');
         } // Or your bookings tab - bookings page needs to be created
      
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.log('❌ Status:', error.response?.status);
        console.log('❌ Data:', JSON.stringify(error.response?.data));
        Alert.alert('Error', String(error.response?.data?.detail || 'Booking Failed'));
      } else if (error instanceof Error) {
        console.log('❌ Non-axios error:', error.message, error.stack);
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Booking Failed');
      }
    } finally {
      setLoading(false);
    }
  };

    return (
    <SafeAreaView style={{flex:1}} edges={['top','left', 'right']}>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Book Service</Text>

      {/* Bike Dropdown */}
      <Text style={styles.label}>Select Bike</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setShowBikeModal(true)}>
        <Text style={styles.dropdownText}>{selectedBikeName}</Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal visible={showBikeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Bike</Text>
            <FlatList
              data={bikes}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, selectedBike === item.id && styles.modalItemActive]}
                  onPress={() => { setSelectedBike(item.id.toString()); setShowBikeModal(false); }}
                >
                  <Text style={styles.modalItemText}>{item.registration_number}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No bikes added yet. Add one from Home.</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowBikeModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pincode */}
      <Text style={styles.label}>Pincode</Text>
      <TextInput
        style={styles.input}
        value={pincode}
        onChangeText={setPincode}
        placeholder="e.g. 560001"
        keyboardType="numeric"
      />
    {/* Date & Time */}
    <Text style={styles.label}>Date & Time</Text>
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.dropdown, { flex: 1, marginRight: 8 }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dropdownText}>{formatDate(preferredDate)}</Text>
      </TouchableOpacity>
    </View>

    {showDatePicker && (
      <DateTimePicker value={preferredDate} mode="date" display="default"
        minimumDate={new Date()}
        onChange={(_, date) => { setShowDatePicker(false); if (date) setPreferredDate(date); }} />
    )}

    <Text style={styles.label}>Select Time</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
        {TIME_SLOTS.map((slot) => (
          <TouchableOpacity
            key={slot}
            onPress={() => setSelectedTime(slot)}
            style={[styles.timeSlot, selectedTime === slot && styles.timeSlotActive]}
          >
            <Text style={[styles.timeSlotText, selectedTime === slot && styles.timeSlotTextActive]}>
              {slot}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
      {/* Address */}
      <Text style={styles.label}>Address</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity style={[styles.toggleBtn, !useManualAddress && styles.toggleBtnActive]} onPress={() => setUseManualAddress(false)}>
          <Text style={[styles.toggleBtnText, !useManualAddress && styles.toggleBtnTextActive]}>Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, useManualAddress && styles.toggleBtnActive]} onPress={() => setUseManualAddress(true)}>
          <Text style={[styles.toggleBtnText, useManualAddress && styles.toggleBtnTextActive]}>Manual</Text>
        </TouchableOpacity>
      </View>

      {useManualAddress ? (
        <TextInput style={styles.textArea} value={manualAddress} onChangeText={setManualAddress}
          placeholder="Enter full address" multiline />
      ) : (
        <>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowAddressModal(true)}>
            <Text style={styles.dropdownText}>{selectedAddressName}</Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
          <Modal visible={showAddressModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Select Address</Text>
                <FlatList
                  data={addresses}
                  keyExtractor={(item: any) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, selectedAddressId === item.id && styles.modalItemActive]}
                      onPress={() => { setSelectedAddressId(item.id.toString()); setShowAddressModal(false); }}
                    >
                      <Text style={styles.modalItemText}>{item.label || item.address_line}</Text>
                      {item.label && <Text style={styles.modalItemSub}>{item.address_line}</Text>}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>No addresses saved yet.</Text>}
                />
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowAddressModal(false)}>
                  <Text style={styles.modalCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Bike Condition */}
      <Text style={styles.label}>Bike Condition</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity style={[styles.toggleBtn, currentCondition === 'running condition' && styles.toggleBtnActive]}
          onPress={() => setCurrentCondition('running condition')}>
          <Text style={[styles.toggleBtnText, currentCondition === 'running condition' && styles.toggleBtnTextActive]}>🟢 Running</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, currentCondition === 'dead condition' && styles.toggleBtnActive]}
          onPress={() => setCurrentCondition('dead condition')}>
          <Text style={[styles.toggleBtnText, currentCondition === 'dead condition' && styles.toggleBtnTextActive]}>🔴 Dead</Text>
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={styles.textArea} value={notes} onChangeText={setNotes}
        placeholder="Any additional notes" multiline />

      <TouchableOpacity style={styles.bookButton} onPress={handleBook} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookButtonText}>Book Service</Text>}
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginTop: 20, marginBottom: 24, textAlign: 'center', color: '#1e293b' },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 10, fontSize: 16, backgroundColor: '#fff', elevation: 1 },
  textArea: { height: 80, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 10, textAlignVertical: 'top', fontSize: 15, backgroundColor: '#fff', elevation: 1 },
  row: { flexDirection: 'row' },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 10, backgroundColor: '#fff', elevation: 1 },
  dropdownText: { fontSize: 15, color: '#1e293b' },
  dropdownArrow: { fontSize: 12, color: '#94a3b8' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#3b82f6' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleBtnTextActive: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bookButton: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6, backgroundColor: '#f8fafc' },
  modalItemActive: { backgroundColor: '#dbeafe' },
  modalItemText: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  modalItemSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  modalClose: { marginTop: 12, padding: 14, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 15, padding: 20 },

  // ✅ time slot 
  timeSlot: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  timeSlotActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  timeSlotText: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  timeSlotTextActive: { color: '#fff' },
});


export default BookingScreen;

