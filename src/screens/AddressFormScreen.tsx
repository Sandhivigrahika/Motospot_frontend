// src/screens/AddressFormScreen.tsx
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useAddress, MY_ADDRESS_QUERY_KEY } from '../hooks/useAddress';
import { Ionicons } from '@expo/vector-icons';

const ADDRESS_KEY = 'motospot_my_addresses_cache';
const API_URL = 'https://motospotbackend-production.up.railway.app';
const LABELS = ['Home', 'Work', 'Other'];

type FormState = {
  label: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
};

type TextFieldKey =
  | 'label'
  | 'address_line'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'country';

export default function AddressFormScreen() {
  const { getLocation, loading: locating, error: locError } = useCurrentLocation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  const existingAddress = route.params?.address;
  const isEditing = !!existingAddress;

  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const inputRefs = useRef<Partial<Record<TextFieldKey, TextInput | null>>>({});

  const [form, setForm] = useState<FormState>({
    label: existingAddress?.label ?? 'Home',
    address_line: existingAddress?.address_line ?? '',
    city: existingAddress?.city ?? '',
    state: existingAddress?.state ?? '',
    postal_code: existingAddress?.postal_code ?? '',
    country: existingAddress?.country ?? 'India',
    latitude: existingAddress?.latitude ?? null,
    longitude: existingAddress?.longitude ?? null,
    formatted_address: existingAddress?.formatted_address ?? null,
  });

  const update = useCallback((field: TextFieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) {
      throw new Error('Missing access token');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const { selectAddress } = useAddress();

  const handleUseLocation = async () => {
    setLocationNotice(null);
    const coords = await getLocation();
    if (!coords) {
      if (locError) Alert.alert('Location', locError);
      return;
    }

    setGeocoding(true);
    try {
      const headers = await getAuthHeaders();
      const res = await api.post(
        `${API_URL}/address/geocode/reverse`,
        { latitude: coords.latitude, longitude: coords.longitude },
        { headers }
      );
      const geo = res.data;

      setForm((prev) => ({
        ...prev,
        latitude: geo.latitude ?? coords.latitude,
        longitude: geo.longitude ?? coords.longitude,
        address_line: geo.address_line ?? prev.address_line,
        city: geo.city ?? prev.city,
        state: geo.state ?? prev.state,
        postal_code: geo.postal_code ?? prev.postal_code,
        country: geo.country ?? prev.country,
        formatted_address: geo.formatted_address ?? null,
      }));

      setLocationNotice('Address auto-filled. Please review before saving.');
    } catch (err) {
      setForm((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      setLocationNotice('Could not fill the address. Retry or enter manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.address_line || !form.city || !form.state || !form.postal_code) {
      Alert.alert('Validation', 'Please fill Address Line, City, State, and Postal Code.');
      return;
    }

    setLoading(true);

    try {
      const headers = await getAuthHeaders();

      let res;
      if (isEditing) {
        res = await api.put(`${API_URL}/address/${existingAddress.id}`, form, { headers });
        Alert.alert('Success', 'Address updated');
      } else {
        res = await api.post(`${API_URL}/address/add`, form, { headers });
        Alert.alert('Success', 'Address saved');
      }

      const newAddress = res.data;

      try {
        const existing = await AsyncStorage.getItem(ADDRESS_KEY);
        const addresses = existing ? JSON.parse(existing) : [];

        if (isEditing) {
          const index = addresses.findIndex((a: any) => a.id === existingAddress.id);
          if (index !== -1) addresses[index] = newAddress;
        } else {
          addresses.push(newAddress);
        }

        await AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses));
      } catch (e) {
        console.log('Address cache update failed:', e);
      }

      await queryClient.invalidateQueries({ queryKey: ['myAddresses'] });
      navigation.goBack();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to save address.';
      Alert.alert('Error', typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  const FIELDS: {
    field: TextFieldKey;
    label: string;
    placeholder: string;
    keyboardType: 'default' | 'numeric';
    autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  }[] = [
    { field: 'address_line', label: 'Address line *', placeholder: 'House / street / area', keyboardType: 'default', autoCapitalize: 'words' },
    { field: 'city', label: 'City *', placeholder: 'City', keyboardType: 'default', autoCapitalize: 'words' },
    { field: 'state', label: 'State *', placeholder: 'State', keyboardType: 'default', autoCapitalize: 'words' },
    { field: 'postal_code', label: 'Postal code *', placeholder: '560001', keyboardType: 'numeric', autoCapitalize: 'none' },
    { field: 'country', label: 'Country', placeholder: 'Country', keyboardType: 'default', autoCapitalize: 'words' },
  ];

  const locationBusy = locating || geocoding;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraHeight={Platform.OS === 'android' ? 140 : 100}
          extraScrollHeight={Platform.OS === 'android' ? 80 : 40}
          keyboardOpeningTime={250}
          enableResetScrollToCoords={false}
        >
          <Text style={styles.groupLabel}>Where should we come?</Text>

          <Text style={styles.label}>Label *</Text>
          <View style={styles.chipRow}>
            {LABELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, form.label === l && styles.chipActive]}
                onPress={() => update('label', l)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, form.label === l && styles.chipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.locationChip}
            onPress={handleUseLocation}
            activeOpacity={0.85}
            disabled={locationBusy}
          >
            {locationBusy ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <>
                <Ionicons name="location-sharp" size={16} color="#10b981" />
                <Text style={styles.locationChipText}>Use my location</Text>
              </>
            )}
          </TouchableOpacity>

          {locationNotice && <Text style={styles.notice}>{locationNotice}</Text>}
          {form.latitude != null && form.longitude != null && (
            <Text style={styles.coordText}>
              Location attached: {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </Text>
          )}

          {FIELDS.map(({ field, label, placeholder, keyboardType, autoCapitalize }, index) => (
            <View key={field}>
              <Text style={[styles.label, { marginTop: 16 }]}>{label}</Text>
              <TextInput
                ref={(ref) => {
                  inputRefs.current[field] = ref;
                }}
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                autoCorrect={false}
                returnKeyType={index === FIELDS.length - 1 ? 'done' : 'next'}
                blurOnSubmit={index === FIELDS.length - 1}
                value={form[field]}
                onChangeText={(t) => update(field, t)}
                onSubmitEditing={() => {
                  const nextField = FIELDS[index + 1];
                  if (nextField) {
                    inputRefs.current[nextField.field]?.focus();
                  } else {
                    Keyboard.dismiss();
                    handleSubmit();
                  }
                }}
              />
            </View>
          ))}

          <TouchableOpacity
            style={styles.cta}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>{isEditing ? 'Save changes' : 'Save address'}</Text>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flexGrow: 1, padding: 18, paddingBottom: 140, backgroundColor: '#f8fafc' },

  groupLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginTop: 4, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', color: '#64748b', marginBottom: 6, marginLeft: 2 },

  input: {
    borderWidth: 0.5, borderColor: '#e8ecf1', padding: 14, borderRadius: 14,
    fontSize: 15, backgroundColor: '#fff', color: '#1e293b',
  },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    borderWidth: 0.5, borderColor: '#e8ecf1', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#0D0F10', borderColor: '#0D0F10' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    borderWidth: 1, borderColor: '#10b981', borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 12, backgroundColor: '#ecfdf5', marginTop: 12,
  },
  locationChipText: { color: '#10b981', fontWeight: '600', fontSize: 13 },

  cta: { backgroundColor: '#0D0F10', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  notice: {
    fontSize: 13, color: '#b45309', backgroundColor: '#fffbeb', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 10, marginTop: 8,
  },
  coordText: { fontSize: 12, color: '#94a3b8', marginTop: 8, marginLeft: 2 },
});