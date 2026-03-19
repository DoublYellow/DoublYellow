import * as Location from 'expo-location';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
import { sendLocalNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';

// ─── AdMob config ────────────────────────────────────────────────────────────
// TODO: Replace placeholder IDs with your real AdMob ad unit IDs before release
const ADMOB_ANDROID_UNIT_ID = 'ca-app-pub-2486082859770139/3473534357';
const ADMOB_IOS_UNIT_ID     = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // ← paste iOS ad unit ID here

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios' ? ADMOB_IOS_UNIT_ID : ADMOB_ANDROID_UNIT_ID;

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});
// ─────────────────────────────────────────────────────────────────────────────

const RADII = ['50m', '100m', '250m', '500m'];
const DEFAULT_RADIUS = '100m';

function getDistanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMinutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function formatMinutesAgo(mins: number): string {
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} mins ago`;
}

export default function ParkedScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const [selectedRadius, setSelectedRadius] = useState(DEFAULT_RADIUS);
  const [saveForNext, setSaveForNext] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [carLocation, setCarLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertDistance, setAlertDistance] = useState(0);
  const [alertMinutesAgo, setAlertMinutesAgo] = useState(0);
  const [alertIsRecent, setAlertIsRecent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const pendingActivateRef = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const alertPulse = useRef(new Animated.Value(1)).current;
  const alertReporterIdsRef = useRef<string[]>([]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Load car location
  useEffect(() => {
    if (lat && lng) {
      setCarLocation({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
    } else {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setCarLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      })();
    }
  }, [lat, lng]);

  // On mount: load settings and check for existing active session
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Load default radius from settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('default_radius')
        .eq('user_id', user.id)
        .single();

      if (settingsData) {
        setSelectedRadius(`${settingsData.default_radius}m`);
      }

      // Check for existing active session
      const { data } = await supabase
        .from('parked_sessions')
        .select('id, radius_metres')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (data) {
        setSessionId(data.id);
        setIsActive(true);
        const label = `${data.radius_metres}m`;
        if (RADII.includes(label)) setSelectedRadius(label);
      }

      setLoading(false);
    })();
  }, []);

  // Pulse animation
  useEffect(() => {
    if (isActive) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulse.setValue(1);
    }
  }, [isActive]);

  // Alert pulse animation
  useEffect(() => {
    if (alertVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(alertPulse, { toValue: 0.4, duration: 500, useNativeDriver: true }),
          Animated.timing(alertPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      alertPulse.setValue(1);
    }
  }, [alertVisible]);

  // Real-time subscription — only while active
  useEffect(() => {
    if (!isActive || !carLocation) return;
    const radiusMetres = parseInt(selectedRadius.replace('m', ''));
    const channel = supabase
      .channel('warden-reports')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'warden_reports' },
        (payload) => {
          const { latitude, longitude, created_at } = payload.new;
          const distance = getDistanceMetres(
            carLocation.latitude,
            carLocation.longitude,
            latitude,
            longitude
          );
          if (distance <= radiusMetres) {
            const minsAgo = getMinutesAgo(created_at ?? new Date().toISOString());
            setAlertDistance(Math.round(distance));
            setAlertMinutesAgo(minsAgo);
            setAlertIsRecent(false);
            setAlertVisible(true);
            // Track who sent this alert so we can thank them later
            const reporterId = payload.new.user_id;
            if (reporterId && !alertReporterIdsRef.current.includes(reporterId)) {
              alertReporterIdsRef.current.push(reporterId);
            }
            sendLocalNotification(
              '🚨 WARDEN SPOTTED',
              `A warden has been reported ${Math.round(distance)}m from your car!`
            );
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isActive, carLocation, selectedRadius]);

  // Load interstitial ad and listen for events
  useEffect(() => {
    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });
    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      interstitial.load(); // preload next ad
      // If activate was waiting for ad to close, run it now
      if (pendingActivateRef.current) {
        pendingActivateRef.current = false;
        runActivate();
      }
    });
    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      setAdLoaded(false);
      // On error, just activate without ad
      if (pendingActivateRef.current) {
        pendingActivateRef.current = false;
        runActivate();
      }
    });
    interstitial.load();
    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, []);

  const runActivate = async () => {
    if (!carLocation) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const radiusMetres = parseInt(selectedRadius.replace('m', ''));

    await supabase.from('parked_sessions').update({ is_active: false }).eq('user_id', user.id);

    const { data } = await supabase
      .from('parked_sessions')
      .insert({
        user_id: user.id,
        latitude: carLocation.latitude,
        longitude: carLocation.longitude,
        radius_metres: radiusMetres,
        is_active: true,
      })
      .select()
      .single();
    if (data) setSessionId(data.id);
    setIsActive(true);

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentReports } = await supabase
      .from('warden_reports')
      .select('latitude, longitude, created_at')
      .gte('created_at', thirtyMinsAgo)
      .order('created_at', { ascending: false });

    if (recentReports) {
      for (const report of recentReports) {
        const distance = getDistanceMetres(
          carLocation.latitude, carLocation.longitude,
          report.latitude, report.longitude
        );
        if (distance <= radiusMetres) {
          const minsAgo = getMinutesAgo(report.created_at);
          setAlertDistance(Math.round(distance));
          setAlertMinutesAgo(minsAgo);
          setAlertIsRecent(true);
          setAlertVisible(true);
          sendLocalNotification('⚠️ RECENT WARDEN SIGHTING', `A warden was spotted ${Math.round(distance)}m away, ${formatMinutesAgo(minsAgo)}`);
          break;
        }
      }
    }
  };

  const handleActivate = () => {
    // Show interstitial ad for free plan users, then activate after it closes
    if (adLoaded) {
      pendingActivateRef.current = true;
      interstitial.show();
    } else {
      // Ad not ready — activate straight away (never block the user)
      runActivate();
    }
  };

  const handleDeactivate = () => {
    setShowTicketModal(true);
  };

  const doDeactivate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('parked_sessions').update({ is_active: false }).eq('user_id', user.id);
    setIsActive(false);
    setSessionId(null);
  };

  const handleNoTicket = async () => {
    setShowTicketModal(false);

    const { data: { user } } = await supabase.auth.getUser();

    // Find all reporters who submitted a warden report during this session, within the radius
    let reporterIds: string[] = [];
    if (user && sessionId) {
      // Get the session start time
      const { data: session } = await supabase
        .from('parked_sessions')
        .select('created_at, latitude, longitude, radius_metres')
        .eq('id', sessionId)
        .single();

      if (session) {
        const sessionLat = session.latitude;
        const sessionLng = session.longitude;
        const sessionRadius = session.radius_metres;
        const lookbackTime = new Date(new Date(session.created_at).getTime() - 30 * 60 * 1000).toISOString();

        const { data: reports } = await supabase
          .from('warden_reports')
          .select('user_id, latitude, longitude')
          .gte('created_at', lookbackTime)
          .neq('user_id', user.id);

        if (reports) {
          for (const report of reports) {
            const distance = getDistanceMetres(
              sessionLat, sessionLng,
              report.latitude, report.longitude
            );
            if (distance <= sessionRadius && !reporterIds.includes(report.user_id)) {
              reporterIds.push(report.user_id);
            }
          }
        }
      }
    }

    await doDeactivate();
    router.push(`/celebrate?reporterIds=${encodeURIComponent(JSON.stringify(reporterIds))}`);
  };

  const handleYesTicket = async () => {
    setShowTicketModal(false);
    await doDeactivate();
    router.push('/appeal');
  };

  if (loading) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>

      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <Animated.View style={[
            styles.alertBox,
            alertIsRecent ? styles.alertBoxRecent : styles.alertBoxLive,
            { opacity: alertPulse }
          ]}>
            <Text style={styles.alertEmoji}>{alertIsRecent ? '⚠️' : '🚨'}</Text>
            <Text style={[styles.alertTitle, alertIsRecent && styles.alertTitleRecent]}>
              {alertIsRecent ? 'RECENT SIGHTING' : 'WARDEN SPOTTED'}
            </Text>
            <Text style={styles.alertDistance}>{alertDistance}m away</Text>
            <Text style={styles.alertTime}>{formatMinutesAgo(alertMinutesAgo)}</Text>
            <Text style={styles.alertSub}>
              {alertIsRecent
                ? 'A warden was spotted near this location recently.'
                : 'A warden has been reported near your car!'}
            </Text>
            <TouchableOpacity
              style={[styles.alertButton, alertIsRecent && styles.alertButtonRecent]}
              onPress={() => setAlertVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.alertButtonText, alertIsRecent && styles.alertButtonTextRecent]}>GOT IT</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showTicketModal} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.ticketModalBox}>
            <Text style={styles.ticketModalEmoji}>🎫</Text>
            <Text style={styles.ticketModalTitle}>DID YOU GET A TICKET?</Text>
            <Text style={styles.ticketModalSub}>Be honest — we're here to help either way</Text>
            <TouchableOpacity style={styles.ticketNoButton} onPress={handleNoTicket} activeOpacity={0.8}>
              <Text style={styles.ticketNoText}>NO — I'M FREE! 🎉</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ticketYesButton} onPress={handleYesTicket} activeOpacity={0.8}>
              <Text style={styles.ticketYesText}>YES — I GOT ONE 😞</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')} activeOpacity={0.7}>
        <Text style={styles.backText}>← BACK</Text>
      </TouchableOpacity>

      <View style={styles.doubleYellow}>
        <View style={styles.yellowLine} />
        <View style={styles.yellowGap} />
        <View style={styles.yellowLine} />
      </View>

      <View style={styles.header}>
        {isActive && (
          <View style={styles.tickCircle}>
            <Text style={styles.tick}>✓</Text>
          </View>
        )}
        {!isActive && <Text style={styles.notLabel}>NOT</Text>}
        <Animated.Text style={[styles.activatedLabel, { opacity: isActive ? pulse : 1 }, !isActive && styles.activatedLabelInactive]}>
          ACTIVATED
        </Animated.Text>
        <Text style={styles.subLabel}>
          {isActive ? 'Community lookouts are go!' : 'Alerts Switched Off.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ALERT ME WHEN A WARDEN IS SPOTTED WITHIN</Text>
        <View style={styles.radiiRow}>
          {RADII.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusButton, selectedRadius === r && styles.radiusButtonActive]}
              onPress={() => setSelectedRadius(r)}
              activeOpacity={0.7}
            >
              <Text style={[styles.radiusText, selectedRadius === r && styles.radiusTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.checkboxRow} onPress={() => setSaveForNext(!saveForNext)} activeOpacity={0.7}>
          <View style={[styles.checkbox, saveForNext && styles.checkboxChecked]}>
            {saveForNext && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Save for next time</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.locationButton, carLocation && styles.locationButtonSet]}
          onPress={() => router.push('/carlocation')}
          activeOpacity={0.7}
        >
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationTextWrapper}>
            <Text style={[styles.locationLabel, carLocation && styles.locationLabelSet]}>
              {carLocation ? 'CAR LOCATION SET' : 'SET CAR LOCATION MANUALLY'}
            </Text>
            <Text style={styles.locationSub}>
              {carLocation ? 'Tap to update' : 'Defaults to your current GPS'}
            </Text>
          </View>
          {carLocation && <Text style={styles.locationTick}>✓</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.deactivateButton, !isActive && styles.activateButton]}
          onPress={isActive ? handleDeactivate : handleActivate}
          activeOpacity={0.8}
        >
          <Text style={[styles.deactivateText, !isActive && styles.activateText]}>
            {isActive ? 'DEACTIVATE' : 'ACTIVATE'}
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertBox: { borderWidth: 2, borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, width: '100%' },
  alertBoxLive: { backgroundColor: '#1A0000', borderColor: '#E63946' },
  alertBoxRecent: { backgroundColor: '#1A1200', borderColor: '#FFD700' },
  alertEmoji: { fontSize: 64 },
  alertTitle: { fontSize: 36, fontWeight: '900', color: '#E63946', letterSpacing: 6 },
  alertTitleRecent: { color: '#FFD700' },
  alertDistance: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  alertTime: { fontSize: 18, fontWeight: '700', color: '#888888', letterSpacing: 2 },
  alertSub: { fontSize: 14, color: '#888888', letterSpacing: 1, textAlign: 'center' },
  alertButton: { backgroundColor: '#E63946', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 8, marginTop: 8 },
  alertButtonRecent: { backgroundColor: '#FFD700' },
  alertButtonText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  alertButtonTextRecent: { color: '#0D0D0D' },
  backButton: { position: 'absolute', top: 80, left: 24, zIndex: 10 },
  backText: { fontSize: 12, fontWeight: '700', color: '#0D0D0D', letterSpacing: 2 },
  doubleYellow: { marginTop: 72 },
  yellowLine: { width: '100%', height: 30, backgroundColor: '#FFD700' },
  yellowGap: { height: 18, backgroundColor: '#0D0D0D' },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  tickCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  tick: { fontSize: 36, color: '#FFFFFF', fontWeight: '900', lineHeight: 42 },
  notLabel: { fontSize: 64, fontWeight: '900', color: '#555555', letterSpacing: 8 },
  activatedLabel: { fontSize: 64, fontWeight: '900', color: '#E63946', letterSpacing: 8 },
  activatedLabelInactive: { color: '#555555' },
  subLabel: { fontSize: 16, color: '#888888', letterSpacing: 2 },
  section: { paddingHorizontal: 24, gap: 20, marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 2, textAlign: 'center' },
  radiiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  radiusButton: { flex: 1, paddingVertical: 16, borderRadius: 8, borderWidth: 1, borderColor: '#333333', alignItems: 'center', backgroundColor: '#1A1A1A' },
  radiusButtonActive: { borderColor: '#E63946', backgroundColor: '#1A0A0A' },
  radiusText: { fontSize: 14, fontWeight: '700', color: '#666666', letterSpacing: 1 },
  radiusTextActive: { color: '#E63946' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: '#444444', backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { borderColor: '#E63946', backgroundColor: '#E63946' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  checkboxLabel: { fontSize: 14, color: '#888888', letterSpacing: 1 },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' },
  locationButtonSet: { borderColor: '#E63946', backgroundColor: '#1A0A0A' },
  locationIcon: { fontSize: 22 },
  locationTextWrapper: { flex: 1 },
  locationLabel: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  locationLabelSet: { color: '#E63946' },
  locationSub: { fontSize: 11, color: '#555555', letterSpacing: 1, marginTop: 2 },
  locationTick: { fontSize: 18, color: '#E63946', fontWeight: '900' },
  footer: { paddingHorizontal: 24, paddingVertical: 72, alignItems: 'center' },
  deactivateButton: { paddingVertical: 16, paddingHorizontal: 48, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF' },
  activateButton: { borderColor: '#E63946' },
  deactivateText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  activateText: { color: '#E63946' },
  ticketModalBox: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  ticketModalEmoji: { fontSize: 56 },
  ticketModalTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, textAlign: 'center' },
  ticketModalSub: { fontSize: 12, color: '#555555', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  ticketNoButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  ticketNoText: { fontSize: 16, fontWeight: '900', color: '#0D0D0D', letterSpacing: 2 },
  ticketYesButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E63946',
    width: '100%',
  },
  ticketYesText: { fontSize: 16, fontWeight: '900', color: '#E63946', letterSpacing: 2 },
});