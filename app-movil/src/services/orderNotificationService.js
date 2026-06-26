/**
 * orderNotificationService.js
 * Handles sound alerts and local push notifications for new incoming orders.
 * Uses expo-av for the cash register audio and expo-notifications for alerts.
 */
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const MUTE_KEY = 'order_notifications_muted';

// ── Android notification channel for new orders ──────────────────────────────
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('miprodu-orders', {
    name: 'Nuevos Pedidos',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C9A22788',
    sound: 'order_chime', // maps to assets/order_chime.mp3 in res/raw
  });
}

// ── Configure how notifications appear when app is in foreground ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // audio handled manually by expo-av
    shouldSetBadge: true,
  }),
});

// ── Sound instance (singleton) ───────────────────────────────────────────────
let soundObj = null;

/**
 * Play the cash register "cha-ching" sound for a new order.
 */
export const playOrderAlertSound = async () => {
  try {
    // Unload previous instance to avoid overlap
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
      { uri: 'https://orangefreesounds.com/wp-content/uploads/2019/11/Ka-ching-sound.mp3' },
      { shouldPlay: true, volume: 1.0 }
    );
    soundObj = sound;

    // Auto-unload after 5 seconds to prevent resource leaks
    setTimeout(async () => {
      try {
        if (soundObj) {
          await soundObj.stopAsync().catch(() => {});
          await soundObj.unloadAsync().catch(() => {});
          soundObj = null;
        }
      } catch {}
    }, 5000);
  } catch (err) {
    console.warn('[OrderNotif] Sound playback failed:', err.message);
  }
};

/**
 * Stop any currently playing order alert sound.
 */
export const stopOrderAlertSound = async () => {
  try {
    if (soundObj) {
      await soundObj.stopAsync().catch(() => {});
      await soundObj.unloadAsync().catch(() => {});
      soundObj = null;
    }
  } catch {}
};

/**
 * Build a human-readable summary of order items.
 * e.g. "2x Camiseta Blanca, 1x Pantaloneta Negra"
 */
const buildItemsSummary = (items = []) => {
  if (!items || items.length === 0) return 'Sin artículos';
  return items
    .slice(0, 4) // max 4 items in notification
    .map(it => `${it.quantity ?? 1}x ${it.name}`)
    .join(', ');
};

/**
 * Show a local push notification for a new incoming order.
 * @param {Object} order - The new order object
 * @param {string} branchName - Name of the branch (optional)
 */
export const showOrderNotification = async (order, branchName = '') => {
  try {
    const customer = order.customerName || 'Cliente';
    const total = (order.total || 0).toLocaleString('es-CO');
    const itemsSummary = buildItemsSummary(order.items);
    const branchPart = branchName ? ` · ${branchName}` : '';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🛒 Nuevo Pedido${branchPart}`,
        body: `${customer}: ${itemsSummary} · $${total}`,
        sound: false, // audio handled by expo-av
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#C9A227',
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    console.warn('[OrderNotif] Notification failed:', err.message);
  }
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

/**
 * Get the Expo Push Token for remote notifications.
 */
export const getExpoPushToken = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Permisos de notificación no otorgados.');
  }

  // Fetch native device token (FCM for Android, APNs for iOS)
  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data;
};

// ── Mute preference ──────────────────────────────────────────────────────────
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

// ── Legacy aliases (backward compat with any remaining imports) ──────────────
export const playWaiterAlertSound = playOrderAlertSound;
export const stopWaiterAlertSound = stopOrderAlertSound;
export const showWaiterCallNotification = async (tableNumber, branchName) => {
  // Kept for backward compat; maps to generic order notification
  await showOrderNotification({ customerName: `Mesa ${tableNumber}`, items: [], total: 0 }, branchName);
};
