/**
 * 投球結果選択パネル
 * スイング・見逃し・ボール・インプレイ・デッドボール・ファウルを選択
 */
import React from 'react';
import { PitchType } from '../../../types/PitchType';

interface PitchResultSelectorProps {
  selectedPitchType: PitchType;
  pitchTypeName: string;
  selectedResult: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul' | '';
  onSelectResult: (result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul') => void;
  onCommit: () => void;
  onCancel: () => void;
  /** overlay: ゾーン中央オーバーレイ（既定） / inline: 簡易入力用のカード配置 */
  variant?: 'overlay' | 'inline';
  /** true のとき「球種: …」行を出さない（簡易入力） */
  hidePitchType?: boolean;
}

const overlayBox: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  background: '#fff',
  border: '2px solid #333',
  borderRadius: 6,
  padding: 12,
  zIndex: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  minWidth: 220,
};

const inlineBox: React.CSSProperties = {
  position: 'relative',
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: 8,
  padding: 12,
  marginTop: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  minWidth: 220,
};

const styles = {
  title: {
    fontWeight: 'bold' as const,
    marginBottom: 6,
    fontSize: 13,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontWeight: 'bold' as const,
    marginBottom: 6,
    fontSize: 12,
    textAlign: 'center' as const,
  },
  buttonContainer: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  resultButton: (selected: boolean) => ({
    padding: '6px 10px',
    background: selected ? '#3498db' : '#f5f5f5',
    color: selected ? '#fff' : '#333',
    border: '2px solid ' + (selected ? '#3498db' : '#ccc'),
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: selected ? ('bold' as const) : ('normal' as const),
    fontSize: '12px',
  }),
  actionContainer: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    marginTop: 10,
  },
  commitButton: (disabled: boolean) => ({
    padding: '6px 12px',
    background: disabled ? '#ccc' : '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold' as const,
    fontSize: '12px',
  }),
  cancelButton: {
    padding: '6px 12px',
    background: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    fontSize: '12px',
  },
};

const PitchResultSelector: React.FC<PitchResultSelectorProps> = ({
  pitchTypeName,
  selectedResult,
  onSelectResult,
  onCommit,
  onCancel,
  variant = 'overlay',
  hidePitchType = false,
}) => {
  const results: Array<{ key: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul'; label: string }> = [
    { key: 'looking', label: '見逃し' },
    { key: 'swing', label: 'スイング' },
    { key: 'foul', label: 'ファウル' },
    { key: 'ball', label: 'ボール' },
    { key: 'deadball', label: 'デッドボール' },
    { key: 'inplay', label: 'インプレイ' },
  ];

  const boxStyle = variant === 'inline' ? inlineBox : overlayBox;

  return (
    <div style={boxStyle}>
      {!hidePitchType && <div style={styles.title}>球種: {pitchTypeName}</div>}
      <div style={styles.subtitle}>{hidePitchType ? '投球結果' : '結果を選択'}</div>
      <div style={styles.buttonContainer}>
        {results.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onSelectResult(r.key)}
            style={styles.resultButton(selectedResult === r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div style={styles.actionContainer}>
        <button
          type="button"
          onClick={onCommit}
          disabled={!selectedResult}
          style={styles.commitButton(!selectedResult)}
        >
          決定
        </button>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default PitchResultSelector;
