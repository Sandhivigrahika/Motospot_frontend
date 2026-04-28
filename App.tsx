import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// ── Screen imports ────────────────────────────────────────────────────────────
import LoginScreen from './src/screens/LoginScreen';
import OTPScreen from './src/screens/OTPScreen';
import HomeScreen from './src/screens/HomeScreen';
import GarageScreen from './src/screens/GarageScreen';
import BookingScreen from './src/screens/BookingScreen';
import BookingsListScreen from './src/screens/BookingListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BikeFormScreen from './src/screens/BikeFormScreen';
import AddressFormScreen from './src/screens/AddressFormScreen';
import AddressListScreen from './src/screens/AddressListScreen';

// Log to catch undefined imports immediately
if (!HomeScreen) console.error('HomeScreen is undefined — check export/path');
if (!GarageScreen) console.error('GarageScreen is undefined — check export/path');
if (!BikeFormScreen) console.error('BikeFormScreen is undefined — check export/path');
if (!AddressFormScreen) console.error('AddressFormScreen is undefined — check export/path');

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30, retry: 2 },
  },
});

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#A6F400',
        tabBarInactiveTintColor: '#8B948C',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
        tabBarStyle: {
          backgroundColor: '#0D0F10',
          borderTopColor: '#23272A',
          borderTopWidth: 1,
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
        },
        sceneStyle: {
          backgroundColor: '#050505',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
            Home: focused ? 'home' : 'home-outline',
            Garage: focused ? 'bicycle' : 'bicycle-outline',
            Book: focused ? 'add-circle' : 'add-circle-outline',
            Bookings: focused ? 'receipt' : 'receipt-outline',
          };

          return (
            <Ionicons
              name={icons[route.name] ?? 'home'}
              size={focused ? size + 1 : size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Garage"
        component={GarageScreen}
        options={{ title: 'My Garage' }}
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
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#050505' },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />

      <Stack.Screen name="Profile" component={ProfileScreen} />

      <Stack.Screen
        name="BikeForm"
        component={BikeFormScreen}
        options={({ route }: any) => ({
          headerShown: true,
          title: route.params?.bike ? 'Edit Bike' : 'Add Bike',
          headerBackTitle: 'Back',
          headerTintColor: '#F5F7F2',
          headerStyle: { backgroundColor: '#050505' },
          headerShadowVisible: false,
          headerTitleStyle: { color: '#F5F7F2', fontWeight: '700' },
          contentStyle: { backgroundColor: '#050505' },
        })}
      />

      <Stack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={({ route }: any) => ({
          headerShown: true,
          title: route.params?.address ? 'Edit Address' : 'Add Address',
          headerBackTitle: 'Back',
          headerTintColor: '#F5F7F2',
          headerStyle: { backgroundColor: '#050505' },
          headerShadowVisible: false,
          headerTitleStyle: { color: '#F5F7F2', fontWeight: '700' },
          contentStyle: { backgroundColor: '#050505' },
        })}
      />

      <Stack.Screen
        name="AddressList"
        component={AddressListScreen}
        options={{
          headerShown: true,
          title: 'My Addresses',
          headerBackTitle: 'Back',
          headerTintColor: '#F5F7F2',
          headerStyle: { backgroundColor: '#050505' },
          headerShadowVisible: false,
          headerTitleStyle: { color: '#F5F7F2', fontWeight: '700' },
          contentStyle: { backgroundColor: '#050505' },
        }}
      />
    </Stack.Navigator>
  );
}

function Navigation() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#050505',
        }}
      >
        <ActivityIndicator size="large" color="#A6F400" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppStack />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050505' },
          }}
        >
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}