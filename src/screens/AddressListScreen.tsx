import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAddress, MY_ADDRESS_QUERY_KEY} from '../hooks/useAddress';






export default function AddressListScreen({ navigation }: any) {
  const {
    addresses,
    isLoading: loading,
    selectedAddress,
    selectAddress,
  } = useAddress();


const dbg = useAddress();
console.log('useAddress path check →', typeof dbg.selectAddress, Object.keys(dbg));

  

  const onSelect = (item: any) => {
    selectAddress(item.id);   // writes to the shared cache the bar reads
    console.log('Selected -> ', item.id);
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}> Select Address </Text>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedAddress?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.addressCard, isSelected && styles.selectedAddress]}
              onPress={() => onSelect(item)}
            >
              <View>
                <Text style={styles.addressName}>{item.label}</Text>
                <Text style={styles.addressDetails}>{item.address_line}</Text>
                <Text style={styles.addressDetails}>
                  {`${item.city}, ${item.state} ${item.postal_code}`}
                </Text>
              </View>
              {isSelected && <Text style={styles.selectedIcon}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No addresses saved</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddressForm')}
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