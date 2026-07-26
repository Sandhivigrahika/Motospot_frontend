// src/components/AddressBar.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import {Ionicons} from '@expo/vector-icons';

const API_URL = 'https://motospotbackend-production.up.railway.app';

type AddressBarProps = {
  onPress?: () => void;
};

const COLORS = {
  surface: '#0D0F10',
  border: '#23272A',
  text: '#F5F7F2',
  textMuted: '#8B948C',
  primary: '#A6F400',
  primarySoft: 'rgba(166, 244, 0, 0.12)',
};

export default function AddressBar({ onPress }: AddressBarProps) {
  const { getLocation } = useCurrentLocation();
  const [location, setLocation] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;

    const detect = async () => {
      const coords = await getLocation();
      if (cancelled) return;

      if (!coords) {
        setStatus('unavailable');
        return;
      }

      try {
        const token = await SecureStore.getItemAsync('accessToken');
        const res = await api.post(
          `${API_URL}/address/geocode/reverse`,
          { latitude: coords.latitude, longitude: coords.longitude },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (cancelled) return;

        const label = [res.data?.city, res.data?.state].filter(Boolean).join(', ');
        if (label) {
          setLocation(label);
          setStatus('ready');
        } else {
          setStatus('unavailable');
        }
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    };

    detect();
    return () => {
      cancelled = true;
    };
  }, [getLocation]);

  const title =
    status === 'loading'
      ? 'Fetching location…'
      : status === 'unavailable'
      ? 'Location unavailable'
      : location;

  const subtitle =
    status === 'loading'
      ? 'Please wait'
      : status === 'unavailable'
      ? 'Tap to add your address'
      : 'Tap to add an address';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Open address form"
    >
      <View style={styles.iconWrap}>
        {status === 'loading' ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="location-sharp" size={18} color={COLORS.primary} />
        )}
      </View>

      <View style={styles.textWrap}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
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

/*
 * ─────────────────────────────────────────────────────────────
 * DESIGN TRADE-OFF — location fetching lives in this component
 * ─────────────────────────────────────────────────────────────
 * This bar calls useCurrentLocation() + reverse-geocode directly,
 * so it is a "smart" display component rather than a dumb one.
 *
 * Why it's fine here:
 *   - Single instance, single screen (Home), doing one thing.
 *   - No other context currently needs this bar to show anything
 *     other than live GPS, so lifting the logic up would add
 *     indirection with no payoff today.
 *
 * The cost we're accepting:
 *   - Display and data-fetching are coupled. Every mount triggers
 *     GPS + an API call.
 *   - If this bar is ever reused to show something else (a saved
 *     address, a branch name, a static label), the fetch logic
 *     has to be pulled out first.
 *
 * When to refactor:
 *   - If a white-label / client build needs this bar to show
 *     non-GPS data, extract the detect-effect into a
 *     useDetectedLocation() hook (which wraps useCurrentLocation),
 *     pass { label, status } in as props, and this component goes
 *     back to being a pure display. One-file move, not a rewrite.
 *
 * Decision: keep it here for MotoSpot. Revisit at first reuse.
 * ─────────────────────────────────────────────────────────────
 */