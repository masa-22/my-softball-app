import React from 'react';
import StrikeZoneGrid from '../play/pitch/StrikeZoneGrid';
import { PitchRecord } from '../../types/AtBat';
import { PitchData } from '../../types/PitchData';

interface ReplayPitchChartProps {
  pitches: PitchRecord[];
}

const BASE_WIDTH = 260;
const BASE_HEIGHT = 325;

const ReplayPitchChart: React.FC<ReplayPitchChartProps> = ({ pitches }) => {
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
      pitches={displayPitches}
      onClickZone={() => {}} // Read-only
    />
  );
};

export default ReplayPitchChart;
