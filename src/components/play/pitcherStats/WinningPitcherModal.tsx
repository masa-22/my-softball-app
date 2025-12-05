import React, { useState } from 'react';
import { Player } from '../../../types/Player';

type WinningPitcherModalProps = {
  open: boolean;
  pitchers: Array<{ playerId: string; player: Player | undefined }>;
  onSelect: (pitcherId: string) => void;
  onCancel: () => void;
};

const formatPlayerName = (player: Player | undefined) => {
  if (!player) return '未登録';
  const family = player.familyName ?? '';
  const given = player.givenName ?? '';
  return `${family} ${given}`.trim() || '未登録';
};

const WinningPitcherModal: React.FC<WinningPitcherModalProps> = ({
  open,
  pitchers,
  onSelect,
  onCancel,
}) => {
  const [selectedPitcherId, setSelectedPitcherId] = useState<string | null>(null);

  if (!open) return null;

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
    maxWidth: 500,
    width: '90%',
    boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
  };

  const handleSubmit = () => {
    if (selectedPitcherId) {
      onSelect(selectedPitcherId);
    }
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          勝利投手を選択
        </div>
        <div style={{ marginBottom: 16, color: '#495057' }}>
          登板した投手から勝利投手を選択してください。
        </div>
        <div style={{ marginBottom: 16 }}>
          {pitchers.map((pitcher) => (
            <label
              key={pitcher.playerId}
              style={{
                display: 'block',
                padding: '12px',
                marginBottom: 8,
                border: selectedPitcherId === pitcher.playerId ? '2px solid #1c7ed6' : '1px solid #dee2e6',
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: selectedPitcherId === pitcher.playerId ? '#e7f5ff' : '#fff',
              }}
            >
              <input
                type="radio"
                name="winningPitcher"
                value={pitcher.playerId}
                checked={selectedPitcherId === pitcher.playerId}
                onChange={(e) => setSelectedPitcherId(e.target.value)}
                style={{ marginRight: 8 }}
              />
              {formatPlayerName(pitcher.player)}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: 'none',
              background: '#e9ecef',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedPitcherId}
            style={{
              border: 'none',
              background: selectedPitcherId ? '#1c7ed6' : '#adb5bd',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: selectedPitcherId ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinningPitcherModal;

