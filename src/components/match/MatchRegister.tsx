import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournaments } from '../../services/tournamentService';
import { getTeams } from '../../services/teamService';
import { registerMatch } from '../../services/matchService';
import Modal from '../common/Modal';

const MatchRegister: React.FC = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState(''); // 追加
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<any | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    setTournaments(getTournaments());
    setTeams(getTeams());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!tournamentId || !date || !startTime || !homeTeamId || !awayTeamId) {
      setError('すべてのフィールドを入力してください。');
      return;
    }
    if (homeTeamId === awayTeamId) {
      setError('先攻と後攻は異なるチームを選んでください。');
      return;
    }
    setPending({ tournamentId, date, startTime, homeTeamId, awayTeamId });
    setConfirmOpen(true);
  };

  const confirmRegister = async () => {
    if (!pending) return;
    setConfirmOpen(false);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const m = await registerMatch({
        tournamentId: pending.tournamentId,
        date: pending.date,
        startTime: pending.startTime,
        homeTeamId: pending.homeTeamId,
        awayTeamId: pending.awayTeamId,
      });
      setMessage(`試合を登録しました（ID: ${m.id}）`);
      setTournamentId('');
      setDate('');
      setStartTime('');
      setHomeTeamId('');
      setAwayTeamId('');

      // 登録後、スタメン登録画面へ遷移
      setTimeout(() => {
        navigate(`/match/${m.id}/lineup`);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '登録に失敗しました。');
    } finally {
      setLoading(false);
      setPending(null);
    }
  };

  const findTournament = (id: string) => tournaments.find(t => String(t.id) === String(id));
  const findTeam = (id: string | number) => teams.find(t => String(t.id) === String(id));

  return (
    <div>
      <h2>試合新規登録</h2>
      {error && <p style={{ color:'red' }}>{error}</p>}
      {message && <p style={{ color:'green' }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:12 }}>
          <label>所属大会</label>
          <select value={tournamentId} onChange={(e)=>setTournamentId(e.target.value)} style={{ width:'100%', padding:8 }}>
            <option value="">大会を選択</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.year} {t.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:12 }}>
          <label>開催日</label>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ width:'100%', padding:8 }} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label>開始時間</label>
          <input type="time" value={startTime} onChange={(e)=>setStartTime(e.target.value)} style={{ width:'100%', padding:8 }} />
        </div>

        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <div style={{ flex:1 }}>
            <label>先攻チーム</label>
            <select value={homeTeamId} onChange={(e)=>setHomeTeamId(e.target.value)} style={{ width:'100%', padding:8 }}>
              <option value="">先攻を選択</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.teamName} ({t.teamAbbr})</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <label>後攻チーム</label>
            <select value={awayTeamId} onChange={(e)=>setAwayTeamId(e.target.value)} style={{ width:'100%', padding:8 }}>
              <option value="">後攻を選択</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.teamName} ({t.teamAbbr})</option>)}
            </select>
          </div>
        </div>

        <button disabled={loading} type="submit" style={{ padding:'10px 16px', background:'#27ae60', color:'#fff', border:'none' }}>
          {loading ? '登録中...' : '試合を登録'}
        </button>
      </form>

      {confirmOpen && pending && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <div>
            <h3>登録内容の確認</h3>
            <p><strong>大会:</strong> {findTournament(pending.tournamentId) ? `${findTournament(pending.tournamentId).year} ${findTournament(pending.tournamentId).name}` : pending.tournamentId}</p>
            <p><strong>開催日:</strong> {pending.date}</p>
            <p><strong>開始時間:</strong> {pending.startTime}</p>
            <p><strong>先攻:</strong> {findTeam(pending.homeTeamId) ? findTeam(pending.homeTeamId).teamName : pending.homeTeamId}</p>
            <p><strong>後攻:</strong> {findTeam(pending.awayTeamId) ? findTeam(pending.awayTeamId).teamName : pending.awayTeamId}</p>

            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={() => setConfirmOpen(false)} style={{ padding:'8px 12px' }}>キャンセル</button>
              <button onClick={confirmRegister} style={{ padding:'8px 12px', background:'#27ae60', color:'#fff', border:'none' }}>登録する</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MatchRegister;
