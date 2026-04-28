// src/components/MicButton.tsx
import React from 'react';
import { Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
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

export const MicButton = React.memo(function MicButton({ state, viz, onTap }: Props) {
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
});

const Rings = React.memo(function Rings() {
  return (
    <>
      {[1.4, 1.65, 1.9].map((scale, i) => (
        <View
          key={i}
          style={[styles.ring, { transform: [{ scale }], opacity: 0.4 - i * 0.12 }]}
        />
      ))}
    </>
  );
});

const Orb = React.memo(function Orb() {
  return (
    <>
      <View style={styles.orbInner} />
      <View style={styles.orbOuter} />
    </>
  );
});

const Bars = React.memo(function Bars() {
  const bars = 28;
  return (
    <View style={styles.barsWrap} pointerEvents="none">
      {Array.from({ length: bars }).map((_, i) => {
        const angle = (i / bars) * 360;
        return (
          <View
            key={i}
            style={[styles.bar, { transform: [{ rotate: `${angle}deg` }, { translateY: -(SIZE / 2 + 18) }] }]}
          />
        );
      })}
    </View>
  );
});

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
  orbInner: {
    position: 'absolute',
    width: SIZE + 30,
    height: SIZE + 30,
    borderRadius: 999,
    backgroundColor: tokens.accent1,
    opacity: 0.25,
  },
  orbOuter: {
    position: 'absolute',
    width: SIZE + 60,
    height: SIZE + 60,
    borderRadius: 999,
    backgroundColor: tokens.accent2,
    opacity: 0.18,
  },
  bar: {
    position: 'absolute',
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: tokens.accent1,
    opacity: 0.7,
  },
  core: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
