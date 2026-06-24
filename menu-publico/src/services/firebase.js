import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// TODO: Replace with production config
const firebaseConfig = {
  apiKey: "AIzaSyDP8xh4FwNRbswvSf1egMCmybkcRr_8xgk",
  authDomain: "miprodu-fec00.firebaseapp.com",
  projectId: "miprodu-fec00",
  storageBucket: "miprodu-fec00.firebasestorage.app",
  messagingSenderId: "112703118753",
  appId: "1:112703118753:web:797a1ec23d2165a9517fe0",
  measurementId: "G-R1BRV39W0X"
};

const app = initializeApp(firebaseConfig);

// Inicialización moderna para el menú público
let db;
const isIframe = typeof window !== 'undefined' && window.self !== window.top;

if (isIframe) {
  // Inside an iframe, use standard getFirestore without persistent local cache
  // to avoid third-party storage access security errors.
  db = getFirestore(app);
} else {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    console.warn("Firestore persistent local cache failed to initialize, falling back to default.", e);
    db = getFirestore(app);
  }
}

const storage = getStorage(app);
const functions = getFunctions(app);

export { db, storage, functions };
