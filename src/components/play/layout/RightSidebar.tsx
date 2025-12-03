import React from 'react';
import LineupPanel from '../LineupPanel';

interface RightSidebarProps {
  teamName: string;
  lineup: any[];
  players: any[];
  currentBatter: any;
  recentBatterResults: Array<{ inning: number; half: 'top' | 'bottom'; result: string }>;
  runners: { '1': string | null; '2': string | null; '3': string | null };
  onPositionChange: (idx: number, val: string) => void;
  onPlayerChange: (idx: number, val: string) => void;
  onSave: () => void;
  currentBattingOrder: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  teamName,
  lineup,
  players,
  currentBatter,
  recentBatterResults,
  runners,
  onPositionChange,
  onPlayerChange,
  onSave,
  currentBattingOrder,
}) => {
  return (
    <div>
      <LineupPanel
        teamName={teamName}
        lineup={lineup}
        players={players}
        currentBatterId={currentBatter?.playerId}
        runners={runners}
        onPositionChange={onPositionChange}
        onPlayerChange={onPlayerChange}
        onSave={onSave}
      />
      <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #dee2e6' }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#495057', fontSize: 14 }}>現在の打者</div>
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          {currentBattingOrder && <span style={{ fontWeight: 700, fontSize: 18, color: '#212529' }}>{currentBattingOrder}</span>}
          <span style={{ fontSize: 15, fontWeight: 500 }}>
            {currentBatter ? `${currentBatter.familyName} ${currentBatter.givenName}` : '—'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#6c757d' }}>
          {recentBatterResults.length > 0 ? (
            <div>
              直近打席:
              <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0 }}>
                {recentBatterResults.map((r, i) => (
                  <li key={i} style={{ fontSize: 11 }}>{`${r.inning}回${r.half === 'top' ? '表' : '裏'}: ${r.result}`}</li>
                ))}
              </ul>
            </div>
          ) : (
            <span>過去打席なし</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
