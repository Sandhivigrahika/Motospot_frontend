//src/hooks/useAddress

import { useState, useCallback } from 'react';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://motospotbackend-production.up.railway.app';

export interface Address { //typescript type safety
  id: string;
  label: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string | null;
}

export function useAddress() { // regular function= use prefix tell react " this is a hook", export means other files can import it.
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  /* Two state variables — addresses holds the list fetched from backend (starts as empty array []), 
  loadingAddresses is the spinner flag (starts as false). */

  const fetchAddresses = useCallback(async (tokenOverride?: string) => {
  setLoadingAddresses(true);
  try {
    const token = tokenOverride || await SecureStore.getItemAsync('accessToken');
    if (!token) return;

    const res = await axios.get(`${API_URL}/address/my-addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setAddresses(res.data || []);
  } catch (err: any) {
    console.error('Address fetch error:', err.response?.data || err.message);
  } finally {
    setLoadingAddresses(false);
  }
}, []);


  // Latest address = first item (most recently added)
  const latestAddress = addresses.length > 0 ? addresses[0] : null;

  return { addresses, latestAddress, loadingAddresses, fetchAddresses };
}
