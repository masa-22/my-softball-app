import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getGames } from '../../services/gameService';
import { getGameState } from '../../services/gameStateService';
import { Game } from '../../types/Game';
import { GameState } from '../../types/GameState';
import PendingApproval from './PendingApproval';
import LoadingIndicator from '../common/LoadingIndicator';
import { getUserApprovalStatus, type UserApproval } from '../../services/userApprovalService';

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState<Array<{ game: Game; state: GameState | null }>>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

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
            setApprovalStatus('none');
          } else if (!status.approved) {
            setApprovalStatus('pending');
          } else {
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

  if (currentUser && checkingApproval) {
    return <LoadingIndicator />;
  }

  if (currentUser && !checkingApproval) {
    if (approvalStatus === 'pending' || approvalStatus === 'none') {
      return <PendingApproval hasApprovalRecord={approvalStatus === 'pending'} />;
    }
    if (approvalStatus === null) {
      return <LoadingIndicator />;
    }
  }

  // 未ログイン: ウェルカム + ログイン/新規登録
  if (!currentUser) {
    return (
      <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '32px', color: '#333', marginBottom: '20px', fontWeight: 'bold' }}>
            ソフトボール成績管理アプリへようこそ
          </h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '20px', lineHeight: '1.6' }}>
            チームや選手の管理、試合の記録など、
            <br />
            ソフトボールの成績管理を効率的に行えます。
          </p>
        </div>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '40px' }}>
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
              minWidth: '200px',
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
              minWidth: '200px',
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

        <div
          style={{
            marginTop: '60px',
            padding: '30px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            maxWidth: '600px',
            margin: '60px auto 0',
          }}
        >
          <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '20px', textAlign: 'center' }}>
            主な機能
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              textAlign: 'center',
            }}
          >
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

  // ログイン済み: 終了した試合のみ表示
  const finishedGames = games.filter(({ state }) => state?.status === 'finished');

  return (
    <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '8px' }}>終了した試合</h1>
        <p style={{ fontSize: '14px', color: '#666' }}>
          試合をクリックすると、スコア・ボックススコア・成績・リプレイなどすべての情報を閲覧できます。
        </p>
      </div>

      {gamesLoading ? (
        <LoadingIndicator />
      ) : finishedGames.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '15px',
          }}
        >
          {finishedGames
            .sort((a, b) => b.game.date.localeCompare(a.game.date))
            .map(({ game, state }) => {
              const bottomScore = state?.scores.bottom_total ?? 0;
              const topScore = state?.scores.top_total ?? 0;

              return (
                <div
                  key={game.gameId}
                  onClick={() => navigate(`/game/${game.gameId}/view`)}
                  style={{
                    padding: '16px',
                    backgroundColor: '#fff',
                    border: '2px solid #95a5a6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3498db';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#95a5a6';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>{game.date}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                    {game.tournament?.name || ''}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333',
                        flex: 1,
                        textAlign: 'left',
                      }}
                    >
                      {game.bottomTeam.name}
                    </div>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#333',
                        margin: '0 15px',
                      }}
                    >
                      {bottomScore} - {topScore}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#333',
                        flex: 1,
                        textAlign: 'right',
                      }}
                    >
                      {game.topTeam.name}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#3498db',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  >
                    詳細を閲覧 →
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p style={{ color: '#666', padding: '30px', backgroundColor: '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
          終了した試合はありません。
        </p>
      )}
    </div>
  );
};

export default HomePage;
