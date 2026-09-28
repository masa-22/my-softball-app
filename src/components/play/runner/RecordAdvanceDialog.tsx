/**
 * 打席中の進塁記録ダイアログ
 * 複数走者について進塁先・理由をまとめて入力する
 */
import React, { useMemo, useState } from 'react';
import { PitchData } from '../../../types/PitchData';
import { POSITIONS } from '../../../data/softball/positions';
import type { AdvanceReasonResult, ErrorType, RunnerAdvancement } from './AdvanceReasonDialog';

type FromBase = '1' | '2' | '3';
type ToBase = '1' | '2' | '3' | 'home';
type PitchAdvanceReason = 'steal' | 'wildpitch' | 'passball' | 'illegalpitch' | 'error';

export type RecordAdvanceConfirmPayload = {
  advancements: RunnerAdvancement[];
  results: AdvanceReasonResult[];
};

interface OccupiedRunner {
  runnerId: string;
  runnerName: string;
  fromBase: FromBase;
}

interface RecordAdvanceDialogProps {
  occupiedRunners: OccupiedRunner[];
  onConfirm: (payload: RecordAdvanceConfirmPayload) => void;
  onCancel: () => void;
  pitches?: PitchData[];
  defaultPitchOrder?: number | null;
  /** 守備位置の略称（P, C, 1B...）→ その時点の守備者名 */
  positionPlayerNames?: Record<string, string>;
}

type RowState = {
  toBase: ToBase | '';
  reason: PitchAdvanceReason | '';
  pitchOrder: number | null | undefined;
  errorBy?: string;
  errorType?: ErrorType;
};

const REASON_OPTIONS: Array<{ value: PitchAdvanceReason; label: string }> = [
  { value: 'steal', label: '盗塁' },
  { value: 'wildpitch', label: 'ワイルドピッチ' },
  { value: 'passball', label: 'パスボール' },
  { value: 'illegalpitch', label: 'イリーガルピッチ' },
  { value: 'error', label: 'エラー' },
];

const FIELD_POSITIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((code) => POSITIONS[code]);

const baseLabel = (b: FromBase | ToBase | '') => {
  if (!b) return '';
  if (b === 'home') return 'ホーム';
  if (b === '1') return '一塁';
  if (b === '2') return '二塁';
  return '三塁';
};

const toBaseNum = (b: FromBase | ToBase): number => (b === 'home' ? 4 : Number(b));

const allowedToBases = (from: FromBase): ToBase[] => {
  if (from === '1') return ['2', '3', 'home'];
  if (from === '2') return ['3', 'home'];
  return ['home'];
};

const requiresPitchOrder = (reason?: string) =>
  !!reason && ['steal', 'wildpitch', 'passball'].includes(reason);

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 640,
    width: '92%',
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600 as const,
    marginBottom: 12,
    color: '#212529',
    textAlign: 'center' as const,
  },
  bulkRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    background: '#e7f5ff',
    borderRadius: 8,
  },
  bulkLabel: { fontSize: 13, fontWeight: 600 as const, color: '#1c7ed6', marginRight: 4 },
  section: {
    marginBottom: 16,
    padding: 14,
    background: '#f8f9fa',
    borderRadius: 8,
    border: '1px solid #dee2e6',
  },
  header: { fontSize: 14, fontWeight: 600 as const, marginBottom: 10, color: '#495057' },
  label: { fontSize: 13, fontWeight: 600 as const, marginBottom: 6, color: '#495057' },
  options: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 10 },
  chip: (selected: boolean) => ({
    padding: '8px 14px',
    background: selected ? '#4c6ef5' : '#fff',
    color: selected ? '#fff' : '#495057',
    border: `2px solid ${selected ? '#4c6ef5' : '#dee2e6'}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: selected ? 600 : 400,
  }),
  select: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ced4da',
    fontSize: 13,
    color: '#495057',
    width: '100%',
    maxWidth: 220,
    cursor: 'pointer',
  },
  detail: {
    marginTop: 8,
    padding: 12,
    background: '#e9ecef',
    borderRadius: 8,
    border: '1px solid #dee2e6',
  },
  buttons: { display: 'flex', gap: 12, justifyContent: 'center' as const, marginTop: 20 },
  button: (variant: 'cancel' | 'confirm') => ({
    padding: '10px 24px',
    background: variant === 'cancel' ? '#6c757d' : '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600 as const,
    fontSize: 14,
  }),
  hint: { fontSize: 12, color: '#868e96', marginBottom: 12, textAlign: 'center' as const },
};

const RecordAdvanceDialog: React.FC<RecordAdvanceDialogProps> = ({
  occupiedRunners,
  onConfirm,
  onCancel,
  pitches = [],
  defaultPitchOrder = null,
  positionPlayerNames = {},
}) => {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    occupiedRunners.forEach((r) => {
      init[r.runnerId] = { toBase: '', reason: '', pitchOrder: undefined };
    });
    return init;
  });

  const pitchOrderOptions = useMemo(() => {
    const orders = Array.from(new Set(pitches.map((p) => p.order))).filter(
      (order) => typeof order === 'number'
    );
    return orders.sort((a, b) => a - b);
  }, [pitches]);

  const resolveDefaultPitchOrder = (): number | null => {
    if (typeof defaultPitchOrder === 'number') return defaultPitchOrder;
    if (pitchOrderOptions.length === 0) return null;
    return pitchOrderOptions[pitchOrderOptions.length - 1];
  };

  const updateRow = (runnerId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [runnerId]: { ...prev[runnerId], ...patch } }));
  };

  const applyBulkReason = (reason: PitchAdvanceReason) => {
    const needsPitch = requiresPitchOrder(reason);
    const pitchOrder = needsPitch ? resolveDefaultPitchOrder() : null;
    setRows((prev) => {
      const next = { ...prev };
      occupiedRunners.forEach((r) => {
        const row = next[r.runnerId];
        if (!row?.toBase) return;
        next[r.runnerId] = {
          ...row,
          reason,
          pitchOrder: needsPitch ? pitchOrder : null,
        };
      });
      return next;
    });
  };

  const advancing = useMemo(() => {
    return occupiedRunners
      .map((r) => {
        const row = rows[r.runnerId];
        if (!row?.toBase || !row.reason) return null;
        return { runner: r, row: row as RowState & { toBase: ToBase; reason: PitchAdvanceReason } };
      })
      .filter(Boolean) as Array<{
      runner: OccupiedRunner;
      row: RowState & { toBase: ToBase; reason: PitchAdvanceReason };
    }>;
  }, [occupiedRunners, rows]);

  const validationError = useMemo(() => {
    if (advancing.length === 0) return '少なくとも1人の進塁を指定してください';

    for (const { runner, row } of advancing) {
      if (!allowedToBases(runner.fromBase).includes(row.toBase)) {
        return `${runner.runnerName}の進塁先が不正です`;
      }
      if (requiresPitchOrder(row.reason) && row.pitchOrder === undefined) {
        return `${runner.runnerName}の球数を選択してください`;
      }
      if (row.reason === 'error' && (!row.errorBy || !row.errorType)) {
        return `${runner.runnerName}のエラーした守備位置と種類を選択してください`;
      }
    }

    const destCounts = new Map<ToBase, number>();
    advancing.forEach(({ row }) => {
      if (row.toBase === 'home') return;
      destCounts.set(row.toBase, (destCounts.get(row.toBase) || 0) + 1);
    });
    for (const [base, count] of destCounts) {
      if (count > 1) return `${baseLabel(base)}に複数の走者が進もうとしています`;
    }

    // 追い越しチェック: 進塁しない走者が残る塁より先へ、後ろの走者だけが進むのを禁止
    const staying = new Map<FromBase, OccupiedRunner>();
    occupiedRunners.forEach((r) => {
      const row = rows[r.runnerId];
      if (!row?.toBase) staying.set(r.fromBase, r);
    });

    for (const { runner, row } of advancing) {
      const fromNum = toBaseNum(runner.fromBase);
      const toNum = toBaseNum(row.toBase);
      for (const [stayBase, stayRunner] of staying) {
        const stayNum = toBaseNum(stayBase);
        if (stayNum > fromNum && stayNum < toNum) {
          return `${stayRunner.runnerName}（${baseLabel(stayBase)}）を追い越す進塁はできません`;
        }
      }
      // より先の塁にいる走者より遠くへ行く場合、その走者も同じかそれ以上進む必要がある
      for (const other of advancing) {
        if (other.runner.runnerId === runner.runnerId) continue;
        const otherFrom = toBaseNum(other.runner.fromBase);
        const otherTo = toBaseNum(other.row.toBase);
        if (otherFrom > fromNum && otherTo < toNum) {
          return '後ろの走者が前の走者を追い越す進塁はできません';
        }
      }
    }

    return null;
  }, [advancing, occupiedRunners, rows]);

  const handleConfirm = () => {
    if (validationError) {
      alert(validationError);
      return;
    }

    const advancements: RunnerAdvancement[] = advancing.map(({ runner, row }) => ({
      runnerId: runner.runnerId,
      runnerName: runner.runnerName,
      fromBase: runner.fromBase,
      toBase: row.toBase,
    }));

    const results: AdvanceReasonResult[] = advancing.map(({ runner, row }) => {
      const needsPitch = requiresPitchOrder(row.reason);
      const pitchOrder = needsPitch ? (row.pitchOrder ?? null) : null;
      return {
        runnerId: runner.runnerId,
        reason: row.reason,
        pitchOrder,
        eventSource: needsPitch && pitchOrder !== null ? 'pitch' : 'non_pitch',
        ...(row.reason === 'error'
          ? { errorDetail: { errorBy: row.errorBy, errorType: row.errorType } }
          : {}),
      };
    });

    onConfirm({ advancements, results });
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.dialog}>
        <h3 style={styles.title}>進塁を記録</h3>
        <div style={styles.hint}>進塁する走者の到達塁と理由を指定してください（複数可）</div>

        <div style={styles.bulkRow}>
          <span style={styles.bulkLabel}>進塁指定中の全員に理由を一括:</span>
          {REASON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => applyBulkReason(opt.value)}
              style={styles.chip(false)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {occupiedRunners.map((runner) => {
          const row = rows[runner.runnerId] || { toBase: '', reason: '', pitchOrder: undefined };
          const destinations = allowedToBases(runner.fromBase);
          return (
            <div key={runner.runnerId} style={styles.section}>
              <div style={styles.header}>
                {baseLabel(runner.fromBase)} · {runner.runnerName}
              </div>

              <div style={styles.label}>進塁先</div>
              <div style={styles.options}>
                <button
                  type="button"
                  onClick={() => updateRow(runner.runnerId, { toBase: '', reason: '', pitchOrder: undefined })}
                  style={styles.chip(row.toBase === '')}
                >
                  進塁しない
                </button>
                {destinations.map((dest) => (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => updateRow(runner.runnerId, { toBase: dest })}
                    style={styles.chip(row.toBase === dest)}
                  >
                    {baseLabel(dest)}
                  </button>
                ))}
              </div>

              {row.toBase && (
                <>
                  <div style={styles.label}>進塁理由 *</div>
                  <div style={styles.options}>
                    {REASON_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const needsPitch = requiresPitchOrder(opt.value);
                          updateRow(runner.runnerId, {
                            reason: opt.value,
                            pitchOrder: needsPitch ? resolveDefaultPitchOrder() : null,
                          });
                        }}
                        style={styles.chip(row.reason === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {requiresPitchOrder(row.reason) && (
                    <div style={styles.detail}>
                      <div style={styles.label}>発生した球数 *</div>
                      <select
                        value={
                          row.pitchOrder != null
                            ? String(row.pitchOrder)
                            : pitchOrderOptions.length === 0
                              ? 'none'
                              : ''
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          updateRow(runner.runnerId, {
                            pitchOrder: value === 'none' ? null : value ? Number(value) : undefined,
                          });
                        }}
                        style={styles.select}
                      >
                        {pitchOrderOptions.length > 0 && <option value="">選択してください</option>}
                        {pitchOrderOptions.map((order) => (
                          <option key={order} value={order}>
                            {order}球目
                          </option>
                        ))}
                        <option value="none">投球なし</option>
                      </select>
                    </div>
                  )}

                  {row.reason === 'error' && (
                    <div style={styles.detail}>
                      <div style={styles.label}>エラーした守備位置 *</div>
                      <select
                        value={row.errorBy || ''}
                        onChange={(e) => updateRow(runner.runnerId, { errorBy: e.target.value || undefined })}
                        style={{ ...styles.select, marginBottom: 10 }}
                      >
                        <option value="">選択してください</option>
                        {FIELD_POSITIONS.map((pos) => {
                          const name = positionPlayerNames[pos.abbr];
                          return (
                            <option key={pos.abbr} value={pos.abbr}>
                              {name ? `${pos.name}（${name}）` : pos.name}
                            </option>
                          );
                        })}
                      </select>
                      <div style={styles.label}>どういうエラーか *</div>
                      <div style={{ ...styles.options, marginBottom: 0 }}>
                        <button
                          type="button"
                          onClick={() => updateRow(runner.runnerId, { errorType: 'throw' })}
                          style={styles.chip(row.errorType === 'throw')}
                        >
                          送球
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(runner.runnerId, { errorType: 'catch' })}
                          style={styles.chip(row.errorType === 'catch')}
                        >
                          捕球
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
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
            style={{
              ...styles.button('confirm'),
              opacity: validationError ? 0.55 : 1,
            }}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordAdvanceDialog;
