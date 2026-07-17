import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { logScreen } from '../lib/analytics';

export default function HomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isParkedActive, setIsParkedActive] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [ticketExpiresAt, setTicketExpiresAt] = useState<Date | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    logScreen('Home');
  }, [navigation]);

  // Refresh session state and avatar every time home screen is focused
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: session } = await supabase
          .from('parked_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        setIsParkedActive(!!session);

        // Read ticket timer from AsyncStorage
        const stored = await AsyncStorage.getItem('ticket_timer_expires');
        if (stored && session) {
          const expires = new Date(stored);
          if (expires > new Date()) {
            setTicketExpiresAt(expires);
          } else {
            // Timer has already passed — clean up
            await AsyncStorage.removeItem('ticket_timer_expires');
            setTicketExpiresAt(null);
          }
        } else {
          setTicketExpiresAt(null);
        }

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false);
        setUnreadMessages(count ?? 0);
      })();
    }, [])
  );

  // Pulse animation when active
  useEffect(() => {
    if (isParkedActive) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.2, duration: 1600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      pulse.setValue(1);
    }
  }, [isParkedActive]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#0D0D0D" />

      {/* Header — logo left, icons right */}
      <View style={styles.header}>
        <Text style={styles.logo}>DOUBLE YELLOW</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.7} style={styles.statusIconBtn}>
            <View style={styles.navIconWrap}>
              <Ionicons name="person-outline" size={24} color="#555555" />
              {unreadMessages > 0 && <View style={styles.navBadge} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.7} style={styles.statusIconBtn}>
            <Ionicons name="settings-outline" size={24} color="#555555" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status row — INACTIVE sits just above yellow lines */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, isParkedActive && styles.statusDotActive]} />
        <Text style={[styles.statusText, isParkedActive && styles.statusTextActive]}>
          {isParkedActive ? 'PROTECTION ACTIVE' : 'INACTIVE'}
        </Text>
      </View>

      {/* Top double yellow lines */}
      <View style={styles.dyLines}>
        <View style={styles.dyLine} />
        <View style={styles.dyLine} />
      </View>

      {/* Cards */}
      <View style={styles.cards}>

        {/* I'VE PARKED */}
        {isParkedActive ? (
          <View style={[styles.card, styles.cardActivated]}>
            <View style={[styles.cardCorner, styles.cardCornerActivated]} />
            <Animated.View style={[styles.iconCircle, styles.iconCircleActivated, { opacity: pulse }]}>
              <Ionicons name="radio-button-on" size={50} color="#FFFFFF" />
            </Animated.View>
            <Text style={[styles.cardLabel, styles.cardLabelActivated]}>ACTIVATED</Text>
            <Text style={styles.cardSub}>Protection active</Text>
            {ticketExpiresAt && (
              <View style={styles.timerBadge}>
                <Ionicons name="timer-outline" size={13} color="#FFD700" />
                <Text style={styles.timerBadgeText}>
                  TICKET EXPIRES {ticketExpiresAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            <View style={styles.activeButtonRow}>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => router.push('/parked')}
                activeOpacity={0.8}
              >
                <Text style={styles.manageButtonText}>MANAGE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deactivateButton}
                onPress={() => router.push('/parked?deactivate=1')}
                activeOpacity={0.8}
              >
                <Ionicons name="stop-circle-outline" size={15} color="#C1121F" />
                <Text style={styles.deactivateButtonText}>DEACTIVATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.card, styles.cardParked]}
            onPress={() => router.push('/parked')}
            activeOpacity={0.85}
          >
            <View style={[styles.cardCorner, styles.cardCornerParked]} />
            <Animated.View style={[styles.iconCircle, styles.iconCircleParked]}>
              <Ionicons name="car-outline" size={50} color="#FFD700" />
            </Animated.View>
            <Text style={styles.cardLabel}>{"I'VE PARKED"}</Text>
            <Text style={styles.cardSub}>Activate community watch</Text>
          </TouchableOpacity>
        )}

        {/* WARDEN SPOTTED */}
        <TouchableOpacity
          style={[styles.card, styles.cardWarden]}
          onPress={() => router.push('/warden')}
          activeOpacity={0.85}
        >
          <View style={styles.cardCornerWarden} />
          <View style={[styles.iconCircle, styles.iconCircleWarden]}>
            <Ionicons name="warning-outline" size={50} color="#FFD700" />
          </View>
          <Text style={[styles.cardLabel, styles.cardLabelWarden]}>REPORT A WARDEN</Text>
          <Text style={styles.cardSub}>Raise the alarm. Save someone's day!</Text>
        </TouchableOpacity>

      </View>

      {/* Bottom double yellow lines */}
      <View style={[styles.dyLines, { paddingBottom: Math.max(30, insets.bottom + 30) }]}>
        <View style={styles.dyLine} />
        <View style={styles.dyLine} />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 52 : 22,
    paddingBottom: 2,
  },
  logo: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#FFD700',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconBtn: {
    padding: 10,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2A2A2A',
  },
  statusDotActive: {
    backgroundColor: '#C1121F',
    shadowColor: '#C1121F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#333333',
  },
  statusTextActive: {
    color: '#C1121F',
  },

  // Double yellow lines
  dyLines: {
    gap: 4,
  },
  dyLine: {
    height: 3,
    backgroundColor: '#FFD700',
  },

  // Cards
  cards: {
    flex: 1,
    flexDirection: 'column',
    gap: 12,
    padding: 14,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardParked: {
    borderColor: '#FFD700',
  },
  cardActivated: {
    borderColor: '#C1121F',
    backgroundColor: '#110000',
  },
  cardWarden: {
    borderColor: '#FFD700',
    backgroundColor: '#111111',
  },

  // Corner accents
  cardCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 64,
    height: 64,
    borderRadius: 0,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 60,
  },
  cardCornerParked: {
    backgroundColor: 'rgba(255,215,0,0.07)',
  },
  cardCornerActivated: {
    backgroundColor: 'rgba(193,18,31,0.1)',
  },
  cardCornerWarden: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 64,
    height: 64,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 60,
    backgroundColor: 'rgba(193,18,31,0.07)',
  },

  // Icon circles
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleParked: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  iconCircleActivated: {
    backgroundColor: '#C1121F',
    borderWidth: 1,
    borderColor: '#C1121F',
  },
  iconCircleWarden: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },

  // Active-state split buttons
  activeButtonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  manageButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  deactivateButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C1121F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#C1121F',
    letterSpacing: 2,
  },

  // Card text
  cardLabel: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#FFFFFF',
  },
  cardLabelActivated: {
    color: '#C1121F',
  },
  cardLabelWarden: {
    color: '#FFFFFF',
  },
  cardSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#444444',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1A1600',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 1.5,
  },

  navIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C1121F',
  },
});
