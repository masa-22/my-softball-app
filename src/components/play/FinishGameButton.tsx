import React, { useState } from 'react';
import { GameStatus } from '../../types/Game';

type FinishGameButtonProps = {
  status: GameStatus | null;
  disabled?: boolean;
  busy?: boolean;
  onFinish: () => Promise<unknown> | unknown;
};

const buttonStyle: React.CSSProperties = {
  border: 'none',
  backgroundColor: '#fa5252',
  color: '#fff',
  padding: '8px 18px',
  borderRadius: 999,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.2s ease',
};

const disabledStyle: React.CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.4)',
  zIndex: 2000,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxSizing: 'border-box',
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: '24px',
  maxWidth: 420,
  width: '90%',
  boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
};

const modalButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  fontWeight: 600,
};

const FinishGameButton: React.FC<FinishGameButtonProps> = ({
  status,
  disabled = false,
  busy = false,
  onFinish,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFinished = status === 'FINISHED';
  const isDisabled = disabled || busy || isFinished;
  const label = isFinished ? '試合終了済' : busy ? '処理中...' : '試合終了';

  const handleClick = () => {
    if (isDisabled) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    try {
      setError(null);
      await onFinish();
    } catch (err) {
      console.warn('finish game failed', err);
      setError('終了処理に失敗しました。時間を置いて再度お試しください。');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        onClick={handleClick}
        style={{ ...buttonStyle, ...(isDisabled ? disabledStyle : {}) }}
        disabled={isDisabled}
      >
        {label}
      </button>
      {error && <span style={{ fontSize: 11, color: '#c92a2a' }}>{error}</span>}
      {confirmOpen && (
        <div style={overlayStyle} onClick={() => setConfirmOpen(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              試合終了
            </div>
            <div style={{ marginBottom: 20, color: '#495057' }}>
              試合を終了します。よろしいですか？
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{ ...modalButtonStyle, background: '#e9ecef' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{ ...modalButtonStyle, background: '#fa5252', color: '#fff' }}
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinishGameButton;
