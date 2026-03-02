import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import LoginScreen from './src/screens/LoginScreen';
import OTPScreen from './src/screens/OTPScreen';
import HomeScreen from './src/screens/HomeScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import BikeAddScreen from './src/screens/BikeAddScreen';
import AddressScreen from './src/screens/AddressScreen';
import AddressListScreen from './src/screens/AddressListScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BookingScreen from './src/screens/BookingScreen';
import BookingsListScreen from './src/screens/BookingListScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
      {isAuthenticated ? (
        <Tab.Navigator 
          screenOptions={{ 
            headerShown: false,
            tabBarStyle: { paddingBottom: 8, height: 60 }
          }}
        >
          {/* Main tabs */}
          <Tab.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Home' }}
          />
          <Tab.Screen 
            name="Book" 
            component={BookingScreen} 
            options={{ title: 'Book Now' }}
          />
          <Tab.Screen 
            name="Bookings" 
            component={BookingsListScreen} 
            options={{ title: 'Status' }}
          />
          
          {/* Modals - hidden from tab bar */}
          <Tab.Screen 
            name="BikeAdd" 
            component={BikeAddScreen} 
            options={{ tabBarButton: () => null }}
          />
          <Tab.Screen 
            name="AddressList" 
            component={AddressListScreen} 
            options={{ tabBarButton: () => null }}
          />
          <Tab.Screen 
            name="AddressScreen" 
            component={AddressScreen} 
            options={{ tabBarButton: () => null }}
          />
          <Tab.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ tabBarButton: () => null }}
          />
        </Tab.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
        </Stack.Navigator>
      )}
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
