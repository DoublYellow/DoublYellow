import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [isParkedActive, setIsParkedActive] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
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

        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);

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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>DOUBLEYELLOW</Text>
        <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.7}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Ionicons name="person-outline" size={22} color="#555555" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Status row */}
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
        <TouchableOpacity
          style={[styles.card, isParkedActive ? styles.cardActivated : styles.cardParked]}
          onPress={() => router.push('/parked')}
          activeOpacity={0.85}
        >
          <View style={[styles.cardCorner, isParkedActive ? styles.cardCornerActivated : styles.cardCornerParked]} />
          <Animated.View style={[
            styles.iconCircle,
            isParkedActive ? styles.iconCircleActivated : styles.iconCircleParked,
            isParkedActive && { opacity: pulse },
          ]}>
            <Ionicons
              name={isParkedActive ? 'radio-button-on' : 'car-outline'}
              size={50}
              color={isParkedActive ? '#FFFFFF' : '#FFD700'}
            />
          </Animated.View>
          <Text style={[styles.cardLabel, isParkedActive && styles.cardLabelActivated]}>
            {isParkedActive ? 'ACTIVATED' : "I'VE PARKED"}
          </Text>
          <Text style={styles.cardSub}>
            {isParkedActive ? 'Tap to manage' : 'Activate community watch'}
          </Text>
        </TouchableOpacity>

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
      <View style={styles.dyLines}>
        <View style={styles.dyLine} />
        <View style={styles.dyLine} />
      </View>

      {/* Bottom nav */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')} activeOpacity={0.7}>
          <View style={styles.navIconWrap}>
            <Ionicons name="person-outline" size={20} color="#333333" />
            {unreadMessages > 0 && <View style={styles.navBadge} />}
          </View>
          <Text style={styles.navLabel}>PROFILE</Text>
        </TouchableOpacity>
        <View style={styles.navItem}>
          <View style={styles.navDotActive} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>HOME</Text>
        </View>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/settings')} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={20} color="#333333" />
          <Text style={styles.navLabel}>SETTINGS</Text>
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 10,
  },
  logo: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#FFD700',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
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

  // Bottom nav
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navDotActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  navLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#333333',
  },
  navLabelActive: {
    color: '#FFD700',
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
