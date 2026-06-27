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
        // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医・遨ｺ驟榊・繧定ｨｭ螳・        setPrefectures([]);
        setAffiliations([]);
      }
    };
    
    loadPrefecturesAndAffiliations();
  }, []);

  // 隧ｦ蜷医ョ繝ｼ繧ｿ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ
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
        setError('讀懃ｴ｢邨先棡縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆縲・);
      }
    } catch (err) {
      console.error(err);
      setError('讀懃ｴ｢縺ｫ螟ｱ謨励＠縺ｾ縺励◆縲・);
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

  // 隱崎ｨｼ迥ｶ諷九ｒ繝√ぉ繝・け
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
            // 謇ｿ隱阪Ξ繧ｳ繝ｼ繝峨′縺ｪ縺・ｴ蜷茨ｼ・irebase Console縺ｧ菴懈・縺励◆繝ｦ繝ｼ繧ｶ繝ｼ縺ｪ縺ｩ・・            setApprovalStatus('none');
          } else if (!status.approved) {
            // 謇ｿ隱榊ｾ・■
            setApprovalStatus('pending');
          } else {
            // 謇ｿ隱肴ｸ医∩
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

  // 謇ｿ隱咲憾諷九ｒ繝√ぉ繝・け荳ｭ縺ｯ繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ陦ｨ遉ｺ
  if (currentUser && checkingApproval) {
    return <LoadingIndicator />;
  }

  // 謇ｿ隱咲憾諷九↓蠢懊§縺ｦ逕ｻ髱｢繧定｡ｨ遉ｺ
  if (currentUser && !checkingApproval) {
    if (approvalStatus === 'pending' || approvalStatus === 'none') {
      return <PendingApproval hasApprovalRecord={approvalStatus === 'pending'} />;
    }
    // approvalStatus === 'approved' 縺ｮ蝣ｴ蜷医・騾壼ｸｸ縺ｮ繝帙・繝繝壹・繧ｸ繧定｡ｨ遉ｺ・亥ｾ檎ｶ壹・return縺ｧ蜃ｦ逅・ｼ・    // approvalStatus === null 縺ｮ蝣ｴ蜷医・縺ｾ縺繝√ぉ繝・け縺悟ｮ御ｺ・＠縺ｦ縺・↑縺・庄閭ｽ諤ｧ縺後≠繧九・縺ｧ縲√Ο繝ｼ繝・ぅ繝ｳ繧ｰ陦ｨ遉ｺ
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
            繧ｽ繝輔ヨ繝懊・繝ｫ謌千ｸｾ邂｡逅・い繝励Μ縺ｸ繧医≧縺薙◎
          </h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '20px', lineHeight: '1.6' }}>
            繝√・繝繧・∈謇九・邂｡逅・∬ｩｦ蜷医・險倬鹸縺ｪ縺ｩ縲・br />
            繧ｽ繝輔ヨ繝懊・繝ｫ縺ｮ謌千ｸｾ邂｡逅・ｒ蜉ｹ邇・噪縺ｫ陦後∴縺ｾ縺吶・          </p>
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
            柏 繝ｭ繧ｰ繧､繝ｳ
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
            笨ｨ 譁ｰ隕冗匳骭ｲ
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
            荳ｻ縺ｪ讖溯・
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>勝・・/div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '5px' }}>繝√・繝邂｡逅・/h3>
              <p style={{ fontSize: '14px', color: '#666' }}>繝√・繝諠・ｱ縺ｮ逋ｻ骭ｲ繝ｻ邂｡逅・/p>
            </div>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>則</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '5px' }}>驕ｸ謇狗ｮ｡逅・/h3>
              <p style={{ fontSize: '14px', color: '#666' }}>驕ｸ謇区ュ蝣ｱ縺ｮ逋ｻ骭ｲ繝ｻ讀懃ｴ｢</p>
            </div>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>投</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '5px' }}>隧ｦ蜷郁ｨ倬鹸</h3>
              <p style={{ fontSize: '14px', color: '#666' }}>隧ｦ蜷医・隧ｳ邏ｰ險倬鹸</p>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* 繧ｯ繧､繝・け繧｢繧ｯ繧ｻ繧ｹ繝懊ち繝ｳ */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>繧ｯ繧､繝・け繧｢繧ｯ繧ｻ繧ｹ</h2>
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
            勝・・繝√・繝邂｡逅・          </button>
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
            則 驕ｸ謇狗ｮ｡逅・          </button>
          
          {/* 隧ｦ蜷育ｮ｡逅・・繧ｿ繝ｳ */}
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
            笞ｾ 隧ｦ蜷育ｮ｡逅・          </button>
          
          {/* 邂｡逅・・畑繝懊ち繝ｳ */}
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
              笞呻ｸ・邂｡逅・・・繝ｼ繧ｸ
            </button>
          )}
        </div>
      </div>

      {/* 繝√・繝讀懃ｴ｢繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>繝√・繝讀懃ｴ｢</h2>
        <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <input
                type="text"
                placeholder="繝√・繝蜷阪〒讀懃ｴ｢・磯Κ蛻・ｸ閾ｴ・・
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 200px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                style={{ flex: '1 1 140px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              >
                <option value="">驛ｽ驕灘ｺ懃恁繧帝∈謚・/option>
                {prefectures.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                style={{ flex: '1 1 140px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              >
                <option value="">謇螻槭ｒ驕ｸ謚・/option>
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
              {loading ? '讀懃ｴ｢荳ｭ...' : '讀懃ｴ｢'}
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
              繝ｪ繧ｻ繝・ヨ
            </button>
          </div>
        </form>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

        {/* 讀懃ｴ｢邨先棡繧偵メ繝ｼ繝繧｢繧､繧ｳ繝ｳ・医き繝ｼ繝会ｼ牙ｽ｢蠑上〒陦ｨ遉ｺ */}
        {searchResults.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#666' }}>
              讀懃ｴ｢邨先棡: {searchResults.length}莉ｶ
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
                    <strong>逡･遘ｰ:</strong> {team.teamAbbr}
                  </p>
                  <p style={{ 
                    margin: '5px 0', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#666' 
                  }}>
                    <strong>謇螻・</strong> {team.affiliation}
                  </p>
                  {team.prefecture && (
                    <p style={{ 
                      margin: '5px 0', 
                      textAlign: 'center', 
                      fontSize: '14px', 
                      color: '#666' 
                    }}>
                      <strong>驛ｽ驕灘ｺ懃恁:</strong> {team.prefecture}
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
                    繧ｯ繝ｪ繝・け縺励※驕ｸ謇倶ｸ隕ｧ繧定ｦ九ｋ 竊・                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 隧ｦ蜷井ｸ隕ｧ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ */}
      {currentUser && (
        <div style={{ marginBottom: '40px' }}>
          {gamesLoading ? (
            <LoadingIndicator />
          ) : (
            <>
              {/* 蜈･蜉帑ｸｭ縺ｮ隧ｦ蜷井ｸ隕ｧ */}
              {games.filter(({ state }) => state?.status === 'in_progress').length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>蜈･蜉帑ｸｭ縺ｮ隧ｦ蜷・/h2>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '15px' 
                  }}>
                    {games
                      .filter(({ state }) => state?.status === 'in_progress')
                      .sort((a, b) => {
                        // 譌･莉倥〒繧ｽ繝ｼ繝茨ｼ域眠縺励＞鬆・ｼ・                        return b.game.date.localeCompare(a.game.date);
                      })
                      .map(({ game, state }) => {
                        const inningDisplay = state 
                          ? `${state.current_inning}蝗・{state.top_bottom === 'top' ? '陦ｨ' : '陬・}`
                          : '譛ｪ髢句ｧ・;
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

              {/* 邨ゆｺ・＠縺溯ｩｦ蜷井ｸ隕ｧ */}
              {games.filter(({ state }) => state?.status === 'finished').length > 0 && (
                <div>
                  <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>邨ゆｺ・＠縺溯ｩｦ蜷・/h2>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '15px' 
                  }}>
                    {games
                      .filter(({ state }) => state?.status === 'finished')
                      .sort((a, b) => {
                        // 譌･莉倥〒繧ｽ繝ｼ繝茨ｼ域眠縺励＞鬆・ｼ・                        return b.game.date.localeCompare(a.game.date);
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
                              隧ｦ蜷育ｵゆｺ・                            </div>
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

      {/* 驕ｸ謇倶ｸ隕ｧ繝｢繝ｼ繝繝ｫ */}
      {playerListOpen && selectedTeamId && (
        <Modal onClose={handleClosePlayerList}>
          <TeamPlayerList teamId={selectedTeamId} onClose={handleClosePlayerList} />
        </Modal>
      )}
    </div>
  );
};

export default HomePage;

