import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MobileAds, { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
import { Ionicons } from '@expo/vector-icons';
import { sendLocalNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';

// ─── AdMob config ────────────────────────────────────────────────────────────
// TODO: Replace placeholder IDs with your real AdMob ad unit IDs before release
const ADMOB_ANDROID_UNIT_ID = 'ca-app-pub-2486082859770139/3473534357';
const ADMOB_IOS_UNIT_ID     = 'ca-app-pub-2486082859770139/4158395213';

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios' ? ADMOB_IOS_UNIT_ID : ADMOB_ANDROID_UNIT_ID;

// ─────────────────────────────────────────────────────────────────────────────

// ─── Beta mode — set to false when paid tiers go live ────────────────────────
const BETA_MODE = true;

// ─── Tier activation limits ───────────────────────────────────────────────────
// Free:      1 per week (resets Monday 00:00 UTC) + earned credits (expire 14d)
// Pro:       1 per day (resets midnight UTC)      + earned credits (never expire)
// Unlimited: unlimited, no limit check
// ─────────────────────────────────────────────────────────────────────────────

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getDayStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
  const { lat, lng, deactivate: autoDeactivateParam } = useLocalSearchParams<{ lat: string; lng: string; deactivate: string }>();
  const autoDeactivate = autoDeactivateParam === '1';
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
  const [userTier, setUserTier] = useState<string>('free');
  const [basePeriodActivations, setBasePeriodActivations] = useState(0); // used this week (free) or today (pro)
  const [earnedCredits, setEarnedCredits] = useState(0);
  const [earnedCreditId, setEarnedCreditId] = useState<string | null>(null); // oldest available credit to use next
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerHours, setTimerHours] = useState(1);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [ticketExpiresAt, setTicketExpiresAt] = useState<Date | null>(null);
  const [timerNotificationId, setTimerNotificationId] = useState<string | null>(null);
  const [activeTrack, setActiveTrack] = useState(false);
  const liveLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const pendingActivateRef = useRef(false);
  const runActivateRef = useRef<() => Promise<void>>(async () => {});
  const interstitialRef = useRef<InterstitialAd | null>(null);
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

      // Load user tier from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();
      const tier = profileData?.tier ?? 'free';
      if (profileData?.tier) setUserTier(tier);

      // Count activations used in current period (week for free, day for pro)
      if (tier !== 'unlimited') {
        const periodStart = tier === 'pro' ? getDayStart() : getWeekStart();
        const { count: periodCount } = await supabase
          .from('parked_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', periodStart.toISOString());
        setBasePeriodActivations(periodCount ?? 0);

        // Fetch available earned credits (not used, not expired)
        const { data: credits } = await supabase
          .from('earned_activations')
          .select('id, expires_at')
          .eq('user_id', user.id)
          .is('used_at', null)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('granted_at', { ascending: true }); // use oldest first
        const availableCredits = credits ?? [];
        setEarnedCredits(availableCredits.length);
        setEarnedCreditId(availableCredits[0]?.id ?? null);
      }

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

  // Auto-trigger deactivation flow when arriving from home screen shortcut
  useEffect(() => {
    if (!loading && autoDeactivate && isActive) {
      handleDeactivate();
    }
  }, [loading, autoDeactivate, isActive]);

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

  // Real-time subscription — only while active.
  // Always reads from liveLocationRef so active-track mode works without re-subscribing on every GPS tick.
  useEffect(() => {
    if (!isActive) return;
    const radiusMetres = parseInt(selectedRadius.replace('m', ''));
    const channel = supabase
      .channel('warden-reports')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'warden_reports' },
        (payload) => {
          const currentLocation = liveLocationRef.current;
          if (!currentLocation) return;
          const { latitude, longitude, created_at } = payload.new;
          const distance = getDistanceMetres(
            currentLocation.latitude,
            currentLocation.longitude,
            latitude,
            longitude
          );
          if (distance <= radiusMetres) {
            const minsAgo = getMinutesAgo(created_at ?? new Date().toISOString());
            setAlertDistance(Math.round(distance));
            setAlertMinutesAgo(minsAgo);
            setAlertIsRecent(false);
            setAlertVisible(true);
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
  }, [isActive, selectedRadius]);

  // Active Track GPS watcher — streams live position into liveLocationRef while active
  useEffect(() => {
    if (!isActive || !activeTrack) return;
    let cancelled = false;
    let watcher: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
        (loc) => {
          liveLocationRef.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      );
      if (cancelled) {
        // Component unmounted before watcher resolved — remove immediately
        watcher.remove();
        return;
      }
      locationWatcherRef.current = watcher;
    })();
    return () => {
      cancelled = true;
      watcher?.remove();
      locationWatcherRef.current = null;
    };
  }, [isActive, activeTrack]);

  // Load interstitial ad and listen for events
  useEffect(() => {
    const setup = async () => {
      const ad = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      interstitialRef.current = ad;

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        setAdLoaded(true);
      });
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        setAdLoaded(false);
        ad.load(); // preload next ad
        if (pendingActivateRef.current) {
          pendingActivateRef.current = false;
          runActivateRef.current();
        }
      });
      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        setAdLoaded(false);
        if (pendingActivateRef.current) {
          pendingActivateRef.current = false;
          runActivateRef.current();
        }
      });

      ad.load();

      return () => {
        unsubLoaded();
        unsubClosed();
        unsubError();
      };
    };

    let cleanup: (() => void) | undefined;
    let unmounted = false;
    setup().then((fn) => {
      if (unmounted) {
        fn?.(); // already unmounted — unsubscribe listeners immediately
      } else {
        cleanup = fn;
      }
    });
    return () => {
      unmounted = true;
      cleanup?.();
    };
  }, []);

  const handleSetTimer = async () => {
    const totalMs = (timerHours * 60 + timerMinutes) * 60 * 1000;
    if (totalMs <= 10 * 60 * 1000) return; // need more than 10 mins for the warning to fire
    const expiresAt = new Date(Date.now() + totalMs);
    setTicketExpiresAt(expiresAt);

    // Cancel any existing timer notification
    if (timerNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(timerNotificationId);
    }

    // Schedule notification 10 minutes before expiry
    const warningTime = new Date(expiresAt.getTime() - 10 * 60 * 1000);
    const secondsUntilWarning = Math.max(1, (warningTime.getTime() - Date.now()) / 1000);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏱ TICKET EXPIRING SOON',
        body: `Your parking ticket runs out in 10 minutes! Move your car or pay now.`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilWarning },
    });
    setTimerNotificationId(id);
    setShowTimerModal(false);
  };

  const handleClearTimer = async () => {
    if (timerNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(timerNotificationId);
      setTimerNotificationId(null);
    }
    setTicketExpiresAt(null);
    setShowTimerModal(false);
  };

  const formatExpiry = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const runActivate = async () => {
    // In active track mode, get a one-shot GPS fix if no manual location is set
    let location = carLocation;
    if (!location) {
      if (activeTrack) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      } else {
        return;
      }
    }
    // Seed the live location ref so the subscription has a starting point immediately
    liveLocationRef.current = location;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const radiusMetres = parseInt(selectedRadius.replace('m', ''));

    await supabase.from('parked_sessions').update({ is_active: false }).eq('user_id', user.id);

    // Save radius as default if user checked "Save for next time"
    if (saveForNext) {
      await supabase
        .from('settings')
        .upsert({ user_id: user.id, default_radius: radiusMetres }, { onConflict: 'user_id' });
    }

    const { data } = await supabase
      .from('parked_sessions')
      .insert({
        user_id: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        radius_metres: radiusMetres,
        is_active: true,
      })
      .select()
      .single();
    if (data) setSessionId(data.id);
    setIsActive(true);

    // Determine whether this activation consumed a base slot or an earned credit
    const baseLimit = userTier === 'pro' ? 1 : 1; // 1/day pro, 1/week free
    const baseExhausted = userTier !== 'unlimited' && basePeriodActivations >= baseLimit;
    if (baseExhausted && earnedCreditId) {
      // Mark the earned credit as used
      await supabase
        .from('earned_activations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', earnedCreditId);
      setEarnedCredits(prev => Math.max(0, prev - 1));
      setEarnedCreditId(null);
    } else {
      setBasePeriodActivations(prev => prev + 1);
    }

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentReports } = await supabase
      .from('warden_reports')
      .select('latitude, longitude, created_at')
      .gte('created_at', thirtyMinsAgo)
      .order('created_at', { ascending: false });

    if (recentReports) {
      for (const report of recentReports) {
        const distance = getDistanceMetres(
          location.latitude, location.longitude,
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

  runActivateRef.current = runActivate;

  const handleActivate = () => {
    // In beta, always allow activation
    if (!BETA_MODE && userTier !== 'unlimited') {
      const baseLimit = userTier === 'pro' ? 1 : 1; // 1/day for pro, 1/week for free
      const baseAvailable = basePeriodActivations < baseLimit;
      const hasEarned = earnedCredits > 0;
      if (!baseAvailable && !hasEarned) {
        // No activations left — could show a paywall/upgrade prompt here
        return;
      }
    }
    runActivate();
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
    // Stop GPS watcher if active track was running
    locationWatcherRef.current?.remove();
    locationWatcherRef.current = null;
    liveLocationRef.current = null;
    // Cancel any pending ticket timer notification
    if (timerNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(timerNotificationId);
      setTimerNotificationId(null);
    }
    setTicketExpiresAt(null);
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

      {/* Ticket Timer Modal */}
      <Modal visible={showTimerModal} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.timerModalBox}>
            <Ionicons name="timer-outline" size={48} color="#FFD700" />
            <Text style={styles.timerModalTitle}>SET TICKET TIMER</Text>
            <Text style={styles.timerModalSub}>We'll remind you 10 minutes before your ticket runs out</Text>

            <View style={styles.timerPickerRow}>
              {/* Hours */}
              <View style={styles.timerPickerCol}>
                <TouchableOpacity onPress={() => setTimerHours(h => Math.min(12, h + 1))} style={styles.timerArrow}>
                  <Ionicons name="chevron-up" size={24} color="#FFD700" />
                </TouchableOpacity>
                <Text style={styles.timerValue}>{timerHours.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setTimerHours(h => Math.max(0, h - 1))} style={styles.timerArrow}>
                  <Ionicons name="chevron-down" size={24} color="#FFD700" />
                </TouchableOpacity>
                <Text style={styles.timerUnit}>HRS</Text>
              </View>

              <Text style={styles.timerColon}>:</Text>

              {/* Minutes */}
              <View style={styles.timerPickerCol}>
                <TouchableOpacity onPress={() => setTimerMinutes(m => (m + 15) % 60)} style={styles.timerArrow}>
                  <Ionicons name="chevron-up" size={24} color="#FFD700" />
                </TouchableOpacity>
                <Text style={styles.timerValue}>{timerMinutes.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setTimerMinutes(m => m === 0 ? 45 : m - 15)} style={styles.timerArrow}>
                  <Ionicons name="chevron-down" size={24} color="#FFD700" />
                </TouchableOpacity>
                <Text style={styles.timerUnit}>MIN</Text>
              </View>
            </View>

            {(timerHours * 60 + timerMinutes) <= 10 && (
              <Text style={styles.timerWarning}>Set more than 10 minutes for the reminder to work</Text>
            )}

            <TouchableOpacity
              style={[styles.timerConfirmButton, (timerHours * 60 + timerMinutes) <= 10 && styles.timerConfirmDisabled]}
              onPress={handleSetTimer}
              disabled={(timerHours * 60 + timerMinutes) <= 10}
              activeOpacity={0.8}
            >
              <Text style={styles.timerConfirmText}>SET REMINDER</Text>
            </TouchableOpacity>

            {ticketExpiresAt && (
              <TouchableOpacity onPress={handleClearTimer} style={styles.timerClearButton}>
                <Text style={styles.timerClearText}>CLEAR TIMER</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setShowTimerModal(false)} style={styles.timerCancelButton}>
              <Text style={styles.timerCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            <Ionicons name="pricetag-outline" size={56} color="#FFD700" />
            <Text style={styles.ticketModalTitle}>DID YOU GET A TICKET?</Text>
            <Text style={styles.ticketModalSub}>Be honest — we're here to help either way</Text>
            <TouchableOpacity style={styles.ticketNoButton} onPress={handleNoTicket} activeOpacity={0.8}>
              <Text style={styles.ticketNoText}>NO — I'M FREE!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ticketYesButton} onPress={handleYesTicket} activeOpacity={0.8}>
              <Text style={styles.ticketYesText}>YES — I GOT ONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.doubleYellow}>
        <View style={styles.yellowLine} />
        <View style={styles.yellowGap} />
        <View style={styles.yellowLine} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {isActive && (
            <View style={styles.tickCircle}>
              <Text style={styles.tick}>✓</Text>
            </View>
          )}
          {!isActive && <Text style={styles.notLabel}>NOT</Text>}
          <Animated.Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            style={[styles.activatedLabel, { opacity: isActive ? pulse : 1 }, !isActive && styles.activatedLabelInactive]}
          >
            ACTIVATED
          </Animated.Text>
          <Text style={styles.subLabel}>
            {isActive && activeTrack ? 'Live tracking active' : isActive ? 'Community lookouts are go!' : 'Alerts Switched Off.'}
          </Text>

          {isActive && (
            <TouchableOpacity
              style={[styles.timerChip, ticketExpiresAt && styles.timerChipActive]}
              onPress={() => setShowTimerModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="timer-outline"
                size={16}
                color={ticketExpiresAt ? '#FFD700' : '#555555'}
              />
              <Text style={[styles.timerChipText, ticketExpiresAt && styles.timerChipTextActive]}>
                {ticketExpiresAt
                  ? `EXPIRES ${formatExpiry(ticketExpiresAt)}`
                  : 'SET TICKET TIMER'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel} numberOfLines={1} adjustsFontSizeToFit>ALERT ME WHEN A WARDEN IS SPOTTED WITHIN</Text>
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

          {userTier === 'unlimited' && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => !isActive && setActiveTrack(v => !v)}
              activeOpacity={isActive ? 1 : 0.7}
            >
              <View style={[styles.checkbox, activeTrack && styles.checkboxCheckedYellow]}>
                {activeTrack && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.checkboxLabel}>Active Track</Text>
                <View style={styles.unlimitedBadge}>
                  <Text style={styles.unlimitedBadgeText}>UNLIMITED</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    'Active Track',
                    'Your GPS location updates continuously while the app is open. Ideal for delivery drivers and tradespeople who move around — alerts follow you as you drive, so you\'re always protected wherever you park.',
                    [{ text: 'Got it', style: 'cancel' }]
                  )}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={styles.infoButton}>
                    <Text style={styles.infoButtonText}>?</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.locationButton, carLocation && !activeTrack && styles.locationButtonSet, activeTrack && styles.locationButtonDisabled]}
            onPress={() => !activeTrack && router.push('/carlocation')}
            activeOpacity={activeTrack ? 1 : 0.7}
            disabled={activeTrack}
          >
            <Ionicons name="location" size={22} color={activeTrack ? '#333333' : carLocation ? '#E63946' : '#666666'} />
            <View style={styles.locationTextWrapper}>
              <Text style={[styles.locationLabel, !activeTrack && carLocation && styles.locationLabelSet, activeTrack && styles.locationLabelDisabled]}>
                {activeTrack ? 'LOCATION NOT NEEDED' : carLocation ? 'CAR LOCATION SET' : 'SET CAR LOCATION MANUALLY'}
              </Text>
              <Text style={styles.locationSub}>
                {activeTrack ? 'GPS updates continuously' : carLocation ? 'Tap to update' : 'Defaults to your current GPS'}
              </Text>
            </View>
            {!activeTrack && carLocation && <Text style={styles.locationTick}>✓</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  topBar: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 72 : 12, paddingBottom: 12 },
  backButton: {},
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  doubleYellow: { marginTop: 8 },
  yellowLine: { width: '100%', height: 22, backgroundColor: '#FFD700' },
  yellowGap: { height: 12, backgroundColor: '#0D0D0D' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  header: { paddingVertical: 40, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  tickCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  tick: { fontSize: 36, color: '#FFFFFF', fontWeight: '900', lineHeight: 42 },
  notLabel: { fontSize: 64, fontWeight: '900', color: '#555555', letterSpacing: 8 },
  activatedLabel: { fontSize: 64, fontWeight: '900', color: '#E63946', letterSpacing: 2, width: '100%', textAlign: 'center' },
  activatedLabelInactive: { color: '#555555' },
  subLabel: { fontSize: 16, color: '#888888', letterSpacing: 2 },
  section: { paddingHorizontal: 24, gap: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 2, textAlign: 'center' },
  radiiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  radiusButton: { flex: 1, paddingVertical: 16, borderRadius: 8, borderWidth: 1, borderColor: '#333333', alignItems: 'center', backgroundColor: '#1A1A1A' },
  radiusButtonActive: { borderColor: '#E63946', backgroundColor: '#1A0A0A' },
  radiusText: { fontSize: 14, fontWeight: '700', color: '#666666', letterSpacing: 1 },
  radiusTextActive: { color: '#E63946' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: '#444444', backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { borderColor: '#E63946', backgroundColor: '#E63946' },
  checkboxCheckedYellow: { borderColor: '#FFD700', backgroundColor: '#FFD700' },
  checkmark: { color: '#0D0D0D', fontSize: 14, fontWeight: '900' },
  checkboxLabel: { fontSize: 14, color: '#888888', letterSpacing: 1 },
  unlimitedBadge: { backgroundColor: '#1A1600', borderWidth: 1, borderColor: '#FFD700', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  unlimitedBadgeText: { fontSize: 8, fontWeight: '900', color: '#FFD700', letterSpacing: 1.5 },
  infoButton: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#555555', alignItems: 'center', justifyContent: 'center' },
  infoButtonText: { fontSize: 10, fontWeight: '900', color: '#555555', lineHeight: 14 },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#333333', backgroundColor: '#1A1A1A' },
  locationButtonSet: { borderColor: '#E63946', backgroundColor: '#1A0A0A' },
  locationButtonDisabled: { borderColor: '#222222', backgroundColor: '#111111', opacity: 0.5 },
  locationTextWrapper: { flex: 1 },
  locationLabel: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  locationLabelSet: { color: '#E63946' },
  locationLabelDisabled: { color: '#444444' },
  locationSub: { fontSize: 11, color: '#555555', letterSpacing: 1, marginTop: 2 },
  locationTick: { fontSize: 18, color: '#E63946', fontWeight: '900' },
  footer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'android' ? 48 : 24, alignItems: 'center' },
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
  ticketModalTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, textAlign: 'center' },
  ticketModalSub: { fontSize: 12, color: '#555555', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  ticketNoButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  ticketNoText: { fontSize: 16, fontWeight: '900', color: '#0D0D0D', letterSpacing: 2, textAlign: 'center' },
  ticketYesButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E63946',
    width: '100%',
  },
  ticketYesText: { fontSize: 16, fontWeight: '900', color: '#E63946', letterSpacing: 2, textAlign: 'center' },

  // Timer chip
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
    marginTop: 4,
  },
  timerChipActive: {
    borderColor: '#FFD700',
    backgroundColor: '#1A1600',
  },
  timerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1.5,
  },
  timerChipTextActive: {
    color: '#FFD700',
  },

  // Timer modal
  timerModalBox: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  timerModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
  },
  timerModalSub: {
    fontSize: 12,
    color: '#555555',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  timerPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  timerPickerCol: {
    alignItems: 'center',
    gap: 4,
  },
  timerArrow: {
    padding: 8,
  },
  timerValue: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 2,
    minWidth: 80,
    textAlign: 'center',
  },
  timerUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 2,
  },
  timerColon: {
    fontSize: 48,
    fontWeight: '900',
    color: '#333333',
    marginBottom: 20,
  },
  timerWarning: {
    fontSize: 11,
    color: '#E63946',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  timerConfirmButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  timerConfirmDisabled: {
    backgroundColor: '#333333',
  },
  timerConfirmText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 3,
  },
  timerClearButton: {
    paddingVertical: 10,
  },
  timerClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E63946',
    letterSpacing: 2,
  },
  timerCancelButton: {
    paddingVertical: 8,
  },
  timerCancelText: {
    fontSize: 12,
    color: '#444444',
    letterSpacing: 1,
  },
});