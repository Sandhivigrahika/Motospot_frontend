// src/hooks/usePhone.tsx
import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

interface StoredUser {
  phone?: string | null;
  [key: string]: any;
}

interface PhoneUpdateResponse {
  message: string;
  saved_phone: string;
}

export const usePhone = () => {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const loadPhone = useCallback(async () => {
    try {
      const raw = await SecureStore.getItemAsync('user');

      if (!raw) {
        setUserPhone(null);
        return;
      }

      const parsed: StoredUser = JSON.parse(raw);
      setUserPhone(parsed.phone ?? null);
    } catch (error) {
      console.log('Failed to load phone from SecureStore:', error);
      setUserPhone(null);
    }
  }, []);

  useEffect(() => {
    loadPhone();
  }, [loadPhone]);

  const openPhoneEdit = useCallback(() => {
    const digits = (userPhone ?? '').replace(/\D/g, '');
    const editablePhone =
      digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits;

    setPhoneInput(editablePhone);
    setPhoneModal(true);
  }, [userPhone]);

  const closePhoneModal = useCallback(() => {
    setPhoneModal(false);
    setPhoneInput('');
  }, []);

  const savePhone = useCallback(async () => {
    const trimmed = phoneInput.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');

    if (!digitsOnly) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    if (digitsOnly.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit number');
      return;
    }

    setPhoneLoading(true);

    try {
      const token = await SecureStore.getItemAsync('accessToken');

      if (!token) {
        return;
      }

      const method = userPhone ? 'put' : 'post';

      const response = await api[method]<PhoneUpdateResponse>(
        '/user/phone',
        { number: digitsOnly },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const savedPhone = response.data?.saved_phone;

      const raw = await SecureStore.getItemAsync('user');
      const parsed: StoredUser = raw ? JSON.parse(raw) : {};
      const updatedUser = { ...parsed, phone: savedPhone };

      await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));

      setUserPhone(savedPhone ?? null);
      setPhoneModal(false);
      setPhoneInput('');
      Alert.alert('Success', 'Phone number updated');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail;

        const isAuthError =
          status === 401 ||
          detail === 'Token expired' ||
          detail === 'Could not validate credentials';

        if (isAuthError) {
          return;
        }

        Alert.alert('Error', detail || 'Something went wrong');
        return;
      }

      Alert.alert('Error', 'Something went wrong');
    } finally {
      setPhoneLoading(false);
    }
  }, [phoneInput, userPhone]);

  return {
    userPhone,
    phoneInput,
    setPhoneInput,
    phoneModal,
    phoneLoading,
    loadPhone,
    openPhoneEdit,
    closePhoneModal,
    savePhone,
  };
};