import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

const BASE = 'https://motospotbackend-production.up.railway.app';

/**
 * Phone number for the logged-in user.
 *
 * Source of truth on the device is the stored `user` object (same one ProfileScreen
 * updates). We re-read it every time the screen gains focus, so a number saved on
 * Profile shows up on Booking too, and we update it immediately after saving here.
 */
export function usePhone() {
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const loadPhone = useCallback(async () => {
    try {
      const raw = await SecureStore.getItemAsync('user');
      const user = raw ? JSON.parse(raw) : null;
      setUserPhone(user?.phone || null);
    } catch {
      setUserPhone(null);
    }
  }, []);

  // Refresh whenever the screen comes into view (e.g. after editing on Profile)
  useFocusEffect(
    useCallback(() => {
      loadPhone();
    }, [loadPhone])
  );

  const openPhoneEdit = () => {
    setPhoneInput((userPhone ?? '').replace(/^\+91/, ''));
    setPhoneModal(true);
  };

  const closePhoneModal = () => {
    if (!phoneLoading) setPhoneModal(false);
  };

  const savePhone = async () => {
    const number = phoneInput.trim();

    if (!/^\d{10}$/.test(number)) {
      Alert.alert('Invalid number', 'Enter a 10-digit phone number.');
      return;
    }

    setPhoneLoading(true);

    let res: Response;
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      res = await fetch(`${BASE}/user/phone`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number }),
      });
    } catch {
      setPhoneLoading(false);
      Alert.alert(
        'Connection problem',
        'Could not reach the server. It may be waking up — try again in a moment.'
      );
      return;
    }

    if (!res.ok) {
      let message = `Something went wrong (status ${res.status})`;
      try {
        const data = await res.json();
        if (typeof data?.detail === 'string') message = data.detail;
      } catch {
        // not JSON — keep fallback
      }
      setPhoneLoading(false);
      Alert.alert('Could not save phone number', message);
      return;
    }

    // Saved on the server → update the card right away, then persist locally
    const saved = `+91${number}`;
    setUserPhone(saved);
    try {
      const raw = await SecureStore.getItemAsync('user');
      const user = raw ? JSON.parse(raw) : {};
      await SecureStore.setItemAsync('user', JSON.stringify({ ...user, phone: saved }));
    } catch {
      // even if caching fails, the phone WAS saved on the server
    }

    setPhoneLoading(false);
    setPhoneModal(false);
  };

  return {
    userPhone,
    phoneInput,
    setPhoneInput,
    phoneModal,
    phoneLoading,
    openPhoneEdit,
    closePhoneModal,
    savePhone,
  };
}