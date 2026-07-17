import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HapticButton from '../components/HapticButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>

      {/* Logo area */}
      <View style={styles.logoArea}>
        <View style={styles.doubleYellow}>
          <View style={styles.yellowLine} />
          <View style={styles.yellowGap} />
          <View style={styles.yellowLine} />
        </View>
        <View style={styles.logoTextWrapper}>
          <Text style={styles.logoText} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>DOUBLE</Text>
          <Text style={styles.logoText} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>YELLOW</Text>
        </View>
        <View style={styles.doubleYellow}>
          <View style={styles.yellowLine} />
          <View style={styles.yellowGap} />
          <View style={styles.yellowLine} />
        </View>
      </View>

      {/* Tagline */}
      <View style={styles.taglineWrapper}>
        <Text style={styles.tagline} allowFontScaling={false}>{'A COMMUNITY SAVING MONEY\nONE PARKING FINE AT A TIME.'}</Text>
      </View>

      {/* Buttons */}
      <View style={[styles.buttons, { paddingBottom: 48 + insets.bottom }]}>
        <HapticButton
          style={styles.signUpButton}
          onPress={() => router.push('/signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.signUpText}>SIGN UP</Text>
        </HapticButton>

        <HapticButton
          style={styles.loginButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginText}>LOG IN</Text>
        </HapticButton>

        <HapticButton
          style={styles.forgotButton}
          onPress={() => router.push('/forgot-password')}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </HapticButton>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  logoArea: {
    flex: 1,
    justifyContent: 'center',
    gap: 0,
  },
  doubleYellow: {},
  yellowLine: {
    width: '100%',
    height: 36,
    backgroundColor: '#FFD700',
  },
  yellowGap: {
    height: 18,
    backgroundColor: '#0D0D0D',
  },
  logoTextWrapper: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 0,
  },
  logoText: {
    fontSize: Math.min(72, SCREEN_WIDTH * 0.17),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: Math.min(8, SCREEN_WIDTH * 0.018),
    lineHeight: Math.min(80, SCREEN_WIDTH * 0.19),
  },
  taglineWrapper: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },
  signUpButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 4,
  },
  loginButton: {
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  forgotButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    color: '#333333',
    letterSpacing: 1,
  },
});