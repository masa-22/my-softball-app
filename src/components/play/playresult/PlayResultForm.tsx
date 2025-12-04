import React from 'react';

interface PlayResultFormProps {
  strikeoutType?: 'swinging' | 'looking' | null;
  result: string;
  setResult: (v: string) => void;
  resultOptions: Array<{ value: string; label: string; disabled?: boolean }>;
  position: string;
  setPosition: (v: string) => void;
  positionOptions: Array<{ value: string; label: string }>;
  outfieldDirection: string;
  setOutfieldDirection: (v: string) => void;
  outfieldDirectionOptions: Array<{ value: string; label: string }>;
  // 追加: batType
  batType: string;
  setBatType: (v: string) => void;
  batTypeOptions: Array<{ value: string; label: string }>;
  
  needsPosition: boolean;
  needsOutfieldDirection: boolean;
  needsBatType: boolean;
  isFormValid: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
}

const PlayResultForm: React.FC<PlayResultFormProps> = ({
  strikeoutType,
  result,
  setResult,
  resultOptions,
  position,
  setPosition,
  positionOptions,
  outfieldDirection,
  setOutfieldDirection,
  outfieldDirectionOptions,
  // 追加
  batType,
  setBatType,
  batTypeOptions,
  
  needsPosition,
  needsOutfieldDirection,
  needsBatType,
  isFormValid,
  onSubmit,
  onCancel,
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
      {strikeoutType ? '三振結果入力' : '打席結果入力'}
    </h3>
    {/* 打席結果選択 */}
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block',
        marginBottom: 8,
        fontWeight: 600,
        fontSize: 14,
        color: '#495057',
      }}>
        打席結果 <span style={{ color: '#e74c3c' }}>*</span>
      </label>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
      }}>
        {resultOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (option.disabled) return;
              setResult(option.value);
              if (!needsPosition) {
                setPosition('');
              }
              if (!['triple', 'homerun', 'runninghomerun', 'sacrifice_fly'].includes(option.value)) {
                setOutfieldDirection('');
              }
            }}
            disabled={option.disabled}
            style={{
              padding: '12px 16px',
              background: result === option.value ? '#4c6ef5' : option.disabled ? '#e9ecef' : '#f8f9fa',
              color: result === option.value ? '#fff' : option.disabled ? '#adb5bd' : '#495057',
              border: result === option.value ? '2px solid #4c6ef5' : '1px solid #dee2e6',
              borderRadius: 6,
              cursor: option.disabled ? 'not-allowed' : 'pointer',
              fontWeight: result === option.value ? 600 : 400,
              fontSize: 14,
              transition: 'all 0.2s ease',
              opacity: option.disabled ? 0.6 : 1,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
    
    {/* 打球タイプ選択（追加） */}
    {needsBatType && (
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          marginBottom: 8,
          fontWeight: 600,
          fontSize: 14,
          color: '#495057',
        }}>
          打球タイプ <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {batTypeOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBatType(option.value)}
              style={{
                padding: '10px 12px',
                background: batType === option.value ? '#fd7e14' : '#f8f9fa',
                color: batType === option.value ? '#fff' : '#495057',
                border: batType === option.value ? '2px solid #fd7e14' : '1px solid #dee2e6',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: batType === option.value ? 600 : 400,
                fontSize: 13,
                transition: 'all 0.2s ease',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* 打球方向選択（必要な場合のみ表示） */}
    {needsPosition && (
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          marginBottom: 8,
          fontWeight: 600,
          fontSize: 14,
          color: '#495057',
        }}>
          打球方向（誰が処理したか） <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {positionOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPosition(option.value)}
              style={{
                padding: '10px 12px',
                background: position === option.value ? '#27ae60' : '#f8f9fa',
                color: position === option.value ? '#fff' : '#495057',
                border: position === option.value ? '2px solid #27ae60' : '1px solid #dee2e6',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: position === option.value ? 600 : 400,
                fontSize: 13,
                transition: 'all 0.2s ease',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )}
    {/* 外野方向選択（ホームラン・スリーベース・ランニングホームランの場合のみ表示） */}
    {needsOutfieldDirection && (
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          marginBottom: 8,
          fontWeight: 600,
          fontSize: 14,
          color: '#495057',
        }}>
          打球方向（外野） <span style={{ color: '#e74c3c' }}>*</span>
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}>
          {outfieldDirectionOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setOutfieldDirection(option.value)}
              style={{
                padding: '10px 12px',
                background: outfieldDirection === option.value ? '#1c7ed6' : '#f8f9fa',
                color: outfieldDirection === option.value ? '#fff' : '#495057',
                border: outfieldDirection === option.value ? '2px solid #1c7ed6' : '1px solid #dee2e6',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: outfieldDirection === option.value ? 600 : 400,
                fontSize: 13,
                transition: 'all 0.2s ease',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    )}
    {/* アクションボタン */}
    <div style={{
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginTop: 24,
    }}>
      <button
        type="button"
        onClick={() => onCancel && onCancel()}
        style={{
          padding: '10px 24px',
          background: '#e74c3c',
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
      <button
        type="button"
        onClick={onSubmit}
        disabled={!isFormValid}
        style={{
          padding: '10px 24px',
          background: isFormValid ? '#27ae60' : '#ccc',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: isFormValid ? 'pointer' : 'not-allowed',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        確定
      </button>
    </div>
  </div>
);

export default PlayResultForm;
