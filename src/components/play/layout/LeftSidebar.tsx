import React from 'react';
import LineupPanel from '../LineupPanel';

interface LeftSidebarProps {
  teamName: string;
  lineup: any[];
  players: any[];
  currentPitcher: any;
  pitcherStats: { inningStr: string; total: number; strikes: number; balls: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  onPositionChange: (idx: number, val: string) => void;
  onPlayerChange: (idx: number, val: string) => void;
  onSave: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  teamName,
  lineup,
  players,
  currentPitcher,
  pitcherStats,
  runners,
  onPositionChange,
  onPlayerChange,
  onSave,
}) => {
  return (
    <div>
      <LineupPanel
        teamName={teamName}
        lineup={lineup}
        players={players}
        currentPitcherId={currentPitcher?.playerId}
        runners={runners}
        onPositionChange={onPositionChange}
        onPlayerChange={onPlayerChange}
        onSave={onSave}
      />
      <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #dee2e6' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#495057', fontSize: 14 }}>現在の投手</div>
        <div style={{ marginBottom: 6, fontSize: 15, fontWeight: 500 }}>
          {currentPitcher ? `${currentPitcher.familyName} ${currentPitcher.givenName}` : '—'}
        </div>
        <div style={{ fontSize: 12, color: '#6c757d' }}>
          {`投球回: ${pitcherStats.inningStr}回 / 球数: ${pitcherStats.total}球`}
        </div>
        <div style={{ fontSize: 12, color: '#6c757d' }}>
          {`S:${pitcherStats.strikes} B:${pitcherStats.balls}`}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
