import React, { useState, useCallback, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PhoneCard } from '../components/PhoneCard';
import { useMyBikes } from '../hooks/useMyBikes';
import { useAddress } from '../hooks/useAddress';

const API_URL = 'https://motospotbackend-production.up.railway.app';

type ServiceItem = {
  name: string;
};

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
}

const BookingScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const preselectedService =
    route?.params?.serviceType || route?.params?.serviceRequested || '';

  const { bikes, isLoading: bikesLoading, refetch: refetchBikes } = useMyBikes();
  const { addresses, isLoading: addressesLoading, refetch: refetchAddresses } = useAddress();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const [selectedBike, setSelectedBike] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState('07:00');
  const [serviceRequested, setServiceRequested] = useState(preselectedService);
  const [currentCondition, setCurrentCondition] =
    useState<'running condition' | 'dead condition'>('running condition');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBikeModal, setShowBikeModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showConditionInfoModal, setShowConditionInfoModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (route?.params?.serviceType || route?.params?.serviceRequested) {
      setServiceRequested(route?.params?.serviceType || route?.params?.serviceRequested || '');
    }
  }, [route?.params?.serviceType, route?.params?.serviceRequested]);

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const { data } = await axios.get(`${API_URL}/Services/services`);
      const normalized = Array.isArray(data)
        ? data
            .filter((item) => item?.name)
            .map((item) => ({ name: item.name }))
        : [];
      setServices(normalized);
    } catch (error) {
      console.error('Failed to fetch services', error);
      Alert.alert('Error', 'Could not load service list');
    } finally {
      setServicesLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refetchBikes();
      refetchAddresses();
      fetchServices();
    }, [refetchBikes, refetchAddresses])
  );

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const selectedBikeName =
    bikes.find((b) => String(b.id) === selectedBike)?.registration_number ||
    'Tap to select bike';

  const selectedAddressName =
    addresses.find((a) => String(a.id) === selectedAddressId)?.label ||
    addresses.find((a) => String(a.id) === selectedAddressId)?.address_line ||
    'Tap to select address';

  const handleAddNewBike = () => {
    setIsRedirecting(true);
    setShowBikeModal(false);
    setShowAddressModal(false);

    setTimeout(() => {
      navigation.navigate('BikeForm');
      setTimeout(() => {
        setIsRedirecting(false);
      }, 300);
    }, 150);
  };

  const handleAddNewAddress = () => {
    setIsRedirecting(true);
    setShowAddressModal(false);
    setShowBikeModal(false);

    setTimeout(() => {
      navigation.navigate('AddressForm');
      setTimeout(() => {
        setIsRedirecting(false);
      }, 300);
    }, 150);
  };

  const handleBook = async () => {
    if (!selectedBike || !pincode || !serviceRequested) {
      Alert.alert('Error', 'Select bike, pincode and service type');
      return;
    }

    if (useManualAddress && !manualAddress.trim()) {
      Alert.alert('Error', 'Enter manual address');
      return;
    }

    if (!useManualAddress && !selectedAddressId) {
      Alert.alert('Error', 'Select an address');
      return;
    }

    setLoading(true);

    try {
      const token = await SecureStore.getItemAsync('accessToken');

      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const payload = {
        bike_id: selectedBike,
        pincode,
        preferred_date: formatDate(preferredDate),
        preferred_time: selectedTime,
        ...(useManualAddress
          ? { manual_address: manualAddress.trim() }
          : { address_id: selectedAddressId || null }),
        current_condition: currentCondition,
        notes: notes.trim() || undefined,
        service_requested: serviceRequested,
      };

      const response = await axios.post(`${API_URL}/bookings/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 201 || response.status === 200) {
        Alert.alert('Success', 'Booking Created');
        navigation.navigate('Bookings');
      } else {
        Alert.alert('Success', 'Booking created!');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        Alert.alert('Error', String(error.response?.data?.detail || 'Booking Failed'));
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Booking Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Book Service</Text>

        <Text style={styles.label}>Service Type</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowServiceModal(true)}>
          <Text style={styles.dropdownText}>
            {serviceRequested || 'Tap to select service'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal visible={showServiceModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Service</Text>

              {servicesLoading ? (
                <ActivityIndicator style={{ paddingVertical: 24 }} />
              ) : (
                <FlatList
                  data={services}
                  keyExtractor={(item, index) => `${item.name}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        serviceRequested === item.name && styles.modalItemActive,
                      ]}
                      onPress={() => {
                        setServiceRequested(item.name);
                        setShowServiceModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No services available right now.</Text>
                    </View>
                  }
                />
              )}

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Select Bike</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            if (!isRedirecting) setShowBikeModal(true);
          }}
        >
          <Text style={styles.dropdownText}>{selectedBikeName}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal visible={showBikeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Select Bike</Text>

              {bikesLoading ? (
                <ActivityIndicator style={{ paddingVertical: 24 }} />
              ) : (
                <FlatList
                  data={bikes}
                  keyExtractor={(item: any) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        selectedBike === String(item.id) && styles.modalItemActive,
                      ]}
                      onPress={() => {
                        setSelectedBike(String(item.id));
                        setShowBikeModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.registration_number}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No bikes added yet.</Text>
                      <TouchableOpacity style={styles.addNewButton} onPress={handleAddNewBike}>
                        <Text style={styles.addNewButtonText}>Add New Bike</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              )}

              <TouchableOpacity style={styles.modalClose} onPress={() => setShowBikeModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Pincode</Text>
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={setPincode}
          placeholder="e.g. 560001"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Add or Update phone</Text>
        <PhoneCard />

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
          <DateTimePicker
            value={preferredDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) setPreferredDate(date);
            }}
          />
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
                <Text
                  style={[
                    styles.timeSlotText,
                    selectedTime === slot && styles.timeSlotTextActive,
                  ]}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>Address</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, !useManualAddress && styles.toggleBtnActive]}
            onPress={() => setUseManualAddress(false)}
          >
            <Text style={[styles.toggleBtnText, !useManualAddress && styles.toggleBtnTextActive]}>
              Choose Address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, useManualAddress && styles.toggleBtnActive]}
            onPress={() => setUseManualAddress(true)}
          >
            <Text style={[styles.toggleBtnText, useManualAddress && styles.toggleBtnTextActive]}>
              Enter Manually
            </Text>
          </TouchableOpacity>
        </View>

        {useManualAddress ? (
          <TextInput
            style={styles.textArea}
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="Enter full address"
            multiline
          />
        ) : (
          <>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                if (!isRedirecting) setShowAddressModal(true);
              }}
            >
              <Text style={styles.dropdownText}>{selectedAddressName}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <Modal visible={showAddressModal} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Select Address</Text>

                  {addressesLoading ? (
                    <ActivityIndicator style={{ paddingVertical: 24 }} />
                  ) : (
                    <FlatList
                      data={addresses}
                      keyExtractor={(item: any) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.modalItem,
                            selectedAddressId === String(item.id) && styles.modalItemActive,
                          ]}
                          onPress={() => {
                            setSelectedAddressId(String(item.id));
                            setShowAddressModal(false);
                          }}
                        >
                          <Text style={styles.modalItemText}>
                            {item.label || item.address_line}
                          </Text>
                          {item.label ? (
                            <Text style={styles.modalItemSub}>{item.address_line}</Text>
                          ) : null}
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyText}>No addresses saved yet.</Text>
                          <TouchableOpacity
                            style={styles.addNewButton}
                            onPress={handleAddNewAddress}
                          >
                            <Text style={styles.addNewButtonText}>Add New Address</Text>
                          </TouchableOpacity>
                        </View>
                      }
                    />
                  )}

                  <TouchableOpacity
                    style={styles.modalClose}
                    onPress={() => setShowAddressModal(false)}
                  >
                    <Text style={styles.modalCloseText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        )}

        <View style={styles.labelRow}>
          <Text style={styles.label}>Bike Condition</Text>
          <TouchableOpacity
            onPress={() => setShowConditionInfoModal(true)}
            style={styles.infoButton}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              currentCondition === 'running condition' && styles.toggleBtnActive,
            ]}
            onPress={() => setCurrentCondition('running condition')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                currentCondition === 'running condition' && styles.toggleBtnTextActive,
              ]}
            >
              🟢 Running
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              currentCondition === 'dead condition' && styles.toggleBtnActive,
            ]}
            onPress={() => setCurrentCondition('dead condition')}
          >
            <Text
              style={[
                styles.toggleBtnText,
                currentCondition === 'dead condition' && styles.toggleBtnTextActive,
              ]}
            >
              🔴 Dead
            </Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showConditionInfoModal} transparent animationType="fade">
          <View style={styles.infoModalOverlay}>
            <View style={styles.infoModalBox}>
              <Text style={styles.infoModalTitle}>Bike Condition Info</Text>

              <Text style={styles.infoModalText}>
                <Text style={{ fontWeight: '700', color: '#1e293b' }}>Running condition:</Text>{' '}
                The bike starts and can move on its own, even if it has some issue or needs service.
              </Text>

              <Text style={[styles.infoModalText, { marginTop: 10 }]}>
                <Text style={{ fontWeight: '700', color: '#1e293b' }}>Dead condition:</Text>{' '}
                The bike does not start, cannot move on its own, or may need pickup/support to be
                serviced.
              </Text>

              <TouchableOpacity
                style={styles.infoModalCloseButton}
                onPress={() => setShowConditionInfoModal(false)}
              >
                <Text style={styles.infoModalCloseText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes"
          multiline
        />

        <TouchableOpacity style={styles.bookButton} onPress={handleBook} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>Book Service</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 24,
    textAlign: 'center',
    color: '#1e293b',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  infoButton: {
    marginLeft: 6,
    padding: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    elevation: 1,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 10,
    textAlignVertical: 'top',
    fontSize: 15,
    backgroundColor: '#fff',
    elevation: 1,
  },
  row: { flexDirection: 'row' },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 1,
  },
  dropdownText: { fontSize: 15, color: '#1e293b' },
  dropdownArrow: { fontSize: 12, color: '#94a3b8' },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#3b82f6' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleBtnTextActive: { fontSize: 14, fontWeight: '600', color: '#fff' },
  bookButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
  },
  modalItemActive: { backgroundColor: '#dbeafe' },
  modalItemText: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  modalItemSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  modalClose: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 15,
  },
  addNewButton: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  addNewButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  timeSlot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  timeSlotActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  timeSlotText: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  timeSlotTextActive: { color: '#fff' },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  infoModalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoModalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  infoModalCloseButton: {
    marginTop: 18,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  infoModalCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default BookingScreen;