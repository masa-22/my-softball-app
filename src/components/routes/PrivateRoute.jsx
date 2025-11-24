import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingIndicator from '../common/LoadingIndicator';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingIndicator/>;
  }

  return currentUser ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;