import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/routes/PrivateRoute';
import AuthContainer from './components/auth/AuthContainer';
import LoadingIndicator from './components/common/LoadingIndicator';
import TeamManagement from './components/team/TeamManagement';
import PlayerManagement from './components/player/PlayerManagement';

const HomePage = () => <div>ホームページ</div>;
const Dashboard = () => <div>ダッシュボード（ログイン必須）</div>;

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/team" element={<PrivateRoute><TeamManagement /></PrivateRoute>} />
          <Route path="/player" element={<PrivateRoute><PlayerManagement /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/login" element={<AuthContainer mode="login" />} />
          <Route path="/signup" element={<AuthContainer mode="signup" />} />
          <Route path="/loading" element={<LoadingIndicator />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
