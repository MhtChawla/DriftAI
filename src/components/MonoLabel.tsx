// src/components/MonoLabel.tsx
import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { fonts } from '../theme/tokens';
import { useThemeTokens } from '../hooks/useThemeTokens';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

export const MonoLabel = React.memo(function MonoLabel({ children, style }: Props) {
  const t = useThemeTokens();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.mono,
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: t.textFaint,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
});
