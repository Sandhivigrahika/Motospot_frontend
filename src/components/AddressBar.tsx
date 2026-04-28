// src/components/AddressBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

type AddressBarProps = {
  address?: {
    label?: string;
    address_line?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
  loading?: boolean;
  onPress?: () => void;
};

const COLORS = {
  bg: '#050505',
  surface: '#0D0F10',
  surfaceSoft: '#121416',
  surfaceElevated: '#181B1D',
  border: '#23272A',
  text: '#F5F7F2',
  textSecondary: '#C7CEC7',
  textMuted: '#8B948C',
  primary: '#A6F400',
  primarySoft: 'rgba(166, 244, 0, 0.12)',
};

export default function AddressBar({ address, loading, onPress }: AddressBarProps) {
  const title = loading
    ? 'Fetching location...'
    : address?.address_line
    ? address.address_line
    : 'Add your address';

  const subtitle = loading
    ? 'Please wait'
    : address?.city || address?.state
    ? [address?.label, address?.city, address?.state].filter(Boolean).join(' • ')
    : 'Tap to select or save address';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Open address selection"
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.icon}>📍</Text>
        )}
      </View>

      <View style={styles.textWrap}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.chevronWrap}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  icon: {
    fontSize: 16,
    color: COLORS.primary,
  },

  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },

  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },

  chevronWrap: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chevron: {
    fontSize: 22,
    lineHeight: 22,
    color: COLORS.primary,
    fontWeight: '600',
  },
});