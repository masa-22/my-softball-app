/**
 * 横型スコアボード
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
// import { getMatches } from '../../services/matchService';
import { getTeams } from '../../services/teamService';
import { getGameState } from '../../services/gameStateService';
import { getGame } from '../../services/gameService';

const MAX_INNINGS = 7;

const ScoreBoard: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [homeName, setHomeName] = useState<string>('先攻');
  const [awayName, setAwayName] = useState<string>('後攻');
  const [state, setState] = useState<ReturnType<typeof getGameState> | null>(null);

  useEffect(() => {
    if (!matchId) return;

    // ▼ gamesからチーム名取得
    const g = getGame(matchId);
    if (g) {
      const teams = getTeams();
      const home = teams.find(t => String(t.id) === String(g.topTeam.id));
      const away = teams.find(t => String(t.id) === String(g.bottomTeam.id));
      setHomeName(home ? home.teamName : g.topTeam.name);
      setAwayName(away ? away.teamName : g.bottomTeam.name);
    }

    const update = () => setState(getGameState(matchId));
    update();

    const t = setInterval(update, 500);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'game_states') update();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(t);
      window.removeEventListener('storage', onStorage);
    };
  }, [matchId]);

  if (!state) {
    return (
      <div style={{ padding: 8, background: '#fafafa', border: '1px solid #eee', marginBottom: 12 }}>
        スコアボード（読み込み中）
      </div>
    );
  }

  const current = { inning: state.current_inning, half: state.top_bottom };
  const totals = { home: state.scores.top_total, away: state.scores.bottom_total };

  const inningCols = Array.from({ length: MAX_INNINGS }, (_, i) => i + 1);
  const scoreTopByInning: Record<number, number | '-' | null> = {};
  const scoreBottomByInning: Record<number, number | '-' | null> = {};

  inningCols.forEach(n => {
    const rec = state.scores.innings[String(n)];
    scoreTopByInning[n] = rec ? (rec.top ?? 0) : 0;
    scoreBottomByInning[n] = rec ? (rec.bottom ?? (n === current.inning && current.half === 'bottom' ? null : 0)) : 0;
  });

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 20, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflowX: 'auto'
    }}>
      <table style={{ 
        width: '100%', 
        minWidth: 400,
        borderCollapse: 'collapse', 
        fontSize: 14 
      }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            <th style={{ 
              border: '1px solid #dee2e6', 
              padding: '10px 12px', 
              textAlign: 'left',
              fontWeight: 600,
              color: '#495057',
              minWidth: 100
            }}>
              チーム
            </th>
            {inningCols.map(n => {
              const highlight = n === current.inning;
              return (
                <th
                  key={n}
                  style={{
                    border: '1px solid #dee2e6',
                    padding: '10px 8px',
                    textAlign: 'center',
                    fontWeight: highlight ? 700 : 600,
                    backgroundColor: highlight ? '#fff3cd' : 'transparent',
                    color: highlight ? '#856404' : '#495057',
                    minWidth: 30
                  }}
                >
                  {n}
                </th>
              );
            })}
            <th style={{ 
              border: '1px solid #dee2e6', 
              padding: '10px 12px', 
              textAlign: 'center',
              fontWeight: 700,
              background: '#e7f5ff',
              color: '#1c7ed6',
              minWidth: 40
            }}>
              計
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ 
              border: '1px solid #dee2e6', 
              padding: '10px 12px',
              fontWeight: 600,
              color: '#212529',
            }}>
              {homeName}
            </td>
            {inningCols.map(n => {
              const isCurrentInning = n === current.inning;
              const isAttacking = isCurrentInning && current.half === 'top';
              const score = n > current.inning ? '-' : 
                           (n === current.inning && current.half === 'top') ? scoreTopByInning[n] || 0 :
                           scoreTopByInning[n] || 0;
              
              return (
                <td 
                  key={n} 
                  style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '10px 8px', 
                    textAlign: 'center',
                    fontWeight: isAttacking ? 700 : 400,
                    backgroundColor: isAttacking ? '#d1ecf1' : 'transparent',
                    color: isAttacking ? '#0c5460' : '#212529',
                  }}
                >
                  {score}
                </td>
              );
            })}
            <td style={{ 
              border: '1px solid #dee2e6', 
              padding: '10px 12px', 
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 16,
              color: '#212529',
            }}>
              {totals.home}
            </td>
          </tr>
          <tr>
            <td style={{ 
              border: '1px solid #dee2e6', 
              padding: '10px 12px',
              fontWeight: 600,
              color: '#212529',
            }}>
              {awayName}
            </td>
            {inningCols.map(n => {
              const isCurrentInning = n === current.inning;
              const isAttacking = isCurrentInning && current.half === 'bottom';
              const score = n > current.inning ? '-' : 
                           (n === current.inning && current.half === 'top') ? '-' :
                           scoreBottomByInning[n] || 0;
              
              return (
                <td 
                  key={n} 
                  style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '10px 8px', 
                    textAlign: 'center',
                    fontWeight: isAttacking ? 700 : 400,
                    backgroundColor: isAttacking ? '#d1ecf1' : 'transparent',
                    color: isAttacking ? '#0c5460' : '#212529',
                  }}
                >
                  {score}
                </td>
              );
            })}
            <td style={{ 
              border: '1px solid #dee2e6', 
              padding: '10px 12px', 
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 16,
              color: '#212529',
            }}>
              {totals.away}
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
        現在: {current.inning}回{current.half === 'top' ? '表' : '裏'}
      </div>
    </div>
  );
};

export default ScoreBoard;
