/**
 * ランナーのアウト理由を入力するダイアログコンポーネント
 */
import React, { useState } from 'react';

// アウト理由（1球ごと・打撃後共通）
type OutReason = 'caughtstealing' | 'pickoff' | 'runout' | 'forceout' | 'tagout' | 'leftbase';

export interface RunnerOut {
  runnerId: string;
  runnerName: string;
  fromBase: '1' | '2' | '3' | 'home';
  outAtBase: '1' | '2' | '3' | 'home';
}

export interface OutReasonResult {
  runnerId: string;
  reason: OutReason;
  outDetail?: {
    taggedBy?: string;    // 盗塁死: タッチした守備位置
    putoutBy?: string;    // 牽制死: アウトにした守備位置
    threwBy?: string;     // 走塁死: 送球した守備位置
    caughtBy?: string;    // 走塁死: アウトにした守備位置
    forceoutBy?: string;  // 封殺: アウトにした守備位置
    tagoutBy?: string;    // タッチアウト: アウトにした守備位置
    leftbaseBy?: string;  // 離塁アウト: アウトにした守備位置
  };
}

interface OutReasonDialogProps {
  outs: RunnerOut[];
  context: 'pitch' | 'batting'; // 1球ごと or 打撃後
  onConfirm: (results: OutReasonResult[]) => void;
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
  outSection: {
    marginBottom: 20,
    padding: 16,
    background: '#fff3cd',
    borderRadius: 8,
    border: '1px solid #ffc107',
  },
  outHeader: {
    fontSize: 14,
    fontWeight: 600 as const,
    marginBottom: 12,
    color: '#856404',
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
    background: isSelected ? '#e74c3c' : '#fff',
    color: isSelected ? '#fff' : '#495057',
    border: `2px solid ${isSelected ? '#e74c3c' : '#dee2e6'}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: isSelected ? 600 : 400,
    transition: 'all 0.2s ease',
  }),
  detailGroup: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #dee2e6',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 600 as const,
    marginBottom: 6,
    color: '#6c757d',
  },
  select: {
    width: '100%',
    padding: 8,
    borderRadius: 4,
    border: '1px solid #dee2e6',
    fontSize: 13,
    marginBottom: 8,
  },
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
};

const positionOptions = [
  { value: '1', label: '投手（P）' },
  { value: '2', label: '捕手（C）' },
  { value: '3', label: '一塁手（1B）' },
  { value: '4', label: '二塁手（2B）' },
  { value: '5', label: '三塁手（3B）' },
  { value: '6', label: '遊撃手（SS）' },
  { value: '7', label: '左翼手（LF）' },
  { value: '8', label: '中堅手（CF）' },
  { value: '9', label: '右翼手（RF）' },
];

const OutReasonDialog: React.FC<OutReasonDialogProps> = ({
  outs,
  context,
  onConfirm,
  onCancel,
}) => {
  const [results, setResults] = useState<Record<string, OutReasonResult>>({});

  const pitchOutOptions = [
    { value: 'caughtstealing', label: '盗塁死' },
    { value: 'pickoff', label: '牽制死' },
    { value: 'runout', label: '走塁死' },
    { value: 'leftbase', label: '離塁アウト' },
  ];

  const battingOutOptions = [
    { value: 'forceout', label: '封殺' },
    { value: 'tagout', label: 'タッチアウト' },
    { value: 'runout', label: '走塁死' },
    { value: 'leftbase', label: '離塁アウト' },
  ];

  const handleReasonSelect = (runnerId: string, reason: string) => {
    setResults(prev => ({
      ...prev,
      [runnerId]: {
        runnerId,
        reason: reason as OutReason,
        outDetail: {},
      },
    }));
  };

  const handleOutDetailChange = (runnerId: string, field: string, value: string) => {
    setResults(prev => ({
      ...prev,
      [runnerId]: {
        ...prev[runnerId],
        outDetail: {
          ...prev[runnerId]?.outDetail,
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
    return outs.every(out => {
      const result = results[out.runnerId];
      if (!result) return false;

      // 各アウト理由に応じた詳細情報のチェック
      if (result.reason === 'caughtstealing') {
        return !!result.outDetail?.taggedBy;
      }
      if (result.reason === 'pickoff') {
        return !!result.outDetail?.putoutBy;
      }
      if (result.reason === 'runout') {
        return !!result.outDetail?.caughtBy; // threwByは任意
      }
      if (result.reason === 'forceout') {
        return !!result.outDetail?.forceoutBy;
      }
      if (result.reason === 'tagout') {
        return !!result.outDetail?.tagoutBy;
      }
      if (result.reason === 'leftbase') {
        return !!result.outDetail?.leftbaseBy;
      }

      return false;
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
        <h3 style={styles.title}>アウト理由の入力</h3>

        {outs.map((out) => {
          const currentReason = results[out.runnerId]?.reason;
          const outDetail = results[out.runnerId]?.outDetail;

          return (
            <div key={out.runnerId} style={styles.outSection}>
              <div style={styles.outHeader}>
                {out.runnerName} ({getBaseLabel(out.fromBase)} → {getBaseLabel(out.outAtBase)}でアウト)
              </div>

              <div style={styles.reasonGroup}>
                <div style={styles.reasonLabel}>アウトになった理由 *</div>
                <div style={styles.reasonOptions}>
                  {(context === 'pitch' ? pitchOutOptions : battingOutOptions).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleReasonSelect(out.runnerId, option.value)}
                      style={styles.reasonButton(currentReason === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* アウト詳細入力 */}
              {currentReason && (
                <div style={styles.detailGroup}>
                  {currentReason === 'caughtstealing' && (
                    <div>
                      <div style={styles.detailLabel}>タッチした守備位置 *</div>
                      <select
                        value={outDetail?.taggedBy || ''}
                        onChange={(e) => handleOutDetailChange(out.runnerId, 'taggedBy', e.target.value)}
                        style={styles.select}
                      >
                        <option value="">選択してください</option>
                        {positionOptions.map(pos => (
                          <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentReason === 'pickoff' && (
                    <div>
                      <div style={styles.detailLabel}>アウトにした守備位置 *</div>
                      <select
                        value={outDetail?.putoutBy || ''}
                        onChange={(e) => handleOutDetailChange(out.runnerId, 'putoutBy', e.target.value)}
                        style={styles.select}
                      >
                        <option value="">選択してください</option>
                        {positionOptions.map(pos => (
                          <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentReason === 'runout' && (
                    <>
                      <div>
                        <div style={styles.detailLabel}>送球した守備位置（任意）</div>
                        <select
                          value={outDetail?.threwBy || ''}
                          onChange={(e) => handleOutDetailChange(out.runnerId, 'threwBy', e.target.value)}
                          style={styles.select}
                        >
                          <option value="">なし</option>
                          {positionOptions.map(pos => (
                            <option key={pos.value} value={pos.value}>{pos.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={styles.detailLabel}>アウトにした守備位置 *</div>
                        <select
                          value={outDetail?.caughtBy || ''}
                          onChange={(e) => handleOutDetailChange(out.runnerId, 'caughtBy', e.target.value)}
                          style={styles.select}
                        >
                          <option value="">選択してください</option>
                          {positionOptions.map(pos => (
                            <option key={pos.value} value={pos.value}>{pos.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {currentReason === 'forceout' && (
                    <div>
                      <div style={styles.detailLabel}>封殺した守備位置 *</div>
                      <select
                        value={outDetail?.forceoutBy || ''}
                        onChange={(e) => handleOutDetailChange(out.runnerId, 'forceoutBy', e.target.value)}
                        style={styles.select}
                      >
                        <option value="">選択してください</option>
                        {positionOptions.map(pos => (
                          <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentReason === 'tagout' && (
                    <div>
                      <div style={styles.detailLabel}>タッチアウトにした守備位置 *</div>
                      <select
                        value={outDetail?.tagoutBy || ''}
                        onChange={(e) => handleOutDetailChange(out.runnerId, 'tagoutBy', e.target.value)}
                        style={styles.select}
                      >
                        <option value="">選択してください</option>
                        {positionOptions.map(pos => (
                          <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {currentReason === 'leftbase' && (
                    <div>
                      <div style={styles.detailLabel}>離塁アウトにした守備位置 *</div>
                      <select
                        value={outDetail?.leftbaseBy || ''}
                        onChange={(e) => handleOutDetailChange(out.runnerId, 'leftbaseBy', e.target.value)}
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

export default OutReasonDialog;
