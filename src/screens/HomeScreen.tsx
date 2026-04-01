import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  StatusBar,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AddressBar from '../components/AddressBar';
import { useAddress } from '../hooks/useAddress';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://motospotbackend-production.up.railway.app';

const COLORS = {
  bg: '#151620',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  border: '#E2E8F0',
  borderSoft: '#EEF2F7',
  text: '#0f2a20',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#10B981',
  primaryDark: '#059669',
  primarySoft: '#ECFDF5',
  infoSoft: '#EFF6FF',
  shadow: '#0F172A',
  dangerSoft: '#FEE2E2',
};

export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [myBikes, setMyBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { signOut, devSignIn, isAuthenticated } = useAuth();
  const { addresses, latestAddress, isLoading: loadingAddresses, refetch: refetchAddresses} = useAddress();

  const loadUserAndBikes = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      refetchAddresses();

      const storedUser = await SecureStore.getItemAsync('user');

      if (storedUser) {
        setUser(JSON.parse(storedUser));

        const bikesRes = await axios.get(`${API_URL}/user/my-bikes`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('MY-BIKES RAW (storedUser):', bikesRes.data);
        setMyBikes(bikesRes.data || []);
        return;
      }

      console.log('Token for my-bikes:', token ? 'present' : 'MISSING');

      const bikesRes = await axios.get(`${API_URL}/user/my-bikes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('MY-BIKES RAW:', bikesRes.data);
      setMyBikes(bikesRes.data || []);

      const profileRes = await axios.get(`${API_URL}/dashboard/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const freshUser = profileRes.data;
      setUser(freshUser);
      await SecureStore.setItemAsync('user', JSON.stringify(freshUser));
    } catch (err: any) {
      console.error('Load error:', err.response?.data || err.message);
      Alert.alert('Error', 'Failed to load your data. Pull to refresh or try again');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUserAndBikes();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (!isAuthenticated) return;
      loadUserAndBikes();
    });

    return unsubscribe;
  }, [navigation, isAuthenticated]);

  const renderBikeItem = ({ item }: any) => (
    <View style={styles.bikeCard}>
      <View style={styles.bikeIconWrap}>
        <Text style={styles.bikeIcon}>🏍️</Text>
      </View>

      <View style={styles.bikeInfo}>
        <Text style={styles.bikeCompany}>{item.company_name}</Text>
        <Text style={styles.bikeModel}>{item.model_name}</Text>

        <View style={styles.bikeMetaRow}>
          <View style={styles.regBadge}>
            <Text style={styles.bikeReg}>{item.registration_number}</Text>
          </View>

          {!!item.purchase_year && (
            <View style={styles.yearBadge}>
              <Text style={styles.bikeYear}>{item.purchase_year}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.center}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle}>Loading your dashboard</Text>
            <Text style={styles.loadingText}>Fetching profile, bikes and address...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasBikes = myBikes.length > 0;
  const firstName = user.name?.split('_')[0] || user.name?.split(' ')[0] || 'Rider';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.wrapper}>
        <View style={styles.headerShell}>
          <View style={styles.headerRow}>
            <View style={styles.addressContainer}>
              <AddressBar
                address={latestAddress}
                loading={loadingAddresses}
                onPress={() => navigation.navigate('AddressList')}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadUserAndBikes}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>
                  {firstName?.charAt(0)?.toUpperCase() || 'R'}
                </Text>
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>MOTOSPOT HOME</Text>
                <Text style={styles.title}>Welcome, {user.name}!</Text>
                <Text style={styles.subtitle}>Your bikes, bookings and address in one place.</Text>
              </View>
            </View>

            <View style={styles.phoneChip}>
              <Text style={styles.phoneChipLabel}>Phone</Text>
              <Text style={styles.phoneChipValue}>{user.phone}</Text>
            </View>
          </View>

          {hasBikes ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>GARAGE</Text>
                  <Text style={styles.sectionTitle}>Your Bikes</Text>
                </View>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{myBikes.length}</Text>
                </View>
              </View>

              <FlatList
                data={myBikes}
                keyExtractor={(item, index) => String(item.id ?? index)}
                renderItem={renderBikeItem}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.bikeListContent}
              />

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.primaryButton}
                onPress={() => navigation.navigate('BikeForm')}
              >
                <Text style={styles.primaryButtonText}>+ Add Another Bike</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>🏍️</Text>
              </View>

              <Text style={styles.emptyTitle}>Add your first bike</Text>
              <Text style={styles.emptyText}>
                Save your bike details once so booking services becomes much faster.
              </Text>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.primaryButton}
                onPress={() => navigation.navigate('BikeForm')}
              >
                <Text style={styles.primaryButtonText}>+ Add Bike</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>Next step</Text>
            <Text style={styles.quickActionsText}>
              {hasBikes
                ? 'Your garage is ready. You can now continue to booking flow smoothly.'
                : 'Add one bike first so the booking flow feels seamless for the user.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.secondaryButton}
              onPress={() =>
                hasBikes ? navigation.navigate('Book') : navigation.navigate('BikeForm')
              }
            >
              <Text style={styles.secondaryButtonText}>
                {hasBikes ? 'Start Booking' : 'Complete Setup'}
              </Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <View style={styles.devSection}>
              <Text style={styles.devTitle}>Developer Tools</Text>

              <TouchableOpacity style={styles.devButton} onPress={devSignIn} activeOpacity={0.85}>
                <Text style={styles.devButtonText}>🔧 Dev Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devButton, styles.devDangerButton]}
                onPress={signOut}
                activeOpacity={0.85}
              >
                <Text style={styles.devDangerButtonText}>🚪 Logout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.devButton}
                onPress={loadUserAndBikes}
                activeOpacity={0.85}
              >
                <Text style={styles.devButtonText}>🔄 Reload</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.devButton}
                activeOpacity={0.85}
                onPress={async () => {
                  const token = await SecureStore.getItemAsync('accessToken');
                  const res = await axios.get(`${API_URL}/address/my-addresses`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  console.log('ADDRESSES:', res.data);
                }}
              >
                <Text style={styles.devButtonText}>🗺️ Test Addresses</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  wrapper: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  headerShell: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  addressContainer: {
    flex: 1,
    marginRight: 12,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  profileIcon: {
    fontSize: 22,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 36,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.bg,
  },

  loaderCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  loadingText: {
    marginTop: 8,
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  heroTextWrap: {
    flex: 1,
  },

  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
  },

  phoneChip: {
    marginTop: 18,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  phoneChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  phoneChipValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },

  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },

  countBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },

  bikeListContent: {
    paddingTop: 4,
  },

  bikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
    marginBottom: 12,
  },

  bikeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  bikeIcon: {
    fontSize: 20,
  },

  bikeInfo: {
    flex: 1,
  },

  bikeCompany: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },

  bikeModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },

  bikeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  regBadge: {
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 4,
  },

  bikeReg: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.4,
  },

  yearBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 4,
  },

  bikeYear: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  emptyIcon: {
    fontSize: 30,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 18,
  },

  quickActionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },

  quickActionsText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textMuted,
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 4,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: COLORS.text,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  devSection: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },

  devTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },

  devButton: {
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },

  devButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  devDangerButton: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: '#FECACA',
  },

  devDangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991B1B',
  },
});
