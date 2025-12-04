/**
 * 投球結果選択パネル
 * スイング・見逃し・ボール・インプレイ・デッドボール・ファウルを選択
 */
import React from 'react';
import { PitchType } from '../common/PitchTypeSelector';

interface PitchResultSelectorProps {
  selectedPitchType: PitchType;
  pitchTypeName: string;
  selectedResult: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul' | '';
  onSelectResult: (result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul') => void;
  onCommit: () => void;
  onCancel: () => void;
}

const styles = {
  overlay: {
    position: 'absolute' as const,
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
  },
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
}) => {
  const results: Array<{ key: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul'; label: string }> = [
    { key: 'swing', label: 'スイング' },
    { key: 'looking', label: '見逃し' },
    { key: 'ball', label: 'ボール' },
    { key: 'deadball', label: 'デッドボール' },
    { key: 'foul', label: 'ファウル' },
    { key: 'inplay', label: 'インプレイ' },
  ];

  return (
    <div style={styles.overlay}>
      <div style={styles.title}>球種: {pitchTypeName}</div>
      <div style={styles.subtitle}>結果を選択</div>
      <div style={styles.buttonContainer}>
        {results.map(r => (
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