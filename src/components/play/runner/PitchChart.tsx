import React, { useMemo } from 'react';
import { PitchData } from '../../../types/PitchData';
import { PitchType } from '../../../types/PitchType';

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '12px',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    maxHeight: 220,
  },
  title: {
    fontWeight: 600 as const,
    fontSize: '13px',
    color: '#495057',
  },
  logWrapper: {
    border: '1px solid #e9ecef',
    borderRadius: 6,
    padding: '4px',
    backgroundColor: '#f8f9fa',
    flex: 1,
    overflowY: 'auto' as const,
  },
  logItem: (variant: 'strike' | 'ball' | 'neutral') => ({
    display: 'flex',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    fontSize: 12,
    backgroundColor:
      variant === 'strike'
        ? '#fff3bf'
        : variant === 'ball'
          ? '#d3f9d8'
          : '#e9ecef',
    color: '#212529',
    border: '1px solid #dee2e6',
    alignItems: 'center',
  }),
  orderLabel: {
    fontWeight: 600 as const,
    minWidth: 48,
  },
  empty: {
    fontSize: 12,
    color: '#868e96',
    textAlign: 'center' as const,
    padding: '12px 0',
  },
};

const STRIKE_RESULTS: Array<PitchData['result']> = ['swing', 'looking', 'foul', 'inplay'];
const BALL_RESULTS: Array<PitchData['result']> = ['ball', 'deadball'];

const RESULT_LABELS: Record<PitchData['result'], string> = {
  swing: 'スイング',
  looking: '見逃し',
  foul: 'ファウル',
  ball: 'ボール',
  inplay: 'インプレイ',
  deadball: 'デッドボール',
};

const PITCH_TYPE_LABELS: Record<PitchType, string> = {
  rise: 'ライズ',
  drop: 'ドロップ',
  cut: 'カット',
  changeup: 'チェンジアップ',
  chenrai: 'チェンライ',
  slider: 'スライダー',
  unknown: '不明',
};

interface PitchChartProps {
  pitches?: PitchData[];
}

const PitchChart: React.FC<PitchChartProps> = ({ pitches = [] }) => {
  const sortedPitches = useMemo(() => {
    return [...pitches].sort((a, b) => a.order - b.order);
  }, [pitches]);

  const getVariant = (result: PitchData['result']): 'strike' | 'ball' | 'neutral' => {
    if (STRIKE_RESULTS.includes(result)) return 'strike';
    if (BALL_RESULTS.includes(result)) return 'ball';
    return 'neutral';
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>投球ログ</div>
      <div style={styles.logWrapper}>
        {sortedPitches.length === 0 ? (
          <div style={styles.empty}>まだ入力された投球がありません</div>
        ) : (
          sortedPitches.map((pitch, index) => {
            const displayOrder = Number.isFinite(pitch.order) ? pitch.order : index + 1;
            return (
              <div key={pitch.id} style={styles.logItem(getVariant(pitch.result))}>
                <span style={styles.orderLabel}>{displayOrder}球目</span>
                <span>{RESULT_LABELS[pitch.result] || '不明'}</span>
                <span>{PITCH_TYPE_LABELS[pitch.type] || '不明'}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PitchChart;
