import { useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#888888" />

      <View style={styles.inner}>

        {/* Top half - I've Parked */}
        <TouchableOpacity style={[styles.half, styles.topHalf]} activeOpacity={0.8} onPress={() => router.push('/parked')}>
          <View style={styles.lineRow}>
            <View style={styles.yellowLineRow} />
            <Text style={styles.roadWord}>I'VE</Text>
          </View>
          <View style={styles.lineGap} />
          <View style={styles.lineRow}>
            <View style={styles.yellowLineRow} />
            <Text style={styles.roadWord}>PARKED</Text>
          </View>
        </TouchableOpacity>

        {/* Middle icon bar */}
        <View style={styles.iconBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <Text style={styles.iconLabel}>PROFILE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')} activeOpacity={0.7}>
            <Text style={styles.iconLabel}>SETTINGS</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom half - Warden Spotted */}
        <TouchableOpacity style={[styles.half, styles.bottomHalf]} activeOpacity={0.8} onPress={() => router.push('/warden')}>
          <View style={styles.triangleWrapper}>
            <View style={styles.triangle} />
            <Text style={styles.exclamation}>!</Text>
          </View>
          <View style={styles.wardenTextWrapper}>
            <Text style={styles.wardenText}>WARDEN</Text>
            <Text style={styles.wardenText}>SPOTTED</Text>
          </View>
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#888888',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  iconButton: {
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 2,
  },
  half: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  topHalf: {
    justifyContent: 'center',
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 24,
  },
  bottomHalf: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    gap: 20,
  },
  lineRow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  yellowLineRow: {
    width: '100%',
    height: 80,
    backgroundColor: '#FFD700',
    position: 'absolute',
  },
  lineGap: {
    height: 20,
    backgroundColor: '#0D0D0D',
  },
  roadWord: {
    fontSize: 52,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 8,
    lineHeight: 80,
    zIndex: 1,
  },
  triangleWrapper: {
    width: 160,
    height: 145,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 80,
    borderRightWidth: 80,
    borderBottomWidth: 140,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFD700',
    position: 'absolute',
    top: 0,
  },
  exclamation: {
    fontSize: 72,
    fontWeight: '900',
    color: '#0D0D0D',
    position: 'absolute',
    bottom: 10,
    zIndex: 10,
  },
  wardenTextWrapper: {
    alignItems: 'center',
  },
  wardenText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    lineHeight: 58,
  },
});