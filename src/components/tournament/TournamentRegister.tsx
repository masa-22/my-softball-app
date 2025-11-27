import React, { useState } from 'react';
import { registerTournament } from '../../services/tournamentService';
import Modal from '../common/Modal';

const TournamentRegister: React.FC = () => {
  const [year, setYear] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'トーナメント' | 'リーグ' | ''>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // 追加: 確認モーダル
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{ year: string; name: string; type: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!year || !name || !type) {
      setError('すべてのフィールドを入力してください。');
      return;
    }
    setPending({ year, name, type });
    setConfirmOpen(true);
  };

  const confirmRegister = async () => {
    if (!pending) return;
    setConfirmOpen(false);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const t = await registerTournament(pending);
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
      setPending(null);
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

      {confirmOpen && pending && (
        <Modal onClose={() => setConfirmOpen(false)}>
          <div>
            <h3>登録内容の確認</h3>
            <p><strong>開催年:</strong> {pending.year}</p>
            <p><strong>大会名:</strong> {pending.name}</p>
            <p><strong>種別:</strong> {pending.type}</p>

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

export default TournamentRegister;
