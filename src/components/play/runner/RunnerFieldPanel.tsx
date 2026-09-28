import React from 'react';
import DiamondField from './DiamondField';

interface RunnerFieldPanelProps {
  styles: any;
  runners: { '1': string | null; '2': string | null; '3': string | null };
  offensePlayers: any[];
  onBaseClick: (base: '1' | '2' | '3' | 'home') => void;
  onAddOutClick: () => void;
  onRecordAdvanceClick: () => void;
}

const RunnerFieldPanel: React.FC<RunnerFieldPanelProps> = ({
  styles,
  runners,
  offensePlayers,
  onBaseClick,
  onAddOutClick,
  onRecordAdvanceClick,
}) => {
  const hasRunners = !!(runners['1'] || runners['2'] || runners['3']);

  return (
    <div style={styles.fieldPanel}>
      <div style={{ marginBottom: 0 }}>
        <DiamondField
          runners={runners}
          selectedBase={null}
          onBaseClick={onBaseClick}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRecordAdvanceClick}
          disabled={!hasRunners}
          style={{
            padding: '10px 20px',
            background: hasRunners ? '#4c6ef5' : '#adb5bd',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: hasRunners ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: 14,
            opacity: hasRunners ? 1 : 0.7,
          }}
        >
          進塁を記録
        </button>
        <button
          type="button"
          onClick={onAddOutClick}
          style={{
            padding: '10px 20px',
            background: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          アウトを追加
        </button>
      </div>

      <div style={{ marginTop: 0, paddingLeft: 12, paddingRight: 12 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 12, color: '#495057' }}>現在のランナー</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {(['1', '2', '3'] as const).map(b => {
            const pid = runners[b];
            const player = offensePlayers.find(p => p.playerId === pid);
            const name = player ? `${player.familyName || ''} ${player.givenName || ''}`.trim() : '-';
            return (
              <div
                key={b}
                style={{
                  background: pid ? '#ffe6e6' : '#fff',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: 6,
                  fontSize: 11,
                }}
              >
                <div style={{ color: '#666', marginBottom: 3, fontWeight: 600 }}>
                  {b === '1' ? '一' : b === '2' ? '二' : '三'}塁
                </div>
                <div style={{ fontWeight: 500 }}>{name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RunnerFieldPanel;
