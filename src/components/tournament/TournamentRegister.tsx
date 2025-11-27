import React, { useState } from 'react';
import { registerTournament } from '../../services/tournamentService';

const TournamentRegister: React.FC = () => {
  const [year, setYear] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'トーナメント' | 'リーグ' | ''>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!year || !name || !type) {
      setError('すべてのフィールドを入力してください。');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const t = await registerTournament({ year, name, type });
      setMessage(`大会「${t.name}」を登録しました（ID: ${t.id}）`);
      setYear('');
      setName('');
      setType('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'DUPLICATE') setError('同じ年と大会名の組合せは既に登録されています。');
      else setError(err.message || '登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>大会新規登録</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:12 }}>
          <label>開催年</label>
          <input value={year} onChange={(e)=>setYear(e.target.value)} placeholder="例: 2025" style={{ width:'100%', padding:8 }} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label>大会名</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="例: 春季大会" style={{ width:'100%', padding:8 }} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label>大会種別</label>
          <select value={type} onChange={(e)=>setType(e.target.value as any)} style={{ width:'100%', padding:8 }}>
            <option value="">選択してください</option>
            <option value="トーナメント">トーナメント</option>
            <option value="リーグ">リーグ</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={{ padding:'10px 16px', background:'#27ae60', color:'#fff', border:'none' }}>
          {loading ? '登録中...' : '大会を登録'}
        </button>
      </form>
    </div>
  );
};

export default TournamentRegister;
