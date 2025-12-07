import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';
import AuthContainer from './AuthContainer';
import { createPendingUser } from '../../services/userApprovalService';

interface Props {
  switchTo?: (mode: 'login' | 'signup') => void;
  onClose?: () => void;
}

const SignupForm: React.FC<Props> = ({ switchTo, onClose }) => {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { signup, currentUser, logout } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (currentUser) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const email = emailRef.current?.value || '';
      const userCredential = await signup(email, passwordRef.current?.value || '');
      const userId = userCredential.user.uid;
      
      // Firestoreにユーザー情報を保存（承認待ち状態）
      await createPendingUser(userId, email);
      
      // ログアウトして認証待ち状態にする
      await logout();
      if (onClose) onClose();
      navigate('/');
    } catch (e: any) {
      console.error(e);
      setError('ユーザー登録に失敗しました。このメールアドレスは既に使用されている可能性があります。');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof switchTo === 'function') {
      switchTo('login');
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <div>
      <h2>新規ユーザー登録</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>メールアドレス</label>
          <input
            type="email"
            ref={emailRef}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label>パスワード</label>
          <input
            type="password"
            ref={passwordRef}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          登録
        </button>
      </form>

      <div style={{ margin: '20px 0', textAlign: 'center', color: '#888' }}>または</div>

      <GoogleLoginButton onClose={onClose} isSignup={true} />

      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <a href="/login" onClick={handleOpenLogin} style={{ color: '#3498db', textDecoration: 'none', cursor: 'pointer' }}>
          既にアカウントをお持ちの方はこちら
        </a>
      </div>

      {showLoginModal && <AuthContainer mode="login" isModal={true} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default SignupForm;
