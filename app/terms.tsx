import { useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SectionProps = { title: string; children: React.ReactNode };

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>·</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 24 }} style={styles.backButton}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TERMS & CONDITIONS</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <Text style={styles.updated}>Effective date: July 2026</Text>

          <Section title="1. ABOUT DOUBLEYELLOW">
            <Body>
              DoublYellow is a community-based information service. It allows registered users to share real-time alerts about the presence of parking enforcement officers in their area, giving other members of the community the opportunity to move or return to their vehicles in good time.
            </Body>
            <Body>
              The app is intended for — and is particularly valued by — people who park out of necessity rather than choice: district nurses and community carers visiting patients at home, parents and carers on the school run, tradespeople and contractors parked at a job site, delivery drivers, and others who have no practical alternative. These are people who, through no fault of their own, can find themselves at risk of a parking contravention, and who stand to benefit most from a timely community alert.
            </Body>
            <Body>
              DoublYellow is, in essence, a neighbourhood watch for parking. We believe that when people have the information they need to move their vehicle in time, the frustration, sense of injustice, and occasional confrontation that can follow a parking fine become far less likely.
            </Body>
          </Section>

          <Section title="2. OUR MISSION">
            <Body>DoublYellow exists to:</Body>
            <Bullet>Help ordinary working people and local businesses avoid unnecessary fines through community-generated information.</Bullet>
            <Bullet>Reduce the animosity and confrontation that can arise when people feel they have been treated unfairly by the parking enforcement system.</Bullet>
            <Bullet>Support the safety and dignity of parking enforcement officers by reducing the likelihood of hostile encounters — a driver who receives a timely warning is far less likely to become aggressive than one who returns to find a ticket on their windscreen.</Bullet>
            <Bullet>Provide a simple, lawful, community-led tool that levels the playing field for those who park out of genuine necessity.</Bullet>
          </Section>

          <Section title="3. THE LEGAL NATURE OF PARKING CONTRAVENTIONS">
            <Body>
              Under the Traffic Management Act 2004, the majority of parking contraventions in England and Wales have been "decriminalised." In most cases, a parking contravention is a civil matter, not a criminal offence. Fines are issued as Penalty Charge Notices (PCNs) by Civil Enforcement Officers (CEOs) acting on behalf of local authorities. A PCN represents a civil debt — it does not result in a criminal record, points on your driving licence, or the risk of imprisonment.
            </Body>
            <Body>
              There are circumstances in which parking can constitute a criminal offence — for example, parking on red routes or zig-zag markings (enforced by the police under the Road Traffic Act 1988), in areas where a local authority has not adopted civil enforcement powers, or where a vehicle causes an obstruction. DoublYellow is designed to help users avoid civil parking contraventions and does not assist users in evading lawful criminal enforcement.
            </Body>
          </Section>

          <Section title="4. WHEN A CIVIL PARKING CONTRAVENTION COMES INTO EXISTENCE">
            <Body>
              A Penalty Charge Notice may only be issued by a Civil Enforcement Officer who has personally witnessed and recorded the contravention. A contravention cannot be established on the basis of a report from a member of the public alone — the officer must physically attend and observe the vehicle directly.
            </Body>
            <Body>
              This means that under civil parking enforcement, a contravention does not formally come into existence until it is witnessed by an authorised officer. A vehicle parked in breach of a restriction that has not yet been observed by a CEO has not, in the civil enforcement sense, committed a contravention that can be acted upon.
            </Body>
            <Body>
              DoublYellow operates entirely within this framework. By alerting users to the presence of enforcement officers in their area, the app enables people to return to or move their vehicles before any officer witnesses their parking situation. DoublYellow does not help users escape a contravention that has already occurred — it helps them ensure that no contravention ever comes into existence in the first place.
            </Body>
            <Body>
              This is the same principle that underlies a friend calling to say "there's a warden on your street" — a form of community information sharing that has always been entirely lawful. DoublYellow simply provides that service at scale, through a structured community network.
            </Body>
          </Section>

          <Section title="5. GRACE PERIODS AND OBSERVATION PERIODS">
            <Body>
              Since April 2015, drivers are entitled to a 10-minute grace period before a PCN can be issued if they overstay a permitted parking period. This applies to time-limited bays only — it does not apply to yellow line restrictions, permit-only bays, or where no payment has been made when required.
            </Body>
            <Body>
              Before issuing a PCN, Civil Enforcement Officers are typically required to observe a vehicle for a period of time to confirm that no exempt activity is taking place (such as loading and unloading, or a passenger boarding or alighting). The required observation period varies by local authority and the nature of the contravention.
            </Body>
            <Body>
              Where a grace period does apply, DoublYellow is designed to help its users make use of it — giving them the community-generated information they need to return to their vehicle within the time available before a PCN can lawfully be issued.
            </Body>
          </Section>

          <Section title="6. NO ENDORSEMENT OF ILLEGAL ACTIVITY">
            <Body>
              DoublYellow does not encourage, endorse, or facilitate illegal parking or any breach of traffic or parking legislation. The app does not advise users to park unlawfully, and an alert from another user should never be taken as permission to do so.
            </Body>
            <Body>
              Users remain solely responsible for ensuring that their parking complies with all applicable laws, regulations, and restrictions at all times. Receiving an alert through DoublYellow does not confer any right to park in a restricted area, and DoublYellow accepts no liability for any Penalty Charge Notice, fine, clamp, tow, or other enforcement action taken against a user's vehicle.
            </Body>
          </Section>

          <Section title="7. YOUR RESPONSIBILITY TO PARK SAFELY AND LAWFULLY">
            <Body>
              By using DoublYellow, you agree that you will at all times park your vehicle in a manner that is safe, considerate, and lawful. In particular, you agree that you will never park in a way that:
            </Body>
            <Bullet>Obstructs or delays an emergency vehicle, including ambulances, fire engines, and police vehicles.</Bullet>
            <Bullet>Blocks a dropped kerb, driveway, or access to a property.</Bullet>
            <Bullet>Causes an obstruction to other road users, pedestrians, or cyclists.</Bullet>
            <Bullet>Places your vehicle on a pavement, footpath, cycle lane, or bus lane where prohibited.</Bullet>
            <Bullet>Contravenes double yellow lines, red routes, zig-zag markings near schools or pedestrian crossings, or any other absolute parking restriction.</Bullet>
            <Bullet>Endangers the safety of any other person, including children, disabled persons, or road users.</Bullet>
            <Body>
              DoublYellow is designed to help users avoid unnecessary civil parking fines — it is not a tool to assist with parking that is unsafe, antisocial, or in breach of the law. Using the app does not excuse, justify, or permit any form of illegal or dangerous parking. You remain solely responsible for where and how you park at all times.
            </Body>
          </Section>

          <Section title="8. TICKET APPEAL GUIDANCE — DISCLAIMER">
            <Body>
              DoublYellow provides general educational information and guidance about how to challenge a parking ticket, including links to third-party resources and independent appeal services. This information is provided in good faith as a community service only.
            </Body>
            <Body>
              This guidance does not constitute legal advice. DoublYellow is not a law firm, is not regulated by the Solicitors Regulation Authority, and does not provide legal representation of any kind.
            </Body>
            <Body>
              If you choose to challenge a parking ticket on the basis of guidance provided within DoublYellow, you do so entirely at your own risk. DoublYellow accepts no liability whatsoever for:
            </Body>
            <Bullet>Any appeal that is unsuccessful.</Bullet>
            <Bullet>Any increase in the fine amount resulting from a failed appeal or late payment.</Bullet>
            <Bullet>Any additional charges, court costs, debt collection fees, or enforcement action (including clamping, towing, or county court judgments) arising from your decision to challenge a ticket.</Bullet>
            <Bullet>Any loss, financial or otherwise, resulting from reliance on information provided within the app.</Bullet>
            <Body>
              Before challenging any Penalty Charge Notice or private parking charge, you are strongly encouraged to seek independent legal advice. The appeal deadline on your notice should be observed carefully — a decision to appeal does not suspend payment deadlines unless the relevant authority confirms otherwise.
            </Body>
          </Section>

          <Section title="9. ACCEPTABLE USE">
            <Body>By using DoublYellow, you agree that you will not:</Body>
            <Bullet>Submit false, misleading, or malicious reports or alerts.</Bullet>
            <Bullet>Use the app to harass, target, intimidate, or endanger any parking enforcement officer or any other individual.</Bullet>
            <Bullet>Use the app for any purpose that is unlawful or that could bring DoublYellow into disrepute.</Bullet>
            <Bullet>Attempt to manipulate or game the app's ranking, points, or prize draw systems.</Bullet>
            <Bullet>Share your account with others or create multiple accounts.</Bullet>
            <Bullet>Use the app in any way that could compromise the safety of yourself or others.</Bullet>
            <Body>
              DoublYellow reserves the right to suspend or permanently remove any account found to be in breach of these terms, without notice.
            </Body>
          </Section>

          <Section title="10. USER-GENERATED CONTENT">
            <Body>
              Alerts and reports submitted through DoublYellow are generated by members of the public. DoublYellow does not verify the accuracy of individual alerts and accepts no responsibility for the consequences of acting — or failing to act — on information provided by other users. Alerts are provided in good faith as a community service only.
            </Body>
            <Body>
              You are solely responsible for any content you submit through the app. By submitting an alert or report, you confirm that it is genuine and made in good faith.
            </Body>
          </Section>

          <Section title="11. POINTS AND PRIZE DRAW">
            <Body>
              DoublYellow operates an in-app points system and annual prize draw to reward community contributions. Points and prize draw entries have no monetary value outside of the draw, cannot be exchanged for cash, and are not transferable.
            </Body>
            <Body>
              Prize draw entries are earned by saving other users — defined as submitting a warden report that results in an alert being received by another user with an active parking session in the area. The number of entries earned per save depends on your plan: Lookout (1 entry), Pro (2 entries), Unlimited (3 entries). The draw is free to enter and open to all registered users regardless of plan.
            </Body>
            <Body>
              We reserve the right to adjust, reset, or remove points and draw entries at any time without notice, including where we reasonably suspect abuse of the system.
            </Body>
          </Section>

          <Section title="12. NO GUARANTEE OF SERVICE">
            <Body>
              DoublYellow is provided on an "as is" basis. We do not guarantee that the app will be available at all times, that alerts will be accurate or timely, or that using the app will result in you avoiding a parking fine. The service depends entirely on the participation of the community.
            </Body>
          </Section>

          <Section title="13. PRIVACY">
            <Body>
              Your use of DoublYellow is also governed by our Privacy Policy, available at doubleyellow.app/privacy. By creating an account, you confirm that you have read and understood our Privacy Policy.
            </Body>
          </Section>

          <Section title="14. AGE REQUIREMENT">
            <Body>
              You must be at least 17 years of age to use DoublYellow (the minimum age to hold a provisional driving licence in the United Kingdom). By creating an account, you confirm that you meet this requirement.
            </Body>
          </Section>

          <Section title="15. CHANGES TO THESE TERMS">
            <Body>
              DoublYellow reserves the right to update these Terms & Conditions at any time. Where changes are material, we will notify users via the app. Continued use of DoublYellow following notification of changes constitutes acceptance of the revised terms.
            </Body>
          </Section>

          <Section title="16. GOVERNING LAW">
            <Body>
              These Terms & Conditions are governed by the laws of England and Wales. Any disputes arising from your use of DoublYellow will be subject to the exclusive jurisdiction of the courts of England and Wales.
            </Body>
          </Section>

          <Section title="17. CONTACT">
            <Body>
              If you have any questions about these Terms & Conditions, please contact us at contact@pluckyfilms.co.uk.
            </Body>
          </Section>

          <Text style={styles.footer}>
            By creating a DoublYellow account, you confirm that you have read, understood, and agreed to these Terms & Conditions.
          </Text>

          <View style={{ height: 40 }} />
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: { paddingVertical: 4 },
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFD700', letterSpacing: 3 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20, gap: 20 },
  updated: { fontSize: 11, color: '#444444', letterSpacing: 1, marginBottom: 4 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#FFD700', letterSpacing: 3, marginBottom: 2 },
  body: { fontSize: 13, color: '#AAAAAA', lineHeight: 22, letterSpacing: 0.3 },
  bulletRow: { flexDirection: 'row', gap: 10, paddingLeft: 4 },
  bulletDot: { fontSize: 16, color: '#FFD700', lineHeight: 22, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 13, color: '#AAAAAA', lineHeight: 22, letterSpacing: 0.3 },
  footer: { fontSize: 12, color: '#444444', fontStyle: 'italic', textAlign: 'center', marginTop: 20, lineHeight: 20 },
});
