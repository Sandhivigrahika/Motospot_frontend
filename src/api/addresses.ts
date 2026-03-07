// src/api/addresses.ts
import * as SecureStore from 'expo-secure-store';

const BASE = 'https://motospotbackend-production.up.railway.app';

const getHeaders = async () => {
  const token = await SecureStore.getItemAsync('accessToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export interface Address {
  id: string;
  label: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface AddressUpdatePayload {
  label: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export const fetchMyAddresses = async (): Promise<Address[]> => {
  const headers = await getHeaders();
  const res = await fetch(`${BASE}/address/my-addresses`, { headers });
  if (!res.ok) throw new Error('Failed to fetch addresses');
  return res.json();
};

export const updateAddress = async (address_id: string, payload: AddressUpdatePayload): Promise<string> => {
  const headers = await getHeaders();
  const res = await fetch(`${BASE}/address/${address_id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update address');
  return res.json();
};
