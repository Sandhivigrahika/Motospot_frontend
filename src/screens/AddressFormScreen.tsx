// src/screens/AddressFormScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, Alert, ActivityIndicator,
  StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import AsyncStorage from '@react-native-async-storage/async-storage';
const ADDRESS_KEY ='motospot_my_addresses_cache';


const API_URL = 'https://motospotbackend-production.up.railway.app';
const LABELS = ['Home', 'Work', 'Other'];

export default function AddressFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  // ── Detect mode ───────────────────────────────────────────────────────────
  const existingAddress = route.params?.address;
  const isEditing = !!existingAddress;

  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    label: existingAddress?.label ?? 'Home',
    address_line: existingAddress?.address_line ?? '',
    city: existingAddress?.city ?? '',
    state: existingAddress?.state ?? '',
    postal_code: existingAddress?.postal_code ?? '',
    country: existingAddress?.country ?? 'India',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.address_line || !form.city || !form.state || !form.postal_code) {
      Alert.alert('Validation', 'Please fill Address Line, City, State, and Postal Code.');
      return;
    }
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      let res; //declaring the rest variable

      if (isEditing) {
        res = await axios.put(`${API_URL}/address/${existingAddress.id}`, form, { headers });
        Alert.alert('Success', 'Address updated! ✅');
      } else {
        res = await axios.post(`${API_URL}/address/add`, form, { headers });
        Alert.alert('Success', 'Address saved! 📍');
      }

      const newAddress = res.data;

      //cache update (works for both add + edit)
      try {
        const existing = await AsyncStorage.getItem(ADDRESS_KEY);
        const addresses = existing ? JSON.parse(existing): [];

        if (isEditing) {
          //update exisitng
          const index = addresses.findIndex((a:any) => a.id === existingAddress.id);
          if (index !==-1) addresses[index] = newAddress;
        } else {
          //addnew
          addresses.push(newAddress)
        }
      await AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(addresses));

      } catch (e) {
        console.log('Address cache  failed:', e);
      }

      await queryClient.invalidateQueries({ queryKey: ['myAddresses'] });
      navigation.goBack();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      Alert.alert('Error', typeof detail === 'string' ? detail : JSON.stringify(detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = () => {
  Alert.alert('Remove Address', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Remove', style: 'destructive', onPress: async () => {
        setDeleteLoading(true);
        try {
          const token = await SecureStore.getItemAsync('accessToken');
          await axios.delete(`${API_URL}/address/${existingAddress.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          // ✅ ADD THIS — remove from cache
          try {
            const existing = await AsyncStorage.getItem(ADDRESS_KEY);
            const addresses = existing ? JSON.parse(existing) : [];
            const filtered = addresses.filter((a: any) => a.id !== existingAddress.id);
            await AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(filtered));
          } catch (e) {
            console.log('Address cache delete failed:', e);
          }

          await queryClient.invalidateQueries({ queryKey: ['myAddresses'] });
          navigation.goBack();
        } catch {
          Alert.alert('Error', 'Failed to remove address.');
        } finally {
          setDeleteLoading(false);
        }
      },
    },
  ]);
};

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>

          {/* Label chips */}
          <Text style={styles.label}>Label *</Text>
          <View style={styles.chipRow}>
            {LABELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, form.label === l && styles.chipActive]}
                onPress={() => update('label', l)}
              >
                <Text style={[styles.chipText, form.label === l && styles.chipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fields */}
          {[
            { field: 'address_line', placeholder: 'Address Line *' },
            { field: 'city', placeholder: 'City *' },
            { field: 'state', placeholder: 'State *' },
            { field: 'postal_code', placeholder: 'Postal Code *', numeric: true },
            { field: 'country', placeholder: 'Country' },
          ].map(({ field, placeholder, numeric }) => (
            <View key={field}>
              <Text style={styles.label}>{placeholder}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                keyboardType={numeric ? 'numeric' : 'default'}
                value={(form as any)[field]}
                onChangeText={(t) => update(field, t)}
              />
            </View>
          ))}

          {/* Submit */}
          {loading ? (
            <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 24 }} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>
                {isEditing ? 'Save Changes' : 'Save Address'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Delete — only in edit mode */}
          {isEditing && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={deleteLoading}>
              {deleteLoading
                ? <ActivityIndicator color="#ef4444" />
                : <Text style={styles.deleteText}>Remove Address</Text>}
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
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', padding: 13,
    borderRadius: 10, fontSize: 15, backgroundColor: '#f9fafb', marginBottom: 4,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
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
