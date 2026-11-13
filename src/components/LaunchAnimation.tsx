import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const BG = '#000000'; // must match the native splash backgroundColor in app.json

// Layers cut from the same 1024px-wide logo artwork, so they line up exactly
// when stacked at these offsets (in source pixels).
const SRC_WIDTH = 1024;
const SRC_HEIGHT = 445;
const LAYERS = {
  wrench: { src: require('../../assets/launch/wrench.png'), top: 0, height: 155 },
  moto: { src: require('../../assets/launch/moto.png'), top: 210, height: 165 },
  spot: { src: require('../../assets/launch/spot.png'), top: 210, height: 165 },
  tagline: { src: require('../../assets/launch/tagline.png'), top: 405, height: 40 },
};

type Props = {
  /** true once the app can show its first real screen (e.g. auth `loading` is false) */
  ready: boolean;
  /** called after the fade-out; unmount the component here */
  onFinish: () => void;
};

/**
 * Launch animation:
 *   1. wrench pops in
 *   2. MOTO slides in from the left, SPOT from the right — they meet in the middle
 *   3. "VEHICLE REPAIR MADE EASY" rises in
 *   4. everything fades out to the app (waits for `ready`)
 */
export function LaunchAnimation({ ready, onFinish }: Props) {
  const { width: screenW } = useWindowDimensions();
  const W = Math.min(screenW - 48, 340);
  const s = W / SRC_WIDTH;
  const offscreen = screenW; // start fully outside the screen

  const wrenchO = useRef(new Animated.Value(0)).current;
  const wrenchScale = useRef(new Animated.Value(0.6)).current;

  const motoX = useRef(new Animated.Value(-offscreen)).current;
  const spotX = useRef(new Animated.Value(offscreen)).current;
  const wordO = useRef(new Animated.Value(0)).current;

  const tagO = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(10)).current;

  const overlayO = useRef(new Animated.Value(1)).current;
  const overlayScale = useRef(new Animated.Value(1)).current;

  const [introDone, setIntroDone] = useState(false);

  const startIntro = () => {
    const slideIn = (value: Animated.Value) =>
      Animated.spring(value, {
        toValue: 0,
        friction: 14, // high = they meet cleanly without overlapping (lower it for a bounce)
        tension: 60,
        useNativeDriver: true,
      });

    Animated.sequence([
      // 1. wrench pops in
      Animated.parallel([
        Animated.timing(wrenchO, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(wrenchScale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),

      // 2. MOTO from left + SPOT from right, together
      Animated.parallel([
        Animated.timing(wordO, { toValue: 1, duration: 150, useNativeDriver: true }),
        slideIn(motoX),
        slideIn(spotX),
      ]),

      // 3. motto rises in
      Animated.parallel([
        Animated.timing(tagO, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(tagY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setIntroDone(true));
  };

  // 4. fade out — only once the intro has played AND the app is ready
  useEffect(() => {
    if (!introDone || !ready) return;
    Animated.sequence([
      Animated.delay(400), // let the full logo register
      Animated.parallel([
        Animated.timing(overlayO, {
          toValue: 0,
          duration: 360,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(overlayScale, {
          toValue: 1.06,
          duration: 360,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onFinish());
  }, [introDone, ready]);

  const layerBox = (l: { top: number; height: number }) => ({
    top: l.top * s,
    width: W,
    height: l.height * s,
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayO }]}
      pointerEvents="auto"
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
        startIntro();
      }}
    >
      <Animated.View
        style={{ width: W, height: SRC_HEIGHT * s, transform: [{ scale: overlayScale }] }}
      >
        <Animated.Image
          source={LAYERS.wrench.src}
          style={[
            styles.layer,
            layerBox(LAYERS.wrench),
            { opacity: wrenchO, transform: [{ scale: wrenchScale }] },
          ]}
        />
        <Animated.Image
          source={LAYERS.moto.src}
          style={[
            styles.layer,
            layerBox(LAYERS.moto),
            { opacity: wordO, transform: [{ translateX: motoX }] },
          ]}
        />
        <Animated.Image
          source={LAYERS.spot.src}
          style={[
            styles.layer,
            layerBox(LAYERS.spot),
            { opacity: wordO, transform: [{ translateX: spotX }] },
          ]}
        />
        <Animated.Image
          source={LAYERS.tagline.src}
          style={[
            styles.layer,
            layerBox(LAYERS.tagline),
            { opacity: tagO, transform: [{ translateY: tagY }] },
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  layer: {
    position: 'absolute',
    left: 0,
  },
});