import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../lib/supabase';

export default function WardenScreen() {
  const navigation = useNavigation();
  const [submitted, setSubmitted] = useState(false);
  const [pinCoord, setPinCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoVerified, setPhotoVerified] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const mapRef = useRef<MapView>(null);

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const points = photoVerified ? 100 : 50;

    // Insert warden report
    await supabase.from('warden_reports').insert({
      user_id: user.id,
      latitude: pinCoord.latitude,
      longitude: pinCoord.longitude,
      photo_verified: photoVerified,
      points_awarded: points,
    });

    // Increment points using RPC
    await supabase.rpc('increment_points', {
      user_id: user.id,
      amount: points,
    });

    // Check badges
    const earned: string[] = [];

    // Get total report count
    const { count: reportCount } = await supabase
      .from('warden_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (reportCount === 1) earned.push('FIRST ALERT');

    // Check photo badge
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
    setTimeout(() => navigation.goBack(), 3000);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.successContainer}>
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>WARDEN SPOTTED</Text>
          <Text style={styles.headerSub}>Drop a pin where you saw them</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.homeIcon}>⌂</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
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

      {/* Photo verify */}
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

      {/* Submit */}
      <View style={styles.footer}>
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
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerLeft: {
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
  homeIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  map: {
    flex: 1,
  },
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
  photoIcon: {
    fontSize: 24,
    color: '#00C853',
  },
  photoTextWrapper: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  photoLabelVerified: {
    color: '#00C853',
  },
  photoOptional: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
    marginTop: 2,
  },
  photoPointsLabel: {
    color: '#00C853',
    fontWeight: '700',
  },
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
  footer: {
    padding: 16,
    paddingBottom: 24,
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
  submitTextDisabled: {
    color: '#444444',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  successEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 8,
  },
  successSub: {
    fontSize: 15,
    color: '#888888',
    letterSpacing: 1,
  },
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