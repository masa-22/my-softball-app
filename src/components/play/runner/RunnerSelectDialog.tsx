import React from 'react';

type BaseKey = '1' | '2' | '3' | 'home';

interface RunnerSelectDialogProps {
  selectedTargetBase: BaseKey | null;
  candidates: Array<{ id: string; name: string; fromBase: '1' | '2' | '3' }>;
  selectedRunnerId: string | null;
  setSelectedRunnerId: (id: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const styles = {
  confirmDialog: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    padding: 24,
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    zIndex: 1000,
    minWidth: 400,
  },
  confirmOverlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: 600 as const,
    marginBottom: 16,
    color: '#212529',
  },
  confirmList: {
    marginBottom: 16,
    padding: 12,
    background: '#f8f9fa',
    borderRadius: 8,
  },
  button: (variant: 'cancel' | 'complete') => ({
    padding: '8px 20px',
    background: variant === 'cancel' ? '#e74c3c' : '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600 as const,
    fontSize: 14,
  }),
  candidate: (selected: boolean) => ({
    padding: '12px',
    marginBottom: 8,
    background: selected ? '#4c6ef5' : '#f8f9fa',
    color: selected ? '#fff' : '#212529',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: selected ? 600 : 400,
  }),
  confirmButtons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
};

const RunnerSelectDialog: React.FC<RunnerSelectDialogProps> = ({
  selectedTargetBase,
  candidates,
  selectedRunnerId,
  setSelectedRunnerId,
  onCancel,
  onConfirm,
}) => {
  const title =
    selectedTargetBase === 'home'
      ? 'ホームに進むランナーを選択'
      : `${selectedTargetBase === '1' ? '一' : selectedTargetBase === '2' ? '二' : '三'}塁に進むランナーを選択`;

  return (
    <>
      <div style={styles.confirmOverlay} onClick={onCancel} />
      <div style={styles.confirmDialog}>
        <div style={styles.confirmTitle}>{title}</div>
        <div style={styles.confirmList}>
          {candidates.map((runner) => (
            <div
              key={runner.id}
              style={styles.candidate(selectedRunnerId === runner.id)}
              onClick={() => setSelectedRunnerId(runner.id)}
            >
              {runner.name}
            </div>
          ))}
        </div>
        <div style={styles.confirmButtons}>
          <button type="button" onClick={onCancel} style={styles.button('cancel')}>
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!selectedRunnerId}
            style={{
              ...styles.button('complete'),
              opacity: selectedRunnerId ? 1 : 0.5,
              cursor: selectedRunnerId ? 'pointer' : 'not-allowed',
            }}
          >
            確定
          </button>
        </div>
      </div>
    </>
  );
};

export default RunnerSelectDialog;
