// src/components/GradientText.tsx
// MaskedView + LinearGradient trick for gradient text in RN
import React from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { tokens } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

export function GradientText({ children, style }: Props) {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>
      }
    >
      <LinearGradient
        colors={[tokens.accent1, tokens.accent2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
