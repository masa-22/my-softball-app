import React from 'react';
import { AtBat } from '../../types/AtBat';
import ReplayPitchChart from './ReplayPitchChart';
import ReplayRunnerField from './ReplayRunnerField';
import { useReplayCardLogic } from './useReplayCardLogic';

interface ReplayCardProps {
  atBat: AtBat;
  getPlayerName: (id: string) => string;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onEdit?: () => void;
  score?: { top: number; bottom: number };
  topTeamName?: string;
  bottomTeamName?: string;
  compact?: boolean;
}

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '16px',
    maxWidth: '500px', // 幅を広げる
    margin: '0 auto',
    fontFamily: '"Hiragino Kaku Gothic ProN", "Meiryo", sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    paddingBottom: '8px',
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  resultSection: {
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  resultMain: (isHit: boolean) => ({
    fontSize: '24px',
    fontWeight: 'bold',
    color: isHit ? '#e03131' : '#333', // ヒットなら赤
    marginBottom: '4px',
  }),
  resultSub: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  matchupSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '8px',
  },
  pitcherInfo: {
    flex: 1,
  },
  batterInfo: {
    flex: 1,
    textAlign: 'right' as const,
  },
  nameLabel: {
    fontSize: '12px',
    color: '#888',
  },
  playerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  situation: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    margin: '0 12px',
  },
  count: {
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: '4px',
  },
  outs: {
    fontSize: '14px',
    color: '#d6336c',
    fontWeight: 'bold',
  },
  chartSection: {
    marginBottom: '16px',
  },
  chartTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#555',
  },
  chartContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  pitchList: {
    flex: 1,
    fontSize: '12px',
    color: '#444',
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  chartWrapper: {
    flex: 1,
    maxWidth: '220px', // 少し小さく
  },
  pitchItem: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  pitchContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '4px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
  },
  navButton: {
    padding: '10px 20px',
    backgroundColor: '#4c6ef5',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    opacity: 1,
    transition: 'opacity 0.2s',
  },
  navButtonDisabled: {
    padding: '10px 20px',
    backgroundColor: '#ccc',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  editButton: {
    marginTop: '12px',
    width: '100%',
    padding: '8px',
    backgroundColor: '#fff',
    border: '1px solid #fa5252',
    color: '#fa5252',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  }
};

const ReplayCard: React.FC<ReplayCardProps> = ({
  atBat,
  getPlayerName,
  onNext,
  onPrev,
  hasPrev,
  hasNext,
  onEdit,
  score,
  topTeamName,
  bottomTeamName,
  compact,
}) => {
  const cardStyle = compact ? { ...styles.card, padding: 12 } : styles.card;
  const {
    resultName,
    isHit,
    inningStr,
    count: { b, s, o },
    resultDescription,
    runCount,
    getPitchTypeName,
    getPitchResultName,
  } = useReplayCardLogic(atBat);

  return (
    <div style={cardStyle}>
      <div style={styles.header}>
        <span>{inningStr}</span>
        {score && topTeamName && bottomTeamName && (
          <span>
            {topTeamName} {score.top} - {score.bottom} {bottomTeamName}
          </span>
        )}
      </div>

      <div style={styles.resultSection}>
        <div style={styles.resultMain(isHit)}>
          {resultName}
          {runCount > 0 && (
            <span style={{ marginLeft: 6, color: '#d6336c', fontSize: '0.85em' }}>
              +{runCount}点
            </span>
          )}
        </div>
        {resultDescription && (
           <div style={styles.resultSub}>
             {resultDescription}
           </div>
        )}
      </div>

      <div style={styles.matchupSection}>
        <div style={styles.pitcherInfo}>
          <div style={styles.nameLabel}>投手</div>
          <div style={styles.playerName}>{getPlayerName(atBat.pitcherId)}</div>
        </div>

        <div style={styles.situation}>
           <div style={{ width: 100, height: 100, marginBottom: 4 }}>
             <ReplayRunnerField runners={atBat.situationBefore.runners} />
           </div>
           <div style={styles.count}>B{b} S{s}</div>
           <div style={styles.outs}>{o}アウト</div>
        </div>

        <div style={styles.batterInfo}>
          <div style={styles.nameLabel}>打者</div>
          <div style={styles.playerName}>{getPlayerName(atBat.batterId)}</div>
        </div>
      </div>

      <div style={styles.chartSection}>
        <div style={styles.chartTitle}>投球チャート</div>
        <div style={styles.chartContent}>
            <div style={styles.chartWrapper}>
                <ReplayPitchChart compact={compact} pitches={atBat.pitches} />
            </div>
            <div style={styles.pitchList}>
              {atBat.pitches.map((p, i) => (
                <div key={i} style={styles.pitchItem}>
                  <div style={styles.pitchContent}>
                    <span style={{ fontWeight: 'bold', width: '16px', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ flexShrink: 0, minWidth: '80px' }}>{getPitchTypeName(p.type)}</span>
                    <span style={{ color: '#666', flexShrink: 0 }}>{getPitchResultName(p.result)}</span>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* 修正機能は後日実装のため一時的に非表示
      {onEdit && (
        <button style={styles.editButton} onClick={onEdit}>
          修正する
        </button>
      )}
      */}

      <div style={styles.navigation}>
        <button 
          style={hasPrev ? styles.navButton : styles.navButtonDisabled} 
          onClick={onPrev} 
          disabled={!hasPrev}
        >
          &lt; 前の打者
        </button>
        <button 
          style={hasNext ? styles.navButton : styles.navButtonDisabled} 
          onClick={onNext} 
          disabled={!hasNext}
        >
          次の打者 &gt;
        </button>
      </div>
    </div>
  );
};

export default ReplayCard;
