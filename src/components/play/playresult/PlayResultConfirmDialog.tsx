import React from 'react';

interface PlayResultConfirmDialogProps {
  strikeoutType?: 'swinging' | 'looking' | null;
  resultLabel: string;
  positionLabel: string;
  outfieldDirectionLabel: string;
  needsPosition: boolean;
  needsOutfieldDirection: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const PlayResultConfirmDialog: React.FC<PlayResultConfirmDialogProps> = ({
  strikeoutType,
  resultLabel,
  positionLabel,
  outfieldDirectionLabel,
  needsPosition,
  needsOutfieldDirection,
  onCancel,
  onConfirm,
}) => (
  <div style={{
    padding: 20,
    background: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: 8,
    maxWidth: 600,
    margin: '0 auto',
  }}>
    <h3 style={{
      marginBottom: 20,
      fontSize: 18,
      fontWeight: 600,
      color: '#212529',
      textAlign: 'center',
    }}>
      入力内容の確認
    </h3>
    <div style={{
      background: '#f8f9fa',
      padding: 16,
      borderRadius: 8,
      marginBottom: 20,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 4 }}>打席結果</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#212529' }}>
          {resultLabel}
        </div>
      </div>
      {needsPosition && positionLabel && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 4 }}>打球方向</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#212529' }}>{positionLabel}</div>
        </div>
      )}
      {needsOutfieldDirection && outfieldDirectionLabel && (
        <div>
          <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 4 }}>打球方向（外野）</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#212529' }}>{outfieldDirectionLabel}</div>
        </div>
      )}
    </div>
    <div style={{ fontSize: 14, color: '#6c757d', marginBottom: 20, textAlign: 'center' }}>
      この内容で登録してもよろしいですか？
    </div>
    <div style={{
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
    }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: '10px 24px',
          background: '#6c757d',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        戻る
      </button>
      <button
        type="button"
        onClick={onConfirm}
        style={{
          padding: '10px 24px',
          background: '#27ae60',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        登録する
      </button>
    </div>
  </div>
);

export default PlayResultConfirmDialog;
