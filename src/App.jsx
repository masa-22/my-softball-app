import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/routes/PrivateRoute';
import AuthContainer from './components/auth/AuthContainer';
import LoadingIndicator from './components/common/LoadingIndicator';
import TeamManagement from './components/team/TeamManagement';

// --- サンプルページ ---
const HomePage = () => <div>ホームページ</div>;
const Dashboard = () => <div>ダッシュボード（ログイン必須）</div>;

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <Router>
      <MainLayout>
        <Routes>
          {/* ホームページ（誰でもアクセス可能） */}
          <Route path="/" element={<HomePage />} />

          {/* チーム登録ページ（ログイン必須） */}
          <Route
            path="/team"
            element={
              <PrivateRoute>
                <TeamManagement />
              </PrivateRoute>
            }
          />

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