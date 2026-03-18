import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [siren, setSiren] = useState(true);
  const [defaultRadius, setDefaultRadius] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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
    })();
  }, []);

  const saveSetting = async (updates: Partial<{ notifications: boolean; siren: boolean; default_radius: number }>) => {
  setSaving(true);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { setSaving(false); return; }

  const { error } = await supabase
    .from('settings')
    .upsert({
      user_id: user.id,
      notifications,
      siren,
      default_radius: defaultRadius,
      ...updates,
      updated_at: new Date().toISOString(),
    });

  if (error) console.log('SETTINGS ERROR:', JSON.stringify(error));
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
                <Text style={styles.rowIcon}>🔔</Text>
                <View>
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
                <Text style={styles.rowIcon}>🚨</Text>
                <View>
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
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>✉️</Text>
                <View>
                  <Text style={styles.rowLabel}>Email</Text>
                  <Text style={styles.rowSub}>{email || '...'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>🔑</Text>
                <View>
                  <Text style={styles.rowLabel}>Change Password</Text>
                  <Text style={styles.rowSub}>Update your password</Text>
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
                <Text style={styles.rowIcon}>⭐</Text>
                <View>
                  <Text style={styles.rowLabel}>Current Plan</Text>
                  <Text style={styles.rowSub}>Free — Year 1 Beta</Text>
                </View>
              </View>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>🚀</Text>
                <View>
                  <Text style={styles.rowLabel}>Upgrade to Pro</Text>
                  <Text style={styles.rowSub}>Unlimited activations — coming soon</Text>
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
                <Text style={styles.rowIcon}>🟡</Text>
                <View>
                  <Text style={styles.rowLabel}>Double Yellow</Text>
                  <Text style={styles.rowSub}>Version 1.0.0 — Beta</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={() => router.push('/privacy')} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>📄</Text>
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
                <Text style={styles.rowIcon}>📋</Text>
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
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2, width: 60 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  savingText: { fontSize: 10, fontWeight: '700', color: '#FFD700', letterSpacing: 2, width: 60, textAlign: 'right' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 24, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 3 },
  card: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  rowIcon: { fontSize: 22 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  rowSub: { fontSize: 11, color: '#555555', letterSpacing: 0.5, marginTop: 2 },
  rowArrow: { fontSize: 20, color: '#444444' },
  divider: { height: 1, backgroundColor: '#2A2A2A', marginHorizontal: 16 },
  radiusRow: { flexDirection: 'row', gap: 8, padding: 16 },
  radiusButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333333', alignItems: 'center', backgroundColor: '#0D0D0D' },
  radiusButtonActive: { backgroundColor: '#E63946', borderColor: '#E63946' },
  radiusText: { fontSize: 13, fontWeight: '900', color: '#555555', letterSpacing: 1 },
  radiusTextActive: { color: '#FFFFFF' },
  radiusSub: { fontSize: 11, color: '#444444', letterSpacing: 0.5, paddingHorizontal: 16, paddingBottom: 16, lineHeight: 16 },
  freeBadge: { borderWidth: 1, borderColor: '#FFD700', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  freeBadgeText: { fontSize: 10, fontWeight: '900', color: '#FFD700', letterSpacing: 2 },
  logoutButton: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#E63946', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '900', color: '#E63946', letterSpacing: 4 },
});