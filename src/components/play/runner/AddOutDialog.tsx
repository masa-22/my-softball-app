import React from 'react';

interface AddOutDialogProps {
  runners: { '1': string | null; '2': string | null; '3': string | null };
  baseLabel: (b: '1' | '2' | '3' | 'home') => string;
  getRunnerName: (playerId: string | null) => string;
  selected: { runnerId: string; fromBase: '1' | '2' | '3' } | null;
  onSelect: (runnerId: string, fromBase: '1' | '2' | '3') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const AddOutDialog: React.FC<AddOutDialogProps> = ({
  runners,
  baseLabel,
  getRunnerName,
  selected,
  onSelect,
  onConfirm,
  onCancel,
}) => {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
        }}
        onClick={onCancel}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: 12,
          padding: 20,
          zIndex: 1000,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          minWidth: 320,
          maxWidth: 400,
          maxHeight: '80%',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 12, textAlign: 'center', fontSize: 16 }}>
          アウトになった走者を選択
        </div>
        <div style={{ maxHeight: 240, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
          {(['1', '2', '3'] as const).map(base => {
            const runnerId = runners[base];
            if (!runnerId) return null;
            const isSelected = selected?.runnerId === runnerId && selected?.fromBase === base;
            const name = getRunnerName(runnerId);
            return (
              <div
                key={base}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? '#e74c3c' : '#fff',
                  color: isSelected ? '#fff' : '#212529',
                  border: `1px solid ${isSelected ? '#e74c3c' : '#dee2e6'}`,
                  marginBottom: 8,
                  transition: 'all 0.2s ease',
                  fontWeight: isSelected ? 600 : 400,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(runnerId, base);
                }}
              >
                <span>{baseLabel(base)}: {name}</span>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#fff' : '#dee2e6'}`,
                    background: isSelected ? '#fff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#e74c3c',
                    }} />
                  )}
                </div>
              </div>
            );
          })}
          {!runners['1'] && !runners['2'] && !runners['3'] && (
            <div style={{ color: '#999', textAlign: 'center', padding: 16 }}>走者がいません</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            disabled={!selected}
            style={{
              padding: '8px 16px',
              background: '#e74c3c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: selected ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              opacity: selected ? 1 : 0.5,
            }}
          >
            確定
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </>
  );
};

export default AddOutDialog;
