import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReplayCard from './ReplayCard';
import CorrectionModal from './CorrectionModal';
import { getGame } from '../../services/gameService';
import { getAtBats } from '../../services/atBatService';
import { getPlayers } from '../../services/playerService';
import { recalculateGame } from '../../services/gameCorrectionService';
import { Game } from '../../types/Game';
import { AtBat, normalizeScoredRunners } from '../../types/AtBat';
import { Player } from '../../types/Player';

const ReplayView: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isViewerPath = location.pathname.includes('/viewer/');

  const [game, setGame] = useState<Game | null>(null);
  const [atBats, setAtBats] = useState<AtBat[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [scores, setScores] = useState<{top: number, bottom: number}[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const loadData = useCallback(async (isInitial = false) => {
    if (!matchId) return;
    setLoading(true);
    try {
      const [gameData, atBatsData] = await Promise.all([
        getGame(matchId),
        getAtBats(matchId)
      ]);

      if (gameData) {
        setGame(gameData);
        const [topPlayers, bottomPlayers] = await Promise.all([
          getPlayers(gameData.topTeam.id),
          getPlayers(gameData.bottomTeam.id)
        ]);
        
        const playerMap: Record<string, Player> = {};
        [...topPlayers, ...bottomPlayers].forEach(p => {
          playerMap[p.playerId] = p;
        });
        setPlayers(playerMap);
      }

      setAtBats(atBatsData);
      
      // Calculate scores
      let top = 0;
      let bottom = 0;
      const calculatedScores = atBatsData.map(atBat => {
        const currentScore = { top, bottom };
        const scoredList = normalizeScoredRunners(atBat.scoredRunners);
        if (atBat.topOrBottom === 'top') {
            top += scoredList.length;
        } else {
            bottom += scoredList.length;
        }
        return currentScore;
      });
      setScores(calculatedScores);

      if (isInitial && atBatsData.length > 0) {
          const isFinished = gameData?.status === 'FINISHED';
          setCurrentIndex(isFinished ? 0 : atBatsData.length - 1);
      }
    } catch (error) {
      console.error('Error loading replay data:', error);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const getPlayerName = (id: string) => {
    const p = players[id];
    if (p) return `${p.familyName} ${p.givenName}`;
    return '不明';
  };

  const handleNext = () => {
    if (currentIndex < atBats.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };
  
  const handleEdit = () => {
      setShowCorrectionModal(true);
  };

  const handleSaveCorrection = async (updatedAtBat: AtBat) => {
      if (!matchId) return;
      try {
          setLoading(true);
          await recalculateGame(matchId, updatedAtBat);
          setShowCorrectionModal(false);
          await loadData(false); // Reload but keep index? Or maybe reload current index data?
          // If we reload, atBats will be updated. currentIndex should point to the same play (by index).
      } catch (error) {
          console.error('Failed to recalculate:', error);
          alert('再計算に失敗しました');
          setLoading(false);
      }
  };

  if (loading && atBats.length === 0) return <div style={{ padding: 20, textAlign: 'center' }}>読み込み中...</div>;
  if (!game || atBats.length === 0) return <div style={{ padding: 20, textAlign: 'center' }}>データがありません</div>;

  const currentAtBat = atBats[currentIndex];
  const currentTeamId = currentAtBat.topOrBottom === 'top' ? game.topTeam.id : game.bottomTeam.id;
  const relevantPlayers = Object.values(players).filter(p => p.teamId === currentTeamId);

  const containerPadding = isMobile ? 12 : 20;
  const headerMarginBottom = isMobile ? 12 : 16;
  const titleFontSize = isMobile ? 16 : 18;

  return (
    <div style={{ padding: containerPadding, backgroundColor: '#f1f3f5', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: headerMarginBottom, display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={() => (isViewerPath ? navigate('/viewer') : navigate(-1))}
            style={{ 
                marginRight: '12px', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer', 
                fontSize: '16px',
                color: '#4c6ef5',
                minHeight: 44,
                padding: '8px 0',
            }}
          >
            ← 戻る
          </button>
          <h2 style={{ margin: 0, fontSize: titleFontSize, color: '#333', flex: 1 }}>
            リプレイ: {game.topTeam.name} vs {game.bottomTeam.name}
          </h2>
        </div>

        <ReplayCard
          compact={isMobile}
          atBat={currentAtBat}
          getPlayerName={getPlayerName}
          onNext={handleNext}
          onPrev={handlePrev}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < atBats.length - 1}
          onEdit={handleEdit}
          score={scores[currentIndex]}
          topTeamName={game.topTeam.shortName}
          bottomTeamName={game.bottomTeam.shortName}
        />
        
        <div style={{ textAlign: 'center', marginTop: '12px', color: '#888', fontSize: '12px' }}>
          {currentIndex + 1} / {atBats.length}
        </div>

        {showCorrectionModal && (
            <CorrectionModal
                atBat={currentAtBat}
                players={relevantPlayers}
                onSave={handleSaveCorrection}
                onCancel={() => setShowCorrectionModal(false)}
            />
        )}
      </div>
    </div>
  );
};

export default ReplayView;
