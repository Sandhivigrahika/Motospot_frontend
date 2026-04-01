//src/hooks/useAddress.ts
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStorage from 'expo-secure-store';
import axios from 'axios';



const API_URL = 'https://motospotbackend-production.up.railway.app';
export const ADDRESSES_KEY = 'motospot_my_address_cache';
export const MY_ADDRESS_QUERY_KEY = ['myAddresses']; // Shared query key


export interface Address {
  id: string;
  label: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string | null; 
}

const fetchMyAddresses = async (): Promise<Address[]> => {
  const token = await SecureStorage.getItemAsync('accessToken');

  if (!token) {
    throw new Error('No access token found');
  }

  const res = await axios.get<Address[]>(`${API_URL}/address/my-addresses`, {
    headers: {Authorization: `Bearer ${token}`}
  });

  const addresses = res.data || [];
  await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
  return addresses;

};


  export function useAddress() {
    const query = useQuery ({
      queryKey: MY_ADDRESS_QUERY_KEY,
      queryFn: fetchMyAddresses,
      staleTime:1000 *5, //change in production
      gcTime: 1000 *60 *30
    });


    //latest address = first item (most recently added)
    const latestAddress = (query.data ?? []).length >0 ? (query.data ?? []) [0]:
    null;

    return {
      ...query,
      addresses: query.data ?? [],
      latestAddress,
    };
  }
