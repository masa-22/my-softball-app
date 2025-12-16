import React from 'react';
import MiniScoreBoard from '../common/MiniScoreBoard';
import PitchChart from './PitchChart';
import { PitchData } from '../../../types/PitchData';

interface RunnerStatusSidebarProps {
  bso: { b: number; s: number; o: number };
  pitches?: PitchData[];
  canUseTemporaryRunner?: boolean;
  onTempRunnerClick?: () => void;
}

const RunnerStatusSidebar: React.FC<RunnerStatusSidebarProps> = ({ 
  bso, 
  pitches = [],
  canUseTemporaryRunner,
  onTempRunnerClick
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 220 }}>
      <MiniScoreBoard bso={bso} />
      <PitchChart pitches={pitches} />
      {canUseTemporaryRunner && onTempRunnerClick && (
        <button
          type="button"
          onClick={onTempRunnerClick}
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#fd7e14',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          テンポラリーランナー交代
        </button>
      )}
    </div>
  );
};

export default RunnerStatusSidebar;
