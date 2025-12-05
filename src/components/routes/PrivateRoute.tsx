import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingIndicator from '../common/LoadingIndicator';
import { getUserApprovalStatus } from '../../services/userApprovalService';

interface Props {
  children: ReactNode;
}

const PrivateRoute: React.FC<Props> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [approvalLoading, setApprovalLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const checkApproval = async () => {
      if (currentUser) {
        try {
          const approvalStatus = await getUserApprovalStatus(currentUser.uid);
          setIsApproved(approvalStatus?.approved ?? false);
        } catch (error) {
          console.error('Error checking approval status:', error);
          setIsApproved(false);
        } finally {
          setApprovalLoading(false);
        }
      } else {
        setApprovalLoading(false);
      }
    };

    checkApproval();
  }, [currentUser]);

  if (loading || approvalLoading) {
    return <LoadingIndicator />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!isApproved) {
    return (
      <div style={{ width: '95%', maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>アクセスできません</h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
          アカウントがまだ承認されていません。
          <br />
          管理者による承認が完了するまでお待ちください。
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 24px',
            background: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default PrivateRoute;
