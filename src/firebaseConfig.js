// src/firebaseConfig.js

// Firebaseのコア機能と、使用するサービス（Auth, Firestore）をインポート
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 💡 ここにFirebaseコンソールから取得したプロジェクト設定を貼り付けます
const firebaseConfig = {

  apiKey: "AIzaSyCig0k-trclZCICTCbN-sX45MzRZrKdA20",

  authDomain: "tus-softball-datasystem.firebaseapp.com",

  projectId: "tus-softball-datasystem",

  storageBucket: "tus-softball-datasystem.firebasestorage.app",

  messagingSenderId: "889674832694",

  appId: "1:889674832694:web:56f16751133260991bf197",

  measurementId: "G-RYK8F8D3LQ"

};


// 1. Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 2. 使用するサービス（認証とFirestore）のインスタンスを取得
export const auth = getAuth(app);    // 認証（ログイン）機能にアクセスするためのオブジェクト
export const db = getFirestore(app); // データベース（Firestore）にアクセスするためのオブジェクト

// このファイルから auth と db をエクスポートすることで、
// 他のReactコンポーネントから簡単に利用できるようになります。
// 例: import { db } from './firebaseConfig';