//src/hooks/useLocatiionAutofill.ts

import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

import { api } from '../api/client';
import { useCurrentLocation} from './useCurrentLocation'


const API_URL = 'https://motospotbackend-production.up.railway.app';


export interface GeocodeResult {
    address_line: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    formatted_address: string | null;
    latitude: number;
    longitude: number;
    }



export function useLocationAutofill() {
    const {getLocation, loading: locating, error: locError } = useCurrentLocation();
    const [geocoding, setGeocoding] = useState(false);


    const fetchLocationAddress = useCallback(async(): Promise<GeocodeResult | null> => {
        const coords = await getLocation();
        if(!coords) return null;

        setGeocoding(true);

        try {
            const token = await SecureStore.getItemAsync('accessToken');
            const res = await api.post(
                `${API_URL}/address/geocode/reverse`,
                { latitude : coords.latitude, longitude: coords.longitude },
                {headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}}
            );
            return res.data as GeocodeResult;
        } catch {
            //GEOCODING FAILED -RETURN RAW COORDS SO CALLER CAN STILL USE THEM
            return {
                address_line: null, city: null, state: null, postal_code: null,
                country: null, formatted_address: null,
                latitude: coords.latitude, longitude: coords.longitude,
            };
        } finally {
            setGeocoding(false);
        }
    }, [getLocation]);

    return { fetchLocationAddress, loading: locating || geocoding, error: locError };
}
