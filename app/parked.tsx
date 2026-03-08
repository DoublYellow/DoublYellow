import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const RADII = ['50m', '100m', '250m', '500m'];
const DEFAULT_RADIUS = '100m';

export default function ParkedScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const [selectedRadius, setSelectedRadius] = useState(DEFAULT_RADIUS);
  const [saveForNext, setSaveForNext] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [carLocation, setCarLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (lat && lng) {
      setCarLocation({ latitude: parseFloat(lat), longitude: parseFloat(lng) });
    }
  }, [lat, lng]);

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

  return (
    <SafeAreaView style={styles.container}>

      {/* Home button */}
      <TouchableOpacity style={styles.homeButton} onPress={() => router.push('/')} activeOpacity={0.7}>
        <Text style={styles.homeIcon}>⌂</Text>
      </TouchableOpacity>

      {/* Double yellow lines at top */}
      <View style={styles.doubleYellow}>
        <View style={styles.yellowLine} />
        <View style={styles.yellowGap} />
        <View style={styles.yellowLine} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        {isActive && (
          <View style={styles.tickCircle}>
            <Text style={styles.tick}>✓</Text>
          </View>
        )}
        {!isActive && (
          <Text style={styles.notLabel}>NOT</Text>
        )}
        <Animated.Text style={[styles.activatedLabel, { opacity: isActive ? pulse : 1 }, !isActive && styles.activatedLabelInactive]}>
          ACTIVATED
        </Animated.Text>
        <Text style={styles.subLabel}>
          {isActive ? "Community lookouts are go!" : 'Alerts Switched Off.'}
        </Text>
      </View>

      {/* Radius selector */}
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
              <Text style={[styles.radiusText, selectedRadius === r && styles.radiusTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setSaveForNext(!saveForNext)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, saveForNext && styles.checkboxChecked]}>
            {saveForNext && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Save for next time</Text>
        </TouchableOpacity>

        {/* Set car location button */}
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

      {/* Deactivate / Activate button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.deactivateButton, !isActive && styles.activateButton]}
          onPress={() => setIsActive(!isActive)}
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
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  homeButton: {
    position: 'absolute',
    top: 66,
    left: 24,
    zIndex: 10,
  },
  homeIcon: {
    fontSize: 28,
    color: '#0D0D0D',
  },
  doubleYellow: {
    marginTop: 72,
  },
  yellowLine: {
    width: '100%',
    height: 30,
    backgroundColor: '#FFD700',
  },
  yellowGap: {
    height: 18,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  tickCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tick: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: '900',
    lineHeight: 42,
  },
  notLabel: {
    fontSize: 64,
    fontWeight: '900',
    color: '#555555',
    letterSpacing: 8,
  },
  activatedLabel: {
    fontSize: 64,
    fontWeight: '900',
    color: '#E63946',
    letterSpacing: 8,
  },
  activatedLabelInactive: {
    color: '#555555',
  },
  subLabel: {
    fontSize: 16,
    color: '#888888',
    letterSpacing: 2,
  },
  section: {
    paddingHorizontal: 24,
    gap: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
    textAlign: 'center',
  },
  radiiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  radiusButtonActive: {
    borderColor: '#E63946',
    backgroundColor: '#1A0A0A',
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 1,
  },
  radiusTextActive: {
    color: '#E63946',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444444',
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#E63946',
    backgroundColor: '#E63946',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#888888',
    letterSpacing: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
  },
  locationButtonSet: {
    borderColor: '#E63946',
    backgroundColor: '#1A0A0A',
  },
  locationIcon: {
    fontSize: 22,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  locationLabelSet: {
    color: '#E63946',
  },
  locationSub: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
    marginTop: 2,
  },
  locationTick: {
    fontSize: 18,
    color: '#E63946',
    fontWeight: '900',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 72,
    alignItems: 'center',
  },
  deactivateButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  activateButton: {
    borderColor: '#E63946',
  },
  deactivateText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  activateText: {
    color: '#E63946',
  },
});