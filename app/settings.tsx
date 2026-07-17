import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { logScreen } from '../lib/analytics';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [siren, setSiren] = useState(true);
  const [defaultRadius, setDefaultRadius] = useState(100);
  const [saving, setSaving] = useState(false);
  const [userTier, setUserTier] = useState<string>('free');
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Password change
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email change
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    logScreen('Settings');
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      if (user.email) setEmail(user.email);

      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setNotifications(data.notifications);
        setSiren(data.siren);
        setDefaultRadius(data.default_radius);
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();

      if (profileData?.tier) setUserTier(profileData.tier);

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(count ?? 0);
    })();
  }, []);

  const saveSetting = async (updates: Partial<{ notifications: boolean; siren: boolean; default_radius: number }>) => {
    if (!userId) return;
    setSaving(true);

    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: userId,
        notifications,
        siren,
        default_radius: defaultRadius,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      Alert.alert('Save Failed', 'Could not save your settings. Please try again.');
      // Roll back local state to match DB
      if ('notifications' in updates) setNotifications(notifications);
      if ('siren' in updates) setSiren(siren);
      if ('default_radius' in updates) setDefaultRadius(defaultRadius);
    }
    setSaving(false);
  };

  const handleNotifications = (val: boolean) => {
    setNotifications(val);
    saveSetting({ notifications: val });
  };

  const handleSiren = (val: boolean) => {
    setSiren(val);
    saveSetting({ siren: val });
  };

  const handleRadius = (val: number) => {
    setDefaultRadius(val);
    saveSetting({ default_radius: val });
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    // Verify current password first
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (authError) {
      setPasswordError('Current password is incorrect.');
      setSavingPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError('Could not update password. Try again.');
    } else {
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    }
    setSavingPassword(false);
  };

  const handleSaveEmail = async () => {
    setEmailError('');
    if (!newEmail.includes('@') || newEmail.trim().length < 5) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailError('Could not update email. Try again.');
    } else {
      setIsChangingEmail(false);
      setEmail(newEmail.trim());
      setNewEmail('');
      Alert.alert('Confirmation Sent', 'Check your new email address to confirm the change.');
    }
    setSavingEmail(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'LOG OUT',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <Text style={styles.savingText}>{saving ? 'SAVING...' : ' '}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ALERTS</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="notifications-outline" size={22} color="#FFD700" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Push Notifications</Text>
                  <Text style={styles.rowSub}>Get alerted when a warden is spotted</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={handleNotifications}
                trackColor={{ false: '#333333', true: '#FFD700' }}
                thumbColor={notifications ? '#0D0D0D' : '#666666'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="alert-circle-outline" size={22} color="#FFD700" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>Siren Alert</Text>
                  <Text style={styles.rowSub}>Override silent mode with siren sound</Text>
                </View>
              </View>
              <Switch
                value={siren}
                onValueChange={handleSiren}
                trackColor={{ false: '#333333', true: '#FFD700' }}
                thumbColor={siren ? '#0D0D0D' : '#666666'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEFAULT ALERT RADIUS</Text>
          <View style={styles.card}>
            <View style={styles.radiusRow}>
              {[50, 100, 250, 500].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.radiusButton, defaultRadius === r && styles.radiusButtonActive]}
                  onPress={() => handleRadius(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.radiusText, defaultRadius === r && styles.radiusTextActive]}>
                    {r}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.radiusSub}>Alerts will fire for wardens spotted within this distance of your parked car</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>

            {/* Messages row */}
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => router.push('/messages')}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="mail-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Messages</Text>
                  <Text style={styles.rowSub}>Updates and notices from DoubleYellow</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
                <Text style={styles.rowArrow}>›</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Email row */}
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => { setIsChangingEmail(!isChangingEmail); setEmailError(''); setNewEmail(''); }}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="mail-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Email</Text>
                  <Text style={styles.rowSub}>{email || '...'}</Text>
                </View>
              </View>
              <Text style={styles.rowArrow}>{isChangingEmail ? '↑' : '›'}</Text>
            </TouchableOpacity>

            {isChangingEmail && (
              <View style={styles.editPanel}>
                <TextInput
                  style={styles.editInput}
                  value={newEmail}
                  onChangeText={(t) => { setNewEmail(t); setEmailError(''); }}
                  placeholder="new email address"
                  placeholderTextColor="#555555"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
                {emailError ? <Text style={styles.editError}>{emailError}</Text> : null}
                <Text style={styles.editHint}>A confirmation link will be sent to your new address.</Text>
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => { setIsChangingEmail(false); setEmailError(''); setNewEmail(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editCancelText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSaveBtn, savingEmail && { opacity: 0.5 }]}
                    onPress={handleSaveEmail}
                    disabled={savingEmail}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editSaveText}>{savingEmail ? 'SAVING...' : 'UPDATE EMAIL'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* Password row */}
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => { setIsChangingPassword(!isChangingPassword); setPasswordError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmPassword(false); }}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="key-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Change Password</Text>
                  <Text style={styles.rowSub}>Update your password</Text>
                </View>
              </View>
              <Text style={styles.rowArrow}>{isChangingPassword ? '↑' : '›'}</Text>
            </TouchableOpacity>

            {isChangingPassword && (
              <View style={styles.editPanel}>
                {/* Current password */}
                <View style={styles.pwRow}>
                  <TextInput
                    style={styles.pwInput}
                    value={currentPassword}
                    onChangeText={(t) => { setCurrentPassword(t); setPasswordError(''); }}
                    placeholder="current password"
                    placeholderTextColor="#555555"
                    secureTextEntry={!showCurrentPassword}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowCurrentPassword(v => !v)} activeOpacity={0.7}>
                    <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555555" />
                  </TouchableOpacity>
                </View>
                {/* New password */}
                <View style={styles.pwRow}>
                  <TextInput
                    style={styles.pwInput}
                    value={newPassword}
                    onChangeText={(t) => { setNewPassword(t); setPasswordError(''); }}
                    placeholder="new password"
                    placeholderTextColor="#555555"
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(v => !v)} activeOpacity={0.7}>
                    <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555555" />
                  </TouchableOpacity>
                </View>
                {/* Confirm new password */}
                <View style={styles.pwRow}>
                  <TextInput
                    style={styles.pwInput}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setPasswordError(''); }}
                    placeholder="confirm new password"
                    placeholderTextColor="#555555"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)} activeOpacity={0.7}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#555555" />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.editError}>{passwordError}</Text> : null}
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.editCancelBtn}
                    onPress={() => { setIsChangingPassword(false); setPasswordError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmPassword(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editCancelText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSaveBtn, savingPassword && { opacity: 0.5 }]}
                    onPress={handleSavePassword}
                    disabled={savingPassword}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editSaveText}>{savingPassword ? 'SAVING...' : 'UPDATE PASSWORD'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={styles.divider} />

            {/* Delete account row */}
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'This will permanently delete your account and all associated data immediately. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete My Account',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert(
                          'Are you sure?',
                          'Your account, reports, points, and all data will be gone forever.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Yes, Delete Everything',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const { data: { session } } = await supabase.auth.getSession();
                                  const res = await supabase.functions.invoke('delete-account', {
                                    headers: { Authorization: `Bearer ${session?.access_token}` },
                                  });
                                  if (res.error) throw res.error;
                                  await supabase.auth.signOut();
                                  router.replace('/welcome');
                                } catch (e) {
                                  Alert.alert('Error', 'Could not delete your account. Please try again or contact support.');
                                }
                              },
                            },
                          ]
                        );
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={22} color="#E63946" />
                <View>
                  <Text style={[styles.rowLabel, { color: '#E63946' }]}>Delete Account</Text>
                  <Text style={styles.rowSub}>Permanently delete your account and data</Text>
                </View>
              </View>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUBSCRIPTION</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="star-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Current Plan</Text>
                  <Text style={styles.rowSub}>
                    {userTier === 'unlimited' ? 'Unlimited — Full Access'
                      : userTier === 'pro' ? 'Pro — 1 activation/day'
                      : 'Lookout — 1 activation/week'}
                  </Text>
                </View>
              </View>
              <View style={[styles.freeBadge, userTier === 'unlimited' && styles.unlimitedBadge]}>
                <Text style={[styles.freeBadgeText, userTier === 'unlimited' && styles.unlimitedBadgeText]}>
                  {userTier.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => router.push('/plans')}>
              <View style={styles.rowLeft}>
                <Ionicons name="rocket-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Upgrade Plan</Text>
                  <Text style={styles.rowSub}>View plans — coming soon</Text>
                </View>
              </View>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="ellipse" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Double Yellow</Text>
                  <Text style={styles.rowSub}>Version 1.0.0 — Beta</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={() => router.push('/privacy')} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Ionicons name="document-text-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Privacy Policy</Text>
                  <Text style={styles.rowSub}>How we use your data</Text>
                </View>
              </View>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={() => router.push('/terms')} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Ionicons name="clipboard-outline" size={22} color="#FFD700" />
                <View>
                  <Text style={styles.rowLabel}>Terms of Service</Text>
                  <Text style={styles.rowSub}>Our terms and conditions</Text>
                </View>
              </View>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>LOG OUT</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  savingText: { fontSize: 10, fontWeight: '700', color: '#FFD700', letterSpacing: 2, width: 60, textAlign: 'right' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 24, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 3 },
  card: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  rowSub: { fontSize: 11, color: '#555555', letterSpacing: 0.5, marginTop: 2 },
  rowArrow: { fontSize: 20, color: '#444444' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadBadge: {
    backgroundColor: '#C1121F',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#2A2A2A', marginHorizontal: 16 },
  radiusRow: { flexDirection: 'row', gap: 8, padding: 16 },
  radiusButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333333', alignItems: 'center', backgroundColor: '#0D0D0D' },
  radiusButtonActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  radiusText: { fontSize: 13, fontWeight: '900', color: '#555555', letterSpacing: 1 },
  radiusTextActive: { color: '#FFFFFF' },
  radiusSub: { fontSize: 11, color: '#444444', letterSpacing: 0.5, paddingHorizontal: 16, paddingBottom: 16, lineHeight: 16 },
  freeBadge: { borderWidth: 1, borderColor: '#FFD700', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  freeBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFD700', letterSpacing: 2 },
  unlimitedBadge: { borderColor: '#FFD700', backgroundColor: '#FFD700' },
  unlimitedBadgeText: { color: '#0D0D0D' },
  logoutButton: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#E63946', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '900', color: '#E63946', letterSpacing: 4 },
  editPanel: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  editInput: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  editError: { fontSize: 11, color: '#E63946', letterSpacing: 1 },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  editHint: { fontSize: 11, color: '#444444', letterSpacing: 0.5, lineHeight: 16 },
  editButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  editCancelText: { fontSize: 11, fontWeight: '900', color: '#666666', letterSpacing: 2 },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    alignItems: 'center',
  },
  editSaveText: { fontSize: 11, fontWeight: '900', color: '#0D0D0D', letterSpacing: 2 },
});