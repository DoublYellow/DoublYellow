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
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TERMS OF SERVICE</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          <Text style={styles.updated}>Last updated: March 2026</Text>

          <Body>
            By downloading or using Double Yellow, you agree to be bound by these Terms of Service. Please read them carefully. If you do not agree, do not use the app.
          </Body>

          <Section title="1. WHAT DOUBLE YELLOW DOES">
            <Body>
              Double Yellow is a community-powered app that allows registered users to report the presence of parking wardens and alert other nearby users who have activated parking protection. The app is intended to help drivers stay informed — it does not guarantee that any alert will be received, that any alert will be accurate, or that its use will prevent a parking penalty.
            </Body>
          </Section>

          <Section title="2. ELIGIBILITY">
            <Body>
              You must be at least 18 years old to use Double Yellow. By creating an account, you confirm that you are 18 or over and that the information you provide is accurate.
            </Body>
          </Section>

          <Section title="3. YOUR ACCOUNT">
            <Bullet>You are responsible for keeping your account credentials secure.</Bullet>
            <Bullet>You must not share your account with others or allow others to access it.</Bullet>
            <Bullet>You are responsible for all activity that occurs under your account.</Bullet>
            <Bullet>Your username must not impersonate another person or contain offensive, discriminatory, or illegal content.</Bullet>
            <Bullet>We reserve the right to suspend or terminate accounts that violate these terms.</Bullet>
          </Section>

          <Section title="4. USER CONDUCT">
            <Body>When using Double Yellow, you must not:</Body>
            <Bullet>Submit false, misleading, or malicious warden reports.</Bullet>
            <Bullet>Use the app to harass, stalk, or intimidate parking wardens or any other individuals.</Bullet>
            <Bullet>Attempt to reverse-engineer, hack, or disrupt the app or its infrastructure.</Bullet>
            <Bullet>Use automated tools or scripts to submit reports or interact with the app.</Bullet>
            <Bullet>Use the app in any way that violates UK law or any applicable local law.</Bullet>
            <Body>
              We reserve the right to investigate and take appropriate action, including account termination, against any user who violates these rules.
            </Body>
          </Section>

          <Section title="5. WARDEN REPORTS AND ACCURACY">
            <Body>
              Reports are submitted by members of the public and are not verified by Double Yellow. We make no representations as to the accuracy, completeness, or timeliness of any report. You should always use your own judgement and comply with all applicable parking regulations regardless of any alerts received through the app.
            </Body>
            <Body>
              Double Yellow accepts no liability for any parking penalties, fines, vehicle clamping or towing, or other consequences arising from reliance on information provided through the app.
            </Body>
          </Section>

          <Section title="6. POINTS AND REWARDS">
            <Body>
              Double Yellow operates an in-app points system to reward contributions. Points have no monetary value, cannot be exchanged for cash, and are not transferable. We reserve the right to adjust, reset, or remove points at any time without notice. Points balances are not a form of property or entitlement.
            </Body>
          </Section>

          <Section title="7. LOCATION DATA AND PRIVACY">
            <Body>
              By activating parking protection or submitting a warden report, you consent to the collection and processing of your device's GPS location as described in our Privacy Policy. You should not use the app in situations where sharing your location would put you at risk.
            </Body>
          </Section>

          <Section title="8. INTELLECTUAL PROPERTY">
            <Body>
              All content, design, code, and trademarks within Double Yellow are owned by or licensed to us. You may not copy, reproduce, or distribute any part of the app without our written permission. By submitting reports or content through the app, you grant us a non-exclusive, royalty-free licence to use that content to operate and improve the service.
            </Body>
          </Section>

          <Section title="9. DISCLAIMERS AND LIMITATION OF LIABILITY">
            <Body>
              Double Yellow is provided "as is" without warranties of any kind, express or implied. We do not warrant that the app will be uninterrupted, error-free, or free of viruses.
            </Body>
            <Body>
              To the maximum extent permitted by UK law, we exclude all liability for any direct, indirect, incidental, or consequential loss or damage arising from your use of the app, including but not limited to parking penalties, fines, or missed alerts.
            </Body>
          </Section>

          <Section title="10. SUSPENSION AND TERMINATION">
            <Body>
              We may suspend or terminate your access to Double Yellow at any time if we reasonably believe you have breached these terms, or for operational or legal reasons. You may delete your account at any time by contacting us at contact@doubleyellow.app.
            </Body>
          </Section>

          <Section title="11. CHANGES TO THESE TERMS">
            <Body>
              We may update these terms from time to time. We will notify you of significant changes via an in-app notice or email. Continued use of the app after changes take effect constitutes your acceptance of the updated terms.
            </Body>
          </Section>

          <Section title="12. GOVERNING LAW">
            <Body>
              These terms are governed by the laws of England and Wales. Any disputes arising from these terms or your use of the app shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </Body>
          </Section>

          <Section title="13. CONTACT">
            <Body>
              For any questions about these terms, contact us at: contact@doubleyellow.app
            </Body>
          </Section>

          <View style={{ height: 40 }} />
        </View>
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
  headerTitle: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8, gap: 20 },
  updated: { fontSize: 11, color: '#444444', letterSpacing: 1, marginBottom: 4 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#FFD700', letterSpacing: 3, marginBottom: 2 },
  body: { fontSize: 13, color: '#AAAAAA', lineHeight: 22, letterSpacing: 0.3 },
  bulletRow: { flexDirection: 'row', gap: 10, paddingLeft: 4 },
  bulletDot: { fontSize: 16, color: '#FFD700', lineHeight: 22, marginTop: 1 },
  bulletText: { flex: 1, fontSize: 13, color: '#AAAAAA', lineHeight: 22, letterSpacing: 0.3 },
});
