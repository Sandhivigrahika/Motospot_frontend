//src/components/addressbar

import React from 'react'; //imports react core from react
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'; //imports UI components from react native
import { Address } from '../hooks/useAddress'; // imports address typescript interface
import { SafeAreaView } from 'react-native-safe-area-context'; 
/* This defines what this component expects.

Meaning:

address → either an Address object OR null

loading → true/false

onPress → function with no parameters returning nothing

This gives you:

Autocomplete

Compile-time safety

Error prevention*/
interface Props {
  address: Address | null;
  loading: boolean;
  onPress: () => void;
}
//creates a functional component
// Destructures props immediately
// Applies type safety using : Props
export default function AddressBar({ address, loading, onPress }: Props) {
  return (
   <SafeAreaView style={styles.safeArea}>
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconWrapper}>
        <Text style={styles.pinIcon}>📍</Text>
      </View>

      <View style={styles.textWrapper}>
        {loading ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : address ? (
          <>
            <Text style={styles.label} numberOfLines={1}>
              {address.label || 'Home'}
            </Text>
            <Text style={styles.addressLine} numberOfLines={1}>
              {address.address_line}, {address.city}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Add your address</Text>
            <Text style={styles.addressLine}>Tap to add a service location</Text>
          </>
        )}
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconWrapper: {
    marginRight: 10,
  },
  pinIcon: {
    fontSize: 20,
  },
  textWrapper: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  addressLine: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#94a3b8',
    marginLeft: 8,
  },
});
