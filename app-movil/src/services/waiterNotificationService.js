/**
 * waiterNotificationService.js
 * Handles sound alerts and local/remote notification tokens for waiter calls.
 * Uses expo-av for audio and expo-notifications for in-app/push alerts.
 */
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const MUTE_KEY = 'waiter_calls_muted';
const CALLS_ONLY_MODE_KEY = 'calls_only_mode';

// Configure default high-importance notification channel for Android background/foreground push routing
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('waiter-calls-custom-sound', {
    name: 'Llamados de Mesero',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'waiter_bell', // Use custom waiter_bell.mp3 from res/raw
  });
}

// ── Configure how notifications appear when app is in foreground ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // we handle sound ourselves with expo-av
    shouldSetBadge: true,
  }),
});

// ── Sound instance (singleton) ──
let soundObj = null;

/**
 * Play a bell/chime alert sound (crisp double bell ding).
 */
export const playWaiterAlertSound = async () => {
  try {
    // Unload previous if any
    if (soundObj) {
      await soundObj.unloadAsync().catch(() => {});
      soundObj = null;
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldRouteAudioToReceiverIOS: false,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: 'https://www.orangefreesounds.com/wp-content/uploads/2017/12/Desk-bell-sound-2x.mp3' },
      { shouldPlay: true, volume: 1.0 }
    );
    soundObj = sound;

    // Auto-unload after 6 seconds to prevent leaking resources
    setTimeout(async () => {
      try {
        if (soundObj) {
          await soundObj.stopAsync().catch(() => {});
          await soundObj.unloadAsync().catch(() => {});
          soundObj = null;
        }
      } catch {}
    }, 6000);
  } catch (err) {
    console.warn('[WaiterNotif] Sound playback failed:', err.message);
  }
};

/**
 * Stop any currently playing alert sound.
 */
export const stopWaiterAlertSound = async () => {
  try {
    if (soundObj) {
      await soundObj.stopAsync().catch(() => {});
      await soundObj.unloadAsync().catch(() => {});
      soundObj = null;
    }
  } catch {}
};

/**
 * Show a local push notification for a new waiter call.
 */
export const showWaiterCallNotification = async (tableNumber, branchName = '') => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 ¡Llamado de Mesero!',
        body: `Mesa ${tableNumber}${branchName ? ` · ${branchName}` : ''} necesita atención`,
        sound: false, // audio handled by expo-av
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#8b1a2e',
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    console.warn('[WaiterNotif] Notification failed:', err.message);
  }
};

/**
 * Request notification permissions and fetch the push token for remote notifications.
 */
export const getExpoPushToken = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    throw new Error('Permisos de notificación no otorgados (granted).');
  }

  // Retrieve Expo Project ID (required in newer Expo versions)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || "3ac54c27-6c7a-4e1d-9509-03404074626a";
  
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return tokenData.data;
};

/**
 * Request notification permissions. Call once at app startup.
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};

// ── Mute preference ──
export const isMuted = async () => {
  try {
    const val = await AsyncStorage.getItem(MUTE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

export const setMuted = async (value) => {
  await AsyncStorage.setItem(MUTE_KEY, value ? 'true' : 'false');
};

// ── Calls-Only Mode ──
export const isCallsOnlyMode = async () => {
  try {
    const val = await AsyncStorage.getItem(CALLS_ONLY_MODE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

export const setCallsOnlyMode = async (value) => {
  await AsyncStorage.setItem(CALLS_ONLY_MODE_KEY, value ? 'true' : 'false');
};
