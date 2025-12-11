/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - ロジックはカスタムフックに委譲し、Viewの構成に専念
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ScoreBoard from './ScoreBoard';
import LeftSidebar from './layout/LeftSidebar';
import CenterPanel from './layout/CenterPanel';
import RightSidebar from './layout/RightSidebar';
import { RunnerMovementResult } from './RunnerMovementInput';
import { useGameInput } from '../../hooks/useGameInput';
import { useLineupManager, SpecialEntryResolution } from '../../hooks/useLineupManager';
import { useRunnerManager } from '../../hooks/useRunnerManager';
import { useGameProcessor } from '../../hooks/useGameProcessor';
import { getAtBats } from '../../services/atBatService';
import { POSITIONS } from '../../data/softball/positions';
import { BATTING_RESULTS } from '../../data/softball/battingResults';
import { useBoxScoreData } from '../../hooks/useBoxScoreData';
import BoxScoreModal from './boxscore/BoxScoreModal';
import { useStatsData } from '../../hooks/useStatsData';
import StatsModal from './stats/StatsModal';
import { usePitcherStatsData, getPitchersForSelection } from '../../hooks/usePitcherStatsData';
import PitcherStatsModal from './pitcherStats/PitcherStatsModal';
import WinningPitcherModal from './pitcherStats/WinningPitcherModal';
import { setWinningPitcher, getWinningPitcher } from '../../services/winningPitcherService';
import { getGame } from '../../services/gameService';
import { getGameState } from '../../services/gameStateService';
import { getLineup } from '../../services/lineupService';
import SpecialSubstitutionModal from './substitution/SpecialSubstitutionModal';
import FinishGameButton from './FinishGameButton';
import { useGameStatus } from '../../hooks/useGameStatus';

// 座標計算用定数
const PLAY_LAYOUT_WIDTH = 1200;
const SCALE_BASE_WIDTH = 1400;
const MOBILE_BREAKPOINT = 768;

type MovementDetails = { 
  position: string; 
  batType: string; 
  outfieldDirection: string;
  fieldingOptions?: {
    putoutPosition?: string;
    assistPosition?: string;
  };
};

const PlayRegister: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const {
    status: gameStatus,
    isFinished: isGameFinished,
    startIfScheduled,
    finishGame,
    transitioning: statusTransitioning,
  } = useGameStatus(matchId);

  // 1. Game State (Realtime)
  const {
    runners,
    setRunners,
    handleRunnersChange,
    currentBSO,
    currentInningVal,
    currentHalf,
    pitches,
    setPitches,
    runnerEvents,
    addRunnerEvent,
    clearRunnerEvents,
    handleCountsChange,
    handleCountsReset
  } = useGameInput(matchId);

  // 2. Lineup & Players
  const {
    match, // offenseTeamId計算に使用
    homePlayers,
    awayPlayers,
    currentBatter,
    currentPitcher,
    homeBatIndex,
    awayBatIndex,
    homeLineupDraft,
    awayLineupDraft,
    homeLineup,
    awayLineup,
    homeTeamName,
    awayTeamName,
    allAtBats,
    handlePositionChange,
    handlePlayerChange,
    handleSidebarSave,
    advanceBattingOrder,
    currentBattingOrder,
    recentBatterResults,
    offensePlayers,
    offenseTeamId,
    specialEntries,
    applySpecialEntryResolutions,
  } = useLineupManager({
    matchId,
    currentHalf,
    runners,
    setRunners,
    setPitches,
  });

  // 3. Runner Operations
  const runnerManager = useRunnerManager({
    matchId,
    runners,
    setRunners,
    offensePlayers,
    currentBSO,
    recordRunnerEvent: addRunnerEvent,
  });

  // 4. Game Processing (Play Result)
  const currentInningInfo = useMemo(() => ({
    inning: currentInningVal,
    half: currentHalf,
  }), [currentInningVal, currentHalf]);

  const { processPlayResult, processQuickOut } = useGameProcessor({
    matchId,
    currentInningInfo,
    currentBSO,
    runners,
    setRunners,
    pitches,
    runnerEvents,
    clearRunnerEvents,
    currentBatter,
    currentPitcher,
    homeBatIndex: homeBatIndex ?? 0,
    awayBatIndex: awayBatIndex ?? 0,
    currentHalf,
    advanceBattingOrder,
    homeLineup,
    awayLineup,
  });

  // UI State
  const [activeTab, setActiveTab] = useState<'pitch' | 'runner'>('pitch');
  const [showPlayResult, setShowPlayResult] = useState(false);
  const [showRunnerMovement, setShowRunnerMovement] = useState(false);
  const [strikeoutType, setStrikeoutType] = useState<'swinging' | 'looking' | null>(null);
  const [battingResultForMovement, setBattingResultForMovement] = useState<string>('');
  const [playDetailsForMovement, setPlayDetailsForMovement] = useState<MovementDetails>({ position: '', batType: 'ground', outfieldDirection: '' });
  const [pendingOutcome, setPendingOutcome] = useState<{ kind: 'inplay' | 'strikeout' | 'walk'; battingResult?: string } | null>(null);
  const [desktopScale, setDesktopScale] = useState(1);
  const [runnerMovementOutsAfterOverride, setRunnerMovementOutsAfterOverride] = useState<number | null>(null);
  const [showBoxScore, setShowBoxScore] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPitcherStats, setShowPitcherStats] = useState(false);
  const [showWinningPitcherModal, setShowWinningPitcherModal] = useState(false);
  const [winningPitcherModalSide, setWinningPitcherModalSide] = useState<'home' | 'away' | null>(null);
  const [winningPitcherModalPitchers, setWinningPitcherModalPitchers] = useState<Array<{ playerId: string; player: any | undefined }>>([]);
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [specialModalDismissed, setSpecialModalDismissed] = useState(false);
  const specialEntriesKeyRef = useRef<string>('');
  const {
    data: boxScoreData,
    loading: boxScoreLoading,
    refresh: refreshBoxScore,
  } = useBoxScoreData(matchId);
  const {
    data: statsData,
    loading: statsLoading,
    refresh: refreshStats,
  } = useStatsData(matchId);
  const {
    data: pitcherStatsData,
    loading: pitcherStatsLoading,
    refresh: refreshPitcherStats,
  } = usePitcherStatsData(matchId);

  useEffect(() => {
    if (!matchId || gameStatus !== 'SCHEDULED') return;
    startIfScheduled();
  }, [matchId, gameStatus, startIfScheduled]);

  useEffect(() => {
    const key = specialEntries.map(entry => entry.id).join('|');
    if (key !== specialEntriesKeyRef.current) {
      specialEntriesKeyRef.current = key;
      setSpecialModalDismissed(false);
    }
    if (specialEntries.length === 0) {
      setShowSpecialModal(false);
      setSpecialModalDismissed(false);
      return;
    }
    if (!specialModalDismissed) {
      setShowSpecialModal(true);
    }
  }, [specialEntries, specialModalDismissed]);

  // 投手成績（表示用）
  const pitcherStats = useMemo(() => {
    if (!matchId || !currentPitcher || !Array.isArray(allAtBats)) return { inningStr: '0', total: 0, strikes: 0, balls: 0, inning: 1, half: 'top' as 'top' | 'bottom' };
    
    const pitcherAtBats = allAtBats.filter(a => a.pitcherId === currentPitcher.playerId);
    
    let totalOuts = 0;
    pitcherAtBats.forEach(a => {
        const outsAdded = Math.max(0, a.situationAfter.outs - a.situationBefore.outs);
        totalOuts += outsAdded;
    });

    const inningWhole = Math.floor(totalOuts / 3);
    const inningRemainder = totalOuts % 3;
    const inningStr = `${inningWhole}.${inningRemainder}`;

    // 現在の回
    const currentInning = currentInningVal;
    const currentH = currentHalf;
    
    let total = 0;
    let strikes = 0;
    let balls = 0;
    
    pitcherAtBats.forEach(a => {
        a.pitches.forEach(p => {
            total++;
            if (['swing', 'looking', 'foul', 'inplay'].includes(p.result)) strikes++;
            if (['ball', 'deadball'].includes(p.result)) balls++;
        });
    });
    
    // 現在入力中の球数も加算
    pitches.forEach(p => {
        total++;
        if (['swing', 'looking', 'foul', 'inplay'].includes(p.result)) strikes++;
        if (['ball', 'deadball'].includes(p.result)) balls++;
    });

    return { inningStr, total, strikes, balls, inning: currentInning, half: currentH };
  }, [matchId, currentPitcher, allAtBats, pitches, currentInningVal, currentHalf]);

  // UI Handlers
  const resetUI = () => {
    setShowPlayResult(false);
    setShowRunnerMovement(false);
    setStrikeoutType(null);
    setBattingResultForMovement('');
    setPlayDetailsForMovement({ position: '', batType: '', outfieldDirection: '' });
    setPendingOutcome(null);
    setRunnerMovementOutsAfterOverride(null);
  };

  const handleInplayCommit = () => {
    setStrikeoutType(null);
    setPendingOutcome({ kind: 'inplay' });
    setShowPlayResult(true);
  };

  const handleStrikeoutCommit = (isSwinging: boolean) => {
    setStrikeoutType(isSwinging ? 'swinging' : 'looking');
    setPendingOutcome({ kind: 'strikeout' });
    setShowPlayResult(true);
  };

  const handleWalkCommit = (isDeadball?: boolean) => {
    setStrikeoutType(null);
    setPendingOutcome({ kind: 'walk' });
    setShowPlayResult(false);
    
    // 死球フラグが渡されていない場合、最後のピッチを確認
    const deadball = isDeadball ?? (pitches.length > 0 && pitches[pitches.length - 1].result === 'deadball');
    setBattingResultForMovement(deadball ? 'deadball' : 'walk');
    setPlayDetailsForMovement({ position: '', batType: 'walk', outfieldDirection: '' });
    setShowRunnerMovement(true);
  };

  const handleOpenBoxScore = () => {
    refreshBoxScore();
    setShowBoxScore(true);
  };

  const handleCloseBoxScore = () => setShowBoxScore(false);

  const handleOpenStats = () => {
    refreshStats();
    setShowStats(true);
  };

  const handleCloseStats = () => setShowStats(false);

  const handleOpenPitcherStats = () => {
    refreshPitcherStats();
    setShowPitcherStats(true);
  };

  const handleClosePitcherStats = () => setShowPitcherStats(false);

  const handleOpenSpecialModal = () => {
    setSpecialModalDismissed(false);
    setShowSpecialModal(true);
  };

  const handleSpecialModalCancel = () => {
    setShowSpecialModal(false);
    setSpecialModalDismissed(true);
  };

  const handleSpecialModalSubmit = async (resolutions: SpecialEntryResolution[]) => {
    await applySpecialEntryResolutions(resolutions);
    refreshBoxScore();
  };

  const handleRunnerMovement = (battingResult: string, details: MovementDetails, outsAfterOverride?: number) => {
    const hasRunners = runners['1'] || runners['2'] || runners['3'];
    const isOut = ['groundout', 'flyout', 'strikeout_swinging', 'strikeout_looking', 'bunt_out', 'sacrifice_fly', 'sacrifice_bunt'].includes(battingResult);
    const nextO = currentBSO.o + (isOut ? 1 : 0);
    setRunnerMovementOutsAfterOverride(
      typeof outsAfterOverride === 'number' ? outsAfterOverride : null
    );

    // 2アウトでのフライアウトはRunnerMovementに移らず、自動的にアウトを加算しランナーを動かさずに保存
    if (currentBSO.o === 2 && battingResult === 'flyout') {
      // ランナーを動かさずに現在の位置を保持
      const movementResult: RunnerMovementResult = {
        afterRunners: { '1': runners['1'], '2': runners['2'], '3': runners['3'] },
        outsAfter: 3,
        scoredRunners: [],
        outDetails: [],
      };
      processPlayResult({
        movementResult,
        pendingOutcome: undefined,
        strikeoutType: null,
        battingResultForMovement: battingResult,
        playDetailsForMovement: details,
      },
      resetUI, // onComplete
      resetUI  // onCancel
      );
      return;
    }

    // ランナーなしアウト -> 簡易処理
    const isStrikeout = battingResult.startsWith('strikeout');
    
    // 2アウトでの三振はRunnerMovementに移らず、自動的にアウトを加算（捕手に刺殺）
    if (currentBSO.o === 2 && isStrikeout) {
      // 三振は捕手に刺殺が記録される（useGameProcessorで処理）
      processPlayResult({
        movementResult: undefined,
        pendingOutcome: { kind: 'strikeout' },
        strikeoutType,
        battingResultForMovement: '',
        playDetailsForMovement: { position: '', batType: '', outfieldDirection: '' },
      }, 
      resetUI, // onComplete
      resetUI  // onCancel
      );
      return;
    }
    // ランナーがいない場合の三振はRunnerMovementに移さず、直接処理する
    if (!hasRunners && isStrikeout) {
        // 三振は捕手に刺殺が記録される（useGameProcessorで処理）
        processPlayResult({
          movementResult: undefined,
          pendingOutcome: { kind: 'strikeout' },
          strikeoutType,
          battingResultForMovement: '',
          playDetailsForMovement: { position: '', batType: '', outfieldDirection: '' },
        }, 
        resetUI, // onComplete
        resetUI  // onCancel
        );
        return;
    }
    
    if (!hasRunners && isOut && !isStrikeout) {
        processQuickOut(battingResult, details);
        resetUI();
        return;
    }

    setBattingResultForMovement(battingResult);
    setPlayDetailsForMovement(details);
    setShowPlayResult(false);
    setShowRunnerMovement(true);
  };

  const handlePlayResultComplete = (movementResult?: RunnerMovementResult) => {
    processPlayResult({
      movementResult,
      pendingOutcome,
      strikeoutType,
      battingResultForMovement,
      playDetailsForMovement,
    }, 
    resetUI, // onComplete
    () => { // onCancel (RunnerMovementInputでキャンセルされた場合など)
       // 入力内容はクリアしない方が親切かもしれないが、一旦 PitchCourseInput (初期状態) に戻る挙動にする
       // 必要なら resetUI ではなく showRunnerMovement(false) だけにする等の調整が可能
       setShowRunnerMovement(false);
       setBattingResultForMovement('');
       setPlayDetailsForMovement({ position: '', batType: '', outfieldDirection: '' });
    });
  };

  // Resize Logic
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width <= MOBILE_BREAKPOINT) {
        setDesktopScale(1);
        return;
      }
      const ratio = Math.min(1, width / SCALE_BASE_WIDTH);
      setDesktopScale(ratio);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 勝利投手モーダル用の投手リストを取得
  useEffect(() => {
    if (!matchId || !winningPitcherModalSide) {
      setWinningPitcherModalPitchers([]);
      return;
    }
    const loadPitchers = async () => {
      try {
        const pitchers = await getPitchersForSelection(matchId, winningPitcherModalSide);
        setWinningPitcherModalPitchers(pitchers);
      } catch (error) {
        console.error('Error loading pitchers for selection:', error);
        setWinningPitcherModalPitchers([]);
      }
    };
    loadPitchers();
  }, [matchId, winningPitcherModalSide]);

  const baseMovementOutsAfter = useMemo(() => {
    const isOut = ['groundout', 'flyout', 'strikeout_swinging', 'strikeout_looking', 'bunt_out', 'sacrifice_fly', 'sacrifice_bunt'].includes(battingResultForMovement);
    return Math.min(3, currentBSO.o + (isOut ? 1 : 0));
  }, [battingResultForMovement, currentBSO.o]);

  const movementInitialOuts = currentBSO.o;
  const movementPresetOutsAfter = runnerMovementOutsAfterOverride ?? baseMovementOutsAfter;

  const battingResultDisplayLabel = useMemo(() => {
    if (!battingResultForMovement) return '';
    const definition = BATTING_RESULTS[battingResultForMovement as keyof typeof BATTING_RESULTS];
    const defaultLabel = definition?.name ?? battingResultForMovement;
    if (['groundout', 'flyout'].includes(battingResultForMovement) && playDetailsForMovement.position) {
      const short = POSITIONS[playDetailsForMovement.position]?.shortName || '';
      if (!short) return defaultLabel;
      return `${short}${battingResultForMovement === 'groundout' ? 'ゴロ' : '飛'}`;
    }
    return defaultLabel;
  }, [battingResultForMovement, playDetailsForMovement.position]);

  const playAreaLocked = isGameFinished;

  const desktopContent = (
    <>
      <style>{`
        .play-register-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 10px;
          background-color: #f8f9fa;
          box-sizing: border-box;
        }
        
        .play-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: minmax(200px, 280px) minmax(300px, 1fr) minmax(200px, 280px);
          grid-template-areas: "left center right";
          align-items: start;
        }

        .area-scoreboard {
          display: block;
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .boxscore-trigger {
          margin-top: 8px;
          display: flex;
          justify-content: flex-start;
        }

        .boxscore-button {
          border: none;
          background-color: #1c7ed6;
          color: #fff;
          padding: 8px 18px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
          margin-right: 8px;
        }

        .boxscore-button:hover {
          background-color: #1971c2;
        }

        .boxscore-button:disabled {
          background-color: #adb5bd;
          cursor: not-allowed;
        }

        .special-button {
          border: 1px solid #f08c00;
          background-color: #fff4e6;
          color: #d9480f;
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .special-button:hover {
          background-color: #ffe8cc;
          border-color: #e8590c;
        }

        .special-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .play-grid-wrapper {
          position: relative;
        }

        .play-grid-wrapper.locked .play-grid {
          pointer-events: none;
          opacity: 0.4;
        }

        .play-grid-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 600;
          color: #495057;
          background-color: rgba(248, 249, 250, 0.75);
          border-radius: 12px;
          padding: 16px;
        }

        .area-center { grid-area: center; }
        .area-left { grid-area: left; }
        .area-right { grid-area: right; }

        @media (max-width: 768px) {
          .area-scoreboard { display: none; }
          .play-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto auto;
            grid-template-areas:
              "center center"
              "left right";
          }
        }
      `}</style>

      <div className="play-register-container">
        <div className="area-scoreboard">
          <div style={{ minWidth: 320 }}>
            <ScoreBoard />
            <div className="boxscore-trigger">
              <button
                type="button"
                className="boxscore-button"
                onClick={handleOpenBoxScore}
                disabled={!matchId}
              >
                ボックスを表示
              </button>
              <button
                type="button"
                className="boxscore-button"
                onClick={handleOpenStats}
                disabled={!matchId}
              >
                打者成績
              </button>
              <button
                type="button"
                className="boxscore-button"
                onClick={handleOpenPitcherStats}
                disabled={!matchId}
              >
                投手成績
              </button>
              {specialEntries.length > 0 && (
                <button
                  type="button"
                  className="special-button"
                  onClick={handleOpenSpecialModal}
                  disabled={showSpecialModal}
                >
                  交代処理 ({specialEntries.length})
                </button>
              )}
              <div style={{ marginLeft: 'auto' }}>
                <FinishGameButton
                  status={gameStatus}
                  onFinish={async () => {
                    if (!matchId) return;
                    const game = await getGame(matchId);
                    if (!game) return;
                    const gameState = await getGameState(matchId);
                    if (!gameState) return;

                    // 試合終了前に勝利投手の選択が必要かチェック
                    const atBats = await getAtBats(matchId);
                    const lineup = await getLineup(matchId);
                    
                    // 勝ちチームを判定
                    const finalHomeScore = gameState.scores.top_total;
                    const finalAwayScore = gameState.scores.bottom_total;
                    const winningTeam = finalHomeScore > finalAwayScore ? 'home' : finalAwayScore > finalHomeScore ? 'away' : null;

                    if (winningTeam) {
                      // 条件3かどうかをチェック
                      const winningSide = winningTeam === 'home' ? 'home' : 'away';
                      const pitchers = await getPitchersForSelection(matchId, winningSide);
                      
                      // 先発投手を特定
                      const startingPitcher = pitchers.find((p) => {
                        const lineupSide = winningSide === 'home' ? lineup.away : lineup.home;
                        const pitcherEntry = lineupSide.find((e) => e.position === '1');
                        return pitcherEntry?.playerId === p.playerId;
                      }) || pitchers[0];

                      const reliefPitchers = pitchers.filter((p) => p.playerId !== startingPitcher?.playerId);
                      
                      // 条件3の場合（2人以上の救援投手が出場した場合）
                      if (reliefPitchers.length >= 2) {
                        // 既に選択されているかチェック
                        try {
                          const savedWinningPitcher = await getWinningPitcher(matchId, winningSide);
                          if (!savedWinningPitcher) {
                            // モーダルを表示
                            setWinningPitcherModalSide(winningSide);
                            setShowWinningPitcherModal(true);
                            return; // 試合終了はモーダルで選択後に実行
                          }
                        } catch (error) {
                          console.error('Error getting winning pitcher:', error);
                          // エラーが発生した場合もモーダルを表示
                          setWinningPitcherModalSide(winningSide);
                          setShowWinningPitcherModal(true);
                          return;
                        }
                      }
                    }

                    // 試合終了
                    await finishGame();
                  }}
                  busy={statusTransitioning}
                  disabled={!matchId}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={`play-grid-wrapper${playAreaLocked ? ' locked' : ''}`}>
          <div className="play-grid">
            <div className="area-center">
              <CenterPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                showRunnerMovement={showRunnerMovement}
                showPlayResult={showPlayResult}
                currentBSO={currentBSO}
                initialOuts={movementInitialOuts}
                presetOutsAfter={movementPresetOutsAfter}
                battingResultLabel={battingResultDisplayLabel}
                pitches={pitches}
                onPitchesChange={setPitches}
                offenseTeamId={offenseTeamId}
                playDetails={playDetailsForMovement}
                runners={runners}
                currentBatterId={currentBatter?.playerId}
                battingResultForMovement={battingResultForMovement}
                onPlayResultComplete={handlePlayResultComplete}
                onInplayCommit={handleInplayCommit}
                onStrikeoutCommit={handleStrikeoutCommit}
                onWalkCommit={handleWalkCommit}
                onRunnerMovement={handleRunnerMovement}
                onRunnersChange={handleRunnersChange}
                onCountsChange={handleCountsChange}
                onCountsReset={handleCountsReset}
                strikeoutType={strikeoutType}
                offensePlayers={offensePlayers}
                baseLabel={runnerManager.baseLabel}
                getRunnerName={runnerManager.getRunnerName}
                onRunnerBaseClick={runnerManager.handleRunnerBaseClick}
                onAddOutClick={runnerManager.handleAddOutClick}
                showAdvanceDialog={runnerManager.showAdvanceDialog}
                pendingAdvancements={runnerManager.pendingAdvancements}
                onAdvanceConfirm={runnerManager.handleRunnerAdvanceConfirm}
                showOutDialog={runnerManager.showOutDialog}
                pendingOuts={runnerManager.pendingOuts}
                onOutConfirm={runnerManager.handleRunnerOutConfirm}
                onDialogCancel={runnerManager.handleRunnerDialogCancel}
                showAddOutDialog={runnerManager.showAddOutDialog}
                selectedOutRunner={runnerManager.selectedOutRunner}
                onSelectOutRunner={runnerManager.handleSelectOutRunner}
                onAddOutConfirm={runnerManager.handleAddOutConfirm}
                onAddOutCancel={runnerManager.handleAddOutCancel}
              />
            </div>
            
            <div className="area-left">
              <LeftSidebar
                teamName={awayTeamName}
                lineup={awayLineupDraft}
                players={awayPlayers}
                currentPitcher={currentPitcher}
                pitcherStats={pitcherStats}
                runners={runners}
                onPositionChange={(idx, val) => handlePositionChange('away', idx, val)}
                onPlayerChange={(idx, val) => handlePlayerChange('away', idx, val)}
                onSave={() => handleSidebarSave('away')}
                currentBatterId={currentBatter?.playerId}
                matchId={matchId || ''}
              />
            </div>

            <div className="area-right">
              <RightSidebar
                teamName={homeTeamName}
                lineup={homeLineupDraft}
                players={homePlayers}
                currentBatter={currentBatter}
                recentBatterResults={recentBatterResults}
                runners={runners}
                onPositionChange={(idx, val) => handlePositionChange('home', idx, val)}
                onPlayerChange={(idx, val) => handlePlayerChange('home', idx, val)}
                onSave={() => handleSidebarSave('home')}
                currentBattingOrder={currentBattingOrder}
                currentPitcherId={currentPitcher?.playerId}
                matchId={matchId || ''}
              />
            </div>
          </div>
          {playAreaLocked && (
            <div className="play-grid-overlay">
              この試合は終了済みのため、記録の閲覧のみ可能です。
            </div>
          )}
        </div>
      </div>
    </>
  );

  const scaled = desktopScale < 1 && desktopScale > 0;

  return (
    <>
      <SpecialSubstitutionModal
        open={showSpecialModal && specialEntries.length > 0}
        entries={specialEntries}
        onSubmit={handleSpecialModalSubmit}
        onCancel={handleSpecialModalCancel}
      />
      <BoxScoreModal
        open={showBoxScore}
        data={boxScoreData}
        loading={boxScoreLoading}
        onClose={handleCloseBoxScore}
      />
      <StatsModal
        open={showStats}
        data={statsData}
        loading={statsLoading}
        onClose={handleCloseStats}
      />
      <PitcherStatsModal
        open={showPitcherStats}
        data={pitcherStatsData}
        loading={pitcherStatsLoading}
        onClose={handleClosePitcherStats}
        matchId={matchId}
      />
      {winningPitcherModalSide && (
        <WinningPitcherModal
          open={showWinningPitcherModal}
          pitchers={winningPitcherModalPitchers}
          onSelect={async (pitcherId) => {
            if (matchId && winningPitcherModalSide) {
              try {
                await setWinningPitcher(matchId, winningPitcherModalSide, pitcherId);
              } catch (error) {
                console.error('Error setting winning pitcher:', error);
              }
              setShowWinningPitcherModal(false);
              setWinningPitcherModalSide(null);
              // 試合終了を実行
              finishGame();
            }
          }}
          onCancel={() => {
            setShowWinningPitcherModal(false);
            setWinningPitcherModalSide(null);
          }}
        />
      )}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      {scaled ? (
        <div style={{ width: PLAY_LAYOUT_WIDTH * desktopScale }}>
          <div
            style={{
              width: PLAY_LAYOUT_WIDTH,
              transform: `scale(${desktopScale})`,
              transformOrigin: 'top left',
            }}
          >
            {desktopContent}
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: PLAY_LAYOUT_WIDTH }}>{desktopContent}</div>
      )}
      </div>
    </>
  );
};

export default PlayRegister;
