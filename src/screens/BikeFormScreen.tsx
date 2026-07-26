// src/screens/BikeFormScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DropDownPicker from 'react-native-dropdown-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { api } from '../api/client';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIKES_KEY = 'motospot_my_bikes_cache';
const API_URL = 'https://motospotbackend-production.up.railway.app';

interface Company {
  id: string;
  company_name: string;
}

interface Model {
  id: string;
  model_name: string;
  company_id: string;
}

interface Bike {
  id: string | number;
  registration_number: string;
  company_name: string;
  model_name: string;
  purchase_year?: number;
}

export default function BikeFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  const existingBike = route.params?.bike;
  const isEditing = !!existingBike;

  const [loading, setLoading] = useState(false);

  const [openCompany, setOpenCompany] = useState(false);
  const [openModel, setOpenModel] = useState(false);

  const [companyValue, setCompanyValue] = useState<string | null>(null);
  const [modelValue, setModelValue] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [form, setForm] = useState({
    registration_number: existingBike?.registration_number ?? '',
    purchase_year: existingBike?.purchase_year ? String(existingBike.purchase_year) : '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`${API_URL}/user/companies`);
        setCompanies(res.data || []);
      } catch {
        Alert.alert('Error', 'Failed to load companies');
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isEditing && companies.length > 0 && !companyValue) {
      const match = companies.find(
        (c) => c.company_name.toLowerCase() === existingBike.company_name.toLowerCase()
      );
      if (match) setCompanyValue(String(match.id));
    }
  }, [companies]);

  useEffect(() => {
    if (!companyValue) {
      setModels([]);
      setModelValue(null);
      return;
    }

    const load = async () => {
      try {
        const res = await api.get(`${API_URL}/user/bike-models`, {
          params: { company_id: companyValue },
        });
        setModels(res.data || []);
      } catch {
        Alert.alert('Error', 'Failed to load models');
      }
    };
    load();
  }, [companyValue]);

  useEffect(() => {
    if (isEditing && models.length > 0 && !modelValue) {
      const match = models.find(
        (m) => m.model_name.toLowerCase() === existingBike.model_name.toLowerCase()
      );
      if (match) setModelValue(String(match.id));
    }
  }, [models]);

  const updateBikeCache = async (newBike: Bike) => {
    try {
      const existingStr = await AsyncStorage.getItem(BIKES_KEY);
      const bikes = existingStr ? JSON.parse(existingStr) : [];

      if (isEditing) {
        const index = bikes.findIndex((b: Bike) => b.id === existingBike.id);
        if (index !== -1) bikes[index] = newBike;
      } else {
        bikes.push(newBike);
      }

      await AsyncStorage.setItem(BIKES_KEY, JSON.stringify(bikes));
      await queryClient.invalidateQueries({ queryKey: ['myBikes'] });
    } catch (e) {
      console.log('cache failed', e);
    }
  };

  const handleSubmit = async () => {
    if (!companyValue || !modelValue || !form.registration_number || !form.purchase_year) {
      Alert.alert('Validation', 'Please fill all fields.');
      return;
    }

    const year = parseInt(form.purchase_year, 10);
    if (isNaN(year) || year < 1990 || year > new Date().getFullYear()) {
      Alert.alert('Validation', 'Enter a valid purchase year.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      let res;

      if (isEditing) {
        const payload = {
          registration_number: form.registration_number || null,
          purchase_year: year || null,
          company_name: null,
          model_name: null,
          fuel_type: null,
        };

        res = await api.put(`${API_URL}/bikes/${existingBike.id}`, payload, { headers });
        Alert.alert('Success', 'Bike updated');
      } else {
        const payload = {
          company_id: companyValue,
          model_id: modelValue,
          registration_number: form.registration_number,
          purchase_year: year,
          fuel_type: 'petrol',
        };

        res = await api.post(`${API_URL}/bikes/add`, payload, { headers });
        Alert.alert('Success', 'Bike added');
      }

      if (res?.data) {
        await updateBikeCache(res.data);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['myBikes'] });
      }

      navigation.goBack();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      Alert.alert(
        'Error',
        typeof detail === 'string' ? detail : JSON.stringify(detail || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

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
          extraScrollHeight={Platform.OS === 'android' ? 40 : 20}
          keyboardOpeningTime={0}
          resetScrollToCoords={{ x: 0, y: 0 }}
        >
          <View style={styles.groupRow}>
            <Text style={styles.groupLabel}>Which bike is it?</Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Why we collect this',
                  'Vehicle number helps us track your orders efficiently'
                )
              }
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Why we collect vehicle number"
            >
              <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Brand *</Text>
          <DropDownPicker
            open={openCompany}
            value={companyValue}
            items={companies.map((c) => ({ label: c.company_name, value: String(c.id) }))}
            setOpen={setOpenCompany}
            setValue={setCompanyValue}
            setItems={setCompanies as any}
            placeholder="Select brand"
            zIndex={3000}
            zIndexInverse={1000}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Model *</Text>
          <DropDownPicker
            open={openModel}
            value={modelValue}
            items={models.map((m) => ({ label: m.model_name, value: String(m.id) }))}
            setOpen={setOpenModel}
            setValue={setModelValue}
            setItems={setModels as any}
            placeholder={companyValue ? 'Select model' : 'Select brand first'}
            disabled={!companyValue}
            zIndex={2000}
            zIndexInverse={2000}
            style={[styles.dropdown, !companyValue && { opacity: 0.5 }]}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Registration number *</Text>
          <TextInput
            style={styles.input}
            placeholder="KA01AB1234"
            placeholderTextColor="#94a3b8"
            value={form.registration_number}
            onChangeText={(t) => setForm((p) => ({ ...p, registration_number: t.toUpperCase() }))}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Purchase year *</Text>
          <TextInput
            style={styles.input}
            placeholder="2020"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={4}
            value={form.purchase_year}
            onChangeText={(t) => setForm((p) => ({ ...p, purchase_year: t }))}
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleSubmit();
            }}
          />

          <TouchableOpacity
            style={styles.cta}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>{isEditing ? 'Save changes' : 'Add bike'}</Text>
            )}
          </TouchableOpacity>

          {isEditing && (
            <Text style={styles.hint}>Bike removal is temporarily unavailable.</Text>
          )}
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { flexGrow: 1, padding: 18, paddingBottom: 140, backgroundColor: '#f8fafc' },

  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, marginTop: 4 },
  groupLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b' },

  label: { fontSize: 13, fontWeight: '500', color: '#64748b', marginBottom: 6, marginLeft: 2 },

  input: {
    borderWidth: 0.5, borderColor: '#e8ecf1', padding: 14, borderRadius: 14,
    fontSize: 15, backgroundColor: '#fff', color: '#1e293b',
  },

  dropdown: { borderWidth: 0.5, borderColor: '#e8ecf1', borderRadius: 14, backgroundColor: '#fff', minHeight: 50 },
  dropdownContainer: { borderWidth: 0.5, borderColor: '#e8ecf1', borderRadius: 14 },
  dropdownText: { fontSize: 15, color: '#1e293b' },
  dropdownPlaceholder: { fontSize: 15, color: '#94a3b8' },

  cta: { backgroundColor: '#0D0F10', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  hint: { marginTop: 12, textAlign: 'center', fontSize: 13, color: '#94a3b8' },
});