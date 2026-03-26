import * as Haptics from 'expo-haptics';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

type HapticStyle = 'light' | 'medium' | 'heavy';

interface HapticButtonProps extends TouchableOpacityProps {
  hapticStyle?: HapticStyle;
}

const styleMap: Record<HapticStyle, Haptics.ImpactFeedbackStyle> = {
  light:  Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy:  Haptics.ImpactFeedbackStyle.Heavy,
};

/**
 * Drop-in replacement for TouchableOpacity that fires a haptic on every press.
 * Default style is 'light' — a subtle click/tap feeling.
 *
 * Usage:
 *   <HapticButton onPress={...} style={...}>
 *     <Text>TAP ME</Text>
 *   </HapticButton>
 *
 *   <HapticButton hapticStyle="medium" onPress={...}>...</HapticButton>
 */
export default function HapticButton({
  hapticStyle = 'light',
  onPress,
  disabled,
  ...props
}: HapticButtonProps) {
  const handlePress = (e: Parameters<NonNullable<TouchableOpacityProps['onPress']>>[0]) => {
    if (!disabled) {
      Haptics.impactAsync(styleMap[hapticStyle]);
    }
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled}
    />
  );
}
