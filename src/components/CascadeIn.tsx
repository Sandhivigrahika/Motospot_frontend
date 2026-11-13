import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useAuth } from '../context/AuthContext';

type Props = {
  /** position in the cascade: 0 animates first, each next one ~70ms later */
  index: number;
  /** 'top' drops down into place (for headers); 'bottom' rises up (default) */
  from?: 'top' | 'bottom';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

const STAGGER_MS = 70;
const DURATION_MS = 320;

/**
 * Wraps a Home section so it fades + slides into place right after sign-in.
 *
 * - Mounted while the welcome overlay is up (justSignedIn = true): starts hidden,
 *   animates in when the overlay starts leaving.
 * - Mounted any other time (app open, tab switch, back navigation): renders
 *   normally, no animation.
 */
export function CascadeIn({ index, from = 'bottom', style, children }: Props) {
  const { justSignedIn } = useAuth();

  // Decide once, at mount, whether this instance should animate
  const shouldAnimate = useRef(justSignedIn).current;
  const opacity = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const translateY = useRef(
    new Animated.Value(shouldAnimate ? (from === 'top' ? -14 : 18) : 0)
  ).current;
  const played = useRef(false);

  useEffect(() => {
    if (!shouldAnimate || played.current || justSignedIn) return;
    played.current = true;

    const delay = index * STAGGER_MS;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_MS,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION_MS,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [justSignedIn]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}