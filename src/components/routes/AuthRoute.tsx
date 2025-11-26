import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingIndicator from '../common/LoadingIndicator';

interface Props {
  children: ReactNode;
  redirectTo?: string;
}

const AuthRoute: React.FC<Props> = ({ children, redirectTo = '/' }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingIndicator />;
  }

  return currentUser ? <Navigate to={redirectTo} replace /> : <>{children}</>;
};

export default AuthRoute;
