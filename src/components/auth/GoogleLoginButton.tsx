import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  onClose?: () => void;
}

const GoogleLoginButton: React.FC<Props> = ({ onClose }) => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();

      if (typeof onClose === 'function') {
        onClose();
      }

      navigate('/');
    } catch (e: any) {
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
