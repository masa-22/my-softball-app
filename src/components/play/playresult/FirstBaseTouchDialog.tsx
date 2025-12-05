import React from 'react';

interface FirstBaseTouchDialogProps {
  onResponse: (touched: boolean) => void;
}

const FirstBaseTouchDialog: React.FC<FirstBaseTouchDialogProps> = ({ onResponse }) => {
  return (
    <div style={{
      padding: 24,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      maxWidth: 400,
      margin: '0 auto',
      textAlign: 'center',
      border: '1px solid #dee2e6'
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: 16,
        fontSize: 18,
        fontWeight: 600,
        color: '#212529',
      }}>
        ファーストがベースを踏みましたか？
      </h3>
      <p style={{
        marginBottom: 24,
        fontSize: 14,
        color: '#495057',
        lineHeight: 1.5,
      }}>
        踏んだ場合はファーストに刺殺のみが記録されます。<br />
        踏んでいない場合は、誰がアウトにしたか（ベースカバー）を選択します。
      </p>
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
            background: '#868e96',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          いいえ
        </button>
        <button
          type="button"
          onClick={() => onResponse(true)}
          style={{
            padding: '10px 24px',
            background: '#228be6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          はい
        </button>
      </div>
    </div>
  );
};

export default FirstBaseTouchDialog;

