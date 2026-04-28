/*The code uses TanStack query as the source of truth, reads async storage for initial paint, 
fetches fresh bikes from the API, and writes the fresh result back to AsyncStorage. 
shared query keys are what let invalidateQueries({ queryKey: ['myBikes]}) work properly across screens */


import {useQuery} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const API_URL='https://motospotbackend-production.up.railway.app';
export const BIKES_KEY = 'motospot_my_bikes_cache';
export const MY_BIKES_QUERY_KEY = ['myBikes'];


export interface Bike {
    id: string | number;
    company_name? : string;
    model_name?: string;
    purchase_year?: number;
    fuel_type?: string;
    registration_number?: string;
}

const fetchMyBikes = async (): Promise<Bike[]> => {
  const token = await SecureStore.getItemAsync('accessToken');

  if (!token) {
    throw new Error('No access token found');
  }

  const res = await axios.get<Bike[]>(`${API_URL}/user/my-bikes`, {
    headers: { Authorization: `Bearer ${token}`},
  });

  const bikes = res.data || [];
  await AsyncStorage.setItem(BIKES_KEY, JSON.stringify(bikes));
  return bikes;

};

const getCachedBikes = async (): Promise<Bike[]> => {
    try {
        const cached = await AsyncStorage.getItem(BIKES_KEY);
        return cached ? JSON.parse(cached) : [];
    } catch {
        return [];
    }
};

export function useMyBikes() {
    const query = useQuery({

        queryKey: MY_BIKES_QUERY_KEY,
        queryFn: fetchMyBikes,
        staleTime: 1000*10,
        gcTime: 1000 * 60 * 30,
        initialData: [],
    });

    return {
        ...query,
        bikes: query.data ?? [], 
        getCachedBikes, 
    };
}