import { Audio } from 'expo-av';

let sirenSound: Audio.Sound | null = null;

export async function playSiren(): Promise<void> {
  try {
    // Unload any previously loaded siren instance
    if (sirenSound) {
      await sirenSound.unloadAsync();
      sirenSound = null;
    }

    // On iOS: override the silent/ringer switch so the siren always plays
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/siren.wav'),
      { shouldPlay: true, volume: 1.0 }
    );

    sirenSound = sound;

    // Clean up after playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        sirenSound = null;
        // Restore normal audio mode after siren finishes
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      }
    });
  } catch (err) {
    console.warn('SIREN ERROR:', err);
  }
}

export async function stopSiren(): Promise<void> {
  if (sirenSound) {
    await sirenSound.stopAsync();
    await sirenSound.unloadAsync();
    sirenSound = null;
  }
}
