//src/hooks/useCurrentLocation.ts 

import {useState, useCallback} from 'react';
import * as Location from 'expo-location'; 


export interface Coordinates {
    latitude: number;
    longitude: number;
    accuracy: number | null; 
}

interface UseCurrentLocationResult {
    getLocation: () => Promise<Coordinates | null>;
    coords: Coordinates | null;
    loading: boolean;
    error: string | null;
}

export function useCurrentLocation(): UseCurrentLocationResult {
    const [coords, setCoords] = useState<Coordinates | null> (null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null> (null);

    const getLocation = useCallback(async (): Promise<Coordinates | null> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Ask permission (in-context, on button tap)
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission denied');
        return null;
      }

      // 2. Optional but recommended: make sure device location is actually on
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setError('Location services are turned off. Please enable GPS.');
        return null;
      }

      // 3. Get the position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setCoords(result);
      return result;
    } catch (e: any) {
      setError(e?.message ?? 'Failed to get location');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getLocation, coords, loading, error };
}

/* 
Design notes

Returns the coords and stores them in state. 
The caller can either await getLocation() and use the return value directly, or read coords from state. Both work — gives you flexibility when wiring the button.

Separate loading/error from your form's loading, so the location fetch spinner doesn't collide with your submit spinner.

hasServicesEnabledAsync() check — permission can be granted while GPS is physically off (airplane mode, disabled location). Catching this gives the user a clear message instead of a silent hang.

Accuracy.High, not Highest — High is fast and street-accurate; Highest can take noticeably longer waiting for a tighter fix, which isn't worth it for a pickup pin.

No backend, no Google — pure device coords, as scoped. 

*/