import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { logSignUp, logScreen } from '../lib/analytics';
import { containsForbiddenWord } from '../lib/forbidden-words';
import HapticButton from '../components/HapticButton';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    logScreen('SignUp');
  }, [navigation]);

  const handleSignUp = async () => {
    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms & Conditions to continue.');
      return;
    }

    const usernameClean = username.trim();
    if (usernameClean.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (usernameClean.includes('@')) {
      setError('Username cannot be an email address.');
      return;
    }
    if (usernameClean.includes(' ')) {
      setError('Username cannot contain spaces.');
      return;
    }
    if (containsForbiddenWord(usernameClean)) {
      setError('That username isn\'t allowed. Please choose another.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      // Always store username so _layout.tsx can create the profile once a
      // real session exists (needed when email confirmation is required and
      // the upsert here would run with no auth session, causing an RLS error).
      await AsyncStorage.setItem('pending_username', usernameClean);

      if (data.session) {
        // Email confirmation disabled — we have a session right now, so
        // upsert the profile immediately.
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: data.user.id, username: usernameClean, points: 0, tier: 'unlimited' }, { onConflict: 'id' });

        if (profileError) {
          setLoading(false);
          setError(profileError.message);
          return;
        }
        await AsyncStorage.removeItem('pending_username');
      }
      // If no session yet (email confirmation required), _layout.tsx will
      // create the profile on SIGNED_IN using the stored username.
    }

    await logSignUp();
    setLoading(false);
    if (data.session) {
      router.replace('/');
    } else {
      router.replace('/verify-email');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <HapticButton style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backText}>← BACK</Text>
          </HapticButton>

          <View style={styles.titleWrapper}>
            <Text style={styles.title}>SIGN UP</Text>
            <Text style={styles.sub}>Join the network.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#444444"
                placeholder="you@example.com"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>USERNAME</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#444444"
                placeholder="e.g. speedywheels"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#444444"
                  placeholder="••••••••"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(v => !v)} activeOpacity={0.7}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555555" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholderTextColor="#444444"
                  placeholder="••••••••"
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)} activeOpacity={0.7}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555555" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms & Conditions checkbox */}
            <View style={styles.termsRow}>
              <TouchableOpacity onPress={() => setAgreedToTerms(v => !v)} activeOpacity={0.7}>
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Ionicons name="checkmark" size={14} color="#0D0D0D" />}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
                  Terms & Conditions
                </Text>
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <HapticButton
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>{loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}</Text>
            </HapticButton>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <HapticButton onPress={() => router.replace('/login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>LOG IN</Text>
            </HapticButton>
          </View>
        </ScrollView>
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
    gap: 8,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 8,
  },
  sub: {
    fontSize: 16,
    color: '#666666',
    letterSpacing: 1,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFlex: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  checkboxChecked: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FFD700',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#555555',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 2,
  },
});