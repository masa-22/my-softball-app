import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchTeams, getPrefectures, getAffiliations } from '../../services/teamService';
import { getPlayers } from '../../services/playerService';
import { getGames } from '../../services/gameService';
import { getGameState } from '../../services/gameStateService';
import LoadingIndicator from '../common/LoadingIndicator';
import PlayerListItem from '../player/PlayerListItem';
import PlayerStatsModal from './PlayerStatsModal';
import { Player } from '../../types/Player';
import { Game } from '../../types/Game';
import { GameState } from '../../types/GameState';

const ViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prefectures, setPrefectures] = useState<string[]>([]);
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [games, setGames] = useState<Array<{ game: Game; state: GameState | null }>>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prefs = await getPrefectures();
        const affs = await getAffiliations();
        setPrefectures(prefs);
        setAffiliations(affs);
      } catch (error) {
        console.error('Error loading data:', error);
        setPrefectures([]);
        setAffiliations([]);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadGames = async () => {
      try {
        setGamesLoading(true);
        const allGames = await getGames();
        const gamesWithState = await Promise.all(
          allGames.map(async (game) => {
            try {
              const state = await getGameState(game.gameId);
              return { game, state };
            } catch (error) {
              console.error(`Error loading game state for ${game.gameId}:`, error);
              return { game, state: null };
            }
          })
        );
        setGames(gamesWithState);
      } catch (error) {
        console.error('Error loading games:', error);
        setGames([]);
      } finally {
        setGamesLoading(false);
      }
    };
    loadGames();
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

  const handleTeamClick = async (team: any) => {
    setSelectedTeam(team);
    setLoadingPlayers(true);
    try {
      const teamPlayers = await getPlayers(team.id);
      setPlayers(teamPlayers);
    } catch (err) {
      console.error('Error loading players:', err);
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleBack = () => {
    setSelectedTeam(null);
    setPlayers([]);
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
  };

  const handleCloseStatsModal = () => {
    setSelectedPlayer(null);
  };

  if (selectedTeam) {
    return (
      <div style={{ width: '95%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <button
          onClick={handleBack}
          style={{
            marginBottom: '20px',
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← 検索結果に戻る
        </button>
        
        <h2>{selectedTeam.teamName}</h2>
        <div style={{ marginBottom: '20px', color: '#666' }}>
          <p>都道府県: {selectedTeam.prefecture || '未設定'}</p>
          <p>所属: {selectedTeam.affiliation || '未設定'}</p>
        </div>

        <h3>選手一覧</h3>
        {loadingPlayers ? (
          <LoadingIndicator />
        ) : players.length === 0 ? (
          <p>選手が登録されていません。</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {players.map((player) => (
              <PlayerListItem 
                key={player.playerId} 
                player={player} 
                onClick={handlePlayerClick}
              />
            ))}
          </div>
        )}

        <PlayerStatsModal
          isOpen={!!selectedPlayer}
          onClose={handleCloseStatsModal}
          player={selectedPlayer}
        />
      </div>
    );
  }

  const finishedGames = games.filter(({ state }) => state?.status === 'finished');

  return (
    <div style={{ width: '95%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>データ閲覧</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        チームを検索して、選手情報を閲覧できます。終了した試合の結果・成績も閲覧できます。
      </p>

      {/* 終了した試合一覧 - トップに表示 */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>終了した試合</h2>
        {gamesLoading ? (
          <LoadingIndicator />
        ) : finishedGames.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '15px',
          }}>
            {finishedGames
              .sort((a, b) => b.game.date.localeCompare(a.game.date))
              .map(({ game, state }) => {
                const bottomScore = state?.scores.bottom_total ?? 0;
                const topScore = state?.scores.top_total ?? 0;
                return (
                  <div
                    key={game.gameId}
                    onClick={() => navigate(`/viewer/game/${game.gameId}/replay`)}
                    style={{
                      padding: '12px',
                      backgroundColor: '#fff',
                      border: '2px solid #95a5a6',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      opacity: 0.9,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3498db';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#95a5a6';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      e.currentTarget.style.opacity = '0.9';
                    }}
                  >
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                      {game.date}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333',
                        flex: 1,
                        textAlign: 'left',
                      }}>
                        {game.bottomTeam.name}
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#333',
                        margin: '0 15px',
                      }}>
                        {bottomScore} - {topScore}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333',
                        flex: 1,
                        textAlign: 'right',
                      }}>
                        {game.topTeam.name}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#7f8c8d',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}>
                      試合結果を閲覧
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p style={{ color: '#666', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            終了した試合はありません。
          </p>
        )}
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            チーム名
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="チーム名で検索"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            都道府県
          </label>
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            <option value="">すべて</option>
            {prefectures.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            所属
          </label>
          <select
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          >
            <option value="">すべて</option>
            {affiliations.map((aff) => (
              <option key={aff} value={aff}>
                {aff}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
          }}
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </form>

      {error && <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>}

      {searchResults.length > 0 && (
        <div>
          <h2>検索結果 ({searchResults.length}件)</h2>
          <div style={{ display: 'grid', gap: '10px' }}>
            {searchResults.map((team) => (
              <div
                key={team.id}
                onClick={() => handleTeamClick(team)}
                style={{
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9f9f9';
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {team.teamName}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {team.prefecture && `${team.prefecture} | `}
                  {team.affiliation || '所属未設定'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewerPage;
