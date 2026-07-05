import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleReset = async () => {
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setError('Could not update your password. The link may have expired — please request a new one.');
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Ionicons name="checkmark-circle" size={72} color="#FFD700" />
          <Text style={styles.title}>PASSWORD{'\n'}UPDATED</Text>
          <Text style={styles.sub}>Your password has been changed successfully.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>GO TO HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>NEW{'\n'}PASSWORD</Text>
          <Text style={styles.sub}>Choose a new password for your account.</Text>

          <View style={styles.form}>
            <View style={styles.pwRow}>
              <TextInput
                style={styles.pwInput}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setError(''); }}
                placeholder="new password"
                placeholderTextColor="#444444"
                secureTextEntry={!showNewPassword}
                autoFocus
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(v => !v)} activeOpacity={0.7}>
                <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#555555" />
              </TouchableOpacity>
            </View>

            <View style={styles.pwRow}>
              <TextInput
                style={styles.pwInput}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                placeholder="confirm new password"
                placeholderTextColor="#444444"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)} activeOpacity={0.7}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#555555" />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.5 }]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{loading ? 'UPDATING...' : 'SET NEW PASSWORD'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  kav: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 4,
    lineHeight: 48,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: '#666666',
    letterSpacing: 0.5,
    lineHeight: 22,
    marginBottom: 8,
  },
  form: { gap: 14 },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#E63946',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 4,
  },
});
