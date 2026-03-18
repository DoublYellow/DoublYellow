import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

type Report = {
  id: string;
  latitude: number;
  longitude: number;
  photo_verified: boolean;
  points_awarded: number;
  created_at: string;
};

type LeaderboardEntry = {
  username: string;
  points: number;
  rank: number;
  isMe: boolean;
};

type Profile = {
  username: string;
  points: number;
  avatar_url: string | null;
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [ranking, setRanking] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, points, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        // Add cache-buster so the latest avatar always loads fresh
        const url = profileData.avatar_url;
        setAvatarUrl(url ? `${url}?t=${Date.now()}` : null);
      }

      const { data: reportData, count } = await supabase
        .from('warden_reports')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (reportData) setReports(reportData);
      setReportCount(count ?? 0);

      const { count: pCount } = await supabase
        .from('warden_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('photo_verified', true);
      setPhotoCount(pCount ?? 0);

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('username, points, id')
        .order('points', { ascending: false })
        .limit(10);

      if (allProfiles) {
        const entries: LeaderboardEntry[] = allProfiles.map((p, i) => ({
          username: p.username,
          points: p.points,
          rank: i + 1,
          isMe: p.id === user.id,
        }));
        setLeaderboard(entries);

        const { count: aboveCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('points', profileData?.points ?? 0);
        setRanking((aboveCount ?? 0) + 1);
      }
    })();
  }, []);

  const handleSaveUsername = async () => {
    const trimmed = editedUsername.trim();
    setUsernameError('');
    if (trimmed.length < 3) {
      setUsernameError('Must be at least 3 characters.');
      return;
    }
    if (trimmed.includes('@')) {
      setUsernameError('Username cannot be an email address.');
      return;
    }
    if (trimmed.includes(' ')) {
      setUsernameError('Username cannot contain spaces.');
      return;
    }
    if (!userId) return;
    setSavingUsername(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', userId);
    if (!error) {
      setProfile((prev) => prev ? { ...prev, username: trimmed } : prev);
      setIsEditingUsername(false);
    } else {
      setUsernameError('Could not save. Try again.');
    }
    setSavingUsername(false);
  };

  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !userId) return;

    setUploadingAvatar(true);

    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${userId}.${ext}`;

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) {
        console.log('UPLOAD ERROR:', JSON.stringify(uploadError));
        setUploadingAvatar(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const cleanUrl = urlData.publicUrl;
      const displayUrl = `${cleanUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cleanUrl })
        .eq('id', userId);

      if (updateError) {
        console.log('PROFILE UPDATE ERROR:', JSON.stringify(updateError));
        setUploadingAvatar(false);
        return;
      }

      // Use timestamped URL locally to force the image cache to refresh
      setAvatarUrl(displayUrl);
    } catch (e) {
      console.log('AVATAR ERROR:', e);
    }

    setUploadingAvatar(false);
  };

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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.heroCard}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8} style={styles.avatarWrapper}>
            {uploadingAvatar ? (
              <View style={styles.avatarCircle}>
                <ActivityIndicator color="#0D0D0D" />
              </View>
            ) : avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                onError={(e) => console.log('IMAGE ERROR:', e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {profile?.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditText}>✎</Text>
            </View>
          </TouchableOpacity>
          {isEditingUsername ? (
            <View style={styles.usernameEditWrapper}>
              <TextInput
                style={styles.usernameInput}
                value={editedUsername}
                onChangeText={(t) => { setEditedUsername(t); setUsernameError(''); }}
                autoCapitalize="none"
                autoFocus
                maxLength={20}
                placeholderTextColor="#555555"
                placeholder="your username"
              />
              {usernameError ? <Text style={styles.usernameErrorText}>{usernameError}</Text> : null}
              <View style={styles.usernameEditButtons}>
                <TouchableOpacity
                  style={styles.usernameCancelBtn}
                  onPress={() => { setIsEditingUsername(false); setUsernameError(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.usernameCancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.usernameSaveBtn, savingUsername && { opacity: 0.5 }]}
                  onPress={handleSaveUsername}
                  disabled={savingUsername}
                  activeOpacity={0.8}
                >
                  <Text style={styles.usernameSaveText}>{savingUsername ? 'SAVING...' : 'SAVE'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => { setEditedUsername(profile?.username ?? ''); setIsEditingUsername(true); }}
              activeOpacity={0.7}
              style={styles.usernameRow}
            >
              <Text style={styles.username}>{profile?.username ?? '...'}</Text>
              <Text style={styles.usernameEditIcon}>✎</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.levelLabel}>LEVEL {level} LOOKOUT</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pointsProgress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{pointsToNextLevel} pts to next level</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.points ?? 0}</Text>
            <Text style={styles.statLabel}>TOTAL PTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{ranking !== null ? `#${ranking}` : '...'}</Text>
            <Text style={styles.statLabel}>RANKING</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{reportCount}</Text>
            <Text style={styles.statLabel}>REPORTS</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEADERBOARD</Text>
          <View style={styles.leaderboardCard}>
            {leaderboard.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No data yet</Text>
              </View>
            ) : (
              leaderboard.map((entry) => (
                <View key={entry.username} style={[styles.leaderRow, entry.isMe && styles.leaderRowMe]}>
                  <Text style={[styles.leaderRank, entry.rank <= 3 && styles.leaderRankTop]}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </Text>
                  <Text style={[styles.leaderName, entry.isMe && styles.leaderNameMe]}>
                    {entry.username}{entry.isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={[styles.leaderPoints, entry.isMe && styles.leaderPointsMe]}>
                    {entry.points} pts
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

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
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2, width: 60 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  scroll: { flex: 1 },
  heroCard: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  avatarWrapper: { marginBottom: 8, position: 'relative' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#FFD700' },
  avatarLetter: { fontSize: 36, fontWeight: '900', color: '#0D0D0D' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFD700', borderRadius: 10, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0D0D0D' },
  avatarEditText: { fontSize: 11, color: '#0D0D0D', fontWeight: '900' },
  username: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  levelLabel: { fontSize: 12, fontWeight: '700', color: '#FFD700', letterSpacing: 3 },
  progressBar: { width: '80%', height: 4, backgroundColor: '#333333', borderRadius: 2, marginTop: 8 },
  progressFill: { height: 4, backgroundColor: '#FFD700', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: '#555555', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', borderRadius: 10, padding: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#555555', letterSpacing: 2 },
  section: { paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 3 },
  leaderboardCard: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', borderRadius: 12, overflow: 'hidden' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  leaderRowMe: { backgroundColor: '#1A1A00' },
  leaderRank: { fontSize: 16, fontWeight: '900', color: '#555555', width: 40 },
  leaderRankTop: { fontSize: 20 },
  leaderName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  leaderNameMe: { color: '#FFD700' },
  leaderPoints: { fontSize: 13, fontWeight: '900', color: '#666666', letterSpacing: 1 },
  leaderPointsMe: { color: '#FFD700' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '30%', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#FFD700', borderRadius: 10, padding: 12, alignItems: 'center', gap: 6 },
  badgeCardLocked: { borderColor: '#333333' },
  badgeIcon: { fontSize: 28 },
  badgeLabel: { fontSize: 9, fontWeight: '900', color: '#FFD700', letterSpacing: 1, textAlign: 'center' },
  badgeLabelLocked: { color: '#444444' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8, backgroundColor: '#1A1A1A', borderRadius: 10, borderWidth: 1, borderColor: '#333333' },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  emptySub: { fontSize: 12, color: '#444444', letterSpacing: 1, textAlign: 'center', paddingHorizontal: 24 },
  reportsList: { gap: 8 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', borderRadius: 10, padding: 14 },
  reportLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportIcon: { fontSize: 20 },
  reportCoords: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  reportTime: { fontSize: 11, color: '#555555', letterSpacing: 1, marginTop: 2 },
  reportPoints: { fontSize: 14, fontWeight: '900', color: '#FFD700', letterSpacing: 2 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usernameEditIcon: { fontSize: 16, color: '#555555', marginTop: 4 },
  usernameEditWrapper: { width: '100%', paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  usernameInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
    textAlign: 'center',
    width: '100%',
  },
  usernameErrorText: { fontSize: 11, color: '#E63946', letterSpacing: 1 },
  usernameEditButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  usernameCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  usernameCancelText: { fontSize: 11, fontWeight: '900', color: '#666666', letterSpacing: 2 },
  usernameSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFD700',
  },
  usernameSaveText: { fontSize: 11, fontWeight: '900', color: '#0D0D0D', letterSpacing: 2 },
});