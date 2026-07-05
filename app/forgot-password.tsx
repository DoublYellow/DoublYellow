import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import HapticButton from '../components/HapticButton';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'doublyellow://reset-password',
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <HapticButton style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </HapticButton>

        <View style={styles.titleWrapper}>
          <Text style={styles.title}>RESET{'\n'}PASSWORD</Text>
          {!sent && (
            <Text style={styles.sub}>Enter your email and we'll send you a reset link.</Text>
          )}
        </View>

        {sent ? (
          <View style={styles.successBox}>
            <Ionicons name="mail-outline" size={56} color="#FFD700" />
            <Text style={styles.successTitle}>CHECK YOUR EMAIL</Text>
            <Text style={styles.successBody}>
              We've sent a password reset link to{'\n'}
              <Text style={styles.successEmail}>{email}</Text>
            </Text>
            <Text style={styles.successHint}>
              Click the link in the email to set a new password. Check your spam folder if you don't see it.
            </Text>
            <HapticButton
              style={styles.submitButton}
              onPress={() => router.replace('/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>BACK TO LOG IN</Text>
            </HapticButton>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholderTextColor="#444444"
                placeholder="you@example.com"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <HapticButton
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>{loading ? 'SENDING...' : 'SEND RESET LINK'}</Text>
            </HapticButton>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  backButton: {
    marginBottom: 32,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
  },
  titleWrapper: {
    marginBottom: 48,
    gap: 12,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 4,
    lineHeight: 48,
  },
  sub: {
    fontSize: 15,
    color: '#666666',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 3,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 13,
    color: '#E63946',
    letterSpacing: 1,
  },
  submitButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#888800',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 4,
  },
  successBox: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 4,
  },
  successBody: {
    fontSize: 15,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 24,
  },
  successEmail: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successHint: {
    fontSize: 13,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  submitButton_success: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
});
