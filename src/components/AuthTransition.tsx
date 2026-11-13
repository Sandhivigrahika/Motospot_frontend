import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';

const BG = '#050505';
const GREEN = '#A6F400';

// wrench_only.png is 449×146; the jaw (bolt) end — the point it rotates around — is at (66, 73)
const WRENCH = {
  src: require('../../assets/launch/wrench_only.png'),
  w: 449,
  h: 146,
  pivotX: 66,
  pivotY: 73,
};
const WRENCH_WIDTH = 200; // on-screen width
const SAFETY_TIMEOUT_MS = 3000; // overlay can never get stuck on screen

/** First name to greet with; null for placeholder names (e.g. Apple users who hid theirs). */
function firstNameFrom(user: any): string | null {
  const name = (user?.name ?? '').trim();
  if (!name || name === 'Motospot User' || name === 'User') return null;
  return name.split(/\s+/)[0];
}

/**
 * Plays after a fresh sign-in (Apple / Google / OTP / dev):
 *   1. wrench swings down a quarter turn around its jaw, like tightening a bolt
 *   2. "Welcome, <name>" rises in, name in green with a soft glow
 *   3. the overlay slides up, and Home sections cascade in underneath (see CascadeIn)
 *
 * Purely visual: it reads `justSignedIn` and calls `clearJustSignedIn` — nothing else
 * in the login flow depends on it.
 */
export function AuthTransition() {
  const { justSignedIn, clearJustSignedIn } = useAuth();
  const { height: screenH } = useWindowDimensions();

  const [visible, setVisible] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

  const wrenchO = useRef(new Animated.Value(0)).current;
  const turn = useRef(new Animated.Value(0)).current; // 0 = -90°, 1 = 0°
  const textO = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(12)).current;
  const slideY = useRef(new Animated.Value(0)).current;

  const playing = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anims = useRef<Animated.CompositeAnimation[]>([]);

  // Only clean up on unmount — NOT when justSignedIn flips back to false
  // mid-animation (that flip is what tells Home to start its cascade).
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      anims.current.forEach((a) => a.stop());
    };
  }, []);

  useEffect(() => {
    if (!justSignedIn || playing.current) return;
    playing.current = true;

    // signIn() saved the user just before flipping justSignedIn
    SecureStore.getItemAsync('user')
      .then((raw) => setFirstName(firstNameFrom(raw ? JSON.parse(raw) : null)))
      .catch(() => setFirstName(null));

    wrenchO.setValue(0);
    turn.setValue(0);
    textO.setValue(0);
    textY.setValue(12);
    slideY.setValue(0);
    setVisible(true);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      clearJustSignedIn();
      setVisible(false);
      playing.current = false;
    };

    const intro = Animated.parallel([
      Animated.timing(wrenchO, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(turn, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(textO, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textY, {
            toValue: 0,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    const outro = Animated.timing(slideY, {
      toValue: -screenH,
      duration: 420,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });

    anims.current = [intro, outro];

    intro.start(() => {
      timers.current.push(
        setTimeout(() => {
          // Tell Home to start its cascade as the overlay begins to leave
          clearJustSignedIn();
          outro.start(finish);
        }, 350) // hold so the welcome registers
      );
    });

    // Safety net: never leave the overlay on screen
    timers.current.push(setTimeout(finish, SAFETY_TIMEOUT_MS));
  }, [justSignedIn]);

  if (!visible) return null;

  // Rotate around the jaw instead of the image centre:
  // move pivot to centre → rotate → move back
  const s = WRENCH_WIDTH / WRENCH.w;
  const h = WRENCH.h * s;
  const dx = WRENCH.pivotX * s - WRENCH_WIDTH / 2;
  const dy = WRENCH.pivotY * s - h / 2;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  return (
    <Animated.View
      style={[styles.overlay, { transform: [{ translateY: slideY }] }]}
      pointerEvents="auto"
    >
      <View style={styles.center}>
        <Animated.Image
          source={WRENCH.src}
          style={{
            width: WRENCH_WIDTH,
            height: h,
            opacity: wrenchO,
            transform: [
              { translateX: dx },
              { translateY: dy },
              { rotate },
              { translateX: -dx },
              { translateY: -dy },
            ],
          }}
          resizeMode="contain"
        />

        <Animated.View style={{ opacity: textO, transform: [{ translateY: textY }] }}>
          {firstName ? (
            <Text style={styles.welcome}>
              Welcome, <Text style={styles.name}>{firstName}</Text>
            </Text>
          ) : (
            <Text style={styles.welcome}>
              Welcome to <Text style={styles.name}>Motospot</Text>
            </Text>
          )}
        </Animated.View>
      </View>
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
    zIndex: 9999,
    elevation: 9999,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  welcome: {
    marginTop: 36,
    fontSize: 28,
    fontWeight: '800',
    color: '#F5F7F2',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  name: {
    color: GREEN,
    textShadowColor: 'rgba(166, 244, 0, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
});