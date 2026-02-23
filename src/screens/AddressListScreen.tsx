// screens/ AddressListScreen.tsx
import React, {useState, useEffect} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const API_URL = 'https://motospotbackend-production.up.railway.app';

export default function AddressListScreen({navigation}: any) {
    const [addresses, setAddresses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState< string | null>(null);

    

    useEffect( () => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        try {
            setLoading(true);
            const token = await SecureStore.getItemAsync('accessToken');

            if (!token) {
                console.log('No token in secureStore')
                Alert.alert('Session Expired','Please login again');
                navigation.navigate('Login'); //redirect login
                return
            }

            console.log("Token found:", token ? 'yes': 'no');
            const addressesRes = await axios.get(`${API_URL}/address/my-addresses`, {
                headers: {Authorization: `Bearer ${token}`}
            });

            setAddresses(addressesRes.data || []);
        } catch (err: any) {
            console.error('Addresses error:', err.response?.data);
        } finally {
            setLoading(false);
        }

    };

    const selectAddress = async (address: any) => {
        // Save to secureStore or emit to context
        SecureStore.setItemAsync('currentAddress', JSON.stringify(address));
        navigation.goBack(); //return to home
    };

    if (loading) {
       return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color= "#10b981"/>
        </View>
       );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}> Select Address </Text>

            <FlatList
            data={addresses}
            keyExtractor={(item)=> item.id}
            renderItem={({item }) => (
                <TouchableOpacity
                style={[
                    styles.addressCard,
                    selectedId=== item.id && styles.selectedAddress
                ]}
                onPress= {() => selectAddress(item)}
                >
                <View>
                    <Text style = {styles.addressName}>{item.name}</Text>
                    <Text style = {styles.addressDetails}>{item.address_line}</Text> 
                    <Text style= {styles.addressDetails}>{`${item.city}, ${item.state} ${item.postal_code}`}</Text>   
                    <Text style={styles.phone}>{item.phone}</Text>
                </View>
                {selectedId===item.id && <Text style={styles.selectedIcon}>✓</Text>}
                </TouchableOpacity>
            )}

            ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No addresses saved</Text>
          </View>
        }

        />
         <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddressScreen')}
      >
        <Text style={styles.addButtonText}>+ Add New Address</Text>
      </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  addressCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedAddress: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  addressName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  addressDetails: { fontSize: 14, color: '#64748b', marginTop: 2 },
  phone: { fontSize: 14, color: '#10b981', marginTop: 4 },
  selectedIcon: { fontSize: 20, color: '#10b981' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#64748b' },
  addButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});