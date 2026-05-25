import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setupLogoutInterceptor, ejectLogoutInterceptor } from '../api/interceptors';
import {Alert} from 'react-native';


type AuthContextType = {
  isAuthenticated: boolean,
  loading: boolean,
  signIn: (token: string, refreshToken:string, user:any) => Promise<void>;
  signOut: () => Promise<void>;
  handleSessionExpired: () => Promise<void>;
  devSignIn: () => Promise<void>;
};



const AuthContext = createContext<AuthContextType>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const sessionAlertShown = useRef(false);

  const signOut = useCallback(async () => {

    console.log('SIGNOUT START');
    setIsAuthenticated(false);
    console.log('SIGNOUT setIsAuthenticated(false);');

    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
      console.log('SIGNOUT storage cleared')
    } catch (error) {
      console.error('Error clearing auth tokens:', error);
    } 
  }, []);

  const handleSessionExpired = useCallback(async () => {

    if (sessionAlertShown.current) return;

    sessionAlertShown.current = true;

    Alert.alert(
      'Session expired',
      'Your Session has expired. Please log in again to continue. ',
      [
        {
          text: 'Logout and continue',
          onPress: async () => {
            await signOut();
            sessionAlertShown.current = false;
          },
        },
      ],
      {cancelable: false}
    )

    console.log('SESSION EXPIRED HANDLER')
    await signOut();
  }, [signOut]);

  useEffect(() => {
    setupLogoutInterceptor( async () => {
      await handleSessionExpired();
    });

    return () => {
      ejectLogoutInterceptor();
    };
  }, [handleSessionExpired]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Error loading auth state:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const signIn = async (token: string, refreshToken: string, user: any) => {
    try {
      await SecureStore.setItemAsync('accessToken', token);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error storing auth tokens:', error);
      throw error;
    }
  };

  const devSignIn = async () => {
    if (__DEV__) {
      try {
        await SecureStore.setItemAsync('accessToken', 'fake_token');
        await SecureStore.setItemAsync('refreshToken', 'fake_refresh');
        await SecureStore.setItemAsync(
          'user',
          JSON.stringify({
            phone: '9999999999',
            name: 'Dev User',
          })
        );
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error in dev sign in:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        signIn,
        signOut,
        handleSessionExpired,
        devSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);