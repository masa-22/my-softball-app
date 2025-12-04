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
  currentBatterId?: string | null;
  matchId?: string;
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
  currentBatterId,
  matchId,
}) => {
  return (
    <div>
      <LineupPanel
        teamName={teamName}
        lineup={lineup}
        players={players}
        currentPitcherId={currentPitcher?.playerId}
        currentBatterId={currentBatterId}
        runners={runners}
        onPositionChange={onPositionChange}
        onPlayerChange={onPlayerChange}
        onSave={onSave}
        matchId={matchId}
      />
      <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #dee2e6' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#495057', fontSize: 14 }}>現在の投手</div>
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 名前（太字） */}
          <span style={{ fontSize: 16, fontWeight: 700 }}>
          {currentPitcher ? `${currentPitcher.familyName} ${currentPitcher.givenName}` : '—'}
          </span>
          {/* 投げ方（細字） */}
          <span style={{ fontSize: 13, fontWeight: 400, color: '#6c757d' }}>
            {currentPitcher ? currentPitcher.throwing : '—'}
          </span>
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
