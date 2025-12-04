import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournaments } from '../../services/tournamentService';
import { getTeams } from '../../services/teamService';
import { getGames } from '../../services/gameService';
import { getLineup } from '../../services/lineupService';

const MatchSearch: React.FC = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState('');
  const [date, setDate] = useState('');
  const [teamName, setTeamName] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTournaments(getTournaments());
    setTeams(getTeams());
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e && e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const allGames = getGames();
      const teamNameQ = (teamName || '').trim().toLowerCase();
      const filtered = allGames.filter(g => {
        const okTournament = tournamentId ? String(g.tournament.id) === String(tournamentId) : true;
        const okDate = date ? g.date === date : true;
        let okTeam = true;
        if (teamNameQ) {
          const homeStr = (g.topTeam.name || '').toLowerCase();
          const awayStr = (g.bottomTeam.name || '').toLowerCase();
          okTeam = homeStr.includes(teamNameQ) || awayStr.includes(teamNameQ);
        }
        return okTournament && okDate && okTeam;
      }).sort((a,b) => a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId));
      setResults(filtered);
      if (filtered.length === 0) setError('検索結果が見つかりませんでした。');
    } catch (err) {
      console.error(err);
      setError('検索に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTournamentId('');
    setDate('');
    setTeamName('');
    setResults([]);
    setError('');
  };

  const findTournament = (id: string) => tournaments.find(t => String(t.id) === String(id));
  const findTeam = (id: string | number) => teams.find(t => String(t.id) === String(id));

  const handleMatchClick = (gameId: string) => {
    const lineup = getLineup(gameId);
    const isHomeComplete = lineup.home.every(e => e.position && e.playerId);
    const isAwayComplete = lineup.away.every(e => e.position && e.playerId);
    if (isHomeComplete && isAwayComplete) {
      navigate(`/game/${gameId}/play`);
    } else {
      navigate(`/game/${gameId}/lineup`);
    }
  };

  return (
    <div>
      <h2>試合検索</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <select value={tournamentId} onChange={(e)=>setTournamentId(e.target.value)} style={{ flex: '1 1 200px', padding: 8, boxSizing: 'border-box' }}>
              <option value="">大会を選択</option>
              {tournaments.map(t => <option key={t.id} value={t.id}>{t.year} {t.name}</option>)}
            </select>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ flex: '1 1 140px', padding:8, boxSizing: 'border-box' }} />
            <input placeholder="チーム名（部分一致）" value={teamName} onChange={(e)=>setTeamName(e.target.value)} style={{ flex:'1 1 200px', padding:8, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button type="submit" style={{ flex: 1, padding:'8px 16px', background:'#3498db', color:'#fff', border:'none', borderRadius: 4 }}>検索</button>
          <button type="button" onClick={handleReset} style={{ flex: 1, padding:'8px 16px', border:'1px solid #ccc', borderRadius: 4 }}>リセット</button>
        </div>
      </form>

      {error && <p style={{ color:'red' }}>{error}</p>}

      <div>
        {results.map((g: any) => {
          const tour = findTournament(g.tournament.id);
          const home = findTeam(g.topTeam.id);
          const away = findTeam(g.bottomTeam.id);
          return (
            <div
              key={g.gameId}
              onClick={() => handleMatchClick(g.gameId)}
              style={{
                padding:12,
                border:'1px solid #ddd',
                borderRadius:4,
                marginBottom:10,
                background:'#fff',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <h3 style={{ margin:0 }}>
                {tour ? `${tour.year} ${tour.name}` : g.tournament.name}
                <small style={{ color:'#666' }}>[{g.gameId}]</small>
              </h3>
              <p style={{ margin:4 }}>
                <strong>開催日:</strong> {g.date} /
                <strong> 先攻:</strong> {home ? home.teamName : g.topTeam.name} /
                <strong> 後攻:</strong> {away ? away.teamName : g.bottomTeam.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchSearch;
