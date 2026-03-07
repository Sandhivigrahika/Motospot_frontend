// src/api/bikes.ts
import * as SecureStore from 'expo-secure-store';

const BASE = 'https://motospotbackend-production.up.railway.app';

const getHeaders = async () => {
  const token = await SecureStore.getItemAsync('accessToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export interface Bike {
  id: string;
  registration_number: string;
  purchase_year: number;
  company_name: string;
  model_name: string;
  fuel_type: string;
}

export interface BikeUpdatePayload {
  registration_number: string;
  purchase_year: number;
  company_name: string;
  model_name: string;
  fuel_type: string;
}

export const fetchMyBikes = async (): Promise<Bike[]> => {
  const headers = await getHeaders();
  const res = await fetch(`${BASE}/user/my-bikes`, { headers });
  if (!res.ok) throw new Error('Failed to fetch bikes');
  return res.json();
};

export const updateBike = async (bike_id: string, payload: BikeUpdatePayload): Promise<string> => {
  const headers = await getHeaders();
  const res = await fetch(`${BASE}/bikes/${bike_id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update bike');
  return res.json();
};
