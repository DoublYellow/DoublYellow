import React from 'react';
import { Text, TextStyle } from 'react-native';

/**
 * Cross-platform emoji renderer.
 * On iOS, emoji break inside fontWeight:'900' text. This component
 * resets to a plain system font so emoji always render correctly.
 */
interface EmojiProps {
  children: string;
  size?: number;
  style?: TextStyle;
}

export function Emoji({ children, size = 20, style }: EmojiProps) {
  return (
    <Text style={[{ fontFamily: '', fontWeight: 'normal', fontSize: size }, style]}>
      {children}
    </Text>
  );
}
