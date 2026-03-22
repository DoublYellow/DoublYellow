import * as Location from 'expo-location';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { MapPressEvent, Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';

export default function CarLocationScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingPin, setPendingPin] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      // Use last known position immediately so the map opens on the right spot
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        const coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        setCurrentLocation(coords);
        setPendingPin(coords);
      }
      // Then refine with accurate GPS
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrentLocation(coords);
      if (!pendingPin) setPendingPin(coords);
    })();
  }, []);

 const confirmLocation = () => {
  router.replace({
    pathname: '/parked',
    params: {
      lat: pendingPin?.latitude,
      lng: pendingPin?.longitude,
    },
  });
};

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SET CAR LOCATION</Text>
          <Text style={styles.sub}>Tap the map to move the pin</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.cancelText}>✕</Text>
        </TouchableOpacity>
      </View>

      {currentLocation ? (
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          showsUserLocation
          customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
          onPress={(e: MapPressEvent) => setPendingPin(e.nativeEvent.coordinate)}
          initialRegion={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {pendingPin && (
            <Marker coordinate={pendingPin} pinColor="#E63946" />
          )}
        </MapView>
      ) : (
        <View style={styles.mapLoading}>
          <Text style={styles.mapLoadingText}>GETTING YOUR LOCATION...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation} activeOpacity={0.8}>
          <Text style={styles.confirmButtonText}>CONFIRM</Text>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 4,
  },
  sub: {
    fontSize: 12,
    color: '#666666',
    letterSpacing: 1,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '900',
  },
  map: {
    flex: 1,
  },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  mapLoadingText: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#0D0D0D',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#666666',
    letterSpacing: 3,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#E63946',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
});