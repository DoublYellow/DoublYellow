import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();

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
          <Text style={styles.logoText}>DOUBLE</Text>
          <Text style={styles.logoText}>YELLOW</Text>
        </View>
        <View style={styles.doubleYellow}>
          <View style={styles.yellowLine} />
          <View style={styles.yellowGap} />
          <View style={styles.yellowLine} />
        </View>
        <Text style={styles.tagline}>THE COMMUNITY WARDEN ALERT</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={() => router.push('/signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.signUpText}>SIGN UP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.loginText}>LOG IN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
        >
          <Text style={styles.guestText}>CONTINUE AS GUEST</Text>
        </TouchableOpacity>
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
    height: 48,
    backgroundColor: '#FFD700',
  },
  yellowGap: {
    height: 24,
    backgroundColor: '#0D0D0D',
  },
  logoTextWrapper: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 0,
  },
  logoText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
    lineHeight: 80,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 32,
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
  guestButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 3,
  },
});