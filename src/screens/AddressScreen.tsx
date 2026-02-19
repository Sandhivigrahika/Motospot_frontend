import React, { useState } from 'react';
import {
  View, Text, TextInput, Button,
  Alert, ActivityIndicator, StyleSheet, ScrollView,
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://motospotbackend-production.up.railway.app';

export default function AddressScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    label: '',
    address_line: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
  });

  const update = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addAddress = async () => {
    if (!form.address_line || !form.city || !form.state || !form.postal_code) {
      Alert.alert('Error', 'Please fill Address Line, City, State, and Postal Code');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        Alert.alert('Error', 'Session expired. Please login again.');
        return;
      }

      await axios.post(`${API_URL}/address/add`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Address saved! 📍');
      navigation.goBack(); // ✅ HomeScreen's focus listener will re-fetch
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
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.formCard}>
        <Text style={styles.title}>Add Address</Text>

        {[
          { field: 'label', placeholder: 'Label (e.g. Home, Work)', required: false },
          { field: 'address_line', placeholder: 'Address Line *', required: true },
          { field: 'city', placeholder: 'City *', required: true },
          { field: 'state', placeholder: 'State *', required: true },
          { field: 'postal_code', placeholder: 'Postal Code *', required: true, numeric: true },
          { field: 'country', placeholder: 'Country', required: false },
        ].map(({ field, placeholder, numeric }) => (
          <TextInput
            key={field}
            style={styles.input}
            placeholder={placeholder}
            keyboardType={numeric ? 'numeric' : 'default'}
            value={(form as any)[field]}
            onChangeText={text => update(field, text)}
          />
        ))}

        {loading ? (
          <ActivityIndicator size="large" color="#10b981" />
        ) : (
          <Button title="Save Address" onPress={addAddress} color="#10b981" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B2B2B',
  },
  formCard: {
    width: '95%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e293b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    fontSize: 15,
  },
});
