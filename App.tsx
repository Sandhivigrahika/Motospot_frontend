import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import OTPScreen from './src/screens/OTPScreen';
import HomeScreen from './src/screens/HomeScreen';  // ADD YOUR HOME SCREEN
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import BikeAddScreen from './src/screens/BikeAddScreen';
import AddressScreen from './src/screens/AddressScreen';
import AddressListScreen from './src/screens/AddressListScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';


const Stack = createNativeStackNavigator();

function Navigation() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated Stack
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="BikeAdd" component={BikeAddScreen} />
            <Stack.Screen name="AddressList" component={AddressListScreen} />
            <Stack.Screen name ="AddressScreen" component={AddressScreen} />
            
            {/* Add other authenticated screens here */}
          </>
        ) : (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
   <SafeAreaProvider>
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  </SafeAreaProvider>
  );
}
