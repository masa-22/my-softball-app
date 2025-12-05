/**
 * 横型スコアボード
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
// import { getMatches } from '../../services/matchService';
import { getTeams } from '../../services/teamService';
import { getGameState } from '../../services/gameStateService';
import { getGame } from '../../services/gameService';
import { getAtBats } from '../../services/atBatService';
import { AtBat } from '../../types/AtBat';

const MAX_INNINGS = 7;

const ScoreBoard: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const [homeName, setHomeName] = useState<string>('先攻');
  const [awayName, setAwayName] = useState<string>('後攻');
  const [state, setState] = useState<ReturnType<typeof getGameState> | null>(null);
  const [atBats, setAtBats] = useState<AtBat[]>([]);

  const inningActivity = useMemo(() => {
    const map: Record<number, { top: boolean; bottom: boolean }> = {};
    atBats.forEach((bat) => {
      const inning = Math.min(MAX_INNINGS, bat.inning ?? 0);
      if (!inning) return;
      const entry = map[inning] || { top: false, bottom: false };
      if (bat.topOrBottom === 'top') {
        entry.top = true;
      } else {
        entry.bottom = true;
      }
      map[inning] = entry;
    });
    return map;
  }, [atBats]);

  const recordedMaxInning = useMemo(() => {
    const maxInning = atBats.reduce((max, bat) => Math.max(max, bat.inning ?? 0), 0);
    return Math.min(MAX_INNINGS, maxInning);
  }, [atBats]);

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

    const update = () => {
      setState(getGameState(matchId));
      setAtBats(getAtBats(matchId));
    };
    update();

    const t = setInterval(update, 500);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'game_states' || e.key === 'softball_app_at_bats') update();
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
  const isFinished = state.status === 'finished';

  const inningCols = Array.from({ length: MAX_INNINGS }, (_, i) => i + 1);
  const getHalfDisplay = (half: 'top' | 'bottom', inning: number): string | number => {
    const rec = state.scores.innings[String(inning)];
    const activity = inningActivity[inning] || { top: false, bottom: false };
    const finishedHyphen =
      isFinished && (recordedMaxInning === 0 || inning > recordedMaxInning);
    if (finishedHyphen) {
      return '-';
    }
    if (!isFinished) {
      if (inning > current.inning) {
        return '-';
      }
      if (half === 'bottom' && inning === current.inning && current.half === 'top') {
        return '-';
      }
    }
    if (half === 'bottom') {
      const showCross =
        isFinished &&
        recordedMaxInning > 0 &&
        inning === recordedMaxInning &&
        activity.top &&
        !activity.bottom;
      if (showCross) {
        return '×';
      }
    }
    const value = half === 'top' ? rec?.top : rec?.bottom;
    if (typeof value === 'number') {
      return value;
    }
    const played = half === 'top' ? activity.top : activity.bottom;
    return played ? 0 : '-';
  };

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
              const score = getHalfDisplay('top', n);
              
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
              const score = getHalfDisplay('bottom', n);
              
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
