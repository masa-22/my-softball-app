import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>認証状態を確認中...</div>;
  }

  // ログインしている場合は子要素（アクセスしたいページ）を表示
  return currentUser ? children : <Navigate to="/login" />;
};

export default PrivateRoute;