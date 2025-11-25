import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const GoogleLoginButton = ({ onClose }) => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle(); // 既存・新規アカウント両方成功扱い
      
      // モーダル内での使用の場合は onClose を呼ぶ
      if (typeof onClose === 'function') {
        onClose();
      }
      
      // その後ホームに遷移
      navigate('/');
    } catch (e) {
      console.error(e);
      setError('Googleアカウントでのログインに失敗しました。');
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