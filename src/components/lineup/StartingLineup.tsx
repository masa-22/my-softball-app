import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatches } from '../../services/matchService';
import { getTeams } from '../../services/teamService';
import { getPlayers } from '../../services/playerService';
import { getLineup, saveLineup } from '../../services/lineupService';
import Modal from '../common/Modal';

const POSITIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DP'];

const StartingLineup: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<any>(null);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);

  const [homeLineup, setHomeLineup] = useState<any[]>([]);
  const [awayLineup, setAwayLineup] = useState<any[]>([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const matches = getMatches();
    const m = matches.find(x => x.id === matchId);
    if (!m) {
      setError('試合が見つかりません。');
      return;
    }
    setMatch(m);

    const teams = getTeams();
    const home = teams.find(t => String(t.id) === String(m.homeTeamId));
    const away = teams.find(t => String(t.id) === String(m.awayTeamId));
    setHomeTeam(home);
    setAwayTeam(away);

    if (home) setHomePlayers(getPlayers(home.id));
    if (away) setAwayPlayers(getPlayers(away.id));

    const lineup = getLineup(matchId);
    setHomeLineup(lineup.home);
    setAwayLineup(lineup.away);
  }, [matchId]);

  const handlePositionChange = (side: 'home' | 'away', index: number, value: string) => {
    const target = side === 'home' ? homeLineup : awayLineup;
    const updated = [...target];
    updated[index].position = value;
    side === 'home' ? setHomeLineup(updated) : setAwayLineup(updated);
  };

  const handlePlayerChange = (side: 'home' | 'away', index: number, value: string) => {
    const target = side === 'home' ? homeLineup : awayLineup;
    const updated = [...target];
    updated[index].playerId = value;
    side === 'home' ? setHomeLineup(updated) : setAwayLineup(updated);
  };

  const getUsedPositions = (side: 'home' | 'away'): Set<string> => {
    const target = side === 'home' ? homeLineup : awayLineup;
    const used = new Set<string>();
    target.forEach(entry => {
      if (entry.position) used.add(entry.position);
    });
    return used;
  };

  const handleSave = () => {
    setError('');
    setMessage('');
    if (!matchId) return;
    
    // 確認モーダルを開く
    setConfirmOpen(true);
  };

  const confirmSave = () => {
    if (!matchId) return;
    saveLineup(matchId, { home: homeLineup, away: awayLineup });
    setMessage('スタメンを保存しました。');
    setConfirmOpen(false);
  };

  const handleBack = () => {
    navigate('/match');
  };

  if (!match) {
    return <div style={{ padding: 20 }}>{error || '読み込み中...'}</div>;
  }

  const renderLineupTable = (side: 'home' | 'away', lineup: any[], players: any[], usedPositions: Set<string>) => {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>打順</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>守備</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>選手名</th>
          </tr>
        </thead>
        <tbody>
          {lineup.map((entry, idx) => {
            const displayOrder = entry.battingOrder === 10 ? 'P' : entry.battingOrder;
            return (
              <tr key={idx}>
                <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{displayOrder}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  <select
                    value={entry.position}
                    onChange={(e) => handlePositionChange(side, idx, e.target.value)}
                    style={{ width: '100%', padding: 4 }}
                  >
                    <option value="">選択</option>
                    {POSITIONS.map(pos => {
                      const isUsed = usedPositions.has(pos) && pos !== entry.position;
                      return (
                        <option key={pos} value={pos} disabled={isUsed}>
                          {pos}
                        </option>
                      );
                    })}
                  </select>
                </td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  <select
                    value={entry.playerId}
                    onChange={(e) => handlePlayerChange(side, idx, e.target.value)}
                    style={{ width: '100%', padding: 4 }}
                  >
                    <option value="">選択</option>
                    {players.map(p => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.familyName} {p.givenName}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderConfirmationContent = () => {
    const renderTeamConfirm = (side: 'home' | 'away', lineup: any[], players: any[], teamName: string) => {
      return (
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '8px 0', textAlign: 'center' }}>{teamName}</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>打順</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>守備</th>
                <th style={{ border: '1px solid #ccc', padding: 4 }}>選手</th>
              </tr>
            </thead>
            <tbody>
              {lineup.map((entry, idx) => {
                const player = players.find(p => p.playerId === entry.playerId);
                const displayOrder = entry.battingOrder === 10 ? 'P' : entry.battingOrder;
                return (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>{displayOrder}</td>
                    <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>{entry.position || '—'}</td>
                    <td style={{ border: '1px solid #ccc', padding: 4 }}>{player ? `${player.familyName} ${player.givenName}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    };

    return (
      <div style={{ minWidth: '600px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: 16 }}>登録内容の確認</h3>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {renderTeamConfirm('away', awayLineup, awayPlayers, awayTeam ? `${awayTeam.teamName} (後攻)` : '後攻')}
          {renderTeamConfirm('home', homeLineup, homePlayers, homeTeam ? `${homeTeam.teamName} (先攻)` : '先攻')}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => setConfirmOpen(false)} style={{ padding: '8px 12px' }}>キャンセル</button>
          <button onClick={confirmSave} style={{ padding: '8px 12px', background: '#27ae60', color: '#fff', border: 'none' }}>保存する</button>
        </div>
      </div>
    );
  };

  const homeUsed = getUsedPositions('home');
  const awayUsed = getUsedPositions('away');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <h1>スタメン登録</h1>
      <p>
        <strong>試合ID:</strong> {match.id} / <strong>日時:</strong> {match.date} {match.startTime}
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        {/* 後攻チーム（左側） */}
        <div style={{ flex: 1 }}>
          <h2 style={{ textAlign: 'center' }}>
            {awayTeam ? `${awayTeam.teamName} (後攻)` : '後攻チーム'}
          </h2>
          {renderLineupTable('away', awayLineup, awayPlayers, awayUsed)}
        </div>

        {/* 先攻チーム（右側） */}
        <div style={{ flex: 1 }}>
          <h2 style={{ textAlign: 'center' }}>
            {homeTeam ? `${homeTeam.teamName} (先攻)` : '先攻チーム'}
          </h2>
          {renderLineupTable('home', homeLineup, homePlayers, homeUsed)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={handleBack} style={{ padding: '10px 16px', border: '1px solid #ccc' }}>
          試合一覧へ戻る
        </button>
        <button onClick={handleSave} style={{ padding: '10px 16px', background: '#27ae60', color: '#fff', border: 'none' }}>
          スタメンを保存
        </button>
      </div>

      {confirmOpen && (
        <Modal onClose={() => setConfirmOpen(false)}>
          {renderConfirmationContent()}
        </Modal>
      )}
    </div>
  );
};

export default StartingLineup;
