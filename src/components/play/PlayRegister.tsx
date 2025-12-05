/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - ロジックはカスタムフックに委譲し、Viewの構成に専念
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ScoreBoard from './ScoreBoard';
import LeftSidebar from './layout/LeftSidebar';
import CenterPanel from './layout/CenterPanel';
import RightSidebar from './layout/RightSidebar';
import { RunnerMovementResult } from './RunnerMovementInput';
import { useGameInput } from '../../hooks/useGameInput';
import { useLineupManager } from '../../hooks/useLineupManager';
import { useRunnerManager } from '../../hooks/useRunnerManager';
import { useGameProcessor } from '../../hooks/useGameProcessor';
import { getAtBats } from '../../services/atBatService';
import { POSITIONS } from '../../data/softball/positions';
import { BATTING_RESULTS } from '../../data/softball/battingResults';

// 座標計算用定数
const PLAY_LAYOUT_WIDTH = 1200;
const SCALE_BASE_WIDTH = 1400;
const MOBILE_BREAKPOINT = 768;

type MovementDetails = { position: string; batType: string; outfieldDirection: string };

const PlayRegister: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

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
    homeTeamName,
    awayTeamName,
    handlePositionChange,
    handlePlayerChange,
    handleSidebarSave,
    advanceBattingOrder,
    currentBattingOrder,
    recentBatterResults,
    offensePlayers,
    offenseTeamId,
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
    homeBatIndex,
    awayBatIndex,
    currentHalf,
    advanceBattingOrder,
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

  // 投手成績（表示用）
  const pitcherStats = useMemo(() => {
    if (!matchId || !currentPitcher) return { inningStr: '0', total: 0, strikes: 0, balls: 0, inning: 1, half: 'top' as 'top' | 'bottom' };
    
    const allAtBats = getAtBats(matchId);
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
  }, [matchId, currentPitcher, pitches, currentInningVal, currentHalf]);

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

  const handleWalkCommit = () => {
    setStrikeoutType(null);
    setPendingOutcome({ kind: 'walk' });
    setShowPlayResult(false);
    
    const isDeadball = pitches.length > 0 && pitches[pitches.length - 1].result === 'deadball';
    setBattingResultForMovement(isDeadball ? 'deadball' : 'walk');
    setPlayDetailsForMovement({ position: '', batType: 'walk', outfieldDirection: '' });
    setShowRunnerMovement(true);
  };

  const handleRunnerMovement = (battingResult: string, details: MovementDetails, outsAfterOverride?: number) => {
    const hasRunners = runners['1'] || runners['2'] || runners['3'];
    const isOut = ['groundout', 'flyout'].includes(battingResult);
    const nextO = currentBSO.o + (isOut ? 1 : 0);
    setRunnerMovementOutsAfterOverride(
      typeof outsAfterOverride === 'number' ? outsAfterOverride : null
    );

    // ランナーなしアウト -> 簡易処理
    if (!hasRunners && isOut) {
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

  const baseMovementOutsAfter = useMemo(() => {
    const isOut = ['groundout', 'flyout'].includes(battingResultForMovement);
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
          </div>
        </div>
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
              offenseTeamId={offenseTeamId}
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
      </div>
    </>
  );

  const scaled = desktopScale < 1 && desktopScale > 0;

  return (
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
  );
};

export default PlayRegister;
