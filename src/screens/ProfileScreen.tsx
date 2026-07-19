// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const BASE = 'https://motospotbackend-production.up.railway.app';

const COLORS = {
  bg: '#050505',
  surface: '#0D0F10',
  surfaceSoft: '#121416',
  surfaceElevated: '#181B1D',
  border: '#23272A',
  borderSoft: '#1A1D20',

  text: '#F5F7F2',
  textSecondary: '#C7CEC7',
  textMuted: '#8B948C',
  textDark: '#050505',

  primary: '#A6F400',
  primaryDark: '#7ECC00',
  primarySoft: 'rgba(166, 244, 0, 0.12)',

  greenBg: 'rgba(166, 244, 0, 0.12)',
  greenText: '#A6F400',

  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberText: '#FBBF24',

  blueBg: 'rgba(59, 130, 246, 0.12)',
  blueText: '#60A5FA',

  purpleBg: 'rgba(139, 92, 246, 0.12)',
  purpleText: '#A78BFA',

  redBg: 'rgba(255, 90, 95, 0.12)',
  redText: '#FF8A8F',

  shadow: '#000000',
};

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

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [user, setUser] = useState<any>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

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

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          setLogoutLoading(true);
          try {
            const headers = await getHeaders();
            await fetch(`${BASE}/auth/logout`, { method: 'POST', headers });
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('user');
            queryClient.clear();
            await signOut();
          } catch (e) {
            console.log('Logout backend error:', e);
          } finally {
            setLogoutLoading(false);
          }
        },
      },
    ]);
  };

  const openPhoneEdit = () => {
    // Strip +91 so the input shows only the 10-digit number
    const raw = (user?.phone ?? '').replace(/^\+91/, '');
    setPhoneInput(raw);
    setPhoneModal(true);
  };

  const savePhone = async () => {
    const number = phoneInput.trim();

    // Validate: exactly 10 digits (backend adds +91)
    if (!/^\d{10}$/.test(number)) {
      Alert.alert('Invalid number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    setPhoneLoading(true);

    let res: Response;
    try {
      const headers = await getHeaders();
      res = await fetch(`${BASE}/user/phone`, {
        method: user?.phone ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify({ number }),
      });
    } catch (e: any) {
      // Only a genuine network failure lands here
      setPhoneLoading(false);
      Alert.alert(
        'Connection problem',
        'Could not reach the server. It may be waking up — please try again in a moment.'
      );
      return;
    }

    // We got a response — handle success vs error explicitly
    if (!res.ok) {
      let message = `Something went wrong (status ${res.status})`;
      try {
        const data = await res.json();
        if (data?.detail) message = data.detail;
      } catch {
        // not JSON — keep fallback
      }
      setPhoneLoading(false);
      Alert.alert('Could not add phone', message);
      return;
    }

    // Success (2xx) — update local state; guard post-processing separately
    try {
      const updated = { ...user, phone: `+91${number}` };
      await SecureStore.setItemAsync('user', JSON.stringify(updated));
      setUser(updated);
    } catch {
      // even if caching fails, the phone WAS saved on the server
    }

    setPhoneLoading(false);
    setPhoneModal(false);
    Alert.alert('Success', 'Phone number updated!');
  };

  const openEmailEdit = () => {
    setEmailInput(user?.email ?? '');
    setEmailModal(true);
  };

  const saveEmail = async () => {
  const email = emailInput.trim();
  if (!email) return;
  setEmailLoading(true);

  let res: Response;
  try {
    const headers = await getHeaders();
    res = await fetch(`${BASE}/user/email`, {
      method: user?.email ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify({ email }),
    });
  } catch (e: any) {
    setEmailLoading(false);
    Alert.alert(
      'Connection problem',
      'Could not reach the server. It may be waking up — please try again in a moment.'
    );
    return;
  }

  if (!res.ok) {
    let message = `Something went wrong (status ${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) message = data.detail;
    } catch {
      // response wasn't JSON — keep the fallback message
    }
    setEmailLoading(false);
    Alert.alert('Could not update email', message);
    return;
  }

  try {
    const updated = { ...user, email };
    await SecureStore.setItemAsync('user', JSON.stringify(updated));
    setUser(updated);
  } catch {
    // even if caching fails, the email WAS saved on the server
  }

  setEmailLoading(false);
  setEmailModal(false);
  Alert.alert('Success', 'Email updated!');
};

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerEyebrow}>PROFILE</Text>
            <Text style={styles.headerTitle}>{user?.name ?? 'User'}</Text>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            disabled={logoutLoading}
            activeOpacity={0.9}
          >
            {logoutLoading ? (
              <ActivityIndicator color={COLORS.textDark} size="small" />
            ) : (
              <Text style={styles.logoutText}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={bikesFetching || addressesFetching}
              onRefresh={() => {
                refetchBikes();
                refetchAddresses();
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {(user?.name?.charAt(0) || 'U').toUpperCase()}
                </Text>
              </View>

              <View style={styles.heroInfo}>
                <Text style={styles.heroLabel}>Account</Text>
                <Text style={styles.heroName}>{user?.name ?? 'User'}</Text>
                <Text style={styles.heroSub}>
                  Manage contact details, bikes, and saved addresses.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>Tap to update</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.fieldRow} onPress={openPhoneEdit} activeOpacity={0.85}>
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldLabel}>Phone number</Text>
                <Text style={[styles.fieldValue, !user?.phone && styles.emptyValue]}>
                  {user?.phone ?? 'No phone added'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fieldRow, styles.rowLast]}
              onPress={openEmailEdit}
              activeOpacity={0.85}
            >
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={[styles.fieldValue, !user?.email && styles.emptyValue]}>
                  {user?.email ?? 'No email added'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Added Bikes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BikeForm')} activeOpacity={0.85}>
                <Text style={styles.addLink}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {bikesLoading ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : bikes.length === 0 ? (
              <Text style={styles.emptyItalic}>No bikes added</Text>
            ) : (
              bikes.map((bike: any, i: number) => (
                <TouchableOpacity
                  key={bike.id}
                  style={[styles.itemRow, i === bikes.length - 1 && styles.rowLast]}
                  onPress={() => navigation.navigate('BikeForm', { bike })}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemPrimary} numberOfLines={1}>
                      {bike.company_name} {bike.model_name}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {bike.registration_number} · {bike.purchase_year}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Address</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddressForm')} activeOpacity={0.85}>
                <Text style={styles.addLink}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {addressesLoading ? (
              <ActivityIndicator color={COLORS.primary} style={styles.loader} />
            ) : addresses.length === 0 ? (
              <Text style={styles.emptyItalic}>No addresses added</Text>
            ) : (
              addresses.map((addr: any, i: number) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.itemRow, i === addresses.length - 1 && styles.rowLast]}
                  onPress={() => navigation.navigate('AddressForm', { address: addr })}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemPrimary} numberOfLines={1}>
                      {addr.label}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {addr.address_line}, {addr.city}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Motospot Support</Text>

            <TouchableOpacity
              style={styles.supportRow}
              onPress={() => Linking.openURL('tel:+917903499148')}
              activeOpacity={0.85}
            >
              <View style={styles.supportIcon}>
                <Ionicons name="call" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.supportText}>
                <Text style={styles.supportLabel}>Phone</Text>
                <Text style={styles.supportValue}>+91 79034 99148</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.supportRow, styles.rowLast]}
              onPress={() => Linking.openURL('mailto:support@motospot.in')}
              activeOpacity={0.85}
            >
              <View style={styles.supportIcon}>
                <Ionicons name="mail" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.supportText}>
                <Text style={styles.supportLabel}>Email</Text>
                <Text style={styles.supportValue}>support@motospot.in</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

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
      </View>
    </SafeAreaView>
  );
}

function EditModal({
  visible,
  title,
  value,
  onChange,
  onSave,
  onClose,
  loading,
  placeholder,
  keyboardType,
}: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit {title}</Text>

            <TextInput
              style={styles.modalInput}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={COLORS.textMuted}
              keyboardType={keyboardType}
              autoCapitalize="none"
              autoFocus
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.9}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={loading} activeOpacity={0.9}>
                {loading ? (
                  <ActivityIndicator color={COLORS.textDark} size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: COLORS.bg,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  logoutBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: COLORS.textDark,
    fontWeight: '800',
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.18)',
  },
  sectionPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  addLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '800',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  fieldLeft: {
    flex: 1,
    paddingRight: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptyValue: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  // Removes the trailing divider on the last row of any section
  rowLast: {
    borderBottomWidth: 0,
  },
  loader: {
    marginVertical: 10,
  },
  emptyItalic: {
    fontSize: 15,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  itemLeft: {
    flex: 1,
    paddingRight: 12,
  },
  itemPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  supportIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  supportText: {
    flex: 1,
    paddingRight: 12,
  },
  supportLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  supportValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 18,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    minHeight: 46,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: COLORS.textDark,
    fontWeight: '800',
    fontSize: 15,
  },
});