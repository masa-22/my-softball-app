import React, { useState } from 'react';
import { searchTournaments } from '../../services/tournamentService';

const TournamentSearch: React.FC = () => {
  const [year, setYear] = useState('');
  const [name, setName] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e && e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const res = await searchTournaments({ year, name });
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
    setYear('');
    setName('');
    setResults([]);
    setError('');
  };

  return (
    <div>
      <h2>大会検索</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input value={year} onChange={(e)=>setYear(e.target.value)} placeholder="開催年（例: 2025）" style={{ flex: '1 1 160px', padding: 8, boxSizing: 'border-box' }} />
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="大会名（部分一致）" style={{ flex: '1 1 200px', padding: 8, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" style={{ flex: 1, padding: '8px 16px', background:'#3498db', color:'#fff', border:'none', borderRadius: 4 }}>{loading ? '検索中...' : '検索'}</button>
          <button type="button" onClick={handleReset} style={{ flex: 1, padding:'8px 16px', border:'1px solid #ccc', borderRadius: 4 }}>リセット</button>
        </div>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div>
        {results.map(t => (
          <div key={t.id} style={{ padding:12, border:'1px solid #ddd', borderRadius:4, marginBottom:10, background:'#fff' }}>
            <h3 style={{ margin:0 }}>{t.name} <small style={{ color:'#666' }}>[{t.id}]</small></h3>
            <p style={{ margin:4 }}><strong>開催年:</strong> {t.year} / <strong>種別:</strong> {t.type}</p>
            <p style={{ margin:4, fontSize:12, color:'#666' }}><strong>登録日時:</strong> {t.createdAt || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentSearch;
