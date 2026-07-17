import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let activeSound: Audio.Sound | null = null;
let activeCheer: Audio.Sound | null = null;

async function playSound(asset: number, overrideSilent = false): Promise<void> {
  try {
    if (activeSound) {
      await activeSound.unloadAsync();
      activeSound = null;
    }
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: overrideSilent,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true, volume: 0.5 });
    activeSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        activeSound = null;
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      }
    });
  } catch (err) {
    console.warn('SOUND ERROR:', err);
  }
}

async function playSoundLayer(asset: number, volume: number): Promise<void> {
  try {
    if (activeCheer) {
      await activeCheer.unloadAsync();
      activeCheer = null;
    }
    const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true, volume });
    activeCheer = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        activeCheer = null;
      }
    });
  } catch (err) {
    console.warn('CHEER ERROR:', err);
  }
}

/**
 * Triumphant fanfare + crowd cheer — played when a warden alert is sent.
 * Fanfare plays immediately; crowd cheer kicks in a beat later.
 */
export async function playAlertSent(): Promise<void> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 120);
  setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 480);
  // Fanfare and cheer play simultaneously — cheer slightly quieter so fanfare cuts through
  playSound(require('../assets/sounds/alert_sent.wav'), true);
  playSoundLayer(require('../assets/sounds/cheer.wav'), 0.4);
}

/**
 * Cheerful flourish + bright ping — played on the No Ticket! celebrate screen.
 * Triggers a lighter, happier haptic pattern.
 */
export async function playCelebrate(): Promise<void> {
  // Lighter pattern: medium pop → success notification as the chord blooms
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 380);
  await playSound(require('../assets/sounds/celebrate.wav'));
}

export async function stopSound(): Promise<void> {
  if (activeSound) {
    await activeSound.stopAsync();
    await activeSound.unloadAsync();
    activeSound = null;
  }
}
