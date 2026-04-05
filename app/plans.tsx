import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const getPlanIcon = (id: string) => {
  switch (id) {
    case 'free':
      return <Ionicons name="ellipse" size={32} color="#888888" />;
    case 'basic':
      return <Ionicons name="star" size={32} color="#FFD700" />;
    case 'pro':
      return <Ionicons name="rocket" size={32} color="#FFD700" />;
    case 'unlimited':
      return <MaterialCommunityIcons name="crown" size={32} color="#FFD700" />;
    default:
      return null;
  }
};

const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: '£0',
    period: '/ month',
    tagline: 'Get started with Double Yellow',
    features: [
      'Unlimited activations',
      'Push notifications',
      'Siren alert',
      'Warden reporting',
      'Leaderboard & badges',
      'Ad-supported',
    ],
    cta: 'FREE FOREVER',
    ctaDisabled: true,
    highlight: false,
    comingSoon: false,
  },
  {
    id: 'basic',
    name: 'BASIC',
    price: '£2.99',
    period: '/ month',
    tagline: 'Perfect for regular parkers',
    features: [
      '8 activations per month',
      'Push notifications',
      'Siren alert',
      'Warden reporting',
      'Leaderboard & badges',
      'No ads',
    ],
    cta: 'COMING SOON',
    ctaDisabled: true,
    highlight: false,
    comingSoon: true,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '£5.99',
    period: '/ month',
    tagline: 'For the frequent driver',
    features: [
      '20 activations per month',
      'Push notifications',
      'Siren alert',
      'Warden reporting',
      'Leaderboard & badges',
      'No ads',
      'Priority alerts',
    ],
    cta: 'COMING SOON',
    ctaDisabled: true,
    highlight: true,
    comingSoon: true,
  },
  {
    id: 'unlimited',
    name: 'UNLIMITED',
    price: '£15.99',
    period: '/ month',
    tagline: 'Never miss a warden',
    features: [
      'Unlimited activations',
      'Push notifications',
      'Siren alert',
      'Warden reporting',
      'Leaderboard & badges',
      'No ads',
      'Priority alerts',
      'Active Track (live GPS mode)',
      'Early access to new features',
    ],
    cta: 'COMING SOON',
    ctaDisabled: true,
    highlight: false,
    comingSoon: true,
  },
];

export default function PlansScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [userTier, setUserTier] = useState<string>('free');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();
      if (data?.tier) setUserTier(data.tier);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PLANS</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>Choose your plan</Text>
          <Text style={styles.introSub}>Paid plans coming soon. Stay tuned!</Text>
        </View>

        {PLANS.map((plan) => (
          <View
            key={plan.id}
            style={[styles.planCard, plan.highlight && styles.planCardHighlight]}
          >
            {plan.highlight && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              {getPlanIcon(plan.id)}
              <View style={styles.planTitleRow}>
                <Text style={[styles.planName, plan.highlight && styles.planNameHighlight]}>
                  {plan.name}
                </Text>
                <Text style={styles.planTagline}>{plan.tagline}</Text>
              </View>
              <View style={styles.planPriceCol}>
                {plan.comingSoon && (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonText}>COMING SOON</Text>
                  </View>
                )}
                <Text style={[styles.planPrice, plan.highlight && styles.planPriceHighlight]}>
                  {plan.price}
                </Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featuresList}>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={12} color="#FFD700" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.ctaButton,
                plan.highlight && styles.ctaButtonHighlight,
                (plan.ctaDisabled || plan.id === userTier) && styles.ctaButtonDisabled,
                plan.id === userTier && styles.ctaButtonCurrent,
              ]}
              disabled={plan.ctaDisabled || plan.id === userTier}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.ctaText,
                plan.highlight && styles.ctaTextHighlight,
                (plan.ctaDisabled || plan.id === userTier) && styles.ctaTextDisabled,
              ]}>
                {plan.id === userTier ? 'YOUR CURRENT PLAN' : plan.cta}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.footerNote}>
          All prices include VAT. Cancel anytime. No commitment.
        </Text>

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
  intro: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  introTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3 },
  introSub: { fontSize: 13, color: '#555555', letterSpacing: 1 },
  planCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    position: 'relative',
  },
  planCardHighlight: {
    borderColor: '#FFD700',
    backgroundColor: '#1A1A00',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  popularText: { fontSize: 9, fontWeight: '900', color: '#0D0D0D', letterSpacing: 2 },
  soonBadge: {
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  soonText: { fontSize: 8, fontWeight: '900', color: '#666666', letterSpacing: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planIcon: { fontSize: 32 },
  planTitleRow: { flex: 1, gap: 2 },
  planName: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3 },
  planNameHighlight: { color: '#FFD700' },
  planTagline: { fontSize: 11, color: '#555555', letterSpacing: 1 },
  planPriceCol: { alignItems: 'flex-end' },
  planPrice: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  planPriceHighlight: { color: '#FFD700' },
  planPeriod: { fontSize: 10, color: '#555555', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#2A2A2A' },
  featuresList: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureTick: { fontSize: 12, color: '#00C853', fontWeight: '900', width: 16 },
  featureText: { fontSize: 13, color: '#CCCCCC', letterSpacing: 0.5 },
  ctaButton: {
    backgroundColor: '#333333',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButtonHighlight: { backgroundColor: '#FFD700' },
  ctaButtonDisabled: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333333' },
  ctaButtonCurrent: { borderColor: '#FFD700' },
  ctaText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3 },
  ctaTextHighlight: { color: '#0D0D0D' },
  ctaTextDisabled: { color: '#444444' },
  footerNote: { fontSize: 11, color: '#333333', textAlign: 'center', letterSpacing: 1, paddingHorizontal: 32, marginTop: 8 },
});
