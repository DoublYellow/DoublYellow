import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import MobileAds from 'react-native-google-mobile-ads';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { registerForPushNotifications } from '../lib/notifications';
import { supabase } from '../lib/supabase';

// RevenueCat API keys — replace with your real keys from app.revenuecat.com
const RC_API_KEY_ANDROID = 'YOUR_REVENUECAT_ANDROID_API_KEY';
const RC_API_KEY_IOS = 'YOUR_REVENUECAT_IOS_API_KEY';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);

  // Initialise Google Mobile Ads SDK on Android (not needed on iOS)
  useEffect(() => {
    if (Platform.OS === 'android') {
      MobileAds().initialize().catch(() => {});
    }
  }, []);

  // Initialise RevenueCat
  useEffect(() => {
    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    if (apiKey.startsWith('YOUR_')) return; // not configured yet
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
  }, []);

  // Handle deep links for password reset (doublyellow://reset-password#access_token=...&type=recovery)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      // Supabase sends tokens in either fragment (#) or query (?) form
      const rawParams = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
      if (!rawParams) return;
      const params: Record<string, string> = {};
      rawParams.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) params[k] = decodeURIComponent(v);
      });
      if (params.type === 'recovery' && params.access_token) {
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token ?? '',
        });
        // onAuthStateChange will fire PASSWORD_RECOVERY which navigates to /reset-password
      }
    };

    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => linkingSub.remove();
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch(() => {
        // If session fetch fails, treat as logged out
      })
      .finally(() => {
        setInitialized(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === 'SIGNED_IN' && session?.user) {
        // Identify the user in RevenueCat so subscription state is tied to their account
        try {
          const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
          if (!apiKey.startsWith('YOUR_')) {
            await Purchases.logIn(session.user.id);
          }
        } catch (_) {}

        // Ensure a profile row exists. This is the safety net for the case
        // where email confirmation is required and the upsert in signup.tsx
        // ran without an auth session (RLS would have blocked it).
        try {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (!existing) {
            const pendingUsername = await AsyncStorage.getItem('pending_username');
            await supabase.from('profiles').upsert(
              { id: session.user.id, username: pendingUsername ?? null, points: 0, tier: 'unlimited' },
              { onConflict: 'id' }
            );
            if (pendingUsername) await AsyncStorage.removeItem('pending_username');
          }
        } catch (_) {
          // Non-fatal — profile screen will handle a missing profile gracefully
        }
      }

      if (event === 'SIGNED_OUT') {
        try {
          const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
          if (!apiKey.startsWith('YOUR_')) await Purchases.logOut();
        } catch (_) {}
      }

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        router.replace('/reset-password');
      }
      if (event === 'USER_UPDATED') {
        // Password was successfully changed — clear recovery state
        setIsRecovery(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'welcome' || segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'forgot-password';
    const onVerifyScreen = segments[0] === 'verify-email';
    const onResetScreen = segments[0] === 'reset-password';
    const emailVerified = !!session?.user?.email_confirmed_at;

    // Never redirect away from the password reset screen during recovery flow
    if (onResetScreen) return;

    if (!session && !inAuthGroup) {
      router.replace('/welcome');
    } else if (session && !emailVerified && !onVerifyScreen) {
      router.replace('/verify-email');
    } else if (session && emailVerified && (inAuthGroup || onVerifyScreen) && !isRecovery) {
      router.replace('/');
    }
  }, [session, initialized, segments, isRecovery]);

  useEffect(() => {
    if (session) {
      registerForPushNotifications().then(async (token) => {
        if (token) {
          await supabase.functions.invoke('update-push-token', {
            body: { push_token: token },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
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