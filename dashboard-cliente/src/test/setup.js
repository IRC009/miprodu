import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  signInWithEmailAndPassword: vi.fn(),
}));

// Mock de Firestore
vi.mock('firebase/firestore', () => ({
  initializeFirestore: vi.fn(() => ({})),
  getFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
  doc: vi.fn((dbOrPath, path) => {
    const finalPath = path || (typeof dbOrPath === 'string' ? dbOrPath : '');
    return { id: finalPath.split('/').pop(), path: finalPath };
  }),
  collection: vi.fn((dbOrPath, path) => {
    const finalPath = path || (typeof dbOrPath === 'string' ? dbOrPath : '');
    return { id: finalPath.split('/').pop(), path: finalPath };
  }),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => 'timestamp'),
  limit: vi.fn(),
  orderBy: vi.fn(),
}));

// Mock de Firebase AI, Storage, Analytics, AppCheck
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
}));

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaV3Provider: vi.fn(),
}));

vi.mock('firebase/ai', () => ({
  getAI: vi.fn(),
  getGenerativeModel: vi.fn(),
  VertexAIBackend: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));
