import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createOrGetUserApproval } from '../../services/userApprovalService';

interface Props {
  onClose?: () => void;
  isSignup?: boolean; // 新規登録かどうか
}

const GoogleLoginButton: React.FC<Props> = ({ onClose, isSignup = false }) => {
  const { signInWithGoogle, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;
      const email = user.email || '';

      if (!email) {
        throw new Error('メールアドレスが取得できませんでした。');
      }

      // Firestoreにユーザー情報を保存または取得
      const userApproval = await createOrGetUserApproval(user.uid, email);

      // 新規登録の場合、承認待ち状態の場合はログアウトする
      if (isSignup && !userApproval.approved) {
        await logout();
        if (onClose) onClose();
        navigate('/');
        return;
      }

      if (typeof onClose === 'function') {
        onClose();
      }

      navigate('/');
    } catch (e: any) {
      console.error(e);
      let errorMessage = 'Googleアカウントでのログインに失敗しました。';
      
      // Firebase エラーコードに基づいて詳細なメッセージを表示
      if (e.code) {
        switch (e.code) {
          case 'auth/popup-closed-by-user':
            errorMessage = 'ログインがキャンセルされました。';
            break;
          case 'auth/popup-blocked':
            errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください。';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Googleアカウントでのログインは許可されていません。';
            break;
          default:
            errorMessage = `Googleアカウントでのログインに失敗しました。(${e.code || '不明なエラー'})`;
        }
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#db4437',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        Googleアカウントを使用
      </button>
    </div>
  );
};

export default GoogleLoginButton;
