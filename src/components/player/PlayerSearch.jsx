import React, { useState, useEffect } from 'react';
import { getTeams } from '../../services/teamService';
import { searchPlayers } from '../../services/playerService';

const PlayerSearch = () => {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [entryYear, setEntryYear] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setTeams(getTeams());
  }, []);

  const handleSearch = async (e) => {
    e && e.preventDefault();
    if (!teamId) {
      setError('チームを選択してください。');
      return;
    }
    setError('');
    const res = await searchPlayers({ teamId, name: nameQuery, entryYear });
    setResults(res);
    if (res.length === 0) setError('検索結果が見つかりませんでした。');
  };

  const handleReset = () => {
    setTeamId('');
    setNameQuery('');
    setEntryYear('');
    setResults([]);
    setError('');
  };

  return (
    <div>
      <h2>選手検索</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width: 240, padding: 8 }}>
            <option value="">チームを選択</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.teamName} ({t.teamAbbr})</option>)}
          </select>
          <input placeholder="名前（苗字／下の名前 部分一致）" value={nameQuery} onChange={(e)=>setNameQuery(e.target.value)} style={{ flex: 1, padding: 8 }} />
          <input placeholder="入学年度" value={entryYear} onChange={(e)=>setEntryYear(e.target.value)} style={{ width: 120, padding: 8 }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" style={{ padding: '8px 16px', background:'#3498db', color:'#fff', border:'none' }}>検索</button>
          <button type="button" onClick={handleReset} style={{ padding:'8px 16px', border:'1px solid #ccc' }}>リセット</button>
        </div>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        {results.map(p => (
          <div key={p.playerId} style={{ padding:12, border:'1px solid #ddd', borderRadius:4, marginBottom:10, background:'#fff' }}>
            <h3 style={{ margin:0 }}>{p.familyName} {p.givenName} <small style={{ color:'#666' }}>[{p.playerId}]</small></h3>
            <p style={{ margin:4 }}><strong>利き手:</strong> {p.throwing} / <strong>利き打ち:</strong> {p.batting}</p>
            {p.entryYear && <p style={{ margin:4 }}><strong>入学年度:</strong> {p.entryYear}</p>}
            <p style={{ margin:4, fontSize:12, color:'#666' }}><strong>所属チームID:</strong> {p.teamId}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerSearch;
