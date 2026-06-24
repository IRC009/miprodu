import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
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

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with offline persistence (IndexedDB, multi-tab safe)
// This replaces the deprecated enableIndexedDbPersistence() removed in Firebase v10+
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);
export const functions = getFunctions(app);
export const appCheck = null;

// Analytics — defer until after first render to avoid TBT
let _analytics = null;
export const getAnalyticsInstance = async () => {
  if (_analytics) return _analytics;
  const { getAnalytics } = await import('firebase/analytics');
  _analytics = getAnalytics(app);
  return _analytics;
};

// Vertex AI — lazy loaded, not needed on critical path
let _model = null;
export const getAIModel = async () => {
  if (_model) return _model;
  const { getAI, getGenerativeModel, VertexAIBackend } = await import('firebase/ai');
  const vertexAI = getAI(app, { backend: new VertexAIBackend() });
  _model = getGenerativeModel(vertexAI, { model: 'gemini-2.0-flash' });
  return _model;
};
