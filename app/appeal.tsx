import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function ResourceLink({ label, url, sub }: { label: string; url: string; sub?: string }) {
  return (
    <TouchableOpacity style={styles.resourceRow} onPress={() => Linking.openURL(url)} activeOpacity={0.7}>
      <View style={styles.resourceLeft}>
        <Text style={styles.resourceLabel}>{label}</Text>
        {sub && <Text style={styles.resourceSub}>{sub}</Text>}
      </View>
      <Text style={styles.resourceArrow}>→</Text>
    </TouchableOpacity>
  );
}

export default function AppealScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 24 }} style={styles.backButton}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FIGHT YOUR TICKET</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Intro */}
        <View style={styles.introBox}>
          <Text style={styles.introText}>
            Don't just pay it. Around <Text style={styles.introHighlight}>50% of challenged tickets are overturned.</Text> Here's everything you need to know.
          </Text>
        </View>

        {/* Step 1: What type of ticket? */}
        <View style={styles.section}>
          <SectionTitle>STEP 1 — WHAT TYPE OF TICKET?</SectionTitle>
          <Card>
            <View style={styles.ticketTypeRow}>
              <View style={[styles.ticketTypeBox, styles.ticketTypeCouncil]}>
                <MaterialIcons name="account-balance" size={28} color="#FFD700" />
                <Text style={styles.ticketTypeLabel}>COUNCIL PCN</Text>
                <Text style={styles.ticketTypeSub}>Issued by local council. Legally enforceable fine. Check the ticket — it will say "Penalty Charge Notice".</Text>
              </View>
              <View style={[styles.ticketTypeBox, styles.ticketTypePrivate]}>
                <MaterialIcons name="business" size={28} color="#FFD700" />
                <Text style={styles.ticketTypeLabel}>PRIVATE TICKET</Text>
                <Text style={styles.ticketTypeSub}>Issued by a private company (car park operator). It's an invoice, NOT a fine. You're NOT legally obliged to pay unless they take you to court.</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Quick start */}
        <View style={styles.section}>
          <SectionTitle>STEP 2 — ACT FAST</SectionTitle>
          <Card>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <View style={styles.stepRight}>
                <Text style={styles.stepLabel}>Write down the date on your ticket</Text>
                <Text style={styles.stepSub}>All deadlines run from the date of issue — not when you read it.</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <View style={styles.stepRight}>
                <Text style={styles.stepLabel}>Take photos immediately</Text>
                <Text style={styles.stepSub}>Parking signs, road markings, any meters or bays. The more evidence the better.</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <View style={styles.stepRight}>
                <Text style={styles.stepLabel}>Submit your first appeal</Text>
                <Text style={styles.stepSub}>Council PCN: within 14 days (you keep the 50% discount). Private ticket: within 28–30 days to the operator.</Text>
              </View>
            </View>
            <Divider />
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <View style={styles.stepRight}>
                <Text style={styles.stepLabel}>If rejected, escalate</Text>
                <Text style={styles.stepSub}>Council → Traffic Penalty Tribunal (free). Private → POPLA or IAS (free). These are independent and have good success rates.</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Key deadlines */}
        <View style={styles.section}>
          <SectionTitle>KEY DEADLINES</SectionTitle>
          <Card>
            {[
              { label: 'PCN — Informal challenge', deadline: '14 days', note: 'Keeps 50% discount if rejected' },
              { label: 'PCN — Formal appeal', deadline: '28 days', note: 'After receiving Notice to Owner' },
              { label: 'PCN — Tribunal appeal', deadline: '28 days', note: 'After formal rejection' },
              { label: 'Private — Challenge operator', deadline: '28–30 days', note: 'Check your specific notice' },
              { label: 'Private — POPLA/IAS appeal', deadline: '28/21 days', note: 'After operator rejects; free within window' },
            ].map((item, i) => (
              <View key={i}>
                {i > 0 && <Divider />}
                <View style={styles.deadlineRow}>
                  <View style={styles.deadlineLeft}>
                    <Text style={styles.deadlineLabel}>{item.label}</Text>
                    <Text style={styles.deadlineNote}>{item.note}</Text>
                  </View>
                  <View style={styles.deadlineBadge}>
                    <Text style={styles.deadlineBadgeText}>{item.deadline}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* Common winning grounds */}
        <View style={styles.section}>
          <SectionTitle>COMMON WINNING GROUNDS</SectionTitle>
          <Card>
            {[
              { icon: <MaterialIcons name="signpost" size={20} color="#FFD700" />, text: 'Signage was missing, obscured, or confusing' },
              { icon: <MaterialIcons name="receipt" size={20} color="#FFD700" />, text: 'You paid but the ticket was still issued' },
              { icon: <Ionicons name="close-circle" size={20} color="#FFD700" />, text: 'The ticket has errors (wrong reg, time, amount)' },
              { icon: <Ionicons name="location" size={20} color="#FFD700" />, text: 'Vehicle was not parked where alleged' },
              { icon: <Ionicons name="lock-open-outline" size={20} color="#FFD700" />, text: 'Private: operator didn\'t follow Protection of Freedoms Act 2012' },
              { icon: <Ionicons name="timer-outline" size={20} color="#FFD700" />, text: 'Private: you weren\'t given the required 10-minute grace period' },
              { icon: <Ionicons name="car-outline" size={20} color="#FFD700" />, text: 'Vehicle was stolen at the time' },
            ].map((item, i) => (
              <View key={i}>
                {i > 0 && <Divider />}
                <View style={styles.groundRow}>
                  {item.icon}
                  <Text style={styles.groundText}>{item.text}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* Free tools */}
        <View style={styles.section}>
          <SectionTitle>FREE TOOLS — LET THEM DO THE HARD WORK</SectionTitle>
          <Card>
            <ResourceLink
              label="Resolvo"
              url="https://resolvo.uk"
              sub="AI generates a personalised appeal letter for you — free, instant"
            />
            <Divider />
            <ResourceLink
              label="Pelp.ai"
              url="https://www.pelp.ai"
              sub="AI parking assistant — scan your ticket and get appeal guidance"
            />
            <Divider />
            <ResourceLink
              label="MoneySavingExpert"
              url="https://www.moneysavingexpert.com/reclaim/parking-ticket-appeals/"
              sub="Expert guides and free appeal letter templates"
            />
            <Divider />
            <ResourceLink
              label="Citizens Advice"
              url="https://www.citizensadvice.org.uk/law-and-courts/parking-tickets/"
              sub="Clear, official guidance on all types of parking ticket"
            />
          </Card>
        </View>

        {/* Official appeal services */}
        <View style={styles.section}>
          <SectionTitle>OFFICIAL APPEAL SERVICES (ALL FREE)</SectionTitle>
          <Card>
            <ResourceLink
              label="Traffic Penalty Tribunal"
              url="https://www.trafficpenaltytribunal.gov.uk"
              sub="Council PCNs outside London — independent, free, no need to attend in person"
            />
            <Divider />
            <ResourceLink
              label="London Tribunals"
              url="https://www.londontribunals.gov.uk"
              sub="Council PCNs in London"
            />
            <Divider />
            <ResourceLink
              label="POPLA"
              url="https://www.popla.co.uk"
              sub="Private parking appeals (BPA member operators) — free within 28 days"
            />
            <Divider />
            <ResourceLink
              label="IAS"
              url="https://theias.org"
              sub="Private parking appeals (IPC member operators) — free within 21 days"
            />
            <Divider />
            <ResourceLink
              label="GOV.UK — Parking Tickets"
              url="https://www.gov.uk/parking-tickets"
              sub="Official government guidance"
            />
          </Card>
        </View>

        {/* Important note about private tickets */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}><Ionicons name="bulb-outline" size={13} color="#FFD700" /> IMPORTANT: PRIVATE TICKETS</Text>
            <Text style={styles.infoText}>
              Private parking fines are <Text style={styles.infoHighlight}>NOT legally enforceable fines</Text> — they are invoices for an alleged breach of contract. You are not legally required to pay unless the company takes you to court and wins. Many never do. Always appeal first.
            </Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'column',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    gap: 10,
  },
  backButton: { paddingVertical: 4 },
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#E63946', letterSpacing: 3 },
  scroll: { flex: 1 },
  introBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1A1200',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
  },
  introText: { fontSize: 14, color: '#AAAAAA', lineHeight: 22, letterSpacing: 0.5 },
  introHighlight: { color: '#FFD700', fontWeight: '900' },
  section: { paddingHorizontal: 16, marginBottom: 24, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#666666', letterSpacing: 3 },
  card: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#2A2A2A', marginHorizontal: 16 },
  ticketTypeRow: { flexDirection: 'row', gap: 0 },
  ticketTypeBox: { flex: 1, padding: 16, gap: 8, alignItems: 'center' },
  ticketTypeCouncil: { borderRightWidth: 1, borderRightColor: '#2A2A2A' },
  ticketTypePrivate: {},
  ticketTypeIcon: { fontSize: 28 },
  ticketTypeLabel: { fontSize: 12, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, textAlign: 'center' },
  ticketTypeSub: { fontSize: 11, color: '#666666', lineHeight: 16, textAlign: 'center' },
  stepRow: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'flex-start' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumberText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  stepRight: { flex: 1, gap: 4 },
  stepLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  stepSub: { fontSize: 12, color: '#666666', lineHeight: 18 },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  deadlineLeft: { flex: 1, gap: 2 },
  deadlineLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  deadlineNote: { fontSize: 11, color: '#555555' },
  deadlineBadge: {
    backgroundColor: '#E63946',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  deadlineBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  groundRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14 },
  groundIcon: { fontSize: 20, marginTop: 1 },
  groundText: { flex: 1, fontSize: 13, color: '#CCCCCC', lineHeight: 20 },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  resourceLeft: { flex: 1, gap: 3 },
  resourceLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  resourceSub: { fontSize: 11, color: '#555555', lineHeight: 16 },
  resourceArrow: { fontSize: 18, color: '#FFD700', marginLeft: 8 },
  infoBox: {
    backgroundColor: '#0A1F2A',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  infoTitle: { fontSize: 13, fontWeight: '900', color: '#2196F3', letterSpacing: 2 },
  infoText: { fontSize: 13, color: '#888888', lineHeight: 20 },
  infoHighlight: { color: '#FFFFFF', fontWeight: '700' },
});
