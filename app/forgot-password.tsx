import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import HapticButton from '../components/HapticButton';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    // No redirectTo — we use the OTP code flow instead of a deep link
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('code');
    setTimeout(() => codeInputRef.current?.focus(), 300);
  };

  const handleVerifyCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 8) {
      setError('Please enter the full code from your email.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: 'recovery',
    });
    setLoading(false);
    if (error) {
      setError('Invalid or expired code. Please check your email and try again.');
      return;
    }
    // onAuthStateChange fires PASSWORD_RECOVERY → _layout.tsx navigates to /reset-password
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
        </View>

        {step === 'email' ? (
          <View style={styles.form}>
            <Text style={styles.sub}>Enter your email and we'll send you a reset code.</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
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
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>{loading ? 'SENDING...' : 'SEND RESET CODE'}</Text>
            </HapticButton>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.sentBox}>
              <Ionicons name="mail-outline" size={36} color="#FFD700" />
              <Text style={styles.sentTitle}>CHECK YOUR EMAIL</Text>
              <Text style={styles.sentBody}>
                We sent a reset code to{'\n'}
                <Text style={styles.sentEmail}>{email}</Text>
              </Text>
              <Text style={styles.sentHint}>Check your spam folder if you don't see it.</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>ENTER CODE</Text>
              <TextInput
                ref={codeInputRef}
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={(t) => { setCode(t); setError(''); }}
                keyboardType="default"
                autoCapitalize="characters"
                maxLength={8}
                placeholderTextColor="#444444"
                placeholder="••••••••"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <HapticButton
              style={[styles.submitButton, (loading || code.trim().length < 6) && styles.submitButtonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading || code.trim().length < 8}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>{loading ? 'CHECKING...' : 'VERIFY CODE'}</Text>
            </HapticButton>

            <HapticButton
              style={styles.resendButton}
              onPress={() => { setStep('email'); setCode(''); setError(''); }}
              activeOpacity={0.7}
            >
              <Text style={styles.resendText}>Didn't get it? Go back and resend</Text>
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
    paddingVertical: 10,
    paddingRight: 24,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
  },
  titleWrapper: {
    marginBottom: 32,
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
    marginBottom: 8,
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
  codeInput: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#E63946',
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#333300',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 4,
  },
  sentBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sentTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 3,
  },
  sentBody: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  sentEmail: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sentHint: {
    fontSize: 11,
    color: '#555555',
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 12,
    color: '#444444',
    letterSpacing: 0.5,
  },
});
