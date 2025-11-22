import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import { useAuth } from './context/AuthContext';

// ⭐ 仮の Home コンポーネント (動作確認用)
const TempHome = () => {
  const { currentUser, logout } = useAuth();
  return (
    <div style={{ padding: '20px' }}>
      <h1>⚾ ソフトボール成績入力システム</h1>
      {currentUser ? (
        <>
          <p>ようこそ、管理者ユーザー様（{currentUser.email}）</p>
          <button onClick={logout} style={{ padding: '8px 15px', background: '#c0392b', color: 'white', border: 'none' }}>
            ログアウト
          </button>
          <h2>✅ ログイン成功！</h2>
          <p>この画面はログイン後にのみ表示されます。</p>
        </>
      ) : (
        <p>エラー: 本来このメッセージは表示されません</p>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* ホーム画面（ログイン後にのみアクセス可能） */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <TempHome />
            </PrivateRoute>
          }
        />
        {/* ログイン画面（認証不要） */}
        <Route path="/login" element={<Login />} />
        {/* 他のルートもここに追加 */}
      </Routes>
    </Router>
  );
}

export default App;