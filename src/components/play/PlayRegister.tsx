/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - スコアボード、打者・投手、コース入力、ランナー状況などを表示
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ScoreBoard from './ScoreBoard';
import { getMatches } from '../../services/matchService';
import { getLineup, saveLineup } from '../../services/lineupService';
import { getPlayers } from '../../services/playerService';
import { getPlays } from '../../services/playService';
import { getTeams } from '../../services/teamService';
import { getGameState, updateCountsRealtime, resetCountsRealtime } from '../../services/gameStateService';
import LeftSidebar from './layout/LeftSidebar.tsx';
import CenterPanel from './layout/CenterPanel.tsx';
import RightSidebar from './layout/RightSidebar.tsx';

const POSITIONS = ['1','2','3','4','5','6','7','8','9','DP','PH','PR','TR'];

const PlayRegister: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

  const [match, setMatch] = useState<any>(null);
  const [lineup, setLineup] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
  const [currentBatter, setCurrentBatter] = useState<any>(null);
  const [currentPitcher, setCurrentPitcher] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pitch' | 'runner'>('pitch');
  
  // 追加: プレー結果入力モード
  const [showPlayResult, setShowPlayResult] = useState(false);
  const [showRunnerMovement, setShowRunnerMovement] = useState(false);
  const [strikeoutType, setStrikeoutType] = useState<'swinging' | 'looking' | null>(null);
  const [battingResultForMovement, setBattingResultForMovement] = useState<string>(''); // 追加
  const [positionForMovement, setPositionForMovement] = useState<string>(''); // 追加

  // 追加: サイドバー編集用 state（先攻/後攻）
  const [homeLineup, setHomeLineup] = useState<any[]>([]);
  const [awayLineup, setAwayLineup] = useState<any[]>([]);
  const [homeTeamName, setHomeTeamName] = useState<string>('先攻');
  const [awayTeamName, setAwayTeamName] = useState<string>('後攻');

  // 追加: ランナー状態を管理
  const [runners, setRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({
    '1': null, '2': null, '3': null,
  });

  // ▼ 追加: gameState のランナー購読（リアルタイム）
  React.useEffect(() => {
    if (!matchId) return;
    const update = () => {
      const gs = getGameState(matchId);
      if (gs) {
        setRunners({ '1': gs.runners['1b'], '2': gs.runners['2b'], '3': gs.runners['3b'] });
      }
    };
    update();
    const t = window.setInterval(update, 500);
    const onStorage = (e: StorageEvent) => { if (e.key === 'game_states') update(); };
    window.addEventListener('storage', onStorage);
    return () => { window.clearInterval(t); window.removeEventListener('storage', onStorage); };
  }, [matchId]);

  // 現在のBSO状態（追加）
  const [currentBSO, setCurrentBSO] = useState({ b: 0, s: 0, o: 0 });

  // 追加: gameState のBSOを購読（リアルタイム）
  React.useEffect(() => {
    if (!matchId) return;
    const update = () => {
      const gs = getGameState(matchId);
      if (gs) {
        setCurrentBSO({ b: gs.counts.b, s: gs.counts.s, o: gs.counts.o });
      }
    };
    update();
    const t = window.setInterval(update, 500);
    const onStorage = (e: StorageEvent) => { if (e.key === 'game_states') update(); };
    window.addEventListener('storage', onStorage);
    return () => { window.clearInterval(t); window.removeEventListener('storage', onStorage); };
  }, [matchId]);

  // ランナー変更ハンドラ
  const handleRunnersChange = (newRunners: { '1': string | null; '2': string | null; '3': string | null }) => {
    console.log('ランナー変更:', newRunners); // デバッグ用
    setRunners(newRunners);
  };

  // 追加: PitchCourseInputからのカウント更新要求を親で処理
  const handleCountsChange = (partial: { b?: number; s?: number; o?: number }) => {
    if (!matchId) return;
    // 現在値に部分更新を適用
    const next = { ...currentBSO, ...partial };
    setCurrentBSO(next);
    // DB反映は親で管理
    updateCountsRealtime(matchId, next);
  };

  const handleCountsReset = () => {
    if (!matchId) return;
    resetCountsRealtime(matchId);
    // ローカルも同期
    const gs = getGameState(matchId);
    if (gs) {
      setCurrentBSO({ b: gs.counts.b, s: gs.counts.s, o: gs.counts.o });
    } else {
      setCurrentBSO({ b: 0, s: 0, o: 0 });
    }
  };

  useEffect(() => {
    if (!matchId) return;
    const m = getMatches().find(x => x.id === matchId);
    setMatch(m);
    const l = getLineup(matchId);
    setLineup(l);
    if (m && l) {
      const homePs = getPlayers(m.homeTeamId);
      const awayPs = getPlayers(m.awayTeamId);
      setHomePlayers(homePs);
      setAwayPlayers(awayPs);
      // 打者・投手（仮）
      const batterEntry = l.home[0];
      const pitcherEntry = l.away.find((e: any) => e.position === '1');
      const batter = homePs.find(p => p.playerId === batterEntry?.playerId) || null;
      const pitcher = awayPs.find(p => p.playerId === pitcherEntry?.playerId) || null;
      setCurrentBatter(batter);
      setCurrentPitcher(pitcher);

      // 追加: サイドバー表示用ラインナップ
      setHomeLineup(l.home);
      setAwayLineup(l.away);

      // チーム名: teamService から取得して設定
      const teams = getTeams();
      const homeTeam = teams.find(t => String(t.id) === String(m.homeTeamId));
      const awayTeam = teams.find(t => String(t.id) === String(m.awayTeamId));
      setHomeTeamName(homeTeam ? homeTeam.teamName : '先攻');
      setAwayTeamName(awayTeam ? awayTeam.teamName : '後攻');
    }
  }, [matchId]);

  // 現在打者の打順（数字のみ）
  const currentBattingOrder = useMemo(() => {
    if (!lineup || !currentBatter) return '';
    const entry = lineup.home.find((e: any) => e.playerId === currentBatter.playerId);
    if (!entry) return '';
    return entry.battingOrder === 10 ? '' : String(entry.battingOrder);
  }, [lineup, currentBatter]);

  // 現在打者の過去打席結果（直近から最大3件）
  const recentBatterResults = useMemo(() => {
    if (!matchId || !currentBatter) return [];
    const plays = getPlays(matchId).filter(p => p.batterId === currentBatter.playerId);
    // 打席終了っぽい結果のみ簡易抽出（ヒット/アウト/四球/死球 など）
    const atBatResults = plays
      .filter(p => ['ヒット', 'アウト', '四球', '死球', '得点', '犠打', '犠飛'].includes(p.result))
      .map(p => ({ inning: p.inning, half: p.topOrBottom, result: p.result }))
      .reverse()
      .slice(0, 3);
    return atBatResults;
  }, [matchId, currentBatter]);

  // 投手の現在回・球数・ストライク/ボール数
  const pitcherStats = useMemo(() => {
    if (!matchId || !currentPitcher) return { inningStr: '0', total: 0, strikes: 0, balls: 0, inning: 1, half: 'top' as 'top' | 'bottom' };
    const plays = getPlays(matchId);
    // アウト数（当該投手が関与した「アウト」結果をカウント）
    const outs = plays.filter(p => p.pitcherId === currentPitcher.playerId && p.result === 'アウト').length;
    const inningWhole = Math.floor(outs / 3);
    const inningRemainder = outs % 3;
    const inningStr = `${inningWhole}.${inningRemainder}`; // 例: 5アウト => 1.2回

    // 現在進行中の回と球数（簡易集計）
    const last = plays.length ? plays[plays.length - 1] : undefined;
    const currentInning = last ? last.inning : 1;
    const currentHalf = last ? last.topOrBottom : 'top';

    const thisInningPlays = plays.filter(
      p => p.inning === currentInning && p.topOrBottom === currentHalf && p.pitcherId === currentPitcher.playerId
    );
    const strikes = thisInningPlays.filter(p => p.result === 'ストライク' || p.result === 'ファウル').length;
    const balls = thisInningPlays.filter(p => p.result === 'ボール' || p.result === '死球' || p.result === '四球').length;
    const total = thisInningPlays.length;

    return { inningStr, total, strikes, balls, inning: currentInning, half: currentHalf };
  }, [matchId, currentPitcher]);

  // 追加: ラインナップ編集ハンドラ
  const handlePositionChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineup] : [...awayLineup];
    list[index].position = value;
    side === 'home' ? setHomeLineup(list) : setAwayLineup(list);
  };

  const handlePlayerChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineup] : [...awayLineup];
    list[index].playerId = value;
    side === 'home' ? setHomeLineup(list) : setAwayLineup(list);
  };

  const handleSidebarSave = (side: 'home' | 'away') => {
    if (!matchId) return;
    const updatedLineup = side === 'home' 
      ? { home: homeLineup, away: awayLineup }
      : { home: homeLineup, away: awayLineup };
    saveLineup(matchId, updatedLineup);
  };

  // インプレイ登録時のコールバック
  const handleInplayCommit = () => {
    setStrikeoutType(null);
    setShowPlayResult(true);
  };

  // 三振登録時のコールバック（追加）
  const handleStrikeoutCommit = (isSwinging: boolean) => {
    setStrikeoutType(isSwinging ? 'swinging' : 'looking');
    setShowPlayResult(true);
  };

  // ランナー動き入力画面へ遷移（修正）
  const handleRunnerMovement = (battingResult: string, position: string) => {
    // ランナーがいない状態でアウトの場合はランナー入力をスキップ
    const hasRunners = runners['1'] || runners['2'] || runners['3'];
    const isOut = ['groundout', 'flyout'].includes(battingResult);
    
    if (!hasRunners && isOut) {
      // ランナーがいない状態でのアウトはそのまま完了
      setShowPlayResult(false);
      setShowRunnerMovement(false);
      setBattingResultForMovement('');
      setPositionForMovement('');
      return;
    }

    setBattingResultForMovement(battingResult);
    setPositionForMovement(position);
    setShowPlayResult(false);
    setShowRunnerMovement(true);
  };

  // フォアボール・デッドボール登録時のコールバック（修正）
  const handleWalkCommit = () => {
    setStrikeoutType(null);
    setShowPlayResult(false);
    setBattingResultForMovement('single'); // フォアボール・デッドボールは一塁扱い
    setPositionForMovement('');
    setShowRunnerMovement(true);
  };

  // プレー結果入力完了時のコールバック
  const handlePlayResultComplete = () => {
    setShowPlayResult(false);
    setShowRunnerMovement(false);
    setStrikeoutType(null);
    setBattingResultForMovement('');
    setPositionForMovement('');
    // 必要に応じてカウント・打者をリセット等
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20, backgroundColor: '#f8f9fa' }}>
      <ScoreBoard />
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr 280px', gap:16 }}>
        <LeftSidebar
          teamName={awayTeamName}
          lineup={awayLineup}
          players={awayPlayers}
          currentPitcher={currentPitcher}
          pitcherStats={pitcherStats}
          runners={runners}
          onPositionChange={(idx, val) => handlePositionChange('away', idx, val)}
          onPlayerChange={(idx, val) => handlePlayerChange('away', idx, val)}
          onSave={() => handleSidebarSave('away')}
        />
        <CenterPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showRunnerMovement={showRunnerMovement}
          showPlayResult={showPlayResult}
          currentBSO={currentBSO}
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
        />
        <RightSidebar
          teamName={homeTeamName}
          lineup={homeLineup}
          players={homePlayers}
          currentBatter={currentBatter}
          recentBatterResults={recentBatterResults}
          runners={runners}
          onPositionChange={(idx, val) => handlePositionChange('home', idx, val)}
          onPlayerChange={(idx, val) => handlePlayerChange('home', idx, val)}
          onSave={() => handleSidebarSave('home')}
          currentBattingOrder={currentBattingOrder}
        />
      </div>
    </div>
  );
};

export default PlayRegister;
