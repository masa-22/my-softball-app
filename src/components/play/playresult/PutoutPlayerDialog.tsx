import React from 'react';

interface PutoutPlayerDialogProps {
  onSelect: (position: string) => void;
  onCancel: () => void;
}

const PutoutPlayerDialog: React.FC<PutoutPlayerDialogProps> = ({ onSelect, onCancel }) => {
  const positionOptions = [
    { value: '1', label: '投手（P）' },
    { value: '2', label: '捕手（C）' },
    { value: '3', label: '一塁手（1B）' }, // 通常は選ばないはずだが、選択肢としてはありうる
    { value: '4', label: '二塁手（2B）' },
    { value: '5', label: '三塁手（3B）' },
    { value: '6', label: '遊撃手（SS）' },
    { value: '7', label: '左翼手（LF）' },
    { value: '8', label: '中堅手（CF）' },
    { value: '9', label: '右翼手（RF）' },
  ];

  return (
    <div style={{
      padding: 24,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      maxWidth: 500,
      margin: '0 auto',
      textAlign: 'center',
      border: '1px solid #dee2e6'
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: 8,
        fontSize: 18,
        fontWeight: 600,
        color: '#212529',
      }}>
        誰がアウトにしましたか？
      </h3>
      <p style={{
        marginBottom: 20,
        fontSize: 14,
        color: '#495057',
      }}>
        ベースカバーに入って捕球し、アウトを成立させた選手を選択してください。
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        marginBottom: 24,
      }}>
        {positionOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            style={{
              padding: '10px 12px',
              background: '#f8f9fa',
              color: '#495057',
              border: '1px solid #dee2e6',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e9ecef';
              e.currentTarget.style.borderColor = '#adb5bd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8f9fa';
              e.currentTarget.style.borderColor = '#dee2e6';
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 20px',
            background: '#868e96',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default PutoutPlayerDialog;

