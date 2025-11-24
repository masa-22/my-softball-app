import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/routes/PrivateRoute';
import AuthContainer from './components/auth/AuthContainer';
import LoadingIndicator from './components/common/LoadingIndicator';

// --- サンプルページ ---
const HomePage = () => <div>ホームページ</div>;
const Dashboard = () => <div>ダッシュボード（ログイン必須）</div>;

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          {/* ホームページ（誰でもアクセス可能） */}
          <Route path="/" element={<HomePage />} />

          {/* ログイン必須ページ */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* 直接 /login や /signup にアクセスした場合も AuthContainer を使用 */}
          <Route path="/login" element={<AuthContainer mode="login" />} />
          <Route path="/signup" element={<AuthContainer mode="signup" />} />

          {/* ローディング表示例（必要に応じて使用） */}
          <Route path="/loading" element={<LoadingIndicator />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;