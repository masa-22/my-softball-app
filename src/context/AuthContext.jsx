import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // authインスタンスをインポート

// 1. Contextを作成
const AuthContext = createContext();

// 2. カスタムフック：Contextを使用するためのフック
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Providerコンポーネント：アプリ全体に認証機能を提供
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ログイン処理
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // ユーザー登録処理
  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Googleログイン処理
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  // ログアウト処理
  const logout = () => {
    return signOut(auth);
  };

  // 認証状態の変更を監視（リロードしてもログイン状態を維持するため）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe; // クリーンアップ関数
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};