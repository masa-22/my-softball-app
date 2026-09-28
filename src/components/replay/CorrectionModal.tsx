import React, { useState } from 'react';
import { AtBat } from '../../types/AtBat';
import { BATTING_RESULTS } from '../../data/softball/battingResults';
import { Player } from '../../types/Player';
import { simulatePlay } from '../../utils/gameSimulation';

interface CorrectionModalProps {
  atBat: AtBat;
  players: Player[];
  onSave: (updatedAtBat: AtBat) => void;
  onCancel: () => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '16px',
  },
  textarea: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '16px',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4c6ef5',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    color: '#333',
  },
};

const CorrectionModal: React.FC<CorrectionModalProps> = ({
  atBat,
  players,
  onSave,
  onCancel,
}) => {
  const [resultType, setResultType] = useState(atBat.result?.type || '');
  const [batterId, setBatterId] = useState(atBat.batterId);
  const [otherNote, setOtherNote] = useState(atBat.note || '');
  const [countsAsAtBat, setCountsAsAtBat] = useState<boolean | null>(
    typeof atBat.result?.countsAsAtBat === 'boolean' ? atBat.result.countsAsAtBat : null
  );

  const isOther = resultType === 'other';
  const canSave =
    !!resultType &&
    (!isOther || (!!otherNote.trim() && countsAsAtBat !== null));

  const handleSave = () => {
    if (!canSave) return;

    // Clone and update
    const updated = { ...atBat };
    
    // Update basic info
    updated.batterId = batterId;
    
    // Update result
    if (!updated.result) updated.result = { type: resultType as any };
    else updated.result.type = resultType as any;

    if (isOther) {
      updated.note = otherNote.trim();
      if (updated.result) {
        updated.result.countsAsAtBat = countsAsAtBat === true;
      }
    } else {
      delete updated.note;
      if (updated.result && 'countsAsAtBat' in updated.result) {
        delete updated.result.countsAsAtBat;
      }
    }
    
    // Recalculate situationAfter based on new result
    // We use the *original* situationBefore as the starting point for this play
    const simResult = simulatePlay(updated.situationBefore, resultType, batterId);
    
    updated.situationAfter = simResult.snapshot;
    updated.scoredRunners = simResult.scoredRunners.map((runnerId) => ({ runnerId, isRBI: true }));
    if (updated.result) {
        updated.result.rbi = updated.scoredRunners.filter((e) => e.isRBI).length;
    }

    onSave(updated);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>プレイ修正</h3>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>打者</label>
          <select 
            style={styles.select}
            value={batterId}
            onChange={(e) => setBatterId(e.target.value)}
          >
            {players.map(p => (
              <option key={p.playerId} value={p.playerId}>
                {p.familyName} {p.givenName} (#{p.number})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>打撃結果</label>
          <select 
            style={styles.select}
            value={resultType}
            onChange={(e) => {
              const next = e.target.value;
              setResultType(next);
              if (next !== 'other') {
                setOtherNote('');
                setCountsAsAtBat(null);
              }
            }}
          >
            <option value="">選択してください</option>
            {Object.values(BATTING_RESULTS).map(res => (
              <option key={res.code} value={res.code}>
                {res.name}
              </option>
            ))}
          </select>
        </div>

        {isOther && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>内容（何が起きたか）</label>
              <textarea
                style={styles.textarea}
                rows={3}
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
                placeholder="例: 打撃妨害、守備妨害 など"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>打数に含めるか</label>
              <select
                style={styles.select}
                value={countsAsAtBat === null ? '' : countsAsAtBat ? 'yes' : 'no'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'yes') setCountsAsAtBat(true);
                  else if (v === 'no') setCountsAsAtBat(false);
                  else setCountsAsAtBat(null);
                }}
              >
                <option value="">選択してください</option>
                <option value="yes">打数に含める</option>
                <option value="no">打数に含めない</option>
              </select>
            </div>
          </>
        )}
        
        <div style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
          ※修正を行うと、これ以降のプレイの状況（ランナー、アウトカウントなど）が自動的に再計算されます。
          手動で入力した詳細なランナーの動きは上書きされる可能性があります。
        </div>

        <div style={styles.buttons}>
          <button 
            style={{...styles.button, ...styles.cancelButton}} 
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button 
            style={{
              ...styles.button,
              ...styles.saveButton,
              opacity: canSave ? 1 : 0.5,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }} 
            onClick={handleSave}
            disabled={!canSave}
          >
            保存して再計算
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorrectionModal;
