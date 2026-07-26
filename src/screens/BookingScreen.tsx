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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { api } from '../api/client';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PhoneCard } from '../components/PhoneCard';
import { useMyBikes } from '../hooks/useMyBikes';
import { useAddress } from '../hooks/useAddress';

import { useCurrentLocation } from '../hooks/useCurrentLocation';

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
  const { getLocation, loading: locating, error: locError } = useCurrentLocation();
  const [geocoding, setGeocoding] = useState(false);
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
  const [locationNotice, setLocationNotice] = useState<string | null> (null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeNotice, setPincodeNotice] = useState<string | null> (null);



  useEffect(() => {
    if (route?.params?.serviceType || route?.params?.serviceRequested) {
      setServiceRequested(route?.params?.serviceType || route?.params?.serviceRequested || '');
    }
  }, [route?.params?.serviceType, route?.params?.serviceRequested]);

  const fetchServices = async () => {
    try {
      setServicesLoading(true);
      const { data } = await api.get(`${API_URL}/Services/services`);
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

  const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

  const handleFetchPincode = async() => {
    setPincodeNotice(null);
    
    const coords = await getLocation();
    if(!coords) {
      if (locError) setPincodeNotice(locError);
      return;
    }

    setPincodeLoading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const res = await api.post(
        `${API_URL}/address/geocode/reverse/pincode`,
        { latitude: coords.latitude, longitude: coords.longitude },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
      // handles either { pincode: "..." }, { postal_code: "..." }, or a bare string
    const fetched = res.data?.pincode ?? res.data?.postal_code ?? res.data;
  
    if (fetched) {
      setPincode(String(fetched));
      setPincodeNotice(' Pincode filled from your location.')
    } else {
      setPincodeNotice('Could not find a pincode for your location. Please enter it manually.');
    }

  } catch (err: any)
 {
  const detail = err?.response?.data?.detail;
  setPincode(detail || 'Could not fetch pincode. Please enter manually.')
 } finally {
  setPincodeLoading(false);
 }

  };
  const handleFetchManualAddress = async () => {

    setLocationNotice(null);

    const coords = await getLocation();
    if (!coords) {
      if (locError) Alert.alert('Location', locError);
      return;
    }

    setGeocoding(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const res = await api.post(
        `${API_URL}/address/geocode/reverse`,
        { latitude: coords.latitude, longitude: coords.longitude },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const geo = res.data;

      if (geo.formatted_address) {
        setManualAddress(geo.formatted_address);
        setLocationNotice('Address filled. Please review before booking.');
      } else {
        setLocationNotice('Got your location but couldn\'t resolve an address. Please type it manually.');
      }
    } catch (err) {
      setLocationNotice('Couldn\'t fetch address from your location. Please type it manually.');
    } finally {
      setGeocoding(false);
    }
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

      const response = await api.post(`${API_URL}/bookings/`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });



      if (response.status === 201 || response.status === 200) {
        Alert.alert('Success', 'Booking Created');
        navigation.navigate('Bookings');
      } else {
        Alert.alert('Success', 'Booking created!');
      }
    }  catch (error: any) {

      // Auth error: ;et the interceptor handle logout, stay silent here
      if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

      if (status === 401 || detail === 'Token expired' || detail === 'Could not validate credentials') {
      return;
    }
  }
      //Request threw - the booking may still have been created (cold_start timeout).
      //verify by refetching and looking for matching booking
      try {
      const token = await SecureStore.getItemAsync('accessToken');
      const res = await api.get('/bookings/me?status=active', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const created = res.data.some(
        (b: any) =>
          b.bike_id === selectedBike &&
          b.status !== 'cancelled' &&
          b.status !== 'rejected'
      );

      if (created) {
        //It actuall went through
        Alert.alert('Success', 'Booking created successfully!');
        navigation.navigate('Bookings');
      } else {
        const detail = error?.response?.data?.detail;
        Alert.alert(
          'Booking failed',
          String(detail || error?.message || 'Could not create booking. Please try again.')
        );
      }

    } catch {
      // Couldn't even re-check (network still down)
      Alert.alert(
        'Check your connection',
        'We could not confirm your booking. Please check the Bookings tab in a moment.'
      );
    } 
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── DARK HEADER (hero) ── */}
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/posters/logo-mark.png')} style={styles.brandMark} />
            <Text style={styles.brandName}>MOTOSPOT</Text>
          </View>
          <Text style={styles.headerTitle}>Let's get your bike sorted</Text>
          <Text style={styles.headerSub}>Book a service in under a minute.</Text>
        </SafeAreaView>

        {/* ── LIGHT FORM (overlaps header) ── */}
        <View style={styles.sheet}>

          {/* Service area */}
          <View style={styles.areaCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.areaLabel}>Service area</Text>
              <TextInput
                style={styles.areaInput}
                value={pincode}
                onChangeText={setPincode}
                placeholder="Enter pincode"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={styles.locatePill}
              onPress={handleFetchPincode}
              activeOpacity={0.85}
              disabled={locating || pincodeLoading}
            >
              {locating || pincodeLoading ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <>
                  <Ionicons name="location-sharp" size={15} color="#10b981" />
                  <Text style={styles.locateText}>Locate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {pincodeNotice && <Text style={styles.notice}>{pincodeNotice}</Text>}

          {/* What */}
          <Text style={styles.groupLabel}>What do you need?</Text>
          <TouchableOpacity style={styles.row} onPress={() => setShowServiceModal(true)} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}><Ionicons name="construct-outline" size={18} color="#475569" /></View>
              <Text style={serviceRequested ? styles.rowText : styles.rowPlaceholder}>
                {serviceRequested || 'Choose a service'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => { if (!isRedirecting) setShowBikeModal(true); }}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}><Ionicons name="bicycle-outline" size={18} color="#475569" /></View>
              <Text style={selectedBike ? styles.rowText : styles.rowPlaceholder}>{selectedBikeName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color="#cbd5e1" />
          </TouchableOpacity>

          {/* When */}
          <Text style={styles.groupLabel}>When works for you?</Text>
          <TouchableOpacity style={styles.row} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}><Ionicons name="calendar-outline" size={18} color="#475569" /></View>
              <Text style={styles.rowText}>{formatDate(preferredDate)}</Text>
            </View>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={preferredDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setPreferredDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
              }}
            />
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 7, paddingVertical: 4 }}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedTime(slot)}
                  style={[styles.slot, selectedTime === slot && styles.slotActive]}
                >
                  <Text style={[styles.slotText, selectedTime === slot && styles.slotTextActive]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Where */}
          <Text style={styles.groupLabel}>Where should we come?</Text>
          <View style={styles.seg}>
            <TouchableOpacity
              style={[styles.segBtn, !useManualAddress && styles.segBtnActive]}
              onPress={() => setUseManualAddress(false)}
            >
              <Text style={[styles.segText, !useManualAddress && styles.segTextActive]}>Saved</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, useManualAddress && styles.segBtnActive]}
              onPress={() => { setUseManualAddress(true); setLocationNotice(null); }}
            >
              <Text style={[styles.segText, useManualAddress && styles.segTextActive]}>Manual</Text>
            </TouchableOpacity>
          </View>

          {useManualAddress ? (
            <>
              <TouchableOpacity
                style={[styles.locatePill, { alignSelf: 'flex-start', marginTop: 10 }]}
                onPress={handleFetchManualAddress}
                activeOpacity={0.85}
                disabled={locating || geocoding}
              >
                {locating || geocoding ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <>
                    <Ionicons name="location-sharp" size={15} color="#10b981" />
                    <Text style={styles.locateText}>Use my location</Text>
                  </>
                )}
              </TouchableOpacity>
              <TextInput
                style={[styles.textArea, { marginTop: 8 }]}
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder="Enter full address"
                placeholderTextColor="#94a3b8"
                multiline
              />
              {locationNotice ? (
                <Text style={styles.notice}>{locationNotice}</Text>
              ) : (
                <Text style={styles.hint}>We'll confirm the address before we ride out.</Text>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.row}
              onPress={() => { if (!isRedirecting) setShowAddressModal(true); }}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}><Ionicons name="home-outline" size={18} color="#475569" /></View>
                <Text style={selectedAddressId ? styles.rowText : styles.rowPlaceholder}>{selectedAddressName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#cbd5e1" />
            </TouchableOpacity>
          )}

          {/* Condition */}
          <View style={styles.groupRow}>
            <Text style={styles.groupLabel}>How's the bike right now?</Text>
            <TouchableOpacity onPress={() => setShowConditionInfoModal(true)} activeOpacity={0.7}>
              <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <View style={styles.seg}>
            <TouchableOpacity
              style={[styles.segBtn, currentCondition === 'running condition' && styles.segBtnActive]}
              onPress={() => setCurrentCondition('running condition')}
            >
              <View style={styles.segIconRow}>
                <Ionicons name="checkmark-circle" size={17} color={currentCondition === 'running condition' ? '#fff' : '#10b981'} />
                <Text style={[styles.segText, currentCondition === 'running condition' && styles.segTextActive]}>Running</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, currentCondition === 'dead condition' && styles.segBtnActive]}
              onPress={() => setCurrentCondition('dead condition')}
            >
              <View style={styles.segIconRow}>
                <Ionicons name="alert-circle" size={17} color={currentCondition === 'dead condition' ? '#fff' : '#ef4444'} />
                <Text style={[styles.segText, currentCondition === 'dead condition' && styles.segTextActive]}>Dead</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <TextInput
            style={[styles.textArea, { marginTop: 12 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything we should know? (optional)"
            placeholderTextColor="#94a3b8"
            multiline
          />

          {/* Phone */}
          <Text style={styles.groupLabel}>Contact number</Text>
          <PhoneCard />

          <TouchableOpacity style={styles.cta} onPress={handleBook} disabled={loading} activeOpacity={0.9}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Confirm booking</Text>}
          </TouchableOpacity>
        </View>

        {/* ── MODALS (logic unchanged) ── */}
        <Modal visible={showServiceModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Choose a service</Text>
              {servicesLoading ? <ActivityIndicator style={{ paddingVertical: 24 }} /> : (
                <FlatList
                  data={services}
                  keyExtractor={(item, index) => `${item.name}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, serviceRequested === item.name && styles.modalItemActive]}
                      onPress={() => { setServiceRequested(item.name); setShowServiceModal(false); }}
                    >
                      <Text style={styles.modalItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyText}>No services available right now.</Text></View>}
                />
              )}
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowServiceModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showBikeModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Choose a bike</Text>
              {bikesLoading ? <ActivityIndicator style={{ paddingVertical: 24 }} /> : (
                <FlatList
                  data={bikes}
                  keyExtractor={(item: any) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, selectedBike === String(item.id) && styles.modalItemActive]}
                      onPress={() => { setSelectedBike(String(item.id)); setShowBikeModal(false); }}
                    >
                      <Text style={styles.modalItemText}>{item.registration_number}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No bikes added yet.</Text>
                      <TouchableOpacity style={styles.addNewButton} onPress={handleAddNewBike}>
                        <Text style={styles.addNewButtonText}>Add a bike</Text>
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

        <Modal visible={showAddressModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Choose an address</Text>
              {addressesLoading ? <ActivityIndicator style={{ paddingVertical: 24 }} /> : (
                <FlatList
                  data={addresses}
                  keyExtractor={(item: any) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, selectedAddressId === String(item.id) && styles.modalItemActive]}
                      onPress={() => { setSelectedAddressId(String(item.id)); setShowAddressModal(false); }}
                    >
                      <Text style={styles.modalItemText}>{item.label || item.address_line}</Text>
                      {item.label ? <Text style={styles.modalItemSub}>{item.address_line}</Text> : null}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No addresses saved yet.</Text>
                      <TouchableOpacity style={styles.addNewButton} onPress={handleAddNewAddress}>
                        <Text style={styles.addNewButtonText}>Add an address</Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              )}
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowAddressModal(false)}>
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showConditionInfoModal} transparent animationType="fade">
          <View style={styles.infoModalOverlay}>
            <View style={styles.infoModalBox}>
              <Text style={styles.infoModalTitle}>Bike condition</Text>
              <Text style={styles.infoModalText}>
                <Text style={{ fontWeight: '700', color: '#1e293b' }}>Running:</Text> The bike starts and moves on its own, even if it needs service.
              </Text>
              <Text style={[styles.infoModalText, { marginTop: 10 }]}>
                <Text style={{ fontWeight: '700', color: '#1e293b' }}>Dead:</Text> The bike won't start or move, and may need pickup.
              </Text>
              <TouchableOpacity style={styles.infoModalCloseButton} onPress={() => setShowConditionInfoModal(false)}>
                <Text style={styles.infoModalCloseText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0F10' },
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: { backgroundColor: '#0D0F10', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 25 },
  brandMark: { width: 35, height: 35, resizeMode: 'contain' },
  brandName: { fontSize: 12, color: '#8B948C', letterSpacing: 1 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#F5F7F2', lineHeight: 28, marginBottom: 5 },
  headerSub: { fontSize: 13, color: '#8B948C' },

  sheet: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    marginTop: -16, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 10,
  },

  areaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e8ecf1',
    borderRadius: 14, padding: 14,
  },
  areaLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  areaInput: { fontSize: 17, fontWeight: '500', color: '#1e293b', padding: 0 },
  locatePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ecfdf5', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
  locateText: { fontSize: 13, color: '#10b981', fontWeight: '600' },

  groupLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 20, marginBottom: 8, marginLeft: 4 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, marginBottom: 8, marginLeft: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e8ecf1',
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  rowText: { fontSize: 15, color: '#1e293b' },
  rowPlaceholder: { fontSize: 15, color: '#94a3b8' },

  slot: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: '#e8ecf1', backgroundColor: '#fff' },
  slotActive: { backgroundColor: '#0D0F10', borderColor: '#0D0F10' },
  slotText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  slotTextActive: { color: '#fff' },

  seg: { flexDirection: 'row', backgroundColor: '#eef1f5', borderRadius: 12, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: 9, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#0D0F10' },
  segIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  segTextActive: { color: '#fff' },

  textArea: { minHeight: 72, borderWidth: 0.5, borderColor: '#e8ecf1', padding: 14, borderRadius: 14, textAlignVertical: 'top', fontSize: 15, backgroundColor: '#fff', color: '#1e293b' },

  cta: { backgroundColor: '#0D0F10', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  notice: { fontSize: 13, color: '#b45309', backgroundColor: '#fffbeb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 8 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 8, marginLeft: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6, backgroundColor: '#f8fafc' },
  modalItemActive: { backgroundColor: '#d1fae5' },
  modalItemText: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  modalItemSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  modalClose: { marginTop: 12, padding: 14, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 15 },
  addNewButton: { marginTop: 12, backgroundColor: '#0D0F10', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  addNewButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  infoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  infoModalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  infoModalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  infoModalText: { fontSize: 14, lineHeight: 22, color: '#475569' },
  infoModalCloseButton: { marginTop: 18, backgroundColor: '#0D0F10', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  infoModalCloseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default BookingScreen;