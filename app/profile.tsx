import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

type Report = {
  id: string;
  latitude: number;
  longitude: number;
  photo_verified: boolean;
  points_awarded: number;
  created_at: string;
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [profile, setProfile] = useState<{ username: string; points: number } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, points')
        .eq('id', user.id)
        .single();
      if (profileData) setProfile(profileData);

      // Reports
      const { data: reportData, count } = await supabase
        .from('warden_reports')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (reportData) setReports(reportData);
      setReportCount(count ?? 0);

      // Photo verified count
      const { count: pCount } = await supabase
        .from('warden_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('photo_verified', true);
      setPhotoCount(pCount ?? 0);
    })();
  }, []);

  const level = profile ? Math.floor(profile.points / 100) + 1 : 1;
  const pointsProgress = profile ? profile.points % 100 : 0;
  const pointsToNextLevel = 100 - pointsProgress;

  const badges = [
    { icon: '⚠️', label: 'FIRST ALERT', earned: reportCount >= 1 },
    { icon: '📍', label: 'PINNED', earned: reportCount >= 10 },
    { icon: '📷', label: 'VERIFIED', earned: photoCount >= 1 },
    { icon: '🔥', label: '7 DAY STREAK', earned: false },
    { icon: '👑', label: 'TOP LOOKOUT', earned: false },
    { icon: '⚡', label: 'RAPID FIRE', earned: reportCount >= 5 },
  ];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Username + level */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {profile?.username?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.username}>{profile?.username ?? '...'}</Text>
          <Text style={styles.levelLabel}>LEVEL {level} LOOKOUT</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pointsProgress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{pointsToNextLevel} pts to next level</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.points ?? 0}</Text>
            <Text style={styles.statLabel}>TOTAL PTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>#{level * 12}</Text>
            <Text style={styles.statLabel}>RANKING</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{reportCount}</Text>
            <Text style={styles.statLabel}>REPORTS</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES</Text>
          <View style={styles.badgesGrid}>
            {badges.map((badge) => (
              <View key={badge.label} style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}>
                <Text style={styles.badgeIcon}>{badge.earned ? badge.icon : '🔒'}</Text>
                <Text style={[styles.badgeLabel, !badge.earned && styles.badgeLabelLocked]}>
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT REPORTS</Text>
          {reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyText}>No reports yet.</Text>
              <Text style={styles.emptySub}>Spot a warden and report it to earn points.</Text>
            </View>
          ) : (
            <View style={styles.reportsList}>
              {reports.map((report) => (
                <View key={report.id} style={styles.reportRow}>
                  <View style={styles.reportLeft}>
                    <Text style={styles.reportIcon}>{report.photo_verified ? '📷' : '⚠️'}</Text>
                    <View>
                      <Text style={styles.reportCoords}>
                        {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                      </Text>
                      <Text style={styles.reportTime}>{formatTime(report.created_at)}</Text>
                    </View>
                  </View>
                  <Text style={styles.reportPoints}>+{report.points_awarded}pts</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
    width: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  scroll: {
    flex: 1,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0D0D0D',
  },
  username: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 3,
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginTop: 8,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 2,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 3,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCard: {
    width: '30%',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  badgeCardLocked: {
    borderColor: '#333333',
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  badgeLabelLocked: {
    color: '#444444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
  },
  emptySub: {
    fontSize: 12,
    color: '#444444',
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  reportsList: {
    gap: 8,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    padding: 14,
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportIcon: {
    fontSize: 20,
  },
  reportCoords: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  reportTime: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
    marginTop: 2,
  },
  reportPoints: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 2,
  },
});