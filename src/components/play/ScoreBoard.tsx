/**
 * 横型スコアボード
 * - 先攻（home）、後攻（away）のチーム名を表示
 * - 各イニングの得点を横並びで表示（簡易：得点のみ）
 * - 現在イニングの列を強調表示
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { computeScoreBoard, ScoreBoardData } from '../../services/playService';
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

  // 表示用に 1..MAX_INNINGS の枠を用意
  const inningCols = Array.from({ length: MAX_INNINGS }, (_, i) => i + 1);
  const scoreTopByInning: Record<number, number> = {};
  const scoreBottomByInning: Record<number, number> = {};
  inningCols.forEach(n => {
    const rec = innings.find(x => x.inning === n);
    scoreTopByInning[n] = rec ? rec.top : 0;
    scoreBottomByInning[n] = rec ? rec.bottom : 0;
  });

  return (
    <div style={{ padding: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 6, marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {/* チーム名列の幅を狭く */}
            <th style={{ border: '1px solid #ccc', padding: 6, background: '#f7f7f7', textAlign: 'left', minWidth: 80 }}>　</th>
            {inningCols.map(n => {
              const highlight = n === current.inning;
              return (
                <th
                  key={n}
                  style={{
                    border: '1px solid #ccc',
                    padding: 6,
                    width: 70, // 各イニングの幅を広げる
                    background: highlight ? '#fffbcc' : '#f7f7f7',
                  }}
                >
                  {n}
                </th>
              );
            })}
            <th style={{ border: '1px solid #ccc', padding: 6, width: 70, background: '#f0f0f0' }}>計</th>
            <th style={{ border: '1px solid #ccc', padding: 6, width: 60, background: '#f0f0f0' }}>安</th>
            <th style={{ border: '1px solid #ccc', padding: 6, width: 60, background: '#f0f0f0' }}>失</th>
          </tr>
        </thead>
        <tbody>
          {/* 先攻（表）＝ home */}
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'left', minWidth: 80 }}>{homeName}</th>
            {inningCols.map(n => (
              <td key={n} style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', width: 70 }}>
                {scoreTopByInning[n] || 0}
              </td>
            ))}
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', fontWeight: 'bold', width: 70 }}>{totals.home}</td>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', width: 60 }}>0</td>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', width: 60 }}>0</td>
          </tr>
          {/* 後攻（裏）＝ away */}
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'left', minWidth: 80 }}>{awayName}</th>
            {inningCols.map(n => (
              <td key={n} style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', width: 70 }}>
                {scoreBottomByInning[n] || 0}
              </td>
            ))}
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', fontWeight: 'bold', width: 70 }}>{totals.away}</td>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', width: 60 }}>0</td>
            <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'center', width: 60 }}>0</td>
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
