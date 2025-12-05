import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUserApprovalStatus } from '../../services/userApprovalService';

const PendingApproval: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [pendingData, setPendingData] = useState<{ email: string; timestamp: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPendingData = async () => {
      if (currentUser) {
        try {
          const approvalStatus = await getUserApprovalStatus(currentUser.uid);
          if (approvalStatus && !approvalStatus.approved) {
            setPendingData({
              email: approvalStatus.email,
              timestamp: approvalStatus.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error loading pending data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadPendingData();
  }, [currentUser]);

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ width: '95%', maxWidth: '800px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  // ログインしていない場合は通常のホームページを表示
  if (!currentUser) {
    return null;
  }

  return (
    <div style={{ 
      width: '95%', 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff',
        border: '2px solid #f39c12',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px'
        }}>
          ⏳
        </div>
        
        <h1 style={{ 
          fontSize: '28px', 
          color: '#333', 
          marginBottom: '20px',
          fontWeight: 'bold'
        }}>
          認証待ち
        </h1>
        
        <p style={{ 
          fontSize: '18px', 
          color: '#666', 
          marginBottom: '30px',
          lineHeight: '1.6'
        }}>
          ご登録ありがとうございます。
        </p>
        
        <p style={{ 
          fontSize: '16px', 
          color: '#666', 
          marginBottom: '20px',
          lineHeight: '1.6'
        }}>
          アカウントの認証が完了するまで、しばらくお待ちください。
        </p>
        
        <p style={{ 
          fontSize: '14px', 
          color: '#999', 
          marginBottom: '30px',
          lineHeight: '1.6'
        }}>
          管理者による承認が完了次第、ログインできるようになります。
          <br />
          承認が完了しましたら、メールでお知らせいたします。
        </p>

        {pendingData && (
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
              <strong>登録メールアドレス:</strong> {pendingData.email}
            </p>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
              <strong>登録日時:</strong> {new Date(pendingData.timestamp).toLocaleString('ja-JP')}
            </p>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            ログイン画面へ
          </button>
          
          <button
            onClick={handleGoHome}
            style={{
              padding: '12px 24px',
              background: '#fff',
              color: '#666',
              border: '2px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#999';
              e.currentTarget.style.color = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.color = '#666';
            }}
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;

