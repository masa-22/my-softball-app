import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchTeams, getPrefectures, getAffiliations } from '../../services/teamService';
import { getGames } from '../../services/gameService';
import { getGameState } from '../../services/gameStateService';
import { Game } from '../../types/Game';
import { GameState } from '../../types/GameState';
import TeamPlayerList from './TeamPlayerList';
import Modal from '../common/Modal';
import PendingApproval from './PendingApproval';
import LoadingIndicator from '../common/LoadingIndicator';
import { getUserApprovalStatus, isAdmin, type UserApproval } from '../../services/userApprovalService';

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prefectures, setPrefectures] = useState<string[]>([]);
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | number | null>(null);
  const [playerListOpen, setPlayerListOpen] = useState(false);
  const [games, setGames] = useState<Array<{ game: Game; state: GameState | null }>>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  useEffect(() => {
    const loadPrefecturesAndAffiliations = async () => {
      try {
        const prefs = await getPrefectures();
        const affs = await getAffiliations();
        setPrefectures(prefs);
        setAffiliations(affs);
      } catch (error) {
        console.error('Error loading prefectures and affiliations:', error);
        // エラーが発生した場合は空配列を設定
        setPrefectures([]);
        setAffiliations([]);
      }
    };
    
    loadPrefecturesAndAffiliations();
  }, []);

  // 試合データの読み込み
  useEffect(() => {
    const loadGames = async () => {
      if (!currentUser) return;
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
  }, [currentUser]);

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

  const handleTeamClick = (teamId: string | number) => {
    setSelectedTeamId(teamId);
    setPlayerListOpen(true);
  };

  const handleClosePlayerList = () => {
    setPlayerListOpen(false);
    setSelectedTeamId(null);
  };

  // 認証状態をチェック
  const [approvalStatus, setApprovalStatus] = useState<'loading' | 'none' | 'pending' | 'approved' | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [userApproval, setUserApproval] = useState<UserApproval | null>(null);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (currentUser) {
        setCheckingApproval(true);
        setApprovalStatus('loading');
        try {
          const status = await getUserApprovalStatus(currentUser.uid);
          setUserApproval(status);
          if (status === null) {
            // 承認レコードがない場合（Firebase Consoleで作成したユーザーなど）
            setApprovalStatus('none');
          } else if (!status.approved) {
            // 承認待ち
            setApprovalStatus('pending');
          } else {
            // 承認済み
            setApprovalStatus('approved');
          }
        } catch (error) {
          console.error('Error checking approval status:', error);
          setApprovalStatus('none');
          setUserApproval(null);
        } finally {
          setCheckingApproval(false);
        }
      } else {
        setApprovalStatus(null);
        setUserApproval(null);
      }
    };

    checkApprovalStatus();
  }, [currentUser]);

  // 承認状態をチェック中はローディング表示
  if (currentUser && checkingApproval) {
    return <LoadingIndicator />;
  }

  // 承認状態に応じて画面を表示
  if (currentUser && !checkingApproval) {
    if (approvalStatus === 'pending' || approvalStatus === 'none') {
      return <PendingApproval hasApprovalRecord={approvalStatus === 'pending'} />;
    }
    // approvalStatus === 'approved' の場合は通常のホームページを表示（後続のreturnで処理）
    // approvalStatus === null の場合はまだチェックが完了していない可能性があるので、ローディング表示
    if (approvalStatus === null) {
      return <LoadingIndicator />;
    }
  }

  if (!currentUser) {
    return (
      <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            color: '#333', 
            marginBottom: '20px',
            fontWeight: 'bold'
          }}>
            ソフトボール成績管理アプリへようこそ
          </h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '20px', lineHeight: '1.6' }}>
            チームや選手の管理、試合の記録など、<br />
            ソフトボールの成績管理を効率的に行えます。
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: '40px'
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '18px 40px',
              background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              minWidth: '200px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            🔐 ログイン
          </button>
          
          <button
            onClick={() => navigate('/signup')}
            style={{
              padding: '18px 40px',
              background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              minWidth: '200px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            ✨ 新規登録
          </button>
        </div>

        <div style={{
          marginTop: '60px',
          padding: '30px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          maxWidth: '600px',
          margin: '60px auto 0'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            color: '#333', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            主な機能
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏟️</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '5px' }}>チーム管理</h3>
              <p style={{ fontSize: '14px', color: '#666' }}>チーム情報の登録・管理</p>
            </div>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>👥</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '5px' }}>選手管理</h3>
              <p style={{ fontSize: '14px', color: '#666' }}>選手情報の登録・検索</p>
            </div>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📊</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '5px' }}>試合記録</h3>
              <p style={{ fontSize: '14px', color: '#666' }}>試合の詳細記録</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* クイックアクセスボタン */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>クイックアクセス</h2>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/team')}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            🏟️ チーム管理
          </button>
          <button
            onClick={() => navigate('/player')}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            👥 選手管理
          </button>
          
          {/* 試合管理ボタン */}
          <button
            onClick={() => navigate('/match')}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            ⚾ 試合管理
          </button>
          
          {/* 管理者用ボタン */}
          {isAdmin(userApproval) && (
            <button
              onClick={() => navigate('/admin/users')}
              style={{
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
            >
              ⚙️ 管理者ページ
            </button>
          )}
        </div>
      </div>

      {/* チーム検索セクション */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>チーム検索</h2>
        <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <input
                type="text"
                placeholder="チーム名で検索（部分一致）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 200px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                style={{ flex: '1 1 140px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              >
                <option value="">都道府県を選択</option>
                {prefectures.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                style={{ flex: '1 1 140px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              >
                <option value="">所属を選択</option>
                {affiliations.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 20px',
                backgroundColor: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? '検索中...' : '検索'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '10px 20px',
                backgroundColor: '#eee',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              リセット
            </button>
          </div>
        </form>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

        {/* 検索結果をチームアイコン（カード）形式で表示 */}
        {searchResults.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#666' }}>
              検索結果: {searchResults.length}件
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '20px' 
            }}>
              {searchResults.map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleTeamClick(team.id)}
                  style={{
                    padding: '20px',
                    backgroundColor: '#fff',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3498db';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    fontSize: '24px',
                    color: '#fff',
                    fontWeight: 'bold'
                  }}>
                    {team.teamAbbr ? team.teamAbbr.charAt(0) : 'T'}
                  </div>
                  <h3 style={{ 
                    margin: '0 0 10px 0', 
                    textAlign: 'center', 
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    {team.teamName}
                  </h3>
                  <p style={{ 
                    margin: '5px 0', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#666' 
                  }}>
                    <strong>略称:</strong> {team.teamAbbr}
                  </p>
                  <p style={{ 
                    margin: '5px 0', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#666' 
                  }}>
                    <strong>所属:</strong> {team.affiliation}
                  </p>
                  {team.prefecture && (
                    <p style={{ 
                      margin: '5px 0', 
                      textAlign: 'center', 
                      fontSize: '14px', 
                      color: '#666' 
                    }}>
                      <strong>都道府県:</strong> {team.prefecture}
                    </p>
                  )}
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '8px', 
                    background: '#f0f0f0', 
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#3498db',
                    fontWeight: 'bold'
                  }}>
                    クリックして選手一覧を見る →
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 試合一覧セクション */}
      {currentUser && (
        <div style={{ marginBottom: '40px' }}>
          {gamesLoading ? (
            <LoadingIndicator />
          ) : (
            <>
              {/* 入力中の試合一覧 */}
              {games.filter(({ state }) => state?.status === 'in_progress').length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>入力中の試合</h2>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '15px' 
                  }}>
                    {games
                      .filter(({ state }) => state?.status === 'in_progress')
                      .sort((a, b) => {
                        // 日付でソート（新しい順）
                        return b.game.date.localeCompare(a.game.date);
                      })
                      .map(({ game, state }) => {
                        const inningDisplay = state 
                          ? `${state.current_inning}回${state.top_bottom === 'top' ? '表' : '裏'}`
                          : '未開始';
                        const bottomScore = state?.scores.bottom_total ?? 0;
                        const topScore = state?.scores.top_total ?? 0;
                        
                        return (
                          <div
                            key={game.gameId}
                            onClick={() => navigate(`/match/${game.gameId}/play`)}
                            style={{
                              padding: '12px',
                              backgroundColor: '#fff',
                              border: '2px solid #3498db',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#2980b9';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#3498db';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                          >
                            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                              {game.date}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '8px'
                            }}>
                              <div style={{ 
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                flex: 1,
                                textAlign: 'left'
                              }}>
                                {game.bottomTeam.name}
                              </div>
                              <div style={{ 
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#333',
                                margin: '0 15px'
                              }}>
                                {bottomScore} - {topScore}
                              </div>
                              <div style={{ 
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                flex: 1,
                                textAlign: 'right'
                              }}>
                                {game.topTeam.name}
                              </div>
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#3498db', 
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}>
                              {inningDisplay}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 終了した試合一覧 */}
              {games.filter(({ state }) => state?.status === 'finished').length > 0 && (
                <div>
                  <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>終了した試合</h2>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '15px' 
                  }}>
                    {games
                      .filter(({ state }) => state?.status === 'finished')
                      .sort((a, b) => {
                        // 日付でソート（新しい順）
                        return b.game.date.localeCompare(a.game.date);
                      })
                      .map(({ game, state }) => {
                        const bottomScore = state?.scores.bottom_total ?? 0;
                        const topScore = state?.scores.top_total ?? 0;
                        
                        return (
                          <div
                            key={game.gameId}
                            onClick={() => navigate(`/match/${game.gameId}/play`)}
                            style={{
                              padding: '12px',
                              backgroundColor: '#fff',
                              border: '2px solid #95a5a6',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              opacity: 0.8
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#7f8c8d';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#95a5a6';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                              e.currentTarget.style.opacity = '0.8';
                            }}
                          >
                            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
                              {game.date}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '8px'
                            }}>
                              <div style={{ 
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                flex: 1,
                                textAlign: 'left'
                              }}>
                                {game.bottomTeam.name}
                              </div>
                              <div style={{ 
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#333',
                                margin: '0 15px'
                              }}>
                                {bottomScore} - {topScore}
                              </div>
                              <div style={{ 
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#333',
                                flex: 1,
                                textAlign: 'right'
                              }}>
                                {game.topTeam.name}
                              </div>
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#7f8c8d', 
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}>
                              試合終了
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 選手一覧モーダル */}
      {playerListOpen && selectedTeamId && (
        <Modal onClose={handleClosePlayerList}>
          <TeamPlayerList teamId={selectedTeamId} onClose={handleClosePlayerList} />
        </Modal>
      )}
    </div>
  );
};

export default HomePage;

