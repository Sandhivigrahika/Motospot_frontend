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
import axios from 'axios';
import { api } from '../api/client';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

type FieldKey = keyof FormState;

export default function AddressFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  const existingAddress = route.params?.address;
  const isEditing = !!existingAddress;

  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Partial<Record<FieldKey, TextInput | null>>>({});

  const [form, setForm] = useState<FormState>({
    label: existingAddress?.label ?? 'Home',
    address_line: existingAddress?.address_line ?? '',
    city: existingAddress?.city ?? '',
    state: existingAddress?.state ?? '',
    postal_code: existingAddress?.postal_code ?? '',
    country: existingAddress?.country ?? 'India',
  });

  const update = useCallback((field: FieldKey, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
        Alert.alert('Success', 'Address updated! ✅');
      } else {
        res = await api.post(`${API_URL}/address/add`, form, { headers });
        Alert.alert('Success', 'Address saved! 📍');
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
    field: FieldKey;
    placeholder: string;
    keyboardType: 'default' | 'numeric';
    autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  }[] = [
    {
      field: 'address_line',
      placeholder: 'Address Line *',
      keyboardType: 'default',
      autoCapitalize: 'words',
    },
    {
      field: 'city',
      placeholder: 'City *',
      keyboardType: 'default',
      autoCapitalize: 'words',
    },
    {
      field: 'state',
      placeholder: 'State *',
      keyboardType: 'default',
      autoCapitalize: 'words',
    },
    {
      field: 'postal_code',
      placeholder: 'Postal Code *',
      keyboardType: 'numeric',
      autoCapitalize: 'none',
    },
    {
      field: 'country',
      placeholder: 'Country',
      keyboardType: 'default',
      autoCapitalize: 'words',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
          <View style={styles.formCard}>
            <Text style={styles.label}>Label *</Text>
            <View style={styles.chipRow}>
              {LABELS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.chip, form.label === l && styles.chipActive]}
                  onPress={() => update('label', l)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, form.label === l && styles.chipTextActive]}>
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {FIELDS.map(({ field, placeholder, keyboardType, autoCapitalize }, index) => (
              <View key={field}>
                <Text style={styles.label}>{placeholder}</Text>
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[field] = ref;
                  }}
                  style={styles.input}
                  placeholder={placeholder}
                  keyboardType={keyboardType}
                  autoCapitalize={autoCapitalize}
                  autoCorrect={false}
                  returnKeyType={index === FIELDS.length - 1 ? 'done' : 'next'}
                  blurOnSubmit={index === FIELDS.length - 1}
                  value={form[field]}
                  onFocus={() => {
                    setTimeout(() => {
                      const ref = inputRefs.current[field];
                      if (ref) {
                        // @ts-ignore
                        inputRefs.current[field]?.measure?.(() => {});
                      }
                    }, 150);
                  }}
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

            {loading ? (
              <ActivityIndicator size="large" color="#16a34a" style={styles.loadingSpinner} />
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitText}>
                  {isEditing ? 'Save Changes' : 'Save Address'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120,
    backgroundColor: '#f3f4f6',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    marginBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 13,
    borderRadius: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingSpinner: {
    marginTop: 24,
  },
});