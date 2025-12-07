/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCig0k-trclZCICTCbN-sX45MzRZrKdA20",
  authDomain: "tus-softball-datasystem.firebaseapp.com",
  projectId: "tus-softball-datasystem",
  storageBucket: "tus-softball-datasystem.firebasestorage.app",
  messagingSenderId: "889674832694",
  appId: "1:889674832694:web:56f16751133260991bf197",
  measurementId: "G-RYK8F8D3LQ",
  databaseURL: "https://tus-softball-datasystem-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

// ローカル開発環境ではエミュレータに接続
// 環境変数で明示的に制御することも可能: import.meta.env.VITE_USE_EMULATOR === 'true'
const useEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR !== 'false';

// Firestoreを初期化（Authより先に初期化）
export const db = getFirestore(app);

// Realtime Databaseを初期化
export const rtdb = getDatabase(app);

// Authを初期化
export const auth = getAuth(app);

// エミュレータへの接続（初期化直後、他のコードが実行される前に行う必要がある）
if (useEmulator) {
  // Firestoreエミュレータに接続
  try {
    const firestoreSettings = (db as any)._delegate?._settings;
    if (!firestoreSettings?.host?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('✅ Connected to Firestore emulator at localhost:8080');
    }
  } catch (error: any) {
    // 既に接続されている場合は無視
    if (error?.message?.includes('already been connected') || error?.message?.includes('already connected')) {
      console.log('Firestore emulator already connected');
    } else {
      console.warn('⚠️ Firestore emulator connection error:', error);
    }
  }
  
  // Realtime Databaseエミュレータに接続
  try {
    const rtdbHost = (rtdb as any)._delegate?._repo?.repoInfo?.host;
    if (!rtdbHost?.includes('localhost')) {
      connectDatabaseEmulator(rtdb, 'localhost', 9000);
      console.log('✅ Connected to Realtime Database emulator at localhost:9000');
    }
  } catch (error: any) {
    // 既に接続されている場合は無視
    if (error?.message?.includes('already been connected') || error?.message?.includes('already connected')) {
      console.log('Realtime Database emulator already connected');
    } else {
      console.warn('⚠️ Realtime Database emulator connection error:', error);
    }
  }
  
  // Authエミュレータに接続（getAuthの直後に行う必要がある）
  try {
    const authConfig = (auth as any)._delegate?._config;
    if (!authConfig?.emulator) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      console.log('✅ Connected to Auth emulator at localhost:9099');
    } else {
      console.log('Auth emulator already connected');
    }
  } catch (error: any) {
    // 既に接続されている場合は無視
    if (error?.message?.includes('already been connected') || error?.message?.includes('already connected')) {
      console.log('Auth emulator already connected');
    } else {
      console.error('❌ Auth emulator connection failed:', error);
      console.warn('💡 Make sure the Firebase emulator is running: npm run dev:emulator');
      console.warn('💡 If you want to use production Firebase, set VITE_USE_EMULATOR=false');
    }
  }
} else {
  console.log('🌐 Using production Firebase (emulator disabled)');
}
