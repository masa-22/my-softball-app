import React, { useState } from 'react';

type Candidate = {
  playerId: string;
  name: string;
  position: string;
};

interface TempRunnerDialogProps {
  open: boolean;
  candidates: Candidate[];
  onConfirm: (runnerId: string) => void;
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
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    textAlign: 'center' as const,
    color: '#343a40',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  item: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    cursor: 'pointer',
    backgroundColor: '#fff',
    transition: 'all 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSelected: {
    backgroundColor: '#e7f5ff',
    borderColor: '#339af0',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    color: '#495057',
  },
  confirmButton: {
    backgroundColor: '#339af0',
    color: '#fff',
  },
};

const TempRunnerDialog: React.FC<TempRunnerDialogProps> = ({
  open,
  candidates,
  onConfirm,
  onCancel,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.title}>テンポラリーランナー選択</div>
        
        {candidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#868e96' }}>
            交代可能な選手がいません
          </div>
        ) : (
          <div style={styles.list}>
            {candidates.map((player) => (
              <div
                key={player.playerId}
                style={{
                  ...styles.item,
                  ...(selectedId === player.playerId ? styles.itemSelected : {}),
                }}
                onClick={() => setSelectedId(player.playerId)}
              >
                <div>
                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
                    {player.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#868e96' }}>
                    ({player.position})
                  </span>
                </div>
                {selectedId === player.playerId && (
                  <span style={{ color: '#339af0' }}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={styles.actions}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            style={{ ...styles.button, ...styles.confirmButton }}
            onClick={() => selectedId && onConfirm(selectedId)}
            disabled={!selectedId}
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
};

export default TempRunnerDialog;

