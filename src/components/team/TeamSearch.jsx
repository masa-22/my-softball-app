import React, { useState } from 'react';
import { searchTeams } from '../../services/teamService';

const TeamSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('チーム名を入力してください。');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const results = await searchTeams(searchQuery);
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

  return (
    <div>
      <h2>チーム検索</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="チーム名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
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
        </div>
      </form>

      {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

      {/* 検索結果表示 */}
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
            <h3 style={{ margin: '0 0 10px 0' }}>{team.teamName}</h3>
            <p style={{ margin: '5px 0' }}>
              <strong>略称:</strong> {team.teamAbbr}
            </p>
            <p style={{ margin: '5px 0' }}>
              <strong>所属:</strong> {team.affiliation}
            </p>
            <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
              <strong>チームID:</strong> {team.id}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamSearch;
