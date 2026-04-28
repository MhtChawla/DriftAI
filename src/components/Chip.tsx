// src/components/Chip.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { fonts } from '../theme/tokens';
import { useThemeTokens } from '../hooks/useThemeTokens';

type Props = {
  label: string;
  onPress?: () => void;
};

export const Chip = React.memo(function Chip({ label, onPress }: Props) {
  const t = useThemeTokens();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: t.text, fontFamily: fonts.sans }]}>
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 13.5,
    letterSpacing: -0.1,
  },
});
