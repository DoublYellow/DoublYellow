import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { logSignUp, logScreen } from '../lib/analytics';
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

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    logScreen('SignUp');
  }, [navigation]);

  const handleSignUp = async () => {
    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
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
      // Use upsert so that even if a DB trigger auto-created a profile row,
      // the user's chosen username always wins.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, username: usernameClean, points: 0, tier: 'unlimited' }, { onConflict: 'id' });

      if (profileError) {
        setLoading(false);
        setError(profileError.message);
        return;
      }
    }

    await logSignUp();
    setLoading(false);
    // If email confirmation is required, Supabase returns a user but no session
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
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#444444"
                placeholder="••••••••"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor="#444444"
                placeholder="••••••••"
              />
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