import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.12)',
  dangerBorder: 'rgba(255, 59, 48, 0.32)',
  dangerText: '#FF8A8F',

  shadow: '#000000',
};

// Helpline number — change to your real emergency line.
const HELPLINE = '+917903499148';

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
  { id: 7, name: 'Other Support', description: 'Tell us what you need', price: '— — —' },
];

const FOUR_WHEELER_SERVICES: EmergencyService[] = [
  { id: 1, name: 'Puncture (Tubeless / Tube)', description: 'On-site puncture repair', price: '₹299 / ₹499' },
  { id: 2, name: 'Stepney Replacement', description: 'Spare tyre fitting', price: '₹299' },
  { id: 3, name: 'Fuel Delivery (2 litre)', description: 'Emergency fuel at your location', price: 'Rate + ₹199' },
  { id: 4, name: 'Towing Service', description: 'Flatbed towing for cars & SUVs', price: '₹1500' },
  { id: 5, name: 'Battery Jumpstart', description: 'Jumpstart or battery replacement', price: '₹499' },
  { id: 6, name: 'Flat Tyre Support', description: 'Tyre change or spare fitting', price: 'Rate + ₹499' },
  { id: 7, name: 'Other Support', description: 'Tell us what you need', price: '— — —' },
];

const SECTIONS = [
  { key: 'two', title: 'Two Wheeler', icon: 'bicycle-outline' as const, services: TWO_WHEELER_SERVICES },
  { key: 'four', title: 'Four Wheeler', icon: 'car-outline' as const, services: FOUR_WHEELER_SERVICES },
];

export default function EmergencyScreen({ navigation }: any) {
  const [activeKey, setActiveKey] = useState(SECTIONS[0].key);
  const active = SECTIONS.find((s) => s.key === activeKey) ?? SECTIONS[0];

  const handleCall = () => {
    Linking.openURL(`tel:${HELPLINE.replace(/\s+/g, '')}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header with back button */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>Emergency Services</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.wrapper}>
        {/* Red banner */}
        <View style={styles.banner}>
          <View style={styles.bannerGlow} />
          <View style={styles.bannerIconWrap}>
            <Ionicons name="warning" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.bannerTextBlock}>
            <Text style={styles.bannerTitle}>Emergency Services 24×7</Text>
            <Text style={styles.bannerBadge}>Available Round the Clock</Text>
          </View>
        </View>

        {/* Reassurance note, directly below banner */}
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.noteText}>Prices may vary based on location</Text>
        </View>

        {/* Vehicle toggle */}
        <View style={styles.toggleWrap}>
          {SECTIONS.map((section) => {
            const isActive = section.key === active.key;
            return (
              <TouchableOpacity
                key={section.key}
                activeOpacity={0.85}
                onPress={() => setActiveKey(section.key)}
                style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
              >
                <Ionicons
                  name={section.icon}
                  size={16}
                  color={isActive ? COLORS.danger : COLORS.textMuted}
                />
                <Text
                  style={[styles.toggleText, isActive && styles.toggleTextActive]}
                >
                  {section.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scrollable service list */}
        <ScrollView
          style={styles.listArea}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {active.services.map((service) => (
            <View key={service.id} style={styles.row}>
              <View style={styles.rowIndex}>
                <Text style={styles.rowIndexText}>{service.id}</Text>
              </View>
              <View style={styles.rowTextBlock}>
                <Text style={styles.rowName}>{service.name}</Text>
                <Text style={styles.rowDesc}>{service.description}</Text>
              </View>
              <View style={styles.rowPriceWrap}>
                <Text style={styles.rowPrice}>{service.price}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Sticky call button */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.callButton}
          onPress={handleCall}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
          <Text style={styles.callButtonText}>Call Emergency Helpline</Text>
        </TouchableOpacity>
        <Text style={styles.callSub}>{HELPLINE}</Text>
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
  banner: {
    margin: 18,
    marginBottom: 12,
    borderRadius: 22,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
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
    backgroundColor: 'rgba(255,255,255,0.14)',
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
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  toggleWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 8,
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
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: COLORS.dangerText,
  },
  listArea: {
    flex: 1,
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 12,
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
    color: COLORS.primary,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  callSub: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});