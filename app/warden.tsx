import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { playAlertSent } from '../lib/sounds';
import HapticButton from '../components/HapticButton';
import { logEvent, logScreen } from '../lib/analytics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
const CONFETTI_COLORS = ['#FFD700', '#FFD700', '#E63946', '#00C853', '#2196F3', '#FF9800', '#E91E63', '#FFFFFF', '#9C27B0', '#FFD700'];
const FALL_COUNT = 70;
const BURST_COUNT = 50; // 25 per side

function makeFallingPieces() {
  return Array.from({ length: FALL_COUNT }, (_, i) => {
    const startX = Math.random() * SCREEN_WIDTH;
    const isRect = Math.random() > 0.4;
    return {
      id: `fall-${i}`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      width: isRect ? 6 + Math.random() * 8 : 8 + Math.random() * 8,
      height: isRect ? 12 + Math.random() * 10 : 8 + Math.random() * 8,
      borderRadius: isRect ? 2 : 50,
      delay: Math.random() * 900,
      duration: 2400 + Math.random() * 1600,
      startX,
      targetX: startX + (Math.random() - 0.5) * 160,
      translateY: new Animated.Value(-80),
      translateX: new Animated.Value(startX),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    };
  });
}

function makeBurstPieces() {
  return Array.from({ length: BURST_COUNT }, (_, i) => {
    const fromLeft = i < BURST_COUNT / 2;
    const startX = fromLeft ? -20 : SCREEN_WIDTH + 20;
    const targetX = fromLeft
      ? 40 + Math.random() * (SCREEN_WIDTH * 0.85)
      : SCREEN_WIDTH - 40 - Math.random() * (SCREEN_WIDTH * 0.85);
    const startY = SCREEN_HEIGHT * 0.1 + Math.random() * (SCREEN_HEIGHT * 0.45);
    const targetY = startY + (Math.random() - 0.2) * 400;
    return {
      id: `burst-${i}`,
      startX, startY, targetX, targetY,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      width: 8 + Math.random() * 10,
      height: Math.random() > 0.4 ? 14 + Math.random() * 10 : 8 + Math.random() * 10,
      borderRadius: Math.random() > 0.4 ? 2 : 50,
      delay: Math.random() * 250,
      duration: 700 + Math.random() * 600,
      translateX: new Animated.Value(startX),
      translateY: new Animated.Value(startY),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    };
  });
}

export default function WardenScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [submitted, setSubmitted] = useState(false);
  const [pinCoord, setPinCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoVerified, setPhotoVerified] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [username, setUsername] = useState<string>('');
  const [totalReports, setTotalReports] = useState(0);
  const [earnedActivation, setEarnedActivation] = useState(false);
  const [reportsUntilCredit, setReportsUntilCredit] = useState<number | null>(null);

  const RATE_LIMIT_MINUTES = 5;
  const RATE_LIMIT_MAX = 2;
  const mapRef = useRef<MapView>(null);
  const fallingPieces = useRef(makeFallingPieces()).current;
  const burstPieces = useRef(makeBurstPieces()).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    logScreen('WardenReport');
    // Pre-check rate limit on mount so user sees countdown before pressing
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await checkRateLimitForUser(user.id);
    })();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [navigation]);

  // Android (Samsung etc) may kill the JS thread while the camera app is open.
  // getPendingResultAsync recovers the camera result when the app restarts.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      const pending = await ImagePicker.getPendingResultAsync();
      if (pending && !pending.canceled && pending.assets && pending.assets.length > 0) {
        setPhotoTaken(true);
        setPhotoVerified(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      // Use last known position immediately so the map opens on the right spot
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        setLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
      }
      // Then refine with accurate GPS
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  const startCountdown = (seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    let s = seconds;
    countdownRef.current = setInterval(() => {
      s -= 1;
      if (s <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setRateLimitSecondsLeft(0);
      } else {
        setRateLimitSecondsLeft(s);
      }
    }, 1000);
  };

  const checkRateLimitForUser = async (userId: string) => {
    const windowStart = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();
    const { data: recentReports } = await supabase
      .from('warden_reports')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true });
    if (recentReports && recentReports.length >= RATE_LIMIT_MAX) {
      const oldestInWindow = new Date(recentReports[0].created_at).getTime();
      const windowEnds = oldestInWindow + RATE_LIMIT_MINUTES * 60 * 1000;
      const secondsLeft = Math.ceil((windowEnds - Date.now()) / 1000);
      if (secondsLeft > 0) {
        setRateLimitSecondsLeft(secondsLeft);
        setRateLimitMessage(null);
        startCountdown(secondsLeft);
      }
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    setPinCoord(e.nativeEvent.coordinate);
  };

  const handlePhotoVerify = async () => {
    if (photoVerified) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.3,
    });
    if (result.canceled) return;

    // Any photo taken counts as verified — no server call needed
    setPhotoTaken(true);
    setPhotoVerified(true);
  };

  const handleSubmit = async () => {
    if (!pinCoord) return;

    // Ensure the spotter is within 100m of the pin they've dropped.
    if (location) {
      const spotterDistance = getDistanceMetres(
        location.latitude, location.longitude,
        pinCoord.latitude, pinCoord.longitude
      );
      if (spotterDistance > 500) {
        setRateLimitMessage('You must be within 500 metres of the warden to file a report.');
        return;
      }
    }

    setLoading(true);
    setRateLimitMessage(null);

    // Get user first, then fetch profile + rate limit in parallel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const windowStart = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString();
    const [{ data: profile }, { data: recentReports }] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', user.id).single(),
      supabase.from('warden_reports').select('created_at').eq('user_id', user.id).gte('created_at', windowStart).order('created_at', { ascending: true }),
    ]);

    setUsername(profile?.username ?? '');

    // Rate limit check
    if (recentReports && recentReports.length >= RATE_LIMIT_MAX) {
      const oldestInWindow = new Date(recentReports[0].created_at).getTime();
      const windowEnds = oldestInWindow + RATE_LIMIT_MINUTES * 60 * 1000;
      const secondsLeft = Math.ceil((windowEnds - Date.now()) / 1000);
      if (secondsLeft > 0) {
        setRateLimitSecondsLeft(secondsLeft);
        startCountdown(secondsLeft);
      }
      setLoading(false);
      return;
    }

    const points = photoVerified ? 100 : 50;

    // Insert the report
    const { data: reportData } = await supabase.from('warden_reports').insert({
      user_id: user.id,
      latitude: pinCoord.latitude,
      longitude: pinCoord.longitude,
      photo_verified: photoVerified,
      points_awarded: points,
    }).select('id').single();

    // ── Show success screen immediately — report is filed ────────────────────
    setPointsEarned(points);
    setLoading(false);
    setSubmitted(true);
    logEvent('warden_report_submitted', { photo_verified: photoVerified, points });
    playAlertSent();
    // ────────────────────────────────────────────────────────────────────────

    // Run all remaining queries in the background — these update the success
    // screen stats but don't block showing it.
    ;(async () => {
      try {
        const earned: string[] = [];

        // Notify nearby parked drivers + credit raffle tickets to reporter
        supabase.functions.invoke('notify-warden', {
          body: {
            record: {
              id: reportData?.id,
              user_id: user.id,
              latitude: pinCoord.latitude,
              longitude: pinCoord.longitude,
              photo_verified: photoVerified,
            },
          },
        }).catch((e) => console.log('notify-warden error:', e));

        // Award points + fetch stats in parallel
        const { data: { session } } = await supabase.auth.getSession();
        const [, { count: reportCount }] = await Promise.all([
          reportData?.id
            ? supabase.functions.invoke('award-points', {
                body: { report_id: reportData.id },
                headers: { Authorization: `Bearer ${session?.access_token}` },
              })
            : Promise.resolve(),
          supabase.from('warden_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

        setTotalReports(reportCount ?? 1);
        if (reportCount === 1) earned.push('FIRST ALERT');

        if (photoVerified) {
          const [{ count: photoCount }, { count: verifiedCount }, { count: creditsGranted }] = await Promise.all([
            supabase.from('warden_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('photo_verified', true),
            supabase.from('warden_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('photo_verified', true),
            supabase.from('earned_activations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('source', 'warden_report'),
          ]);

          if (photoCount === 1) earned.push('VERIFIED');

          const vCount = verifiedCount ?? 0;
          const shouldHave = Math.floor(vCount / 10);
          const has = creditsGranted ?? 0;
          if (shouldHave > has) {
            setEarnedActivation(true);
            setReportsUntilCredit(10);
          } else {
            setReportsUntilCredit(10 - (vCount % 10));
          }
        }

        setNewBadges(earned);
      } catch (e) {
        console.log('Background stats error:', String(e));
      }
    })();

    // Fire confetti — burst from sides
    burstPieces.forEach((piece) => {
      piece.translateX.setValue(piece.startX);
      piece.translateY.setValue(piece.startY);
      piece.opacity.setValue(1);
      piece.rotate.setValue(0);
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(piece.translateX, { toValue: piece.targetX, duration: piece.duration, useNativeDriver: true }),
          Animated.timing(piece.translateY, { toValue: piece.targetY, duration: piece.duration, useNativeDriver: true }),
          Animated.timing(piece.rotate, { toValue: 1, duration: piece.duration, useNativeDriver: true }),
          Animated.timing(piece.opacity, { toValue: 0, duration: piece.duration * 0.5, delay: piece.duration * 0.5, useNativeDriver: true }),
        ]).start();
      }, piece.delay);
    });

    // Fire confetti — rain from top (two waves)
    const fireRain = (delayOffset: number) => {
      fallingPieces.forEach((piece) => {
        piece.translateY.setValue(-80);
        piece.translateX.setValue(piece.startX);
        piece.opacity.setValue(1);
        piece.rotate.setValue(0);
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(piece.translateY, { toValue: SCREEN_HEIGHT + 80, duration: piece.duration, useNativeDriver: true }),
            Animated.timing(piece.translateX, { toValue: piece.targetX, duration: piece.duration, useNativeDriver: true }),
            Animated.timing(piece.rotate, { toValue: 1, duration: piece.duration, useNativeDriver: true }),
            Animated.timing(piece.opacity, { toValue: 0, duration: piece.duration * 0.4, delay: piece.duration * 0.6, useNativeDriver: true }),
          ]).start();
        }, delayOffset + piece.delay);
      });
    };
    fireRain(0);
    fireRain(1400); // second wave

  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.successContainer}>
        {/* Confetti layer */}
        <View style={styles.confettiContainer} pointerEvents="none">
          {fallingPieces.map((piece) => {
            const rotation = piece.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '900deg'] });
            return (
              <Animated.View
                key={piece.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: piece.startX,
                  width: piece.width,
                  height: piece.height,
                  backgroundColor: piece.color,
                  borderRadius: piece.borderRadius,
                  opacity: piece.opacity,
                  transform: [{ translateY: piece.translateY }, { translateX: piece.translateX }, { rotate: rotation }],
                }}
              />
            );
          })}
          {burstPieces.map((piece) => {
            const rotation = piece.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
            return (
              <Animated.View
                key={piece.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: piece.width,
                  height: piece.height,
                  backgroundColor: piece.color,
                  borderRadius: piece.borderRadius,
                  opacity: piece.opacity,
                  transform: [{ translateX: piece.translateX }, { translateY: piece.translateY }, { rotate: rotation }],
                }}
              />
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={[styles.successScroll, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Ionicons name="warning" size={48} color="#E63946" />
          <Text style={styles.successTitle} allowFontScaling={false}>ALERT SENT</Text>

          <Text style={styles.successThankYou} allowFontScaling={false}>
            {username ? `Thank you, ${username}!` : 'Thank you!'}
          </Text>

          <Text style={styles.successImpact} allowFontScaling={false}>
            You could have just saved drivers up to{' '}
            <Text style={styles.successImpactHighlight}>£160 in fines!</Text>
          </Text>

          <Text style={styles.successSub} allowFontScaling={false}>Drivers nearby have been notified.{'\n'}Every spot counts.</Text>

          <Text style={styles.successPoints} allowFontScaling={false}>+{pointsEarned} pts earned</Text>

          {totalReports > 1 && (
            <Text style={styles.successTally} allowFontScaling={false}>
              <Ionicons name="ribbon-outline" size={13} color="#888888" /> You've filed <Text style={styles.successTallyNum}>{totalReports}</Text> alerts — keep it up!
            </Text>
          )}

          {newBadges.length > 0 && (
            <View style={styles.badgesEarned}>
              <Text style={styles.badgesEarnedLabel}>BADGE UNLOCKED</Text>
              {newBadges.map(badge => (
                <Text key={badge} style={styles.badgesEarnedItem}><Ionicons name="ribbon-outline" size={18} color="#FFD700" /> {badge}</Text>
              ))}
            </View>
          )}

          {earnedActivation && (
            <View style={styles.creditEarned}>
              <Ionicons name="car-sport" size={22} color="#4CAF50" />
              <Text style={styles.creditEarnedText}>BONUS ACTIVATION EARNED!</Text>
              <Text style={styles.creditEarnedSub}>You've verified 10 wardens — a free activation has been added to your account.</Text>
            </View>
          )}

          {!earnedActivation && photoVerified && reportsUntilCredit !== null && (
            <Text style={styles.creditProgress} allowFontScaling={false}>
              <Ionicons name="car-outline" size={13} color="#555555" /> {reportsUntilCredit} more verified report{reportsUntilCredit !== 1 ? 's' : ''} until a free activation
            </Text>
          )}

          <Text style={styles.successEncourage} allowFontScaling={false}>Keep spotting. Keep saving.{'\n'}You're making a real difference.{' '}
            <Ionicons name="heart-outline" size={14} color="#555555" />
          </Text>

          <HapticButton style={styles.successHomeButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.successHomeText}>BACK TO HOME</Text>
          </HapticButton>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.topBar}>
        <HapticButton onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
          <Text style={styles.backText}>← BACK</Text>
        </HapticButton>
      </View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WARDEN SPOTTED</Text>
        <Text style={styles.headerSub}>Drop a pin where you saw them</Text>
      </View>

      <View style={styles.mapContainer}>
        {location ? (
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              showsUserLocation
              customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
              onPress={handleMapPress}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            >
              {pinCoord && (
                <Marker coordinate={pinCoord} pinColor="#FFD700" tappable={false} />
              )}
            </MapView>
            {!pinCoord && (
              <View style={styles.mapHint} pointerEvents="none">
                <Text style={styles.mapHintText}>TAP MAP TO PLACE WARDEN</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.mapLoading}>
            <Text style={styles.mapLoadingText}>GETTING YOUR LOCATION...</Text>
          </View>
        )}
      </View>

      <HapticButton
        style={[styles.photoButton, photoVerified && styles.photoButtonVerified]}
        onPress={handlePhotoVerify}
        activeOpacity={0.7}
        disabled={photoVerified}
      >
        {photoVerified ? (
          <Ionicons name="checkmark" size={24} color="#00C853" />
        ) : (
          <Ionicons name="camera" size={24} color="#FFD700" />
        )}
        <View style={styles.photoTextWrapper}>
          <Text style={[styles.photoLabel, photoVerified && styles.photoLabelVerified]}>
            {photoVerified ? 'PHOTO VERIFIED' : 'PHOTO VERIFY'}
          </Text>
          <Text style={[styles.photoOptional, photoVerified && styles.photoPointsLabel]}>
            {photoVerified ? '+50 pts bonus' : '* optional — earn +50 extra pts'}
          </Text>
        </View>
        {photoVerified && <Text style={styles.photoBonusTag}>BONUS</Text>}
      </HapticButton>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <HapticButton
          style={[styles.submitButton, (!pinCoord || loading || rateLimitSecondsLeft > 0) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!pinCoord || loading || rateLimitSecondsLeft > 0}
          activeOpacity={0.8}
        >
          <Text style={[styles.submitText, (!pinCoord || loading || rateLimitSecondsLeft > 0) && styles.submitTextDisabled]}>
            {loading
              ? 'SENDING...'
              : rateLimitSecondsLeft > 0
              ? `WAIT ${Math.floor(rateLimitSecondsLeft / 60)}:${(rateLimitSecondsLeft % 60).toString().padStart(2, '0')}`
              : 'REPORT WARDEN'}
          </Text>
        </HapticButton>
      </View>

    </SafeAreaView>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 52 : 12,
    paddingBottom: 8,
  },
  backButton: { paddingVertical: 10, paddingRight: 24 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: 13,
    color: '#666666',
    letterSpacing: 1,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  map: { flex: 1 },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  mapLoadingText: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  mapHint: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 2,
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
  },
  photoButtonVerified: {
    borderColor: '#00C853',
    backgroundColor: '#0A1F0A',
  },
  photoIcon: { fontSize: 24, color: '#00C853' },
  photoTextWrapper: { flex: 1 },
  photoLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  photoLabelVerified: { color: '#00C853' },
  photoOptional: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
    marginTop: 2,
  },
  photoPointsLabel: { color: '#00C853', fontWeight: '700' },
  photoBonusTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00C853',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#00C853',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: { padding: 16, paddingBottom: 24, gap: 10 },
  submitButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 4,
  },
  submitTextDisabled: { color: '#444444' },
  successContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  successScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 14,
  },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  successTitle: {
    fontSize: Math.min(48, SCREEN_WIDTH * 0.13),
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  successThankYou: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
  },
  successImpact: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
  },
  successImpactHighlight: {
    color: '#FFD700',
    fontWeight: '900',
  },
  successSub: {
    fontSize: 14,
    color: '#666666',
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 22,
  },
  successPoints: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginTop: 4,
  },
  successTally: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  successTallyNum: {
    color: '#FFD700',
    fontWeight: '900',
  },
  successEncourage: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
    marginTop: 8,
    paddingHorizontal: 24,
  },
  successHomeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 16,
  },
  successHomeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 4,
  },
  badgesEarned: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  badgesEarnedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 3,
  },
  badgesEarnedItem: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  creditEarned: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#0A1F0A',
  },
  creditEarnedText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 2,
  },
  creditEarnedSub: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  creditProgress: {
    fontSize: 12,
    color: '#555555',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});