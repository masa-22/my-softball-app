import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoginModal from '../auth/LoginModal';
import AuthContainer from '../auth/AuthContainer';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef();

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // ログアウト処理
  const handleLogout = async () => {
    setIsMenuOpen(false);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('ログアウトに失敗しました', err);
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#f4f4f4',
        borderBottom: '1px solid #ccc',
        position: 'relative',
      }}
    >
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold', fontSize: '20px' }}>MyApp</Link>
      </div>

      {/* 右上: ハンバーガーメニュー */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen((s) => !s)}
          aria-label="メニュー"
          style={{
            width: '40px',
            height: '36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            padding: '6px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            background: 'white',
            cursor: 'pointer',
          }}
        >
          {/* 横三本線（シンプル） */}
          <span style={{ display: 'block', width: '18px', height: '2px', background: '#333' }} />
          <span style={{ display: 'block', width: '18px', height: '2px', background: '#333' }} />
          <span style={{ display: 'block', width: '18px', height: '2px', background: '#333' }} />
        </button>

        {isMenuOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              marginTop: '8px',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              zIndex: 1000,
              minWidth: '160px',
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: '8px 0' }}>
              {/* 認証状態により表示を切り替え */}
              {!currentUser ? (
                <>
                  <li
                    style={{ padding: '10px 14px', cursor: 'pointer' }}
                    onClick={() => {
                      setIsLoginOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    ログイン
                  </li>
                  <li
                    style={{ padding: '10px 14px', cursor: 'pointer' }}
                    onClick={() => {
                      setIsSignupOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    新規登録
                  </li>
                </>
              ) : (
                <>
                  <li
                    style={{ padding: '10px 14px', cursor: 'pointer' }}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/team'); // チーム登録ページへ遷移
                    }}
                  >
                    チーム登録
                  </li>
                  <li
                    style={{ padding: '10px 14px', cursor: 'pointer' }}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/dashboard'); // ダッシュボードへ遷移
                    }}
                  >
                    ダッシュボード
                  </li>
                  <li
                    style={{ padding: '10px 14px', cursor: 'pointer', color: '#e74c3c' }}
                    onClick={handleLogout}
                  >
                    ログアウト
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 各モーダル（条件付き表示） */}
      {isLoginOpen && (
        <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      )}
      {isSignupOpen && (
        <AuthContainer mode="signup" isModal={true} onClose={() => setIsSignupOpen(false)} />
      )}
    </header>
  );
};

export default Header;