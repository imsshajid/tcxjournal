import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const cloudConfigured = ['apiKey', 'authDomain', 'projectId', 'appId']
  .every((key) => Boolean(firebaseConfig[key]));

const app = cloudConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function watchAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase is not configured yet.');
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function logout() {
  if (auth) await signOut(auth);
}

export async function loadCloudJournal(uid) {
  ensureCloud();
  const [tradeSnapshot, settingsSnapshot] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'trades')),
    getDoc(doc(db, 'users', uid, 'journal', 'settings')),
  ]);
  return {
    trades: tradeSnapshot.docs.map((tradeDoc) => ({ id: tradeDoc.id, ...tradeDoc.data() })),
    settings: settingsSnapshot.exists() ? settingsSnapshot.data().settings : null,
  };
}

export async function initializeCloudJournal(user, journal) {
  ensureCloud();
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', user.uid), cleanObject({
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    provider: 'google.com',
    product: 'TCX Journal',
    securityLayer: 'TCX Security',
    updatedAt: serverTimestamp(),
  }), { merge: true });
  batch.set(doc(db, 'users', user.uid, 'journal', 'settings'), {
    settings: cleanObject(journal.settings),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  await writeTradeChunks(user.uid, journal.trades);
}

export async function saveCloudTrades(uid, trades) {
  ensureCloud();
  await writeTradeChunks(uid, trades);
}

export async function deleteCloudTrade(uid, tradeId) {
  ensureCloud();
  await deleteDoc(doc(db, 'users', uid, 'trades', tradeId));
}

export async function saveCloudSettings(uid, settings) {
  ensureCloud();
  await setDoc(doc(db, 'users', uid, 'journal', 'settings'), {
    settings: cleanObject(settings),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function verifyWithTcxSecurity(user) {
  const token = await user.getIdToken(true);
  const response = await fetch('/.netlify/functions/tcx-security', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('TCX Security verification failed.');
  return response.json();
}

function ensureCloud() {
  if (!db) throw new Error('Firebase is not configured yet.');
}

function cleanObject(value) {
  return JSON.parse(JSON.stringify(value));
}

async function writeTradeChunks(uid, trades) {
  for (let start = 0; start < trades.length; start += 450) {
    const batch = writeBatch(db);
    trades.slice(start, start + 450).forEach((trade) => {
      batch.set(doc(db, 'users', uid, 'trades', trade.id), {
        ...cleanObject(trade),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
  }
}
