import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingIndicator from '../common/LoadingIndicator';
import { getUserApprovalStatus, canEdit } from '../../services/userApprovalService';

interface Props {
  children: ReactNode;
}

const EditorRoute: React.FC<Props> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [approvalLoading, setApprovalLoading] = useState(true);
  const [canUserEdit, setCanUserEdit] = useState(false);

  useEffect(() => {
    const checkEditPermission = async () => {
      if (currentUser) {
        try {
          const approvalStatus = await getUserApprovalStatus(currentUser.uid);
          setCanUserEdit(canEdit(approvalStatus));
        } catch (error) {
          console.error('Error checking edit permission:', error);
          setCanUserEdit(false);
        } finally {
          setApprovalLoading(false);
        }
      } else {
        setApprovalLoading(false);
      }
    };

    checkEditPermission();
  }, [currentUser]);

  if (loading || approvalLoading) {
    return <LoadingIndicator />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!canUserEdit) {
    return (
      <div style={{ width: '95%', maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>アクセス権限がありません</h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
          このページは編集者または管理者のみがアクセスできます。
          <br />
          閲覧者の方はデータ閲覧ページをご利用ください。
        </p>
        <button
          onClick={() => window.location.href = '/viewer'}
          style={{
            padding: '12px 24px',
            background: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          データ閲覧ページへ
        </button>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 24px',
            background: '#95a5a6',
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

export default EditorRoute;



