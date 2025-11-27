import React, { useState, useEffect } from 'react';
import { getTeams } from '../../services/teamService';
import { registerPlayer } from '../../services/playerService';
import Modal from '../common/Modal';

const PlayerRegister: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [teamId, setTeamId] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [throwing, setThrowing] = useState('右');
  const [batting, setBatting] = useState('右');
  const [entryYear, setEntryYear] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<any | null>(null);

  useEffect(() => {
    const ts = getTeams();
    setTeams(ts);
  }, []);

  useEffect(() => {
    setSelectedTeam(teams.find(t => String(t.id) === String(teamId)) || null);
  }, [teamId, teams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setPending({ teamId, familyName, givenName, throwing, batting, entryYear });
    setConfirmOpen(true);
  };

  const confirmRegister = async () => {
    if (!pending) return;
    setConfirmOpen(false);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const newP = await registerPlayer(pending);
      setMessage(`選手「${newP.familyName} ${newP.givenName}」を登録しました（ID: ${newP.playerId}）`);
      setFamilyName('');
      setGivenName('');
      setThrowing('右');
      setBatting('右');
      setEntryYear('');
      setTeamId('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || '登録に失敗しました。');
    } finally {
      setLoading(false);
      setPending(null);
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

        <div style={{ display:'flex', gap:0, marginBottom:12, alignItems: 'center' }}>
          <div style={{ flex:1 }}>
            <label>苗字</label>
            <input value={familyName} onChange={(e)=>setFamilyName(e.target.value)} style={{ width:'100%', padding:8 }} />
          </div>

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

      {/* 確認モーダル */}
      {confirmOpen && pending && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <div>
            <h3>登録内容の確認</h3>
            <p><strong>チーム:</strong> {selectedTeam ? `${selectedTeam.teamName} (${selectedTeam.teamAbbr})` : pending.teamId}</p>
            <p><strong>苗字:</strong> {pending.familyName}</p>
            <p><strong>名前:</strong> {pending.givenName}</p>
            <p><strong>利き手:</strong> {pending.throwing} / <strong>利き打ち:</strong> {pending.batting}</p>
            {pending.entryYear && <p><strong>入学年度:</strong> {pending.entryYear}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ padding: '8px 12px' }}>キャンセル</button>
              <button onClick={confirmRegister} style={{ padding: '8px 12px', background: '#27ae60', color:'#fff', border: 'none' }}>登録する</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PlayerRegister;
