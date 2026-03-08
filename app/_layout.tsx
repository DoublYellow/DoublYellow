import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { registerForPushNotifications } from '../lib/notifications';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

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
    const inAuthGroup = segments[0] === 'welcome' || segments[0] === 'login' || segments[0] === 'signup';
    if (!session && !inAuthGroup) {
      router.replace('/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, initialized, segments]);

  useEffect(() => {
    if (session) {
      registerForPushNotifications().then((token) => {
        if (token) {
          console.log('PUSH TOKEN:', token);
          // Save token to Supabase profile for later use
          supabase.from('profiles').update({ push_token: token }).eq('id', session.user.id);
        }
      });
    }
  }, [session]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D0D' } }} />
      <StatusBar style="light" />
    </>
  );
}