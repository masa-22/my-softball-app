import React, { useState } from 'react';

interface GroundoutOutsDialogProps {
  initialOuts: number;
  onConfirm: (outsAfter: number) => void;
  onCancel: () => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 420,
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600 as const,
    marginBottom: 12,
    color: '#212529',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    color: '#495057',
    textAlign: 'center' as const,
  },
  options: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
    marginBottom: 20,
  },
  optionButton: (selected: boolean, disabled: boolean) => ({
    padding: '10px 16px',
    borderRadius: 6,
    border: `2px solid ${selected ? '#4c6ef5' : '#dee2e6'}`,
    background: disabled ? '#f1f3f5' : selected ? '#4c6ef5' : '#fff',
    color: disabled ? '#adb5bd' : selected ? '#fff' : '#495057',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: selected ? 600 : 500,
    minWidth: 70,
    textAlign: 'center' as const,
  }),
  buttons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  button: (variant: 'cancel' | 'confirm', disabled?: boolean) => ({
    padding: '10px 20px',
    borderRadius: 6,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background:
      variant === 'cancel'
        ? '#adb5bd'
        : disabled
          ? '#adb5bd'
          : '#27ae60',
    color: '#fff',
    fontWeight: 600 as const,
    minWidth: 100,
    opacity: disabled ? 0.7 : 1,
  }),
};

const GroundoutOutsDialog: React.FC<GroundoutOutsDialogProps> = ({
  initialOuts,
  onConfirm,
  onCancel,
}) => {
  const validOptions = [0, 1, 2, 3];
  const defaultSelection = Math.min(3, Math.max(initialOuts + 1, initialOuts));
  const [selected, setSelected] = useState<number>(defaultSelection);

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.title}>アウト数を確認</div>
        <div style={styles.subtitle}>
          打撃前: {initialOuts}アウト / 打撃後のアウト数を選択してください
        </div>
        <div style={styles.options}>
          {validOptions.map((count) => {
            const disabled = count < initialOuts;
            return (
              <button
                key={count}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setSelected(count)}
                style={styles.optionButton(selected === count, disabled)}
              >
                {count}アウト
              </button>
            );
          })}
        </div>
        <div style={styles.buttons}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.button('cancel')}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected < initialOuts}
            style={styles.button('confirm', selected < initialOuts)}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroundoutOutsDialog;

