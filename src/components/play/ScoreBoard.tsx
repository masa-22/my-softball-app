/**
 * 横型スコアボード
 * - 先攻（home）、後攻（away）のチーム名を表示
 * - 各イニングの得点を横並びで表示（簡易：得点のみ）
 * - 現在イニングの列を強調表示
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { computeScoreBoard, getPlays, ScoreBoardData } from '../../services/playService';
import { getMatches } from '../../services/matchService';
import { getTeams } from '../../services/teamService';

const MAX_INNINGS = 7;

const ScoreBoard: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [data, setData] = useState<ScoreBoardData | null>(null);
  const [homeName, setHomeName] = useState<string>('先攻');
  const [awayName, setAwayName] = useState<string>('後攻');

  useEffect(() => {
    if (!matchId) return;

    const m = getMatches().find(x => x.id === matchId);
    if (m) {
      const teams = getTeams();
      const home = teams.find(t => String(t.id) === String(m.homeTeamId));
      const away = teams.find(t => String(t.id) === String(m.awayTeamId));
      if (home) setHomeName(home.teamName);
      if (away) setAwayName(away.teamName);
    }

    setData(computeScoreBoard(matchId));
    const t = setInterval(() => setData(computeScoreBoard(matchId)), 1000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'plays') setData(computeScoreBoard(matchId));
    };
    window.addEventListener('storage', onStorage);

    return () => {
      clearInterval(t);
      window.removeEventListener('storage', onStorage);
    };
  }, [matchId]);

  if (!data) {
    return (
      <div style={{ padding: 8, background: '#fafafa', border: '1px solid #eee', marginBottom: 12 }}>
        スコアボード（読み込み中）
      </div>
    );
  }

  const { innings, totals, current } = data;

  const inningCols = Array.from({ length: MAX_INNINGS }, (_, i) => i + 1);
  const scoreTopByInning: Record<number, number> = {};
  const scoreBottomByInning: Record<number, number> = {};
  
  inningCols.forEach(n => {
    const rec = innings.find(x => x.inning === n);
    scoreTopByInning[n] = rec ? rec.top : 0;
    scoreBottomByInning[n] = rec ? rec.bottom : 0;
  });

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 20, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
    }}>
      <table style={{ 
        width: '100%', 
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
