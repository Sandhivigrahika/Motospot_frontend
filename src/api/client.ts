import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const api = axios.create({
    baseURL: 'https://motospotbackend-production.up.railway.app',
    timeout: 60000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
},
(error) => Promise.reject(error)
);
