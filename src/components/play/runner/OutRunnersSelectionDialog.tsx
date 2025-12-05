import React, { useState, useEffect } from 'react';
import { BaseType } from '../../../types/AtBat';

type CandidateRunner = {
  id: string;
  name: string;
  label: string;
  fromBase: '1' | '2' | '3' | 'home';
};

interface OutRunnersSelectionDialogProps {
  outsNeeded: number;
  candidates: CandidateRunner[];
  baseOptions: Array<{ value: BaseType; label: string }>;
  positionOptions: Array<{ value: string; label: string }>;
  presetSelections?: Array<{
    runnerId: string;
    fromBase: '1' | '2' | '3' | 'home';
    outAtBase: BaseType;
    threwPosition?: string;
    caughtPosition?: string;
  }>;
  battingResultLabel?: string;
  onConfirm: (
    selections: Array<{
      runnerId: string;
      fromBase: '1' | '2' | '3' | 'home';
      outAtBase: BaseType;
      threwPosition: string;
      caughtPosition: string;
    }>,
  ) => void;
  onCancel: () => void;
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  dialog: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '92%',
    maxWidth: 520,
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600 as const,
    marginBottom: 8,
    color: '#212529',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    color: '#495057',
    textAlign: 'center' as const,
  },
  selectionCard: {
    border: '1px solid #dee2e6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    background: '#f8f9fa',
  },
  label: {
    fontSize: 13,
    fontWeight: 600 as const,
    marginBottom: 6,
    color: '#495057',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #ced4da',
    fontSize: 13,
    marginBottom: 8,
  },
  buttons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginTop: 12,
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
          : '#e8590c',
    color: '#fff',
    fontWeight: 600 as const,
    minWidth: 110,
    opacity: disabled ? 0.7 : 1,
  }),
};

const OutRunnersSelectionDialog: React.FC<OutRunnersSelectionDialogProps> = ({
  outsNeeded,
  candidates,
  baseOptions,
  positionOptions,
  presetSelections = [],
  battingResultLabel,
  onConfirm,
  onCancel,
}) => {
  const buildInitialRows = () => {
    return Array.from({ length: outsNeeded }, (_, i) => {
      if (i < presetSelections.length) {
        const sel = presetSelections[i];
        return {
          runnerId: sel.runnerId,
          outAtBase: sel.outAtBase,
          threwPosition: sel.threwPosition || '',
          caughtPosition: sel.caughtPosition || '',
        };
      }
      return {
        runnerId: '',
        outAtBase: '1' as BaseType,
        threwPosition: '',
        caughtPosition: '',
      };
    });
  };

  const [rows, setRows] = useState<
    Array<{ runnerId: string; outAtBase: BaseType; threwPosition: string; caughtPosition: string }>
  >(buildInitialRows());

  useEffect(() => {
    setRows(buildInitialRows());
  }, [outsNeeded, presetSelections]);

  const usedIds = rows.map((row) => row.runnerId).filter(Boolean);

  const handleRunnerChange = (index: number, runnerId: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], runnerId };
      return next;
    });
  };

  const handleBaseChange = (index: number, base: BaseType) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], outAtBase: base };
      return next;
    });
  };

  const handleDetailChange = (index: number, field: 'threwPosition' | 'caughtPosition', value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const isValid = rows.every((row) => row.runnerId && row.outAtBase && row.caughtPosition);

  const handleConfirm = () => {
    if (!isValid) return;
    const mapped = rows.map((row) => {
      const candidate = candidates.find((c) => c.id === row.runnerId);
      return {
        runnerId: row.runnerId,
        fromBase: candidate?.fromBase ?? 'home',
        outAtBase: row.outAtBase,
        threwPosition: row.threwPosition || '',
        caughtPosition: row.caughtPosition,
      };
    });
    onConfirm(mapped);
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.title}>アウトの詳細を入力</div>
        <div style={styles.subtitle}>
          <div>打撃結果: {battingResultLabel || '-'} / 増加したアウト数: {outsNeeded}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: '#868e96' }}>
            アウトになった走者と、守備に関わった野手を選択してください。<br />
            捕球した野手がそのままベースを踏んだ場合など、送球がない場合は「送球した守備位置」を「なし」にしてください。
          </div>
        </div>
        {rows.map((row, idx) => {
          const unavailableIds = rows
            .filter((_, i) => i !== idx)
            .map((r) => r.runnerId)
            .filter(Boolean);
          return (
            <div key={idx} style={styles.selectionCard}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>アウト {idx + 1}</div>
              <div style={styles.label}>走者 *</div>
              <select
                value={row.runnerId}
                onChange={(e) => handleRunnerChange(idx, e.target.value)}
                style={styles.select}
              >
                <option value="">選択してください</option>
                {candidates.map((runner) => (
                  <option
                    key={`${runner.id}-${runner.label}`}
                    value={runner.id}
                    disabled={unavailableIds.includes(runner.id)}
                  >
                    {runner.label}: {runner.name}
                  </option>
                ))}
              </select>
              <div style={styles.label}>アウトになった塁 *</div>
              <select
                value={row.outAtBase}
                onChange={(e) => handleBaseChange(idx, e.target.value as BaseType)}
                style={styles.select}
              >
                {baseOptions.map((base) => (
                  <option key={base.value} value={base.value}>
                    {base.label}
                  </option>
                ))}
              </select>
              <div style={styles.label}>送球した守備位置（補殺）</div>
              <select
                value={row.threwPosition}
                onChange={(e) => handleDetailChange(idx, 'threwPosition', e.target.value)}
                style={styles.select}
              >
                <option value="">なし（刺殺のみ）</option>
                {positionOptions.map((pos) => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
              <div style={styles.label}>捕球・刺殺した守備位置 *</div>
              <select
                value={row.caughtPosition}
                onChange={(e) => handleDetailChange(idx, 'caughtPosition', e.target.value)}
                style={styles.select}
              >
                <option value="">選択してください</option>
                {positionOptions.map((pos) => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        <div style={styles.buttons}>
          <button type="button" onClick={onCancel} style={styles.button('cancel')}>
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid}
            style={styles.button('confirm', !isValid)}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutRunnersSelectionDialog;

