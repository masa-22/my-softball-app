import React from 'react';
import MiniScoreBoard from '../common/MiniScoreBoard';
import PitchChart from './PitchChart';

interface RunnerStatusSidebarProps {
  bso: { b: number; s: number; o: number };
}

const RunnerStatusSidebar: React.FC<RunnerStatusSidebarProps> = ({ bso }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 220 }}>
      <MiniScoreBoard bso={bso} />
      <PitchChart />
    </div>
  );
};

export default RunnerStatusSidebar;
