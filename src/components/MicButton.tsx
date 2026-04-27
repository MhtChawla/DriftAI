// src/components/MicButton.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Mic } from 'lucide-react-native';
import { tokens } from '../theme/tokens';
import type { MicState } from '../hooks/useMicCycle';
import type { VizStyle } from '../store/useAppStore';
import { useThemeTokens } from '../hooks/useThemeTokens';

type Props = {
  state: MicState;
  viz: VizStyle;
  onTap: () => void;
};

const SIZE = 132;

export function MicButton({ state, viz, onTap }: Props) {
  const t = useThemeTokens();
  const active = state !== 'idle';

  return (
    <Pressable onPress={onTap} style={styles.wrap}>
      {active && viz === 'rings' && <Rings />}
      {active && viz === 'orb' && <Orb />}
      {active && viz === 'bars' && <Bars />}

      <View style={[styles.coreShadow, active && styles.coreShadowActive]}>
        {active ? (
          <LinearGradient
            colors={[tokens.accent1, tokens.accent2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.core}
          >
            {state === 'processing' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Mic size={40} color="#fff" />
            )}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.core,
              { backgroundColor: t.surface2, borderWidth: 1, borderColor: t.borderStrong },
            ]}
          >
            <Mic size={40} color="#fff" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function Rings() {
  const anim1 = useRef(new Animated.Value(0)).current;
const anim2 = useRef(new Animated.Value(0)).current;
const anim3 = useRef(new Animated.Value(0)).current;

const anims = useMemo(() => [anim1, anim2, anim3], [anim1, anim2, anim3]);
  useEffect(() => {
    const animations = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(v, {
            toValue: 1,
            duration: 2100,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [anims]);

  return (
    <>
      {anims.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              transform: [
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) },
              ],
              opacity: v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.8, 0, 0] }),
            },
          ]}
        />
      ))}
    </>
  );
}

function Orb() {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (v: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: dur, useNativeDriver: true }),
        ]),
      );
    const la = loop(a, 1500);
    const lb = loop(b, 2100);
    la.start();
    lb.start();
    return () => {
      la.stop();
      lb.stop();
    };
  }, [a, b]);

  return (
    <>
      <Animated.View
        style={[
          styles.orb,
          {
            width: SIZE + 30,
            height: SIZE + 30,
            backgroundColor: tokens.accent1,
            opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.36] }),
            transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            width: SIZE + 60,
            height: SIZE + 60,
            backgroundColor: tokens.accent2,
            opacity: b.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] }),
            transform: [{ scale: b.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
          },
        ]}
      />
    </>
  );
}

function Bars() {
  const bars = 28;
  const anims = useRef(
    Array.from({ length: bars }).map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animations = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.timing(v, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [anims]);

  return (
    <View style={styles.barsWrap} pointerEvents="none">
      {anims.map((v, i) => {
        const angle = (i / bars) * 360;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 2,
              height: 14,
              borderRadius: 1,
              backgroundColor: tokens.accent1,
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -(SIZE / 2 + 18) },
                { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: tokens.accent1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  barsWrap: {
    position: 'absolute',
    width: SIZE + 80,
    height: SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreShadow: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  coreShadowActive: {
    shadowColor: tokens.accent1,
    shadowOpacity: 0.6,
    shadowRadius: 40,
  },
  core: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
