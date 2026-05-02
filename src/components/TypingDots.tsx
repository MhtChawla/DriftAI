// src/components/TypingDots.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tokens } from '../theme/tokens';

export const TypingDots = React.memo(function TypingDots() {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, styles.dot1]} />
      <View style={[styles.dot, styles.dot2]} />
      <View style={[styles.dot, styles.dot3]} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.accent1 },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
});
