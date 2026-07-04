import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { getRank, getNextRank } from '../lib/ranks';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
  tier: string | null;
  drivers_saved: number;
};

const TIER_LABELS: Record<string, string> = {
  free:      'FREE',
  pro:       'PRO',
  unlimited: 'UNLIMITED',
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
  const [hasStreak, setHasStreak] = useState(false);
  const [basePeriodActivations, setBasePeriodActivations] = useState(0);
  const [earnedCredits, setEarnedCredits] = useState(0);
  const [nearestExpiry, setNearestExpiry] = useState<Date | null>(null);
  const [verifiedReportCount, setVerifiedReportCount] = useState(0);
  const [creditsGrantedCount, setCreditsGrantedCount] = useState(0);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

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
        .select('username, points, avatar_url, tier, drivers_saved')
        .eq('id', user.id)
        .single();

      // Activation stats — period depends on tier
      const tier = profileData?.tier ?? 'free';
      const isUnlimited = tier === 'unlimited';

      if (!isUnlimited) {
        // Week start (Monday 00:00 UTC) for free; day start for pro
        const getWeekStart = () => {
          const now = new Date();
          const day = now.getUTCDay();
          const daysFromMonday = day === 0 ? 6 : day - 1;
          const monday = new Date(now);
          monday.setUTCDate(now.getUTCDate() - daysFromMonday);
          monday.setUTCHours(0, 0, 0, 0);
          return monday;
        };
        const getDayStart = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };
        const periodStart = tier === 'pro' ? getDayStart() : getWeekStart();

        const { count: periodCount } = await supabase
          .from('parked_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', periodStart.toISOString());
        setBasePeriodActivations(periodCount ?? 0);

        // Earned credits
        const { data: credits } = await supabase
          .from('earned_activations')
          .select('expires_at')
          .eq('user_id', user.id)
          .is('used_at', null)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('expires_at', { ascending: true, nullsFirst: false });
        const available = credits ?? [];
        setEarnedCredits(available.length);
        // Find nearest expiry (for free tier warning)
        const withExpiry = available.filter(c => c.expires_at);
        if (withExpiry.length > 0) setNearestExpiry(new Date(withExpiry[0].expires_at));

        // Verified reports & credits granted — for progress counter
        const { count: vCount } = await supabase
          .from('warden_reports')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('photo_verified', true);
        setVerifiedReportCount(vCount ?? 0);

        const { count: cgCount } = await supabase
          .from('earned_activations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('source', 'warden_report');
        setCreditsGrantedCount(cgCount ?? 0);
      }

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

      // 7 Day Streak — check for at least one report on each of the last 7 calendar days
      const streakStart = new Date();
      streakStart.setDate(streakStart.getDate() - 6);
      streakStart.setHours(0, 0, 0, 0);
      const { data: streakReports } = await supabase
        .from('warden_reports')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', streakStart.toISOString());
      const reportedDays = new Set(
        (streakReports ?? []).map((r) =>
          new Date(r.created_at).toLocaleDateString('en-CA') // gives YYYY-MM-DD in local time
        )
      );
      let streak = true;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (!reportedDays.has(d.toLocaleDateString('en-CA'))) {
          streak = false;
          break;
        }
      }
      setHasStreak(streak);

      // Get true global ranking
      const { count: aboveCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('points', profileData?.points ?? 0);
      const trueRank = (aboveCount ?? 0) + 1;
      setRanking(trueRank);

      // Fetch top 3 for leaderboard
      const { data: top3 } = await supabase
        .from('profiles')
        .select('username, points, id')
        .order('points', { ascending: false })
        .limit(3);

      if (top3) {
        const entries: LeaderboardEntry[] = top3.map((p, i) => ({
          username: p.username,
          points: p.points,
          rank: i + 1,
          isMe: p.id === user.id,
        }));

        // If user is not in top 3, append their own row with true rank
        const userInTop3 = top3.some((p) => p.id === user.id);
        if (!userInTop3 && profileData) {
          entries.push({
            username: profileData.username,
            points: profileData.points,
            rank: trueRank,
            isMe: true,
          });
        }

        setLeaderboard(entries);
      }

      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(msgCount ?? 0);
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

  const uploadAvatarFromUri = async (uri: string) => {
    if (!userId) return;
    setUploadingAvatar(true);
    try {
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

  const handleAvatarPress = () => {
    Alert.alert(
      'Profile Photo',
      'Choose how to set your photo',
      [
        {
          text: '📷  Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Camera Access Needed', 'Please enable camera access in your device settings to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled) uploadAvatarFromUri(result.assets[0].uri);
          },
        },
        {
          text: '🖼️  Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Gallery Access Needed', 'Please enable photo library access in your device settings to choose a photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled) uploadAvatarFromUri(result.assets[0].uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const driversSaved = profile?.drivers_saved ?? 0;
  const rankTitle = getRank(driversSaved);
  const nextRank = getNextRank(driversSaved);

  const badges = [
    { ionicon: 'warning', label: 'FIRST ALERT', earned: reportCount >= 1 },
    { ionicon: 'location', label: 'PINNED', earned: reportCount >= 10 },
    { ionicon: 'camera', label: 'VERIFIED', earned: photoCount >= 1 },
    { mci: 'fire', label: '7 DAY STREAK', earned: hasStreak },
    { mci: 'crown', label: 'TOP LOOKOUT', earned: ranking === 1 },
    { ionicon: 'flash', label: 'RAPID FIRE', earned: reportCount >= 5 },
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
              <View style={styles.usernameEditBadge}>
                <Text style={styles.avatarEditText}>✎</Text>
              </View>
            </TouchableOpacity>
          )}
          <Text style={styles.levelLabel}>{rankTitle.toUpperCase()}</Text>
          {nextRank ? (
            <>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(100, (driversSaved / (driversSaved + nextRank.needed)) * 100)}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{nextRank.needed} saves to {nextRank.title}</Text>
            </>
          ) : (
            <Text style={styles.progressLabel}>MAX RANK ACHIEVED 🏆</Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.points ?? 0}</Text>
            <Text style={styles.statLabel}>TOTAL PTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{driversSaved}</Text>
            <Text style={styles.statLabel}>SAVED</Text>
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

        {/* ── Activation Credits Card ── */}
        {(() => {
          const tier = profile?.tier ?? 'free';
          const label = TIER_LABELS[tier] ?? 'FREE';
          const isUnlimited = tier === 'unlimited';

          // Reset time labels
          const getNextMonday = () => {
            const now = new Date();
            const day = now.getUTCDay();
            const daysUntil = day === 0 ? 1 : 8 - day;
            const d = new Date(now);
            d.setUTCDate(now.getUTCDate() + daysUntil);
            d.setUTCHours(0, 0, 0, 0);
            return d;
          };
          const getTomorrow = () => {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() + 1);
            d.setUTCHours(0, 0, 0, 0);
            return d;
          };
          const resetDate = tier === 'pro' ? getTomorrow() : getNextMonday();
          const resetStr = resetDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

          const baseLimit = isUnlimited ? null : 1;
          const baseUsed = basePeriodActivations;
          const baseRemaining = baseLimit !== null ? Math.max(0, baseLimit - baseUsed) : null;
          const baseExhausted = baseLimit !== null && baseUsed >= baseLimit;
          const baseFillPct = baseLimit !== null ? Math.min(100, (baseUsed / baseLimit) * 100) : 0;

          // Progress toward next earned credit
          const reportsIntoBlock = verifiedReportCount % 10;
          const reportsUntilNext = 10 - reportsIntoBlock;
          const creditProgressPct = (reportsIntoBlock / 10) * 100;

          return (
            <View style={styles.creditsCard}>
              <View style={styles.creditsTop}>
                <View>
                  <Text style={styles.creditsTitle}>ACTIVATIONS</Text>
                  <Text style={[styles.creditsTier, tier === 'free' && styles.creditsTierFree]}>
                    {label} PLAN
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/plans')} activeOpacity={0.8} style={styles.upgradeBtn}>
                  <Text style={styles.upgradeBtnText}>
                    {isUnlimited ? 'MANAGE' : 'UPGRADE'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isUnlimited ? (
                <View style={styles.creditsUnlimitedRow}>
                  <Text style={styles.creditsUnlimitedText}>∞  UNLIMITED</Text>
                  <Text style={styles.creditsAdNote}>Active Track GPS available</Text>
                </View>
              ) : (
                <>
                  {/* Base allocation */}
                  <View style={styles.creditsSection}>
                    <Text style={styles.creditsSectionLabel}>
                      {tier === 'pro' ? 'DAILY ACTIVATION' : 'WEEKLY ACTIVATION'}
                    </Text>
                    <View style={styles.creditsCountRow}>
                      <Text style={[styles.creditsRemaining, baseExhausted && styles.creditsRemainingOver]}>
                        {baseRemaining}
                      </Text>
                      <Text style={styles.creditsRemainingLabel}>
                        {baseExhausted ? 'used — resets' : 'remaining — resets'} {resetStr}
                      </Text>
                    </View>
                    <View style={styles.creditsBar}>
                      <View style={[
                        styles.creditsFill,
                        { width: `${baseFillPct}%` as any },
                        baseExhausted && styles.creditsFillOver,
                      ]} />
                    </View>
                  </View>

                  {/* Earned credits */}
                  <View style={styles.creditsSection}>
                    <Text style={styles.creditsSectionLabel}>EARNED ACTIVATIONS</Text>
                    <View style={styles.earnedRow}>
                      <Ionicons name="car-sport" size={20} color={earnedCredits > 0 ? '#4CAF50' : '#444444'} />
                      <Text style={[styles.earnedCount, earnedCredits > 0 && styles.earnedCountActive]}>
                        {earnedCredits}
                      </Text>
                      <Text style={styles.earnedLabel}>
                        {earnedCredits === 1 ? 'credit' : 'credits'} available
                        {tier === 'free' && nearestExpiry
                          ? ` · next expires ${nearestExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                          : tier === 'pro' ? ' · never expire' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Progress toward next earned credit */}
                  <View style={styles.creditsSection}>
                    <View style={styles.creditProgressHeader}>
                      <Text style={styles.creditsSectionLabel}>NEXT EARNED CREDIT</Text>
                      <Text style={styles.creditProgressFraction}>{reportsIntoBlock}/10 verified reports</Text>
                    </View>
                    <View style={styles.creditsBar}>
                      <View style={[styles.creditsFillGreen, { width: `${creditProgressPct}%` as any }]} />
                    </View>
                    <Text style={styles.creditsUsed}>
                      {reportsUntilNext === 10
                        ? 'Submit a photo-verified warden report to start earning'
                        : `${reportsUntilNext} more photo-verified report${reportsUntilNext !== 1 ? 's' : ''} until your next free activation`}
                    </Text>
                  </View>
                </>
              )}
            </View>
          );
        })()}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.messagesRow}
            onPress={() => router.push('/messages')}
            activeOpacity={0.8}
          >
            <View style={styles.messagesLeft}>
              <Ionicons name="mail-outline" size={20} color="#FFD700" />
              <View>
                <Text style={styles.messagesLabel}>Messages</Text>
                <Text style={styles.messagesSub}>Updates and notices from DoubleYellow</Text>
              </View>
            </View>
            <View style={styles.messagesRight}>
              {unreadCount > 0 && (
                <View style={styles.msgBadge}>
                  <Text style={styles.msgBadgeText}>{unreadCount}</Text>
                </View>
              )}
              <Text style={styles.messagesArrow}>›</Text>
            </View>
          </TouchableOpacity>
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
                <View key={`${entry.rank}-${entry.username}`} style={[styles.leaderRow, entry.isMe && styles.leaderRowMe]}>
                  {entry.rank === 1
                    ? <Text style={[styles.leaderRank, { color: '#FFD700', fontSize: 13 }]}>1ST</Text>
                    : entry.rank === 2
                    ? <Text style={[styles.leaderRank, { color: '#C0C0C0', fontSize: 13 }]}>2ND</Text>
                    : entry.rank === 3
                    ? <Text style={[styles.leaderRank, { color: '#CD7F32', fontSize: 13 }]}>3RD</Text>
                    : <Text style={styles.leaderRank}>{`#${entry.rank}`}</Text>
                  }
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
                {badge.earned ? (
                  'ionicon' in badge
                    ? <Ionicons name={badge.ionicon as any} size={26} color="#FFD700" />
                    : <MaterialCommunityIcons name={badge.mci as any} size={26} color="#FFD700" />
                ) : (
                  <Ionicons name="lock-closed" size={26} color="#444444" />
                )}
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
              <Ionicons name="warning-outline" size={32} color="#666666" />
              <Text style={styles.emptyText}>No reports yet.</Text>
              <Text style={styles.emptySub}>Spot a warden and report it to earn points.</Text>
            </View>
          ) : (
            <View style={styles.reportsList}>
              {reports.map((report) => (
                <View key={report.id} style={styles.reportRow}>
                  <View style={styles.reportLeft}>
                    {report.photo_verified
                      ? <Ionicons name="camera" size={20} color="#FFD700" />
                      : <Ionicons name="warning" size={20} color="#FFD700" />
                    }
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
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2 },
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
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333333', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#555555', letterSpacing: 1 },
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
  usernameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  usernameEditBadge: { position: 'absolute', right: -28, backgroundColor: '#FFD700', borderRadius: 10, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0D0D0D' },
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

  // ── Activation Credits Card ──
  creditsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 18,
    gap: 12,
  },
  creditsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  creditsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 3,
    marginBottom: 2,
  },
  creditsTier: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 2,
  },
  creditsTierFree: {
    color: '#888888',
  },
  upgradeBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  upgradeBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 2,
  },
  creditsUnlimitedRow: {
    gap: 4,
  },
  creditsUnlimitedText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 2,
  },
  creditsAdNote: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
  },
  creditsCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  creditsRemaining: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
  },
  creditsRemainingOver: {
    color: '#E63946',
  },
  creditsRemainingLabel: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 1,
    flex: 1,
    flexWrap: 'wrap',
  },
  creditsBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  creditsFill: {
    height: 4,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  creditsFillOver: {
    backgroundColor: '#E63946',
  },
  creditsSection: {
    gap: 6,
  },
  creditsSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 2,
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earnedCount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#444444',
    letterSpacing: 1,
  },
  earnedCountActive: {
    color: '#4CAF50',
  },
  earnedLabel: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 0.5,
    flex: 1,
    flexWrap: 'wrap',
  },
  creditProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditProgressFraction: {
    fontSize: 10,
    color: '#555555',
    letterSpacing: 0.5,
  },
  creditsFillGreen: {
    height: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  creditsUsed: {
    fontSize: 10,
    color: '#444444',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  messagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
  },
  messagesLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  messagesLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  messagesSub: { fontSize: 11, color: '#555555', letterSpacing: 0.5, marginTop: 2 },
  messagesRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  messagesArrow: { fontSize: 20, color: '#444444' },
  msgBadge: {
    backgroundColor: '#C1121F',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  msgBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
});