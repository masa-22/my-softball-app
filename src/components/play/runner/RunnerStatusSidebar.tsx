import React from 'react';
import MiniScoreBoard from '../common/MiniScoreBoard';
import PitchChart from './PitchChart';
import { PitchData } from '../../../types/PitchData';

interface RunnerStatusSidebarProps {
  bso: { b: number; s: number; o: number };
  pitches?: PitchData[];
}

const RunnerStatusSidebar: React.FC<RunnerStatusSidebarProps> = ({ bso, pitches = [] }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 220 }}>
      <MiniScoreBoard bso={bso} />
      <PitchChart pitches={pitches} />
    </div>
  );
};

export default RunnerStatusSidebar;
