import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';
import AuthContainer from './AuthContainer';

interface Props {
  switchTo?: (mode: 'login' | 'signup') => void;
  onClose?: () => void;
}

const LoginForm: React.FC<Props> = ({ switchTo, onClose }) => {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { login, currentUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showSignupModal, setShowSignupModal] = useState(false);

  if (currentUser) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(emailRef.current?.value || '', passwordRef.current?.value || '');
      if (onClose) onClose();
      navigate('/');
    } catch (e: any) {
      console.error('Login error:', e);
      let errorMessage = 'ログインに失敗しました。';
      
      // Firebase エラーコードに基づいて詳細なメッセージを表示
      if (e.code) {
        switch (e.code) {
          case 'auth/user-not-found':
            errorMessage = 'このメールアドレスは登録されていません。';
            break;
          case 'auth/wrong-password':
            errorMessage = 'パスワードが正しくありません。';
            break;
          case 'auth/invalid-email':
            errorMessage = 'メールアドレスの形式が正しくありません。';
            break;
          case 'auth/user-disabled':
            errorMessage = 'このアカウントは無効化されています。';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再度お試しください。';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'このログイン方法は許可されていません。';
            break;
          default:
            errorMessage = `ログインに失敗しました。(${e.code || '不明なエラー'})`;
        }
      } else {
        errorMessage = 'ログインに失敗しました。メールアドレスまたはパスワードを確認してください。';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSignup = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof switchTo === 'function') {
      switchTo('signup');
    } else {
      setShowSignupModal(true);
    }
  };

  return (
    <div>
      <h2>ログイン</h2>
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
          style={{ width: '100%', padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          ログイン
        </button>
      </form>

      <div style={{ margin: '20px 0', textAlign: 'center', color: '#888' }}>または</div>

      <GoogleLoginButton onClose={onClose} />

      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <a href="/signup" onClick={handleOpenSignup} style={{ color: '#3498db', textDecoration: 'none', cursor: 'pointer' }}>
          新規ユーザー登録はこちら
        </a>
      </div>

      {showSignupModal && <AuthContainer mode="signup" isModal={true} onClose={() => setShowSignupModal(false)} />}
    </div>
  );
};

export default LoginForm;
