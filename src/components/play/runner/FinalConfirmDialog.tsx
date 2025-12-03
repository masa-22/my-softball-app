import React from 'react';

interface FinalConfirmDialogProps {
  initialOuts: number;
  outsAfter: number;
  scoredRunners: string[];
  beforeRunners: { '1': string | null; '2': string | null; '3': string | null };
  afterRunners: { '1': string | null; '2': string | null; '3': string | null };
  getPlayerName: (playerId: string | null) => string;
  needOutDetails: boolean;
  outDetails: Array<{ runnerId: string; base: string; threwPosition: string; caughtPosition: string }>;
  positionOptions: Array<{ value: string; label: string }>;
  baseOptions: Array<{ value: string; label: string }>;
  battingResult: string;
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
  confirmButtons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
};

const FinalConfirmDialog: React.FC<FinalConfirmDialogProps> = ({
  initialOuts,
  outsAfter,
  scoredRunners,
  beforeRunners,
  afterRunners,
  getPlayerName,
  needOutDetails,
  outDetails,
  positionOptions,
  baseOptions,
  battingResult,
  onCancel,
  onConfirm,
}) => {
  const baseLabel = (v: string) => baseOptions.find(b => b.value === v)?.label || '';
  const posLabel = (v: string) => positionOptions.find(p => p.value === v)?.label || '';

  return (
    <>
      <div style={styles.confirmOverlay} onClick={onCancel} />
      <div style={styles.confirmDialog}>
        <div style={styles.confirmTitle}>入力内容の確認</div>

        <div style={styles.confirmList}>
          {/* アウトカウント */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #dee2e6' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8 }}>アウトカウント</div>
            <div style={{ fontSize: 14 }}>{initialOuts}アウト → {outsAfter}アウト</div>
          </div>

          {/* 得点 */}
          {scoredRunners.length > 0 && (
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #dee2e6' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1c7ed6', marginBottom: 8 }}>
                得点 ({scoredRunners.length}点)
              </div>
              {scoredRunners.map((playerId, idx) => (
                <div key={idx} style={{ fontSize: 14, marginBottom: 4 }}>• {getPlayerName(playerId)}</div>
              ))}
            </div>
          )}

          {/* ランナー状況 */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #dee2e6' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8 }}>ランナー状況</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>プレー前</div>
                {(['1','2','3'] as const).map(base => (
                  beforeRunners[base] ? (
                    <div key={base} style={{ fontSize: 13, marginBottom: 2 }}>
                      {(base === '1' ? '一' : base === '2' ? '二' : '三')}塁: {getPlayerName(beforeRunners[base])}
                    </div>
                  ) : null
                ))}
                {!beforeRunners['1'] && !beforeRunners['2'] && !beforeRunners['3'] && (
                  <div style={{ fontSize: 13, color: '#6c757d' }}>なし</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>プレー後</div>
                {(['1','2','3'] as const).map(base => (
                  afterRunners[base] ? (
                    <div key={base} style={{ fontSize: 13, marginBottom: 2 }}>
                      {(base === '1' ? '一' : base === '2' ? '二' : '三')}塁: {getPlayerName(afterRunners[base])}
                    </div>
                  ) : null
                ))}
                {!afterRunners['1'] && !afterRunners['2'] && !afterRunners['3'] && (
                  <div style={{ fontSize: 13, color: '#6c757d' }}>なし</div>
                )}
              </div>
            </div>
          </div>

          {/* アウト詳細 */}
          {needOutDetails && outDetails.some(d => d.runnerId) && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#856404', marginBottom: 8 }}>アウト詳細</div>
              {outDetails.filter(d => d.runnerId).map((detail, idx) => {
                const threwPos = detail.threwPosition ? posLabel(detail.threwPosition) : null;
                const caughtPos = posLabel(detail.caughtPosition);
                return (
                  <div key={idx} style={{ fontSize: 13, marginBottom: 8, paddingLeft: 12 }}>
                    • {baseLabel(detail.base)}で
                    {battingResult === 'bunt_out' && threwPos
                      ? `${threwPos}が処理し、${caughtPos}がアウト`
                      : threwPos
                        ? `${threwPos}から${caughtPos}がアウト`
                        : `${caughtPos}がアウト`}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ fontSize: 14, color: '#6c757d', marginTop: 16, marginBottom: 20, textAlign: 'center' }}>
          この内容で登録してもよろしいですか？
        </div>

        <div style={styles.confirmButtons}>
          <button type="button" onClick={onCancel} style={styles.button('cancel')}>戻る</button>
          <button type="button" onClick={onConfirm} style={styles.button('complete')}>登録する</button>
        </div>
      </div>
    </>
  );
};

export default FinalConfirmDialog;
