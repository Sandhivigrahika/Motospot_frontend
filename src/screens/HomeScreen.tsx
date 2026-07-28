import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ImageBackground,
  FlatList,
  Dimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { api } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AddressBar from '../components/AddressBar';
import { useAddress } from '../hooks/useAddress';
import { SafeAreaView } from 'react-native-safe-area-context';
import SupportRequestModal from '../components/SupportRequestModal';
import { LinearGradient } from 'expo-linear-gradient';
const API_URL = 'https://motospotbackend-production.up.railway.app';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 36;
const BANNER_GAP = 12;
const BANNER_STRIDE = BANNER_WIDTH + BANNER_GAP;

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

  primary: '#A6F400',
  primaryDark: '#7ECC00',
  primarySoft: 'rgba(166, 244, 0, 0.12)',

  dangerSoft: 'rgba(255, 90, 95, 0.12)',
  dangerBorder: 'rgba(255, 90, 95, 0.28)',
  dangerText: '#FF8A8F',

  shadow: '#000000',
};

type Poster = {
  id: string;
  image: number | string;
  serviceType: string;
};

const posters: Poster[] = [
  { id: 'p1', image: require('../../assets/posters/p1.webp'), serviceType: 'Emergency Services' },
  { id: 'p2', image: require('../../assets/posters/p2.webp'), serviceType: 'General Service' },
  { id: 'p3', image: require('../../assets/posters/p3.webp'), serviceType: 'Dent & Paint' },
  { id: 'p4', image: require('../../assets/posters/p4.webp'), serviceType: 'Bike Wash' },
  { id: 'p5', image: require('../../assets/posters/p5.webp'), serviceType: 'General Service' },
];

const services = [

  {
    id: 'ev-repair',
    title: 'EV REPAIR',
    subtitle: 'For electric Vehicles',
    icon: "battery-half-outline",
    serviceType: "EV Repair"
  },

  {
    id: 'general-service',
    title: 'GENERAL\nSERVICE',
    subtitle: 'Comprehensive checks & fluid replacements.',
    icon: 'build-outline',
    serviceType: 'General Service',
  },
  {
    id: 'engine-repair',
    title: 'ENGINE\nREPAIR',
    subtitle: 'Diagnostic checks and rebuilds.',
    icon: 'construct-outline',
    serviceType: 'Engine Repair',
  },
  {
    id: 'dent-paint',
    title: 'DENT &\nPAINT',
    subtitle: 'Full bodywork paint restoration.',
    icon: 'color-wand-outline',
    serviceType: 'Dent & Paint',
  },
  {
    id: 'accident-repair',
    title: 'ACCIDENT\nREPAIR',
    subtitle: 'Damage checks and repair support.',
    icon: 'warning-outline',
    serviceType: 'Accident Repair',
  },
  {
    id: 'minor-service',
    title: 'MINOR SERVICE',
    subtitle: 'at your doorstep',
    icon: 'home-outline',
    serviceType: 'Minor Service'
  },

  


];

export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<{ name: string; phone: string } | null>(null);
  const [myBikes, setMyBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportVisible, setSupportVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const posterListRef = useRef<FlatList<Poster>>(null);

  const { signOut, devSignIn, isAuthenticated } = useAuth();
  const {
    selectedAddress,
    isLoading: loadingAddresses,
    refetch: refetchAddresses,
  } = useAddress();

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

      console.log('New user Loaded!');

      if (storedUser) {
        setUser(JSON.parse(storedUser));

        const bikesRes = await api.get(`${API_URL}/user/my-bikes`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMyBikes(bikesRes.data || []);
        return;
      }

      const bikesRes = await api.get(`${API_URL}/user/my-bikes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMyBikes(bikesRes.data || []);

      const profileRes = await api.get(`${API_URL}/dashboard/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const freshUser = profileRes.data;
      setUser(freshUser);
      await SecureStore.setItemAsync('user', JSON.stringify(freshUser));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;

        const isAuthError =
          status === 401 ||
          detail === 'Token expired' ||
          detail === 'Could not validate credentials';

        if (isAuthError) {
          return;
        }
      }
      console.error(
        'Load error:',
        axios.isAxiosError(err) ? err.response?.data || err.message : err
      );
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

  // Auto-advance carousel
  useEffect(() => {
    if (posters.length < 2) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % posters.length;
        posterListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleServicePress = (serviceType: string) => {
    navigation.navigate('Book', { serviceType });
  };

  const renderPoster = ({ item }: { item: Poster }) => (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.bannerCard, { width: BANNER_WIDTH }]}
      onPress={() => handleServicePress(item.serviceType)}
    >
      <ImageBackground
        source={typeof item.image === 'string' ? { uri: item.image } : item.image}
        style={styles.bannerImage}
        imageStyle={styles.bannerImageStyle}
        resizeMode="contain"
      >
        <View style={styles.bannerOverlay} />
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderService = (service: any) => (
    <TouchableOpacity
      key={service.id}
      activeOpacity={0.9}
      style={styles.serviceCard}
      onPress={() => handleServicePress(service.serviceType)}
    >
      <View style={styles.serviceGlow} />

      <View style={styles.serviceTextBlock}>
        <Text style={styles.serviceTitle}>{service.title}</Text>
        <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
      </View>

      <View style={styles.serviceIconWrap}>
        <Ionicons name={service.icon as any} size={30} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.center}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTitle}>Loading your dashboard</Text>
            <Text style={styles.loadingText}>Fetching profile and home content...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasBikes = myBikes.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.wrapper}>
        <View style={styles.headerShell}>
          <View style={styles.headerRow}>
            <View style={styles.addressContainer}>
              <AddressBar
                onPress={() => navigation.navigate('AddressForm')}
              />
            </View>

            <TouchableOpacity activeOpacity={0.85} style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="person" size={22} color={COLORS.primary} />
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
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.emergencyCard}
            onPress={() => navigation.navigate('Emergency')}
          >
            <View style={styles.emergencyGlow} />
            <LinearGradient
              colors={['#FF5A5F', '#FF3B30', '#D32118']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emergencyContent}
            >
              <View style={styles.emergencyLeft}>
                <View style={styles.emergencyIconWrap}>
                  <Ionicons name="warning" size={22} color="#FFFFFF" />
                </View>

                <View style={styles.emergencyTextBlock}>
                  <Text style={styles.emergencyTitle}>Emergency Services</Text>
                  <Text style={styles.emergencySubtitle}>
                    Roadside help, urgent support, and quick access posters.
                  </Text>
                </View>
              </View>

              <View style={styles.emergencyArrow}>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Poster carousel */}
          <View style={styles.carouselWrap}>
            <FlatList
              ref={posterListRef}
              data={posters}
              keyExtractor={(item) => item.id}
              renderItem={renderPoster}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={BANNER_STRIDE}
              snapToAlignment="start"
              decelerationRate="fast"
              ItemSeparatorComponent={() => <View style={{ width: BANNER_GAP }} />}
              getItemLayout={(_, index) => ({
                length: BANNER_STRIDE,
                offset: BANNER_STRIDE * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_STRIDE);
                setActiveIndex(idx);
              }}
              initialNumToRender={2}
              windowSize={5}
            />

            <View style={styles.dotsRow}>
              {posters.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          </View>

          <View style={styles.welcomeBlock}>
            <Text style={styles.welcomeTitle}>Welcome, {user.name}!</Text>
            <Text style={styles.welcomeSubtitle}>Select a service to continue....</Text>
          </View>

          <View style={styles.servicesGrid}>{services.map(renderService)}</View>

          {!hasBikes && (
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Before you book</Text>
              <Text style={styles.quickActionsText}>
                Add your bike first so bookings are linked to the correct vehicle.
              </Text>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('BikeForm')}
              >
                <Text style={styles.secondaryButtonText}>Add Bike</Text>
              </TouchableOpacity>
            </View>
          )}

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
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.supportFab}
          activeOpacity={0.88}
          onPress={() => setSupportVisible(true)}
        >
          <Ionicons name="help-circle-outline" size={22} color="#0D0F10" />
        </TouchableOpacity>

        <SupportRequestModal
          visible={supportVisible}
          onClose={() => setSupportVisible(false)}
        />
      </View>
    </SafeAreaView>
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
  headerShell: {
    backgroundColor: COLORS.bg,
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
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primarySoft,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
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
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
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

  // Carousel
  carouselWrap: {
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.primary,
  },

  bannerCard: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 8,
  },
  bannerImage: {
  width: '100%',
  aspectRatio: 7 / 5,      // was: height: 255
  justifyContent: 'flex-end',
  },
  bannerImageStyle: {
    borderRadius: 26,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },

  welcomeBlock: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    minHeight: 138,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.83)',
    padding: 14,
    marginBottom: 2,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 6,
    justifyContent: 'space-between',
  },
  serviceGlow: {
    position: 'absolute',
    top: -18,
    left: -12,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(134, 99, 99, 0.09)',
  },
  serviceTextBlock: {
    paddingRight: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  serviceSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  serviceIconWrap: {
    alignSelf: 'flex-end',
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,   // ba(255,255,255,0.04)
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(166,244,0,0.22)',                // 'rgba(255,255,255,0.08)',
  },
  quickActionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginTop: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
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
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceElevated,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(166, 244, 0, 0.28)',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  devSection: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderColor: COLORS.border,
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
    borderColor: COLORS.dangerBorder,
  },
  devDangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dangerText,
  },
  supportFab: {
    position: 'absolute',
    right: 18,
    bottom: 88,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emergencyCard: {
    marginBottom: 16,
    borderRadius: 22,
    backgroundColor: '#FF3B30',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  emergencyGlow: {
    position: 'absolute',
    top: -24,
    left: -10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  emergencyContent: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  emergencyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  emergencyTextBlock: {
    flex: 1,
  },
  emergencyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emergencySubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 18,
  },
  emergencyArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});