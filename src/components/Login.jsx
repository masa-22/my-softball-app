import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // 作成したフックをインポート
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { login, signInWithGoogle, currentUser } = useAuth(); // AuthContextからlogin関数とcurrentUserを取得
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // 画面サイズ変更時にisMobileを更新
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 既にログインしている場合はホーム画面へリダイレクト
  if (currentUser) {
    navigate('/');
    return null;
  }

  //Googleログインハンドラー
  const handleGoogleSignIn = async () => {
    try {
        setError('');
        setLoading(true);
        await signInWithGoogle();
        navigate('/'); // ログイン成功後、ホーム画面へ遷移
    } catch (e) {
        setError('Googleログインに失敗しました。');
        console.error(e);
    }
    setLoading(false);
  };

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

  // --- スタイル定義 ---
  const wrapperStyle = {
    display: 'flex',
    justifyContent: 'center', // 水平方向の中央揃え
    alignItems: 'center',     // 垂直方向の中央揃え
    minHeight: '100vh',     // ビューポートの高さいっぱいを使用
    padding: isMobile ? '0' : '20px',
    boxSizing: 'border-box',
    backgroundColor: '#f4f7f6', 
  };

  // デスクトップ用スタイル
  const containerStyle = {
    maxWidth: '800px',
    width: '100%',
    margin: '0',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
  };

  // モバイル用スタイル
  const mobileContainerStyle = {
    maxWidth: '100%',
    margin: '0 10px',
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '0',
    boxShadow: 'none',
  };

  // コンテナスタイル
  const appliedContainerStyle = {
    ...containerStyle,
    ...(isMobile ? mobileContainerStyle : {}),
  }

  return (
    <div style={wrapperStyle}>
      <div style={appliedContainerStyle}>
        <h2>管理者ログイン</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {/* メール・パスワードフォーム */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>メールアドレス</label>
            <input type="email" ref={emailRef} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>パスワード</label>
            <input type="password" ref={passwordRef} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <button disabled={loading} 
          type="submit" 
          style={{ padding: '10px 15px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}>
            ログイン
          </button>
        </form>

        <div style={{ margin: '20px 0', textAlign: 'center', color: '#888' }}>または</div>

        {/* Googleログインボタン */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ padding: '10px 15px', background: '#db4437', color: 'white', border: 'none', width: '100%', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
          Googleでログイン
        </button>

        {/* ユーザー登録ページへのリンク */}
        <div style={{ marginTop: '20px', textAlign: 'center'}}>
          <Link to="/signup" style={{ color: '#3498db', textDecoration: 'none' }}>新規ユーザー登録はこちら</Link>
        </div>
      </div>
    </div>
  );  
};

export default Login;