/**
 * ミニスコアボードコンポーネント
 * イニング情報・チームスコア・BSO情報を表示
 */
import React, { useMemo, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
// import { getMatches } from '../../../services/matchService';
import { getTeams } from '../../../services/teamService';
import { getGameState } from '../../../services/gameStateService';
import { getGame } from '../../../services/gameService';

interface MiniScoreBoardProps {
  bso: {
    b: number;
    s: number;
    o: number;
  };
}

const styles = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    padding: '16px',
    borderRadius: 8,
    position: 'relative' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  inningDisplay: (isActive: boolean) => ({
    fontSize: '18px',
    fontWeight: isActive ? 700 : 500,
    marginBottom: '12px',
    color: isActive ? '#4c6ef5' : '#495057',
  }),
  teamScore: (isOffense: boolean) => ({
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    padding: '6px 8px',
    borderRadius: 4,
    backgroundColor: isOffense ? '#e7f5ff' : 'transparent',
    color: isOffense ? '#1c7ed6' : '#212529',
  }),
  bsoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #dee2e6',
  },
  bsoLabel: {
    fontWeight: 600,
    width: '20px',
    fontSize: '13px',
    color: '#495057',
  },
  dot: (color: string, active: boolean) => ({
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: active ? color : '#e9ecef',
    display: 'inline-block',
    marginRight: '2px',
    border: '1px solid ' + (active ? 'rgba(0,0,0,0.2)' : '#dee2e6'),
  }),
};

const MiniScoreBoard: React.FC<MiniScoreBoardProps> = ({ bso }) => {
  const { matchId } = useParams<{ matchId: string }>();
  const game = useMemo(() => (matchId ? getGame(matchId) : null), [matchId]);

  // ▼ gameState をリアルタイム購読
  const [state, setState] = useState<ReturnType<typeof getGameState> | null>(null);
  useEffect(() => {
    if (!matchId) return;
    const update = () => setState(getGameState(matchId));
    update();
    const t = setInterval(update, 500);
    const onStorage = (e: StorageEvent) => { if (e.key === 'game_states') update(); };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(t); window.removeEventListener('storage', onStorage); };
  }, [matchId]);

  const currentInningInfo = useMemo(() => {
    if (!state) return { inning: 1, half: 'top' as 'top' | 'bottom' };
    return { inning: state.current_inning, half: state.top_bottom };
  }, [state]);

  const teamNames = useMemo(() => {
    if (!game) return { home: '先攻', away: '後攻' };
    const teams = getTeams();
    const home = teams.find(t => String(t.id) === String(game.topTeam.id));
    const away = teams.find(t => String(t.id) === String(game.bottomTeam.id));
    return {
      home: home?.teamAbbr || game.topTeam.shortName || game.topTeam.name,
      away: away?.teamAbbr || game.bottomTeam.shortName || game.bottomTeam.name,
    };
  }, [game]);

  const isTopInning = currentInningInfo.half === 'top';
  const counts = state?.counts || bso;

  return (
    <div style={styles.container}>
      {/* イニング表示 */}
      <div style={styles.inningDisplay(true)}>
        {currentInningInfo.inning}回{isTopInning ? '表' : '裏'}
      </div>

      {/* チームスコア */}
      <div style={styles.teamScore(isTopInning)}>
        <span>{teamNames.home}</span>
        <span>{state?.scores.top_total ?? 0}</span>
      </div>
      <div style={styles.teamScore(!isTopInning)}>
        <span>{teamNames.away}</span>
        <span>{state?.scores.bottom_total ?? 0}</span>
      </div>

      {/* BSO（gameStateからリアルタイム取得） */}
      <div style={styles.bsoContainer}>
        <div style={styles.bsoLabel}>B</div>
        <div>
          {[...Array(3)].map((_, i) => (
            <span key={i} style={styles.dot('#27ae60', i < counts.b)} />
          ))}
        </div>
      </div>

      <div style={styles.bsoContainer}>
        <div style={styles.bsoLabel}>S</div>
        <div>
          {[...Array(2)].map((_, i) => (
            <span key={i} style={styles.dot('#facc15', i < counts.s)} />
          ))}
        </div>
      </div>

      <div style={styles.bsoContainer}>
        <div style={styles.bsoLabel}>O</div>
        <div>
          {[...Array(2)].map((_, i) => (
            <span key={i} style={styles.dot('#e74c3c', i < counts.o)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MiniScoreBoard;
