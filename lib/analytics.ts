import analytics from '@react-native-firebase/analytics';

// Wrap every call in try/catch so analytics never crashes the app

export const logScreen = async (screenName: string) => {
  try {
    await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch {}
};

export const logLogin = async () => {
  try {
    await analytics().logLogin({ method: 'email' });
  } catch {}
};

export const logSignUp = async () => {
  try {
    await analytics().logSignUp({ method: 'email' });
  } catch {}
};

export const logEvent = async (
  name: string,
  params?: Record<string, string | number | boolean>
) => {
  try {
    await analytics().logEvent(name, params);
  } catch {}
};
