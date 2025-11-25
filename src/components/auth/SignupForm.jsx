import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from './GoogleLoginButton';
import AuthContainer from './AuthContainer';

const SignupForm = ({ switchTo, onClose }) => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { signup, currentUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ログイン済みならホームにリダイレクト
  if (currentUser) {
    navigate('/');
    return null;
  }

  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signup(emailRef.current.value, passwordRef.current.value);
      if (onClose) onClose();
      navigate('/');
    } catch (e) {
      console.error(e);
      setError('ユーザー登録に失敗しました。このメールアドレスは既に使用されている可能性があります。');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogin = (e) => {
    e && e.preventDefault();
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

        {/* 1) メールで登録 */}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          登録
        </button>
      </form>

      <div style={{ margin: '20px 0', textAlign: 'center', color: '#888' }}>または</div>

      {/* 2) Googleで登録（既存の GoogleLoginButton を流用） */}
      <GoogleLoginButton onClose={onClose} />

      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <a href="/login" onClick={handleOpenLogin} style={{ color: '#3498db', textDecoration: 'none', cursor: 'pointer' }}>
          既にアカウントをお持ちの方はこちら
        </a>
      </div>

      {/* ページ表示時に開くローカルモーダル */}
      {showLoginModal && <AuthContainer mode="login" isModal={true} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default SignupForm;