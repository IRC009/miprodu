import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDP8xh4FwNRbswvSf1egMCmybkcRr_8xgk",
  authDomain: "miprodu-fec00.firebaseapp.com",
  projectId: "miprodu-fec00",
  storageBucket: "miprodu-fec00.firebasestorage.app",
  messagingSenderId: "112703118753",
  appId: "1:112703118753:web:797a1ec23d2165a9517fe0",
  measurementId: "G-R1BRV39W0X"
};

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage Persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore with persistent offline cache
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({})
});

// Initialize Functions
const functions = getFunctions(app, 'us-central1');

export { app, auth, db, functions };
