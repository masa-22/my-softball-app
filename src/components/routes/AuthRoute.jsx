import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingIndicator from '../common/LoadingIndicator';

const AuthRoute = ({ children, redirectTo = '/' }) => {
  const { currentUser, loading } = useAuth();

  // 認証状態を確認中はローディング表示
  if (loading) {
    return <LoadingIndicator />;
  }

  // ログイン済みならリダイレクト、未ログインなら children を表示
  return currentUser ? <Navigate to={redirectTo} replace /> : children;
};

export default AuthRoute;