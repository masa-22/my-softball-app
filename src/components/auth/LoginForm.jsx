import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';
import AuthContainer from './AuthContainer'; // ローカルでモーダルを開くために使用

const LoginForm = ({ switchTo, onClose }) => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, currentUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ページ表示時にログイン済みならリダイレクト
  if (currentUser) {
    navigate('/');
    return null;
  }

  const [showSignupModal, setShowSignupModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(emailRef.current.value, passwordRef.current.value);
      if (onClose) onClose();
      navigate('/');
    } catch (e) {
      console.error(e);
      setError('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSignup = (e) => {
    e && e.preventDefault();
    // モーダル内であれば switchTo を呼び、ページ表示ならローカルでモーダルを開く
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

        {/* 1) メールログインボタン */}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          ログイン
        </button>
      </form>

      <div style={{ margin: '20px 0', textAlign: 'center', color: '#888' }}>または</div>

      {/* 2) Googleログインボタン */}
      <GoogleLoginButton />

      {/* 新規登録をモーダルで開く（モーダル内なら切替、ページならローカルでモーダル表示） */}
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <a href="/signup" onClick={handleOpenSignup} style={{ color: '#3498db', textDecoration: 'none', cursor: 'pointer' }}>
          新規ユーザー登録はこちら
        </a>
      </div>

      {/* ページ表示時に開くローカルモーダル */}
      {showSignupModal && <AuthContainer mode="signup" isModal={true} onClose={() => setShowSignupModal(false)} />}
    </div>
  );
};

export default LoginForm;