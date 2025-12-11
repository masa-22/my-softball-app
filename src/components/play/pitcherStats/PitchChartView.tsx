import React, { useMemo } from 'react';
import { PitchData } from '../../../types/PitchData';
import { PitchType } from '../../../types/PitchType';
import StrikeZoneChart from './StrikeZoneChart';
import HeatmapChart from './HeatmapChart';

interface PitchChartViewProps {
  pitches: PitchData[];
}

const PITCH_TYPE_LABELS: Record<PitchType, string> = {
  rise: 'ライズ',
  drop: 'ドロップ',
  cut: 'カット',
  changeup: 'チェンジアップ',
  chenrai: 'チェンライ',
  slider: 'スライダー',
  unknown: '不明',
};

const PITCH_TYPES: PitchType[] = ['rise', 'drop', 'cut', 'changeup', 'chenrai', 'slider', 'unknown'];

// ストライクの結果
const STRIKE_RESULTS: Array<PitchData['result']> = ['swing', 'looking', 'foul', 'inplay'];
// ボールの結果
const BALL_RESULTS: Array<PitchData['result']> = ['ball', 'deadball'];

// 統計情報を計算
const calculateStats = (pitches: PitchData[]) => {
  const total = pitches.length;
  const strikes = pitches.filter((p) => STRIKE_RESULTS.includes(p.result)).length;
  const balls = pitches.filter((p) => BALL_RESULTS.includes(p.result)).length;
  const strikeRate = total > 0 ? (strikes / total) * 100 : 0;

  return {
    total,
    strikes,
    balls,
    strikeRate,
  };
};

// 統計情報を表示するコンポーネント
const StatsDisplay: React.FC<{ pitches: PitchData[] }> = ({ pitches }) => {
  const stats = calculateStats(pitches);

  return (
    <div style={{ marginBottom: 16, fontSize: 13, color: '#6c757d' }}>
      <span>球数: {stats.total}球</span>
      <span style={{ marginLeft: 16 }}>S: {stats.strikes} B: {stats.balls}</span>
      <span style={{ marginLeft: 16 }}>ストライク率: {stats.strikeRate.toFixed(1)}%</span>
    </div>
  );
};

const PitchChartView: React.FC<PitchChartViewProps> = ({ pitches }) => {
  // 球種ごとの投球をフィルタリング
  const pitchesByType = useMemo(() => {
    const result: Record<PitchType, PitchData[]> = {
      rise: [],
      drop: [],
      cut: [],
      changeup: [],
      chenrai: [],
      slider: [],
      unknown: [],
    };

    pitches.forEach((pitch) => {
      if (result[pitch.type]) {
        result[pitch.type].push(pitch);
      }
    });

    return result;
  }, [pitches]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* 1. 全投球チャート（球種アイコンあり） */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#212529' }}>
          全投球における投球チャート（球種アイコン）
        </div>
        <StatsDisplay pitches={pitches} />
        <StrikeZoneChart pitches={pitches} showIcon={true} showNumber={false} />
      </div>

      {/* 2. 全投球チャート（ヒートマップ） */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#212529' }}>
          全投球における投球チャート（コースに来た割合）
        </div>
        <StatsDisplay pitches={pitches} />
        <HeatmapChart pitches={pitches} />
      </div>

      {/* 3. 球種ごとの投球チャート */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#212529' }}>
          その投手の球種ごとにおける投球チャート
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {PITCH_TYPES.map((type) => {
            const typePitches = pitchesByType[type];
            if (typePitches.length === 0) return null;

            return (
              <div key={type}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#495057' }}>
                  {PITCH_TYPE_LABELS[type]}
                </div>
                <StatsDisplay pitches={typePitches} />
                <StrikeZoneChart pitches={typePitches} showIcon={true} showNumber={false} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PitchChartView;

