import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COLORS = ['#FFD700', '#E63946', '#00C853', '#2196F3', '#FF9800', '#FFFFFF'];
const FALL_COUNT = 30;

function makeConfettiPieces() {
  return Array.from({ length: FALL_COUNT }, (_, i) => {
    const startX = Math.random() * SCREEN_WIDTH;
    return {
      id: `c-${i}`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 8,
      delay: Math.random() * 500,
      duration: 2000 + Math.random() * 1200,
      startX,
      targetX: startX + (Math.random() - 0.5) * 100,
      translateY: new Animated.Value(-60),
      translateX: new Animated.Value(startX),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    };
  });
}

export default function WardenScreen() {
  const navigation = useNavigation();
  const [submitted, setSubmitted] = useState(false);
  const [pinCoord, setPinCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoVerified, setPhotoVerified] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  const RATE_LIMIT_MINUTES = 5;
  const mapRef = useRef<MapView>(null);
  const confettiPieces = useRef(makeConfettiPieces()).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const handleMapPress = (e: MapPressEvent) => {
    setPinCoord(e.nativeEvent.coordinate);
  };

  const handlePhotoVerify = async () => {
    if (photoVerified) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotoVerified(true);
    }
  };

  const handleSubmit = async () => {
    if (!pinCoord) return;
    setLoading(true);
    setRateLimitMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Rate limit check — block if last report was within RATE_LIMIT_MINUTES
    const { data: lastReport } = await supabase
      .from('warden_reports')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastReport) {
      const secondsSince = (Date.now() - new Date(lastReport.created_at).getTime()) / 1000;
      const limitSeconds = RATE_LIMIT_MINUTES * 60;
      if (secondsSince < limitSeconds) {
        const minsLeft = Math.ceil((limitSeconds - secondsSince) / 60);
        setRateLimitMessage(`You can report again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.`);
        setLoading(false);
        return;
      }
    }

    const points = photoVerified ? 100 : 50;

    await supabase.from('warden_reports').insert({
      user_id: user.id,
      latitude: pinCoord.latitude,
      longitude: pinCoord.longitude,
      photo_verified: photoVerified,
      points_awarded: points,
    });

    await supabase.rpc('increment_points', {
      user_id: user.id,
      amount: points,
    });

    const earned: string[] = [];

    const { count: reportCount } = await supabase
      .from('warden_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (reportCount === 1) earned.push('FIRST ALERT');

    if (photoVerified) {
      const { count: photoCount } = await supabase
        .from('warden_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('photo_verified', true);
      if (photoCount === 1) earned.push('VERIFIED');
    }

    setPointsEarned(points);
    setNewBadges(earned);
    setLoading(false);
    setSubmitted(true);

    // Fire confetti
    confettiPieces.forEach((piece) => {
      piece.translateY.setValue(-60);
      piece.translateX.setValue(piece.startX);
      piece.opacity.setValue(1);
      piece.rotate.setValue(0);
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(piece.translateY, { toValue: SCREEN_HEIGHT + 60, duration: piece.duration, useNativeDriver: true }),
          Animated.timing(piece.translateX, { toValue: piece.targetX, duration: piece.duration, useNativeDriver: true }),
          Animated.timing(piece.rotate, { toValue: 1, duration: piece.duration, useNativeDriver: true }),
          Animated.timing(piece.opacity, { toValue: 0, duration: piece.duration, delay: piece.duration * 0.6, useNativeDriver: true }),
        ]).start();
      }, piece.delay);
    });

    setTimeout(() => navigation.goBack(), 3500);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.successContainer}>
        {/* Confetti layer */}
        <View style={styles.confettiContainer} pointerEvents="none">
          {confettiPieces.map((piece) => {
            const rotation = piece.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
            return (
              <Animated.View
                key={piece.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: piece.startX,
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  borderRadius: 2,
                  opacity: piece.opacity,
                  transform: [{ translateY: piece.translateY }, { translateX: piece.translateX }, { rotate: rotation }],
                }}
              />
            );
          })}
        </View>
        <Text style={styles.successEmoji}>⚠️</Text>
        <Text style={styles.successTitle}>ALERT SENT</Text>
        <Text style={styles.successSub}>Drivers in your area have been notified.</Text>
        <Text style={styles.successPoints}>+{pointsEarned} pts</Text>
        {newBadges.length > 0 && (
          <View style={styles.badgesEarned}>
            <Text style={styles.badgesEarnedLabel}>BADGE UNLOCKED</Text>
            {newBadges.map(badge => (
              <Text key={badge} style={styles.badgesEarnedItem}>🏅 {badge}</Text>
            ))}
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>WARDEN SPOTTED</Text>
          <Text style={styles.headerSub}>Drop a pin where you saw them</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          customMapStyle={darkMapStyle}
          onPress={handleMapPress}
          region={location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          } : {
            latitude: 51.5074,
            longitude: -0.1278,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          {pinCoord && (
            <Marker coordinate={pinCoord} pinColor="#FFD700" />
          )}
        </MapView>
        {!pinCoord && (
          <View style={styles.mapHint} pointerEvents="none">
            <Text style={styles.mapHintText}>TAP MAP TO PLACE WARDEN</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.photoButton, photoVerified && styles.photoButtonVerified]}
        onPress={handlePhotoVerify}
        activeOpacity={0.7}
      >
        <Text style={styles.photoIcon}>{photoVerified ? '✓' : '📷'}</Text>
        <View style={styles.photoTextWrapper}>
          <Text style={[styles.photoLabel, photoVerified && styles.photoLabelVerified]}>
            {photoVerified ? 'PHOTO VERIFIED' : 'PHOTO VERIFY'}
          </Text>
          <Text style={[styles.photoOptional, photoVerified && styles.photoPointsLabel]}>
            {photoVerified ? '+50 pts bonus' : '* optional — earn +50 extra pts'}
          </Text>
        </View>
        {photoVerified && <Text style={styles.photoBonusTag}>BONUS</Text>}
      </TouchableOpacity>

      <View style={styles.footer}>
        {rateLimitMessage && (
          <Text style={styles.rateLimitText}>⏱ {rateLimitMessage}</Text>
        )}
        <TouchableOpacity
          style={[styles.submitButton, (!pinCoord || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!pinCoord || loading}
          activeOpacity={0.8}
        >
          <Text style={[styles.submitText, (!pinCoord || loading) && styles.submitTextDisabled]}>
            {loading ? 'SENDING...' : 'REPORT WARDEN'}
          </Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerLeft: { gap: 4 },
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
  rateLimitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E63946',
    letterSpacing: 1,
    textAlign: 'center',
  },
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  successEmoji: { fontSize: 64 },
  successTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 8,
  },
  successSub: { fontSize: 15, color: '#888888', letterSpacing: 1 },
  successPoints: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginTop: 8,
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
});