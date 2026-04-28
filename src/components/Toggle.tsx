// src/components/Toggle.tsx
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { tokens } from '../theme/tokens';

type Props = { value: boolean; onChange: (v: boolean) => void };

export const Toggle = React.memo(function Toggle({ value, onChange }: Props) {
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8} style={styles.wrap}>
      {value ? (
        <LinearGradient
          colors={[tokens.accent1, tokens.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill as any}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.track]} />
      )}
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: {
    width: 46,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    backgroundColor: 'rgba(120,120,128,0.32)',
  },
  knob: {
    position: 'absolute',
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  knobOff: { left: 2 },
  knobOn: { left: 20 },
});
