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
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#212529' }}>
          その投手の全投球における投球チャート（球種アイコン）
        </div>
        <StrikeZoneChart pitches={pitches} showIcon={true} showNumber={false} />
      </div>

      {/* 2. 全投球チャート（ヒートマップ） */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#212529' }}>
          その投手の全投球における投球チャート（コースに来た割合）
        </div>
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
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#495057' }}>
                  {PITCH_TYPE_LABELS[type]}
                </div>
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

