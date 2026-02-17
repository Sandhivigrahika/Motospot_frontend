/*This file creates a small "authentication service" using React Context, then exposes it as a hook
(useAuth) so the rest of your app (including React Navigation ) can ask is the "user logged in?"
and call signIn/Signout like in the official auth flow guide*/


import React, {createContext, useContext, useEffect, useState} from 'react';
import * as SecureStore from 'expo-secure-store';

type AuthContextType = {
    isAuthenticated: boolean;
    loading: boolean;
    signIn: (token:string, refreshToken: string, user:any) => Promise<void>;
    signOut: () => Promise<void>;
    devSignIn: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null as any); //this contxt will hold n authcontexttype, "null as any" is a TS trick to satisfy the generic type, 

export function AuthProvider({children}: {children: React.ReactNode}) {
    const [ isAuthenticated, setIsAuthenticated] = useState(false); //state and setterok 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const bootstrap = async () => {

            try {

                const token = await SecureStore.getItemAsync('accessToken');
                if (token) {
                    setIsAuthenticated(true);
                } else {
                    setIsAuthenticated(false);
                }
                
            } catch(error) {
                console.error('Error loading auth state:', error);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
            };
        bootstrap();
    }, []);


    const signIn = async(token: string, refreshToken: string, user:any) => {
        
        try{
            await SecureStore.setItemAsync('accessToken',token);
            await SecureStore.setItemAsync('refreshToken', refreshToken);
            await SecureStore.setItemAsync('user', JSON.stringify(user));
            setIsAuthenticated(true);

        } catch(error) {
        console.error('Error storing Auth tokens:', error);
        throw error;
        }
    };

     // ADD THIS ENTIRE FUNCTION
    const devSignIn = async () => {
        if (__DEV__) {
            try {
                await SecureStore.setItemAsync('accessToken', 'fake_token');
                await SecureStore.setItemAsync('refreshToken', 'fake_refresh');
                await SecureStore.setItemAsync('user', JSON.stringify({ 
                    phone: '9999999999', 
                    name: 'Dev User' 
                }));
                setIsAuthenticated(true);
                console.log('Dev login successful');
            } catch (error) {
                console.error('Error in dev sign in:', error);
            }
        }
    };


    const signOut = async () => {
        try {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('user');
            setIsAuthenticated(false)
        } catch(error) {
            console.error('Error clearing Auth tokens:', error);
        }
    };


    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, signIn, signOut, devSignIn }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

/*AuthProvider owns the state. context shares it. useAuth reads it*/