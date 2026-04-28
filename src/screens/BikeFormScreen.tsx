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
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DropDownPicker from 'react-native-dropdown-picker';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
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
        const res = await axios.get(`${API_URL}/user/companies`);
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

  useEffect(() => {
    if (isEditing && models.length > 0 && !modelValue) {
      const match = models.find(
        (m) => m.model_name.toLowerCase() === existingBike.model_name.toLowerCase()
      );
      if (match) setModelValue(String(match.id));
    }
  }, [models]);

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

        console.log('🔵 UPDATE URL:', `${API_URL}/bikes/${existingBike.id}`);
        console.log('🔵 UPDATE PAYLOAD:', JSON.stringify(payload, null, 2));

        res = await axios.put(`${API_URL}/bikes/${existingBike.id}`, payload, { headers });
        console.log('✅ UPDATE SUCCESS:', res.status, res.data);
        Alert.alert('Success', 'Bike updated! ✅');
      } else {
        const payload = {
          company_id: companyValue,
          model_id: modelValue,
          registration_number: form.registration_number,
          purchase_year: year,
          fuel_type: 'petrol',
        };

        console.log('🟢 CREATE URL:', `${API_URL}/bikes/add`);
        console.log('🟢 CREATE PAYLOAD:', JSON.stringify(payload, null, 2));

        res = await axios.post(`${API_URL}/bikes/add`, payload, { headers });
        console.log('✅ CREATE SUCCESS:', res.status, res.data);
        Alert.alert('Success', 'Bike added! 🎉');
      }

      await queryClient.invalidateQueries({ queryKey: ['myBikes'] });
      navigation.goBack();
    } catch (err: any) {
      console.log(
        '❌ ERROR URL:',
        isEditing ? `${API_URL}/bikes/${existingBike.id}` : `${API_URL}/bikes/add`
      );
      console.log('❌ ERROR METHOD:', isEditing ? 'PUT' : 'POST');
      console.log('❌ ERROR STATUS:', err.response?.status);
      console.log('❌ ERROR HEADERS:', err.response?.headers);
      console.log('❌ ERROR DATA:', JSON.stringify(err.response?.data, null, 2));
      console.log('❌ ERROR MESSAGE:', err.message);

      const detail = err.response?.data?.detail;
      Alert.alert(
        'Error',
        typeof detail === 'string' ? detail : JSON.stringify(detail || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

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
          extraScrollHeight={Platform.OS === 'android' ? 40 : 20}
          keyboardOpeningTime={0}
          resetScrollToCoords={{ x: 0, y: 0 }}
        >
          <View style={styles.formCard}>
            <Text style={styles.label}>Brand *</Text>
            <DropDownPicker
              open={openCompany}
              value={companyValue}
              items={companies.map((c) => ({
                label: c.company_name,
                value: String(c.id),
              }))}
              setOpen={setOpenCompany}
              setValue={setCompanyValue}
              setItems={setCompanies as any}
              placeholder="Select Brand"
              zIndex={3000}
              zIndexInverse={1000}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Model *</Text>
            <DropDownPicker
              open={openModel}
              value={modelValue}
              items={models.map((m) => ({
                label: m.model_name,
                value: String(m.id),
              }))}
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

            <Text style={[styles.label, { marginTop: 16 }]}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KA01AB1234"
              value={form.registration_number}
              onChangeText={(t) =>
                setForm((p) => ({ ...p, registration_number: t.toUpperCase() }))
              }
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>Purchase Year *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2020"
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

            {loading ? (
              <ActivityIndicator size="large" color="#16a34a" style={styles.loadingSpinner} />
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>
                  {isEditing ? 'Save Changes' : 'Add Bike'}
                </Text>
              </TouchableOpacity>
            )}

            {isEditing && (
              <Text style={styles.helperText}>
                Bike removal is temporarily unavailable.
              </Text>
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
    paddingBottom: 140,
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
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 13,
    marginBottom: 4,
    borderRadius: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  dropdown: {
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
  },
  dropdownContainer: {
    borderColor: '#e5e7eb',
    borderRadius: 10,
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
  helperText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
  },
  loadingSpinner: {
    marginTop: 24,
  },
});