import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

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

  // Deeper, less-saturated red — reads more premium than iOS neon red
  danger: '#D62828',
  dangerSoft: 'rgba(214, 40, 40, 0.14)',
  dangerBorder: 'rgba(214, 40, 40, 0.34)',
  dangerText: '#F0908F',

  shadow: '#000000',
};

// Gradient stops (deep crimson → richer, not flat neon)
const BANNER_GRADIENT = ['#E23A3A', '#C81E1E', '#A81818'] as const;
const CALL_GRADIENT = ['#E23A3A', '#C11F1F'] as const;

// Helpline number — change to your real emergency line.
const HELPLINE = '+917903499148';
// Human-readable version for display only
const HELPLINE_DISPLAY = '+91 79034 99148';
// WhatsApp target for location shares (country code + number, no '+' or spaces)
const ADMIN_WHATSAPP = '917903499148';

type EmergencyService = {
  id: number;
  name: string;
  description: string;
  price: string;
};

const TWO_WHEELER_SERVICES: EmergencyService[] = [
  { id: 1, name: 'Puncture (Tubeless / Tube)', description: 'On-site puncture repair', price: '₹199 / ₹299' },
  { id: 2, name: 'Fuel Delivery (1 litre)', description: 'Emergency fuel at your location', price: 'Rate + ₹149' },
  { id: 3, name: 'Battery Issue', description: 'Battery check & jumpstart', price: '₹249' },
  { id: 4, name: 'Flat Tyre Support', description: 'Tyre change or repair on-site', price: 'Rate + ₹499' },
  { id: 5, name: 'Cable Breakdown', description: 'Clutch / brake / accelerator cable', price: 'Rate + ₹249' },
  { id: 6, name: 'Towing Service (up to 5km)', description: 'Vehicle towing to nearest garage', price: '₹999' },
  { id: 7, name: 'Other Support', description: 'Tell us what you need', price: 'On request' },
];

const FOUR_WHEELER_SERVICES: EmergencyService[] = [
  { id: 1, name: 'Puncture (Tubeless / Tube)', description: 'On-site puncture repair', price: '₹299 / ₹499' },
  { id: 2, name: 'Stepney Replacement', description: 'Spare tyre fitting', price: '₹299' },
  { id: 3, name: 'Fuel Delivery (2 litre)', description: 'Emergency fuel at your location', price: 'Rate + ₹199' },
  { id: 4, name: 'Towing Service', description: 'Flatbed towing for cars & SUVs', price: '₹1500' },
  { id: 5, name: 'Battery Jumpstart', description: 'Jumpstart or battery replacement', price: '₹499' },
  { id: 6, name: 'Flat Tyre Support', description: 'Tyre change or spare fitting', price: 'Rate + ₹499' },
  { id: 7, name: 'Other Support', description: 'Tell us what you need', price: 'On request' },
];

const SECTIONS = [
  { key: 'two', title: 'Two Wheeler', icon: 'bicycle-outline' as const, services: TWO_WHEELER_SERVICES },
  { key: 'four', title: 'Four Wheeler', icon: 'car-outline' as const, services: FOUR_WHEELER_SERVICES },
];

// Memoized row so switching vehicle type only swaps data, not the whole list
const ServiceRow = React.memo(function ServiceRow({
  service,
  onPress,
}: {
  service: EmergencyService;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIndex}>
        <Text style={styles.rowIndexText}>{service.id}</Text>
      </View>
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowName}>{service.name}</Text>
        <Text style={styles.rowDesc}>{service.description}</Text>
      </View>
      <View style={styles.rowPriceWrap}>
        <Text style={styles.rowPrice}>{service.price}</Text>
        <Ionicons name="call-outline" size={14} color={COLORS.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
});

export default function EmergencyScreen({ navigation }: any) {
  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
  const active = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0];

  const { getLocation, loading: locating, error: locError } = useCurrentLocation();

  // Opens WhatsApp with a pre-filled emergency message containing a map link
  const handleShareLocation = async () => {
    const coords = await getLocation();
    if (!coords) {
      Alert.alert(
        'Location needed',
        locError || 'Please enable location so we can find you.'
      );
      return;
    }

    const mapsLink = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;

    const message =
      `🚨 *EMERGENCY — MotoSpot*\n\n` +
      `*Vehicle:* ${active.title}\n` +
      `*My location:* ${mapsLink}\n\n` +
      `Please send help.`;

    const appUrl = `whatsapp://send?phone=${ADMIN_WHATSAPP}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(appUrl);
      await Linking.openURL(supported ? appUrl : webUrl);
    } catch {
      Alert.alert('WhatsApp unavailable', 'Please call the helpline instead.');
    }
  };

  // Stable so the memoized rows don't re-render on every toggle
  const handleCall = useCallback(() => {
    Linking.openURL(`tel:${HELPLINE.replace(/\s+/g, '')}`);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header with back button (pinned) */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Emergency Services</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Intro scrolls; the vehicle toggle is a sticky header (index 1). */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* ── index 0: intro block (scrolls away) ───────────────────── */}
        <View>
          {/* Red banner (gradient) */}
          <LinearGradient
            colors={BANNER_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerGlow} />
            <View style={styles.bannerIconWrap}>
              <Ionicons name="warning" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.bannerTextBlock}>
              <Text style={styles.bannerTitle}>Emergency Services 24×7</Text>
              <Text style={styles.bannerBadge}>Available Round the Clock</Text>
            </View>
          </LinearGradient>

          {/* Trust signals — single line, half each */}
          <View style={styles.trustRow}>
            <View style={styles.trustPill}>
              <Ionicons name="time-outline" size={13} color={COLORS.primary} />
              <Text style={styles.trustText} numberOfLines={1}>
                Avg. response 15–20 min
              </Text>
            </View>
            <View style={styles.trustPill}>
              <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.primary} />
              <Text style={styles.trustText} numberOfLines={1}>
                Verified mechanics
              </Text>
            </View>
          </View>

          {/* Reassurance note */}
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.noteText}>
              Tap any service to call · Prices may vary by location
            </Text>
          </View>
        </View>

        {/* ── index 1: STICKY vehicle toggle ────────────────────────── */}
        <View style={styles.stickyToggle}>
          <View style={styles.toggleWrap}>
            {SECTIONS.map((section) => {
              const isActive = section.key === active.key;
              return (
                <Pressable
                  key={section.key}
                  onPress={() => setActiveKey(section.key)}
                  style={({ pressed }) => [
                    styles.toggleBtn,
                    isActive && styles.toggleBtnActive,
                    pressed && styles.toggleBtnPressed,
                  ]}
                >
                  <Ionicons
                    name={section.icon}
                    size={16}
                    color={isActive ? COLORS.danger : COLORS.textMuted}
                  />
                  <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
                    {section.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── index 2: service rows (each calls the helpline) ───────── */}
        <View style={styles.listContent}>
          {active.services.map((service) => (
            <ServiceRow key={service.id} service={service} onPress={handleCall} />
          ))}
        </View>
      </ScrollView>

      {/* Sticky footer: Step 1 share location → Step 2 call */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.shareLocationButton}
          onPress={handleShareLocation}
          disabled={locating}
        >
          <View style={styles.stepBadgeStep1}>
            <Text style={styles.stepBadgeStep1Text}>STEP 1</Text>
          </View>
          {locating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="location" size={18} color={COLORS.primary} />
              <Text style={styles.shareLocationText}>Share My Location</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} style={styles.callButton} onPress={handleCall}>
          <LinearGradient
            colors={CALL_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.callButtonInner}
          >
            <View style={styles.stepBadgeStep2}>
              <Text style={styles.stepBadgeStep2Text}>STEP 2</Text>
            </View>
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call Emergency Helpline</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.callSub}>{HELPLINE_DISPLAY}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  banner: {
    margin: 18,
    marginBottom: 12,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
  },
  bannerGlow: {
    position: 'absolute',
    top: -24,
    left: -10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  bannerTextBlock: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  bannerBadge: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  trustPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  trustText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSoft,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  noteText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  // Solid background so scrolling rows don't show through the pinned toggle
  stickyToggle: {
    backgroundColor: COLORS.bg,
    paddingTop: 2,
    paddingBottom: 10,
  },
  toggleWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
  },
  toggleBtnPressed: {
    opacity: 0.8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: COLORS.dangerText,
  },
  listContent: {
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  rowIndex: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rowIndexText: {
    color: COLORS.dangerText,
    fontSize: 14,
    fontWeight: '800',
  },
  rowTextBlock: {
    flex: 1,
  },
  rowName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  rowPriceWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 78,
    marginTop: 1,
  },
  rowPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  callButton: {
    borderRadius: 16,
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  callButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: 16,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  shareLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  shareLocationText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  stepBadgeStep1: {
    position: 'absolute',
    left: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(166, 244, 0, 0.14)',
  },
  stepBadgeStep1Text: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepBadgeStep2: {
    position: 'absolute',
    left: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  stepBadgeStep2Text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  callSub: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});