//src/hooks/useAddress.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStorage from 'expo-secure-store';
import axios from 'axios';
import { api } from '../api/client';

const API_URL = 'https://motospotbackend-production.up.railway.app';
export const ADDRESSES_KEY = 'motospot_my_address_cache';
export const MY_ADDRESS_QUERY_KEY = ['myAddresses']; // Shared query key
export const SELECTED_ADDRESS_KEY = ['selectedAddressId'];


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

  const res = await api.get<Address[]>(`${API_URL}/address/my-addresses`, {
    headers: {Authorization: `Bearer ${token}`}
  });

  const addresses = res.data || [];
  await AsyncStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
  return addresses;

};


  export function useAddress() {


    const queryClient =useQueryClient();

    const query = useQuery ({
      queryKey: MY_ADDRESS_QUERY_KEY,
      queryFn: fetchMyAddresses,
      staleTime:1000 *5, //change in production
      gcTime: 1000 *60 *30
    });

    //shared, in-memory selected id - lives in the query cache, no fetch

    const { data: SelectedId} = useQuery<string | null>({
      queryKey: SELECTED_ADDRESS_KEY,
      queryFn: () => null,
      staleTime: Infinity,
      gcTime: Infinity,
    })


    //latest address = first item (most recently added)
    const addresses = query.data ?? [];
    const latestAddress = addresses[0] ?? null;
    
    //selected if one was chosen and still exists, else fall back to the latest
    const selectedAddress =
     addresses.find(a => a.id === SelectedId) ?? latestAddress;

    const selectAddress = (id: string) => 
      queryClient.setQueryData(SELECTED_ADDRESS_KEY, id);

    return {
      ...query,
      addresses,
      latestAddress,
      selectedAddress,
      selectAddress,
    };
  }
