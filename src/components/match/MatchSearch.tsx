import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournaments } from '../../services/tournamentService';
import { getTeams } from '../../services/teamService';
import { searchMatches } from '../../services/matchService';

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
      const res = await searchMatches({ tournamentId, date, teamName });
      setResults(res);
      if (res.length === 0) setError('検索結果が見つかりませんでした。');
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

  const handleMatchClick = (matchId: string) => {
    navigate(`/match/${matchId}/lineup`);
  };

  return (
    <div>
      <h2>試合検索</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <select value={tournamentId} onChange={(e)=>setTournamentId(e.target.value)} style={{ width: 240, padding: 8 }}>
            <option value="">大会を選択</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.year} {t.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ padding:8 }} />
          <input placeholder="チーム名（部分一致）" value={teamName} onChange={(e)=>setTeamName(e.target.value)} style={{ flex:1, padding:8 }} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button type="submit" style={{ padding:'8px 16px', background:'#3498db', color:'#fff', border:'none' }}>検索</button>
          <button type="button" onClick={handleReset} style={{ padding:'8px 16px', border:'1px solid #ccc' }}>リセット</button>
        </div>
      </form>

      {error && <p style={{ color:'red' }}>{error}</p>}

      <div>
        {results.map(m => {
          const tour = findTournament(m.tournamentId);
          const home = findTeam(m.homeTeamId);
          const away = findTeam(m.awayTeamId);
          return (
            <div 
              key={m.id} 
              onClick={() => handleMatchClick(m.id)}
              style={{ 
                padding:12, 
                border:'1px solid #ddd', 
                borderRadius:4, 
                marginBottom:10, 
                background:'#fff',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <h3 style={{ margin:0 }}>{tour ? `${tour.year} ${tour.name}` : m.tournamentId} <small style={{ color:'#666' }}>[{m.id}]</small></h3>
              <p style={{ margin:4 }}><strong>開催日:</strong> {m.date} <strong>開始:</strong> {m.startTime}</p>
              <p style={{ margin:4 }}><strong>先攻:</strong> {home ? home.teamName : m.homeTeamId} vs <strong>後攻:</strong> {away ? away.teamName : m.awayTeamId}</p>
              <p style={{ margin:4, fontSize:12, color:'#666' }}><strong>登録日時:</strong> {m.createdAt || '—'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchSearch;
