import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function VerifyEmailScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Poll for email verification — once confirmed, session will exist
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user?.email_confirmed_at) {
          clearInterval(interval);
          router.replace('/');
        }
      } catch {
        // Network error — keep polling
      }
    }, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleResend = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      await supabase.auth.resend({ type: 'signup', email: session.user.email });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Ionicons name="mail-outline" size={72} color="#FFD700" />
        <Text style={styles.title}>CHECK YOUR EMAIL</Text>
        <Text style={styles.sub}>
          We've sent a verification link to your email address. Tap it to activate your account.
        </Text>
        <Text style={styles.note}>
          This page will update automatically once you've verified.
        </Text>

        <TouchableOpacity style={styles.resendButton} onPress={handleResend} activeOpacity={0.8}>
          <Text style={styles.resendText}>RESEND EMAIL</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Use a different account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    color: '#888888',
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 24,
  },
  note: {
    fontSize: 12,
    color: '#444444',
    letterSpacing: 1,
    textAlign: 'center',
  },
  resendButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 3,
  },
  signOutText: {
    fontSize: 13,
    color: '#555555',
    letterSpacing: 1,
  },
});
