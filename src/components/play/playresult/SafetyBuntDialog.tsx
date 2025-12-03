import React from 'react';

interface SafetyBuntDialogProps {
  positionLabel: string;
  onResponse: (isBunt: boolean) => void;
}

const SafetyBuntDialog: React.FC<SafetyBuntDialogProps> = ({ positionLabel, onResponse }) => (
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
      セーフティバントの確認
    </h3>
    <div style={{
      background: '#fff3cd',
      padding: 16,
      borderRadius: 8,
      marginBottom: 20,
      border: '1px solid #ffc107',
    }}>
      <div style={{ fontSize: 14, color: '#856404', textAlign: 'center', marginBottom: 12 }}>
        {positionLabel}が処理したシングルヒットです。
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#212529', textAlign: 'center' }}>
        これはセーフティバントですか？
      </div>
    </div>
    <div style={{
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
    }}>
      <button
        type="button"
        onClick={() => onResponse(false)}
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
        いいえ（通常のヒット）
      </button>
      <button
        type="button"
        onClick={() => onResponse(true)}
        style={{
          padding: '10px 24px',
          background: '#4c6ef5',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        はい（セーフティバント）
      </button>
    </div>
  </div>
);

export default SafetyBuntDialog;
