// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
  RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const BASE = 'https://motospotbackend-production.up.railway.app';

// ── API Helpers ──────────────────────────────────────────────────────────────
const getHeaders = async () => {
  const token = await SecureStore.getItemAsync('accessToken');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const fetchMyBikes = async () => {
  const h = await getHeaders();
  const res = await fetch(`${BASE}/user/my-bikes`, { headers: h });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

const fetchMyAddresses = async () => {
  const h = await getHeaders();
  const res = await fetch(`${BASE}/address/my-addresses`, { headers: h });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { signOut } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<any>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Edit phone modal
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Edit email modal
  const [emailModal, setEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const stored = await SecureStore.getItemAsync('user');
    if (stored) setUser(JSON.parse(stored));
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: bikes = [],
    isLoading: bikesLoading,
    refetch: refetchBikes,
    isFetching: bikesFetching,
  } = useQuery({ queryKey: ['myBikes'], queryFn: fetchMyBikes });

  const {
    data: addresses = [],
    isLoading: addressesLoading,
    refetch: refetchAddresses,
    isFetching: addressesFetching,
  } = useQuery({ queryKey: ['myAddresses'], queryFn: fetchMyAddresses });

  // ── Logout ─────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
  Alert.alert('Logout', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Logout',
      onPress: async () => {
        setLogoutLoading(true);
        try {
          // 1. Call backend
          const headers = await getHeaders();
          await fetch(`${BASE}/auth/logout`, { method: 'POST', headers });

          // 2. Clear local storage
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          await SecureStore.deleteItemAsync('user');

          // 3. Clear React Query cache
          queryClient.clear();

          //4. Your context handles navigation
          await signOut(); //-< from useAuth
         
        } catch (e) {
          // ignore backend logout errors
          console.log('Logout backend error:', e);
        } finally {
          setLogoutLoading(false);
        }
      },
    },
  ]);
};


  // ── Phone Update ───────────────────────────────────────────────────────────
  const openPhoneEdit = () => {
    setPhoneInput(user?.phone ?? '');
    setPhoneModal(true);
  };

  const savePhone = async () => {
    if (!phoneInput.trim()) return;
    setPhoneLoading(true);
    try {
      const headers = await getHeaders();
      const hasPhone = !!user?.phone;
      const res = await fetch(`${BASE}/user/phone`, {
        method: hasPhone ? 'PUT' : 'POST',
        headers: headers,
        body: JSON.stringify({ number: phoneInput.trim() }),
      });

      const text = await res.text();
      console.log("Phone status", res.status);
      console.log("Phone body:", text);

      if (!res.ok) {
        Alert.alert('Error', text || `Status ${res.status}`);
        return;
      }
      const updated = { ...user, phone: phoneInput.trim() };
      await SecureStore.setItemAsync('user', JSON.stringify(updated));
      setUser(updated);
      setPhoneModal(false);
      Alert.alert('Success', 'Phone number updated!');
    } catch (e:any) {
      Alert.alert('Error', e.message || 'Failed to update phone number.');
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Email Update ───────────────────────────────────────────────────────────
  const openEmailEdit = () => {
    setEmailInput(user?.email ?? '');
    setEmailModal(true);
  };

  const saveEmail = async () => {
    const email = emailInput.trim();
    if (!email) return; 

    setEmailLoading(true);

    try {
      const headers = await getHeaders();
      
      // 1) Try update first (PUT), same as swagger update endpoint
      let res = await fetch(`${BASE}/user/email`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({email}),
      });

      //2) If no existing email row/ validation mismatch, try ADD(POST)
      if (res.status === 404 || res.status === 422) {
        res = await fetch(`${BASE}/user/email`, {
          method: 'POST',
          headers,
          body: JSON.stringify({email}),
        });
      }

      const text = await res.text();
      console.log('EMAIL STATUS:', res.status);
      console.log('EMAIL BODY:',text);

      if (!res.ok) {
        // show backend error so you see exactly why it failed
        throw new Error( text || `Status $(res.status)`);

      }
      const updated = { ...user, email: emailInput.trim() };
      await SecureStore.setItemAsync('user', JSON.stringify(updated));
      setUser(updated);
      setEmailModal(false);
      Alert.alert('Success', 'Email updated!');
    } catch (e:any) {
      Alert.alert('Error', e.message ||  'Failed to update email.');
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{flex:1}} edges={['top','left', 'right']}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{user?.name ?? 'User'}</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={bikesFetching || addressesFetching}
            onRefresh={() => { refetchBikes(); refetchAddresses(); }}
            tintColor="#16a34a"
          />
        }
      >
        {/* ── Phone ──────────────────────────────────── */}
        <TouchableOpacity style={styles.fieldRow} onPress={openPhoneEdit} activeOpacity={0.6}>
          <Text style={styles.fieldLabel}>Phone number</Text>
          <Text style={[styles.fieldValue, !user?.phone && styles.emptyValue]}>
            {user?.phone ?? 'No phone added'}
          </Text>
        </TouchableOpacity>

        {/* ── Email ──────────────────────────────────── */}
        <TouchableOpacity style={styles.fieldRow} onPress={openEmailEdit} activeOpacity={0.6}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={[styles.fieldValue, !user?.email && styles.emptyValue]}>
            {user?.email ?? 'No email added'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* ── Added Bikes ────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Added Bikes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BikeForm')}>
              <Text style={styles.addLink}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {bikesLoading ? (
            <ActivityIndicator color="#16a34a" style={styles.loader} />
          ) : bikes.length === 0 ? (
            <Text style={styles.emptyItalic}>No bikes added</Text>
          ) : (
            bikes.map((bike: any) => (
              <TouchableOpacity
                key={bike.id}
                style={styles.itemRow}
                onPress={() => navigation.navigate('BikeForm', { bike })}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemPrimary}>
                    {bike.company_name} {bike.model_name}
                  </Text>
                  <Text style={styles.itemSub}>{bike.registration_number} · {bike.purchase_year}</Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Address ────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Address</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddressForm')}>
              <Text style={styles.addLink}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {addressesLoading ? (
            <ActivityIndicator color="#16a34a" style={styles.loader} />
          ) : addresses.length === 0 ? (
            <Text style={styles.emptyItalic}>No addresses added</Text>
          ) : (
            addresses.map((addr: any) => (
              <TouchableOpacity
                key={addr.id}
                style={styles.itemRow}
                onPress={() => navigation.navigate('AddressForm', { address: addr })}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemPrimary}>{addr.label}</Text>
                  <Text style={styles.itemSub} numberOfLines={1}>
                    {addr.address_line}, {addr.city}
                  </Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Previous Bookings ──────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Previous Bookings</Text>
          <Text style={styles.emptyItalic}>No previous bookings</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Phone Edit Modal ───────────────────────── */}
      <EditModal
        visible={phoneModal}
        title="Phone Number"
        value={phoneInput}
        onChange={setPhoneInput}
        onSave={savePhone}
        onClose={() => setPhoneModal(false)}
        loading={phoneLoading}
        placeholder="+91XXXXXXXXXX"
        keyboardType="phone-pad"
      />

      {/* ── Email Edit Modal ───────────────────────── */}
      <EditModal
        visible={emailModal}
        title="Email"
        value={emailInput}
        onChange={setEmailInput}
        onSave={saveEmail}
        onClose={() => setEmailModal(false)}
        loading={emailLoading}
        placeholder="you@example.com"
        keyboardType="email-address"
      />
    </SafeAreaView>
  );
}

// ── Reusable Edit Modal ──────────────────────────────────────────────────────
function EditModal({
  visible, title, value, onChange, onSave,
  onClose, loading, placeholder, keyboardType,
}: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Edit {title}</Text>
          <TextInput
            style={styles.modalInput}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoFocus
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  logoutBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  divider: { height: 1, backgroundColor: '#e5e7eb' },
  scroll: { flex: 1 },

  // Field Rows (Phone, Email)
  fieldRow: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#f3f4f6',
  },
  fieldLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600', marginBottom: 5 },
  fieldValue: { fontSize: 17, color: '#111827', fontWeight: '400' },
  emptyValue: { color: '#9ca3af', fontStyle: 'italic' },

  // Sections (Bikes, Address, Bookings)
  section: { paddingHorizontal: 20, paddingVertical: 18 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  addLink: { fontSize: 14, color: '#16a34a', fontWeight: '600' },

  emptyItalic: { fontSize: 15, color: '#9ca3af', fontStyle: 'italic' },
  loader: { marginVertical: 10 },

  // Bike / Address rows
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemLeft: { flex: 1 },
  itemPrimary: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemSub: { fontSize: 13, color: '#6b7280', marginTop: 3 },
  rowChevron: { fontSize: 22, color: '#9ca3af' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelText: { color: '#6b7280', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
