import React, { useState, useEffect } from 'react';
import { getTeams } from '../../services/teamService';
import { registerPlayer } from '../../services/playerService';

const PlayerRegister = () => {
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [familyName, setFamilyName] = useState(''); // 追加: 苗字
  const [givenName, setGivenName] = useState('');   // 追加: 名前（下の名前）
  const [throwing, setThrowing] = useState('右');
  const [batting, setBatting] = useState('右');
  const [entryYear, setEntryYear] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const ts = getTeams();
    setTeams(ts);
  }, []);

  useEffect(() => {
    setSelectedTeam(teams.find(t => String(t.id) === String(teamId)) || null);
  }, [teamId, teams]);

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setError('');
    setMessage('');
    if (!teamId) {
      setError('チームを選択してください。');
      return;
    }
    if (!familyName || !givenName || !throwing || !batting) {
      setError('必須フィールドを入力してください。');
      return;
    }
    if (selectedTeam && selectedTeam.affiliation === '大学' && !entryYear) {
      setError('大学チームの場合、入学年度を入力してください。');
      return;
    }

    setLoading(true);
    try {
      const newP = await registerPlayer({ teamId, familyName, givenName, throwing, batting, entryYear: entryYear || null });
      setMessage(`選手「${newP.familyName} ${newP.givenName}」を登録しました（ID: ${newP.playerId}）`);
      setFamilyName('');
      setGivenName('');
      setThrowing('右');
      setBatting('右');
      setEntryYear('');
    } catch (err) {
      console.error(err);
      setError(err.message || '登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>選手新規登録</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>チーム</label>
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width:'100%', padding:8 }}>
            <option value="">チームを選択</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.teamName} ({t.teamAbbr})</option>)}
          </select>
        </div>

        {/* 苗字と名前入力（間に物理的スペースを挿入） */}
        <div style={{ display:'flex', gap:0, marginBottom:12, alignItems: 'center' }}>
          <div style={{ flex:1 }}>
            <label>苗字</label>
            <input value={familyName} onChange={(e)=>setFamilyName(e.target.value)} style={{ width:'100%', padding:8 }} />
          </div>

          {/* 明示的な物理スペース（幅を空ける） */}
          <div aria-hidden="true" style={{ width: 24 }} />

          <div style={{ flex:1 }}>
            <label>名前</label>
            <input value={givenName} onChange={(e)=>setGivenName(e.target.value)} style={{ width:'100%', padding:8 }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label>利き手</label>
            <select value={throwing} onChange={(e)=>setThrowing(e.target.value)} style={{ width:'100%', padding:8 }}>
              <option>右</option><option>左</option><option>両</option>
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label>利き打ち</label>
            <select value={batting} onChange={(e)=>setBatting(e.target.value)} style={{ width:'100%', padding:8 }}>
              <option>右</option><option>左</option><option>両</option>
            </select>
          </div>
        </div>

        {selectedTeam && selectedTeam.affiliation === '大学' && (
          <div style={{ marginBottom: 12 }}>
            <label>入学年度</label>
            <input value={entryYear} onChange={(e)=>setEntryYear(e.target.value)} placeholder="例: 2023" style={{ width:'100%', padding:8 }} />
          </div>
        )}

        <button disabled={loading} type="submit" style={{ padding:'10px 16px', background:'#27ae60', color:'#fff', border:'none' }}>
          {loading ? '登録中...' : '選手を登録'}
        </button>
      </form>
    </div>
  );
};

export default PlayerRegister;
