import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const { signup, currentUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (currentUser) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      // AuthContextで定義した signup 関数を呼び出す
      await signup(emailRef.current.value, passwordRef.current.value);
      navigate('/'); // 登録成功後、ホーム画面へ遷移
    } catch (e) {
      setError('ユーザー登録に失敗しました。このメールアドレスは既に使用されている可能性があります。');
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
      <h2>ユーザー登録</h2>
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
        <button disabled={loading} type="submit" style={{ padding: '10px 15px', background: '#27ae60', color: 'white', border: 'none' }}>
          登録
        </button>
      </form>
      <div style={{ marginTop: '15px', textAlign: 'center' }}>
        <Link to="/login">既にアカウントをお持ちの方はこちら</Link>
      </div>
    </div>
  );
};

export default Signup;