import React from 'react';
import StrikeZoneGrid from '../play/pitch/StrikeZoneGrid';
import { PitchRecord } from '../../types/AtBat';
import { PitchData } from '../../types/PitchData';

interface ReplayPitchChartProps {
  pitches: PitchRecord[];
  compact?: boolean;
}

const BASE_WIDTH = 260;
const BASE_HEIGHT = 325;

const ReplayPitchChart: React.FC<ReplayPitchChartProps> = ({ pitches, compact }) => {
  const displayPitches: PitchData[] = pitches.map((p, index) => ({
    id: index,
    x: (p.x ?? 0) / 100 * BASE_WIDTH,
    y: (p.y ?? 0) / 100 * BASE_HEIGHT,
    type: p.type,
    order: p.seq,
    result: p.result as any,
  }));

  return (
    <StrikeZoneGrid
      compact={compact}
      pitches={displayPitches}
      onClickZone={() => {}} // Read-only
    />
  );
};

export default ReplayPitchChart;
