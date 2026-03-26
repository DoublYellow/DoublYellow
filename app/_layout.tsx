import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import MobileAds from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { registerForPushNotifications } from '../lib/notifications';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);

  // Initialise Google Mobile Ads SDK on Android (not needed on iOS)
  useEffect(() => {
    if (Platform.OS === 'android') {
      MobileAds().initialize().catch(() => {});
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'welcome' || segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'forgot-password';
    const onVerifyScreen = segments[0] === 'verify-email';
    const emailVerified = !!session?.user?.email_confirmed_at;

    if (!session && !inAuthGroup) {
      router.replace('/welcome');
    } else if (session && !emailVerified && !onVerifyScreen) {
      router.replace('/verify-email');
    } else if (session && emailVerified && (inAuthGroup || onVerifyScreen)) {
      router.replace('/');
    }
  }, [session, initialized, segments]);

  useEffect(() => {
  if (session) {
    registerForPushNotifications().then(async (token) => {
      if (token) {
        await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', session.user.id);
      }
    }).catch(() => {});
  }
}, [session]);

  // Foreground notification listener — triggers siren if user has it enabled
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('settings')
          .select('siren')
          .eq('user_id', user.id)
          .single();
        if (data?.siren) {
          // Dynamically import so it only loads after the new EAS build is installed
          const { playSiren } = await import('../lib/siren');
          await playSiren();
        }
      } catch (err) {
        console.warn('SIREN LISTENER ERROR:', err);
      }
    });

    return () => {
      notificationListener.current?.remove();
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D0D' } }} />
      <StatusBar style="light" />
    </>
  );
}