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

const FinishGameButton: React.FC<FinishGameButtonProps> = ({
  status,
  disabled = false,
  busy = false,
  onFinish,
}) => {
  const [error, setError] = useState<string | null>(null);
  const isFinished = status === 'FINISHED';
  const isDisabled = disabled || busy || isFinished;
  const label = isFinished ? '試合終了済' : busy ? '処理中...' : '試合終了';

  const handleClick = async () => {
    if (isDisabled) return;
    const confirmed = window.confirm('試合を終了します。よろしいですか？');
    if (!confirmed) return;
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
    </div>
  );
};

export default FinishGameButton;

