import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext'; // 作成したフックをインポート
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, currentUser } = useAuth(); // AuthContextからlogin関数とcurrentUserを取得
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 既にログインしている場合はホーム画面へリダイレクト
  if (currentUser) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(emailRef.current.value, passwordRef.current.value);
      navigate('/'); // ログイン成功後、ホーム画面へ遷移
    } catch (e) {
      // ログイン失敗時のエラーメッセージ
      setError('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
      <h2>管理者ログイン</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>メールアドレス</label>
          <input type="email" ref={emailRef} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label>パスワード</label>
          <input type="password" ref={passwordRef} required style={{ width: '100%', padding: '8px' }} />
        </div>
        <button disabled={loading} type="submit" style={{ padding: '10px 15px', background: '#3498db', color: 'white', border: 'none' }}>
          ログイン
        </button>
      </form>
    </div>
  );
};

export default Login;