import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/routes/PrivateRoute';
import EditorRoute from './components/routes/EditorRoute';
import AdminRoute from './components/routes/AdminRoute';
import AuthContainer from './components/auth/AuthContainer';
import LoadingIndicator from './components/common/LoadingIndicator';
import TeamManagement from './components/team/TeamManagement';
import PlayerManagement from './components/player/PlayerManagement';
import TournamentManagement from './components/tournament/TournamentManagement';
import MatchManagement from './components/game/gameManagement';
import StartingLineup from './components/lineup/StartingLineup';
import PlayRegister from './components/play/PlayRegister';
import HomePage from './components/home/HomePage';
import UserApprovalManagement from './components/admin/UserApprovalManagement';
import ViewerPage from './components/viewer/ViewerPage';

const Dashboard = () => <div>ダッシュボード（ログイン必須）</div>;

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/team" element={<EditorRoute><TeamManagement /></EditorRoute>} />
          <Route path="/player" element={<EditorRoute><PlayerManagement /></EditorRoute>} />
          <Route path="/tournament" element={<EditorRoute><TournamentManagement /></EditorRoute>} />
          <Route path="/match" element={<EditorRoute><MatchManagement /></EditorRoute>} />
          <Route path="/match/:matchId/lineup" element={<EditorRoute><StartingLineup /></EditorRoute>} />
          <Route path="/match/:matchId/play" element={<EditorRoute><PlayRegister /></EditorRoute>} />
          <Route path="/game/:matchId/lineup" element={<EditorRoute><StartingLineup /></EditorRoute>} />
          <Route path="/game/:matchId/play" element={<EditorRoute><PlayRegister /></EditorRoute>} />
          <Route path="/dashboard" element={<EditorRoute><Dashboard /></EditorRoute>} />
          <Route path="/viewer" element={<PrivateRoute><ViewerPage /></PrivateRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserApprovalManagement /></AdminRoute>} />
          <Route path="/login" element={<AuthContainer mode="login" />} />
          <Route path="/signup" element={<AuthContainer mode="signup" />} />
          <Route path="/loading" element={<LoadingIndicator />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
