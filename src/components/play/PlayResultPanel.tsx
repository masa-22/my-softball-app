/**
 * 1プレーの結果入力・表示用コンポーネント。
 * - 打撃結果や進塁、アウト、得点などを入力・表示する。
 */
import React, { useState } from 'react';

interface PlayResultPanelProps {
  onComplete?: () => void;
  strikeoutType?: 'swinging' | 'looking' | null;
  onRunnerMovement?: () => void; // 追加: ランナー動き入力画面へのコールバック
}

type BattingResult = 
  | 'single' 
  | 'double' 
  | 'triple' 
  | 'homerun' 
  | 'groundout' 
  | 'flyout' 
  | 'strikeout_swinging' // 追加
  | 'strikeout_looking' // 追加
  | 'droppedthird' // 振り逃げ（三振時のみ表示）
  | '';

type FieldPosition = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '';

const PlayResultPanel: React.FC<PlayResultPanelProps> = ({ onComplete, strikeoutType, onRunnerMovement }) => {
  const [result, setResult] = useState<BattingResult>('');
  const [position, setPosition] = useState<FieldPosition>('');
  const [showConfirm, setShowConfirm] = useState(false); // 追加: 確認画面表示フラグ

  // 三振の場合の初期化
  React.useEffect(() => {
    if (strikeoutType === 'swinging') {
      setResult('strikeout_swinging');
    } else if (strikeoutType === 'looking') {
      setResult('strikeout_looking');
    }
  }, [strikeoutType]);

  const resultOptions: { value: BattingResult; label: string }[] = strikeoutType 
    ? [
        // 三振時は三振と振り逃げのみ表示
        { 
          value: strikeoutType === 'swinging' ? 'strikeout_swinging' : 'strikeout_looking', 
          label: strikeoutType === 'swinging' ? '空振り三振' : '見逃し三振' 
        },
        { value: 'droppedthird', label: '振り逃げ' },
      ]
    : [
        // 通常時（振り逃げは表示しない）
        { value: 'single', label: 'ヒット（シングル）' },
        { value: 'double', label: 'ツーベースヒット' },
        { value: 'triple', label: 'スリーベースヒット' },
        { value: 'homerun', label: 'ホームラン' },
        { value: 'groundout', label: 'ゴロアウト' },
        { value: 'flyout', label: 'フライアウト' },
      ];

  const positionOptions: { value: FieldPosition; label: string }[] = [
    { value: '1', label: '投手（P）' },
    { value: '2', label: '捕手（C）' },
    { value: '3', label: '一塁手（1B）' },
    { value: '4', label: '二塁手（2B）' },
    { value: '5', label: '三塁手（3B）' },
    { value: '6', label: '遊撃手（SS）' },
    { value: '7', label: '左翼手（LF）' },
    { value: '8', label: '中堅手（CF）' },
    { value: '9', label: '右翼手（RF）' },
  ];

  const needsPosition = ['single', 'double', 'triple', 'groundout', 'flyout', 'droppedthird'].includes(result);

  const handleSubmit = () => {
    if (!result) return;
    if (needsPosition && !position) return;

    // 確認画面を表示
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    console.log('プレー結果:', { result, position });
    
    // TODO: playServiceに保存処理を追加
    // savePlay(matchId, { result, position, ... });

    setShowConfirm(false);

    // 三振（振り逃げ以外）の場合はそのまま完了
    const isStrikeout = result === 'strikeout_swinging' || result === 'strikeout_looking';
    
    if (isStrikeout) {
      // 通常の三振の場合はそのまま完了
      if (onComplete) {
        onComplete();
      }
    } else {
      // 三振以外（ヒット・アウト・振り逃げ）はランナー動き入力画面へ
      if (onRunnerMovement) {
        onRunnerMovement();
      }
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  const getResultLabel = () => {
    const option = resultOptions.find(opt => opt.value === result);
    return option ? option.label : '';
  };

  const getPositionLabel = () => {
    if (!position) return '';
    const option = positionOptions.find(opt => opt.value === position);
    return option ? option.label : '';
  };

  const isFormValid = result && (!needsPosition || position);

  // 確認画面表示
  if (showConfirm) {
    return (
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
            <div style={{ fontSize: 16, fontWeight: 600, color: '#212529' }}>{getResultLabel()}</div>
          </div>
          
          {needsPosition && position && (
            <div>
              <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 4 }}>打球方向</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#212529' }}>{getPositionLabel()}</div>
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
            onClick={handleCancelConfirm}
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
            onClick={handleConfirm}
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
  }

  return (
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
                setResult(option.value);
                if (!['single', 'double', 'triple', 'groundout', 'flyout', 'droppedthird'].includes(option.value)) {
                  setPosition('');
                }
              }}
              style={{
                padding: '12px 16px',
                background: result === option.value ? '#4c6ef5' : '#f8f9fa',
                color: result === option.value ? '#fff' : '#495057',
                border: result === option.value ? '2px solid #4c6ef5' : '1px solid #dee2e6',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: result === option.value ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.2s ease',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* アクションボタン */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        justifyContent: 'center',
        marginTop: 24,
      }}>
        <button
          type="button"
          onClick={() => onComplete && onComplete()}
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
          onClick={handleSubmit}
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
};

export default PlayResultPanel;
