import React, { useState, useEffect } from 'react';
import { searchTeams, getPrefectures, getAffiliations } from '../../services/teamService';

const TeamSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prefectures, setPrefectures] = useState<string[]>([]);
  const [affiliations, setAffiliations] = useState<string[]>([]);

  useEffect(() => {
    setPrefectures(getPrefectures());
    setAffiliations(getAffiliations());
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);

      const results = await searchTeams({
        name: searchQuery,
        prefecture,
        affiliation,
      });

      setSearchResults(results);
      if (results.length === 0) {
        setError('検索結果が見つかりませんでした。');
      }
    } catch (err) {
      console.error(err);
      setError('検索に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setPrefecture('');
    setAffiliation('');
    setSearchResults([]);
    setError('');
  };

  return (
    <div>
      <h2>チーム検索</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="チーム名で検索（部分一致）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            style={{ width: '180px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">都道府県を選択</option>
            {prefectures.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            style={{ width: '180px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">所属を選択</option>
            {affiliations.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '検索中...' : '検索'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#eee',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            リセット
          </button>
        </div>
      </form>

      {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

      <div>
        {searchResults.map((team) => (
          <div
            key={team.id}
            style={{
              padding: '15px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>{team.teamName} <span style={{ fontSize: '0.9em', color: '#666' }}>({team.teamAbbr})</span></h3>
            <p style={{ margin: '5px 0' }}>
              <strong>所属:</strong> {team.affiliation}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>都道府県:</strong> {team.prefecture || '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamSearch;
