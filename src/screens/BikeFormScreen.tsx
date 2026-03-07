// src/screens/BikeFormScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Alert, ActivityIndicator,
  StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = 'https://motospotbackend-production.up.railway.app';
const FUEL_TYPES = ['petrol',  'electric'];

interface Company { id: string; company_name: string; }
interface Model { id: string; model_name: string; company_id: string; }

export default function BikeFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  // ── Detect mode ──────────────────────────────────────────────────────────
  const existingBike = route.params?.bike;
  const isEditing = !!existingBike;

  // ── State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [openCompany, setOpenCompany] = useState(false);
  const [openModel, setOpenModel] = useState(false);

  const [companyValue, setCompanyValue] = useState<string | null>(null);
  const [modelValue, setModelValue] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  //const [fuelType, setFuelType] = useState(existingBike?.fuel_type ?? 'petrol'); ❌
  const [form, setForm] = useState({
    registration_number: existingBike?.registration_number ?? '',
    purchase_year: existingBike?.purchase_year ? String(existingBike.purchase_year) : '',
  });

  // ── Load companies ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/user/companies`);
        setCompanies(res.data || []);
      } catch {
        Alert.alert('Error', 'Failed to load companies');
      }
    };
    load();
  }, []);

  // ── When editing: auto-select company once companies load ─────────────────
  useEffect(() => {
    if (isEditing && companies.length > 0 && !companyValue) {
      const match = companies.find(
        (c) => c.company_name.toLowerCase() === existingBike.company_name.toLowerCase()
      );
      if (match) setCompanyValue(String(match.id));
    }
  }, [companies]);

  // ── Load models when company changes ─────────────────────────────────────
  useEffect(() => {
    if (!companyValue) {
      setModels([]);
      setModelValue(null);
      return;
    }
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/user/bike-models`, {
          params: { company_id: companyValue },
        });
        setModels(res.data || []);
      } catch {
        Alert.alert('Error', 'Failed to load models');
      }
    };
    load();
  }, [companyValue]);

  // ── When editing: auto-select model once models load ──────────────────────
  useEffect(() => {
    if (isEditing && models.length > 0 && !modelValue) {
      const match = models.find(
        (m) => m.model_name.toLowerCase() === existingBike.model_name.toLowerCase()
      );
      if (match) setModelValue(String(match.id));
    }
  }, [models]);

  // ── Submit ────────────────────────────────────────────────────────────────
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

    if (isEditing) {
      // ── UPDATE: BikeUpdate schema (names, nullable) ──────────────────────
      const selectedCompany = companies.find((c) => String(c.id) === companyValue);
      const selectedModel = models.find((m) => String(m.id) === modelValue);

      const payload = {
        registration_number: form.registration_number || null,
        purchase_year: year || null,
        company_name: null,
        model_name:  null,
        fuel_type:  null,
      };

      console.log('🔵 UPDATE URL:', `${API_URL}/bikes/${existingBike.id}`);
      console.log('🔵 UPDATE PAYLOAD:', JSON.stringify(payload, null, 2));

      const res = await axios.put(`${API_URL}/bikes/${existingBike.id}`, payload, { headers });
      
      console.log('✅ UPDATE SUCCESS:', res.status, res.data);
      Alert.alert('Success', 'Bike updated! ✅');
    } else {
      // ── CREATE: BikeCreate schema (IDs, required) ───────────────────────
      const payload = {
        company_id: companyValue!,
        model_id: modelValue!,
        registration_number: form.registration_number,
        purchase_year: year,
        fuel_type: 'petrol',  // required enum
      };

      console.log('🟢 CREATE URL:', `${API_URL}/bikes/add`);
      console.log('🟢 CREATE PAYLOAD:', JSON.stringify(payload, null, 2));

      const res = await axios.post(`${API_URL}/bikes/add`, payload, { headers });
      
      console.log('✅ CREATE SUCCESS:', res.status, res.data);
      Alert.alert('Success', 'Bike added! 🎉');
    }

    // ── Common success handling ────────────────────────────────────────────
    await queryClient.invalidateQueries({ queryKey: ['myBikes'] });
    navigation.goBack();
  } catch (err: any) {
    // ── FULL ERROR LOGGING ─────────────────────────────────────────────────
    console.log('❌ ERROR URL:', isEditing ? `${API_URL}/bikes/${existingBike.id}` : `${API_URL}/bikes/add`);
    console.log('❌ ERROR METHOD:', isEditing ? 'PUT' : 'POST');
    console.log('❌ ERROR STATUS:', err.response?.status);
    console.log('❌ ERROR HEADERS:', err.response?.headers);
    console.log('❌ ERROR DATA:', JSON.stringify(err.response?.data, null, 2));
    console.log('❌ ERROR MESSAGE:', err.message);

    const detail = err.response?.data?.detail;
    Alert.alert('Error', typeof detail === 'string' ? detail : JSON.stringify(detail || err.message));
  } finally {
    setLoading(false);
  }
};


  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert('Remove Bike', 'Are you sure you want to remove this bike?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setDeleteLoading(true);
          try {
            const token = await SecureStore.getItemAsync('accessToken');
            console.log('🗑️ DELETE URL:', `${API_URL}/bikes/${existingBike.id}`);
            console.log('🗑️ DELETE TOKEN:', token ? 'present' : 'missing');
            await axios.delete(`${API_URL}/bikes/${existingBike.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            await queryClient.invalidateQueries({ queryKey: ['myBikes'] });
            navigation.goBack();
          } catch (err:any) {
            console.log('🗑️ DELETE ERROR:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
            Alert.alert('Cannot Delete Bike', 'This bike has existing service bookings.'),
            [{text: 'OK'}];
          } finally {
            setDeleteLoading(false);
          }
        },
      },
    ]);
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>

          {/* Company Dropdown */}
          <Text style={styles.label}>Brand *</Text>
          <DropDownPicker
            open={openCompany}
            value={companyValue}
            items={companies.map((c) => ({ label: c.company_name, value: String(c.id) }))}
            setOpen={setOpenCompany}
            setValue={setCompanyValue}
            setItems={setCompanies as any}
            placeholder="Select Brand"
            zIndex={3000}
            zIndexInverse={1000}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
          />

          {/* Model Dropdown */}
          <Text style={[styles.label, { marginTop: 16 }]}>Model *</Text>
          <DropDownPicker
            open={openModel}
            value={modelValue}
            items={models.map((m) => ({ label: m.model_name, value: String(m.id) }))}
            setOpen={setOpenModel}
            setValue={setModelValue}
            setItems={setModels as any}
            placeholder={companyValue ? 'Select Model' : 'Select brand first'}
            disabled={!companyValue}
            zIndex={2000}
            zIndexInverse={2000}
            style={[styles.dropdown, !companyValue && { opacity: 0.5 }]}
            dropDownContainerStyle={styles.dropdownContainer}
          />

          {/* Registration */}
          <Text style={[styles.label, { marginTop: 16 }]}>Registration Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. KA01AB1234"
            value={form.registration_number}
            onChangeText={(t) => setForm((p) => ({ ...p, registration_number: t.toUpperCase() }))}
            autoCapitalize="characters"
          />

          {/* Year */}
          <Text style={styles.label}>Purchase Year *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2020"
            keyboardType="numeric"
            maxLength={4}
            value={form.purchase_year}
            onChangeText={(t) => setForm((p) => ({ ...p, purchase_year: t }))}
          />

          

          {/* Submit */}
          {loading ? (
            <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 24 }} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>
                {isEditing ? 'Save Changes' : 'Add Bike'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Delete — only in edit mode */}
          {isEditing && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleteLoading}>
              {deleteLoading
                ? <ActivityIndicator color="#ef4444" />
                : <Text style={styles.deleteText}>Remove Bike</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 16, backgroundColor: '#f3f4f6' },
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', padding: 13,
    marginBottom: 4, borderRadius: 10, fontSize: 15, backgroundColor: '#f9fafb',
  },
  dropdown: { borderColor: '#e5e7eb', borderRadius: 10, backgroundColor: '#f9fafb' },
  dropdownContainer: { borderColor: '#e5e7eb', borderRadius: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  submitBtn: {
    marginTop: 20, backgroundColor: '#16a34a', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteBtn: {
    marginTop: 12, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#ef4444',
  },
  deleteText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
