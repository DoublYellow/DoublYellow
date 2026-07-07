import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { playCelebrate, stopSound } from '../lib/sounds';
import HapticButton from '../components/HapticButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FFD700', '#E63946', '#00C853', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#FFFFFF'];
const FALL_COUNT = 35;
const BURST_COUNT = 30; // 15 per side

function makeFallingPieces() {
  return Array.from({ length: FALL_COUNT }, (_, i) => {
    const startX = Math.random() * SCREEN_WIDTH;
    const targetX = startX + (Math.random() - 0.5) * 120;
    return {
      id: `fall-${i}`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 8,
      delay: Math.random() * 600,
      duration: 2200 + Math.random() * 1200,
      startX,
      targetX,
      translateY: new Animated.Value(-60),
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
      ? 60 + Math.random() * (SCREEN_WIDTH * 0.7)
      : SCREEN_WIDTH - 60 - Math.random() * (SCREEN_WIDTH * 0.7);
    const startY = SCREEN_HEIGHT * 0.2 + Math.random() * (SCREEN_HEIGHT * 0.4);
    const targetY = startY + (Math.random() - 0.3) * 300;
    return {
      id: `burst-${i}`,
      startX,
      startY,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 8 + Math.random() * 9,
      delay: Math.random() * 300,
      duration: 800 + Math.random() * 500,
      translateX: new Animated.Value(startX),
      translateY: new Animated.Value(startY),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
      targetX,
      targetY,
    };
  });
}

type Lookout = { id: string; username: string; thanked: boolean; pointsSent: boolean };

export default function CelebrateScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { reporterIds: reporterIdsStr } = useLocalSearchParams<{ reporterIds: string }>();
  const [lookouts, setLookouts] = useState<Lookout[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const fallingPieces = useRef(makeFallingPieces()).current;
  const burstPieces = useRef(makeBurstPieces()).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Play celebration sound on mount, clean up if user leaves early
  useEffect(() => {
    playCelebrate();
    return () => { stopSound(); };
  }, []);

  // Fire confetti on mount
  useEffect(() => {
    // Falling pieces from top
    fallingPieces.forEach((piece) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(piece.translateY, {
            toValue: SCREEN_HEIGHT + 60,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.translateX, {
            toValue: piece.targetX,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotate, {
            toValue: 1,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: piece.duration,
            delay: piece.duration * 0.6,
            useNativeDriver: true,
          }),
        ]).start();
      }, piece.delay);
    });

    // Burst pieces from sides
    burstPieces.forEach((piece) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(piece.translateX, {
            toValue: piece.targetX,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.translateY, {
            toValue: piece.targetY,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotate, {
            toValue: 1,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: piece.duration * 0.5,
            delay: piece.duration * 0.5,
            useNativeDriver: true,
          }),
        ]).start();
      }, piece.delay);
    });
  }, []);

  // Load lookout usernames and current user info
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', user.id)
        .single();
      if (profile) setUserPoints(profile.points ?? 0);

      if (!reporterIdsStr) return;
      const ids: string[] = JSON.parse(decodeURIComponent(reporterIdsStr));
      const validIds = ids.filter((id) => id !== user.id);
      if (validIds.length === 0) return;

      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username')
        .in('id', validIds);

      // Build lookout list — fall back to 'Anonymous Driver' if no profile row exists
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));
      setLookouts(validIds.map((id) => ({
        id,
        username: profileMap.get(id) ?? 'Anonymous Driver',
        thanked: false,
        pointsSent: false,
      })));

      // Credit each lookout with saving this driver
      for (const id of validIds) {
        await supabase.rpc('increment_drivers_saved', { target_user_id: id, amount: 1 });
      }
    })();
  }, [reporterIdsStr]);

  const handleThumbsUp = async (lookoutId: string) => {
    console.warn('CHEERS TAPPED — currentUserId:', currentUserId, 'lookoutId:', lookoutId);
    if (!currentUserId) return;
    // Optimistically update UI
    setLookouts((prev) =>
      prev.map((l) => (l.id === lookoutId ? { ...l, thanked: true } : l))
    );
    // Record thanks in DB + send push notification to lookout
    const { data, error } = await supabase.functions.invoke('send-thanks', {
      body: { to_user_id: lookoutId, from_user_id: currentUserId, type: 'cheers' },
    });
    console.warn('send-thanks result:', JSON.stringify({ data, error }));
  };

  const handleSendPoints = async (lookoutId: string) => {
    console.warn('POINTS TAPPED — currentUserId:', currentUserId, 'userPoints:', userPoints, 'lookoutId:', lookoutId);
    if (!currentUserId || userPoints < 10) return;
    // Optimistically update UI
    setUserPoints((prev) => prev - 10);
    setLookouts((prev) =>
      prev.map((l) => (l.id === lookoutId ? { ...l, pointsSent: true, thanked: true } : l))
    );
    // Transfer points in DB
    await supabase.rpc('increment_points', { user_id: currentUserId, amount: -10 });
    await supabase.rpc('increment_points', { user_id: lookoutId, amount: 10 });
    // Record thanks in DB + send push notification to lookout
    await supabase.functions.invoke('send-thanks', {
      body: { to_user_id: lookoutId, from_user_id: currentUserId, type: 'points' },
    });
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Confetti layer */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {fallingPieces.map((piece) => {
          const rotation = piece.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
          return (
            <Animated.View
              key={piece.id}
              style={[styles.confettiPiece, {
                left: piece.startX,
                top: 0,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                opacity: piece.opacity,
                transform: [{ translateY: piece.translateY }, { translateX: piece.translateX }, { rotate: rotation }],
              }]}
            />
          );
        })}
        {burstPieces.map((piece) => {
          const rotation = piece.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
          return (
            <Animated.View
              key={piece.id}
              style={[styles.confettiPiece, {
                left: 0,
                top: 0,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                opacity: piece.opacity,
                borderRadius: piece.size / 4,
                transform: [{ translateX: piece.translateX }, { translateY: piece.translateY }, { rotate: rotation }],
              }]}
            />
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Ionicons name="happy" size={80} color="#FFD700" />
        <Text style={styles.title}>NO TICKET!</Text>
        <Text style={styles.subtitle}>You got away with it. Drive safe!</Text>

        {lookouts.length > 0 && (
          <View style={styles.lookoutsSection}>
            <Text style={styles.lookoutsTitle}>YOUR LOOKOUTS HAD YOUR BACK</Text>
            <Text style={styles.lookoutsSub}>Show them some love</Text>

            {lookouts.map((lookout) => (
              <View key={lookout.id} style={styles.lookoutCard}>
                <View style={styles.lookoutTop}>
                  <Ionicons name="eye-outline" size={28} color="#FFD700" />
                  <Text style={styles.lookoutUsername}>@{lookout.username}</Text>
                </View>

                {lookout.thanked ? (
                  <View style={styles.thankedBadge}>
                    <Text style={styles.thankedText}>
                      {lookout.pointsSent ? <><Ionicons name="gift-outline" size={13} color="#00C853" /> +10 points sent — legend!</> : <><Ionicons name="thumbs-up-outline" size={13} color="#00C853" /> Cheers sent!</>}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.lookoutActions}>
                    <HapticButton
                      style={styles.actionButton}
                      onPress={() => handleThumbsUp(lookout.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="thumbs-up-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.actionLabel}>CHEERS</Text>
                    </HapticButton>

                    <HapticButton
                      style={[styles.actionButton, styles.actionButtonPoints, userPoints < 10 && styles.actionButtonDisabled]}
                      onPress={() => handleSendPoints(lookout.id)}
                      activeOpacity={0.7}
                      disabled={userPoints < 10}
                    >
                      <Ionicons name="gift-outline" size={20} color={userPoints >= 10 ? "#FFD700" : "#444444"} />
                      <Text style={[styles.actionLabel, userPoints >= 10 && styles.actionLabelPoints]}>+10 PTS</Text>
                    </HapticButton>

                    <HapticButton
                      style={[styles.actionButton, styles.actionButtonCoffee]}
                      activeOpacity={0.7}
                      disabled
                    >
                      <Ionicons name="cafe-outline" size={20} color="#555555" />
                      <Text style={[styles.actionLabel, styles.actionLabelCoffee]}>COFFEE</Text>
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>SOON</Text>
                      </View>
                    </HapticButton>
                  </View>
                )}
              </View>
            ))}

            {userPoints < 10 && (
              <Text style={styles.lowPointsNote}>You need at least 10 points to gift them</Text>
            )}
          </View>
        )}

        <HapticButton style={styles.homeButton} onPress={() => router.replace('/')} activeOpacity={0.8}>
          <Text style={styles.homeText}>BACK TO HOME</Text>
        </HapticButton>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Double yellow lines — branded footer, always visible */}
      <View style={styles.doubleYellow} pointerEvents="none">
        <View style={styles.yellowLine} />
        <View style={styles.yellowGap} />
        <View style={styles.yellowLine} />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  doubleYellow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    zIndex: 5,
  },
  yellowLine: {
    width: '100%',
    height: 40,
    backgroundColor: '#FFD700',
  },
  yellowGap: {
    height: 20,
    backgroundColor: '#0D0D0D',
  },
  confettiPiece: { position: 'absolute', top: 0, borderRadius: 2 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 160,
    gap: 16,
  },
  bigEmoji: { fontSize: 80 },
  title: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  lookoutsSection: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  lookoutsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
  },
  lookoutsSub: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  lookoutCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  lookoutTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lookoutAvatar: { fontSize: 28 },
  lookoutUsername: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  lookoutActions: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  actionButtonPoints: { borderColor: '#FFD700' },
  actionButtonCoffee: { borderColor: '#333333', opacity: 0.5 },
  actionButtonDisabled: { borderColor: '#2A2A2A', opacity: 0.4 },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 10, fontWeight: '900', color: '#666666', letterSpacing: 1 },
  actionLabelPoints: { color: '#FFD700' },
  actionLabelCoffee: { color: '#555555' },
  comingSoonBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#333333',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  comingSoonText: { fontSize: 8, fontWeight: '900', color: '#888888', letterSpacing: 1 },
  thankedBadge: {
    backgroundColor: '#1A2A1A',
    borderWidth: 1,
    borderColor: '#00C853',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  thankedText: { fontSize: 13, fontWeight: '900', color: '#00C853', letterSpacing: 1 },
  lowPointsNote: { fontSize: 11, color: '#444444', textAlign: 'center', letterSpacing: 1 },
  homeButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  homeText: { fontSize: 16, fontWeight: '900', color: '#0D0D0D', letterSpacing: 4 },
});
