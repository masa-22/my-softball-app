/**
 * ランナーの進塁理由を入力するダイアログコンポーネント
 */
import React, { useMemo, useState } from 'react';
import { PitchData } from '../../../types/PitchData';

// 進塁理由（1球ごと）
type PitchAdvanceReason = 'steal' | 'wildpitch' | 'passball' | 'illegalpitch';

// 進塁理由（打撃後）
type BattingAdvanceReason = 'hit' | 'error' | 'steal' | 'wildpitch' | 'passball';

export interface RunnerAdvancement {
  runnerId: string;
  runnerName: string;
  fromBase: '1' | '2' | '3';
  toBase: '1' | '2' | '3' | 'home';
}

export interface AdvanceReasonResult {
  runnerId: string;
  reason: PitchAdvanceReason | BattingAdvanceReason;
  pitchOrder: number | null;
  eventSource: 'pitch' | 'non_pitch';
  errorDetail?: {
    errorBy?: string; // エラーした守備位置
  };
}

interface AdvanceReasonDialogProps {
  advancements: RunnerAdvancement[];
  context: 'pitch' | 'batting'; // 1球ごと or 打撃後
  onConfirm: (results: AdvanceReasonResult[]) => void;
  onCancel: () => void;
  pitches?: PitchData[];
  defaultPitchOrder?: number | null;
}

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
    maxWidth: 600,
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600 as const,
    marginBottom: 20,
    color: '#212529',
    textAlign: 'center' as const,
  },
  advancementSection: {
    marginBottom: 20,
    padding: 16,
    background: '#f8f9fa',
    borderRadius: 8,
    border: '1px solid #dee2e6',
  },
  advancementHeader: {
    fontSize: 14,
    fontWeight: 600 as const,
    marginBottom: 12,
    color: '#495057',
  },
  reasonGroup: {
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: 600 as const,
    marginBottom: 6,
    color: '#495057',
  },
  reasonOptions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  reasonButton: (isSelected: boolean) => ({
    padding: '8px 16px',
    background: isSelected ? '#4c6ef5' : '#fff',
    color: isSelected ? '#fff' : '#495057',
    border: `2px solid ${isSelected ? '#4c6ef5' : '#dee2e6'}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: isSelected ? 600 : 400,
    transition: 'all 0.2s ease',
  }),
  buttonContainer: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
  },
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
  detailGroup: {
    marginTop: 12,
    padding: 12,
    background: '#e9ecef',
    borderRadius: 8,
    border: '1px solid #dee2e6',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: 600 as const,
    marginBottom: 8,
    color: '#495057',
  },
  select: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ced4da',
    fontSize: 13,
    color: '#495057',
    width: '100%',
    maxWidth: 200,
    cursor: 'pointer',
  },
  pitchOrderGroup: {
    marginTop: 12,
  },
};

const AdvanceReasonDialog: React.FC<AdvanceReasonDialogProps> = ({
  advancements,
  context,
  onConfirm,
  onCancel,
  pitches = [],
  defaultPitchOrder = null,
}) => {
  const [results, setResults] = useState<Record<string, AdvanceReasonResult>>({});

  const pitchOrderOptions = useMemo(() => {
    const orders = Array.from(new Set(pitches.map(p => p.order))).filter((order) => typeof order === 'number');
    return orders.sort((a, b) => a - b);
  }, [pitches]);

  const requiresPitchOrder = (reason?: string) => {
    if (context !== 'pitch') return false;
    if (!reason) return false;
    return ['steal', 'wildpitch', 'passball'].includes(reason);
  };

  const resolveDefaultPitchOrder = () => {
    if (typeof defaultPitchOrder === 'number') return defaultPitchOrder;
    if (pitchOrderOptions.length === 0) return null;
    return pitchOrderOptions[pitchOrderOptions.length - 1];
  };

  const pitchAdvanceOptions = [
    { value: 'steal', label: '盗塁' },
    { value: 'wildpitch', label: 'ワイルドピッチ' },
    { value: 'passball', label: 'パスボール' },
    { value: 'illegalpitch', label: 'イリーガルピッチ' },
  ];

  const battingAdvanceOptions = [
    { value: 'hit', label: 'ヒット' },
    { value: 'error', label: 'エラー' },
    { value: 'steal', label: '盗塁' },
    { value: 'wildpitch', label: 'ワイルドピッチ' },
    { value: 'passball', label: 'パスボール' },
  ];

  const positionOptions = [
    { value: 'P', label: '投手' },
    { value: 'C', label: '捕手' },
    { value: '1B', label: '一塁手' },
    { value: '2B', label: '二塁手' },
    { value: '3B', label: '三塁手' },
    { value: 'SS', label: '遊撃手' },
    { value: 'LF', label: '左翼手' },
    { value: 'CF', label: '中堅手' },
    { value: 'RF', label: '右翼手' },
  ];

  const handleReasonSelect = (runnerId: string, reason: string) => {
    const needsPitchOrder = requiresPitchOrder(reason);
    const resolvedDefault = needsPitchOrder ? resolveDefaultPitchOrder() : null;
    setResults(prev => ({
      ...prev,
      [runnerId]: {
        runnerId,
        reason: reason as any,
        pitchOrder: needsPitchOrder ? resolvedDefault : null,
        eventSource: context === 'pitch' && resolvedDefault !== null ? 'pitch' : 'non_pitch',
        errorDetail: reason === 'error' ? prev[runnerId]?.errorDetail ?? {} : {},
      },
    }));
  };

  const handleErrorDetailChange = (runnerId: string, field: string, value: string) => {
    setResults(prev => ({
      ...prev,
      [runnerId]: {
        ...prev[runnerId],
        errorDetail: {
          ...prev[runnerId]?.errorDetail,
          [field]: value,
        },
      },
    }));
  };

  const getBaseLabel = (base: string) => {
    if (base === 'home') return 'ホーム';
    return base === '1' ? '一塁' : base === '2' ? '二塁' : '三塁';
  };

  const isValid = () => {
    return advancements.every(a => {
      const result = results[a.runnerId];
      if (!result) return false;
      
      // エラーの場合、守備位置が必須
      if (result.reason === 'error') {
        return !!result.errorDetail?.errorBy;
      }

      if (requiresPitchOrder(result.reason)) {
        if (pitchOrderOptions.length > 0 && (result.pitchOrder === null || result.pitchOrder === undefined)) {
          return false;
        }
      }
      
      return true;
    });
  };

  const handleConfirm = () => {
    if (!isValid()) {
      alert('すべての項目を入力してください');
      return;
    }
    onConfirm(Object.values(results));
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.dialog}>
        <h3 style={styles.title}>進塁理由の入力</h3>

        {advancements.map((advancement) => {
          const currentReason = results[advancement.runnerId]?.reason;
          const errorDetail = results[advancement.runnerId]?.errorDetail;

          return (
            <div key={advancement.runnerId} style={styles.advancementSection}>
              <div style={styles.advancementHeader}>
                {advancement.runnerName} ({getBaseLabel(advancement.fromBase)} → {getBaseLabel(advancement.toBase)})
              </div>

              <div style={styles.reasonGroup}>
                <div style={styles.reasonLabel}>進塁理由 *</div>
                <div style={styles.reasonOptions}>
                  {(context === 'pitch' ? pitchAdvanceOptions : battingAdvanceOptions).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleReasonSelect(advancement.runnerId, option.value)}
                      style={styles.reasonButton(currentReason === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {requiresPitchOrder(currentReason) && (
                <div style={{ ...styles.detailGroup, ...styles.pitchOrderGroup }}>
                  <div style={styles.detailLabel}>発生した球数 *</div>
                  <select
                    value={
                      results[advancement.runnerId]?.pitchOrder != null
                        ? String(results[advancement.runnerId]?.pitchOrder)
                        : pitchOrderOptions.length === 0
                          ? 'none'
                          : ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setResults(prev => {
                        const current = prev[advancement.runnerId];
                        if (!current) return prev;
                        return {
                          ...prev,
                          [advancement.runnerId]: {
                            ...current,
                            pitchOrder: value === 'none' ? null : (value ? Number(value) : null),
                            eventSource: context === 'pitch' && value !== 'none' ? 'pitch' : 'non_pitch',
                          },
                        };
                      });
                    }}
                    style={styles.select}
                  >
                    {pitchOrderOptions.length > 0 && <option value="">選択してください</option>}
                    {pitchOrderOptions.map(order => (
                      <option key={order} value={order}>
                        {order}球目
                      </option>
                    ))}
                    <option value="none">投球なし</option>
                  </select>
                  <div style={{ fontSize: 11, color: '#868e96' }}>
                    直前の投球で発生しているか確認してください
                  </div>
                </div>
              )}

              {/* エラー詳細入力 */}
              {currentReason === 'error' && (
                <div style={styles.detailGroup}>
                  <div style={styles.detailLabel}>エラーした守備位置 *</div>
                  <select
                    value={errorDetail?.errorBy || ''}
                    onChange={(e) => handleErrorDetailChange(advancement.runnerId, 'errorBy', e.target.value)}
                    style={styles.select}
                  >
                    <option value="">選択してください</option>
                    {positionOptions.map(pos => (
                      <option key={pos.value} value={pos.value}>{pos.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}

        <div style={styles.buttonContainer}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.button('cancel')}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={styles.button('confirm')}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvanceReasonDialog;
