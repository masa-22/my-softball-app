/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - 親としてgame_states購読・書き込み、ランナー進塁/アウト/得点のロジックを管理
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ScoreBoard from './ScoreBoard';
import { getMatches } from '../../services/matchService';
import { getLineup, saveLineup } from '../../services/lineupService';
import { getPlayers } from '../../services/playerService';
import { getPlays } from '../../services/playService';
import { getTeams } from '../../services/teamService';
import { getGameState, updateCountsRealtime, resetCountsRealtime, updateRunnersRealtime, addRunsRealtime, closeHalfInningRealtime, updateMatchupRealtime } from '../../services/gameStateService';
import LeftSidebar from './layout/LeftSidebar';
import CenterPanel from './layout/CenterPanel';
import RightSidebar from './layout/RightSidebar';
import { RunnerAdvancement } from './runner/AdvanceReasonDialog';
import { RunnerOut } from './runner/OutReasonDialog';

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

  // 追加: 打順インデックス（homeが先攻）
  const [homeBatIndex, setHomeBatIndex] = useState<number>(0);
  const [awayBatIndex, setAwayBatIndex] = useState<number>(0);

  // 追加: 現在の攻撃側 half を gameState からリアルタイム購読
  const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>('top');
  useEffect(() => {
    if (!matchId) return;
    const update = () => {
      const gs = getGameState(matchId);
      if (gs) setCurrentHalf(gs.top_bottom);
    };
    update();
    const t = window.setInterval(update, 500);
    const onStorage = (e: StorageEvent) => { if (e.key === 'game_states') update(); };
    window.addEventListener('storage', onStorage);
    return () => { window.clearInterval(t); window.removeEventListener('storage', onStorage); };
  }, [matchId]);

  // 初期打者/投手設定時にインデックス初期化
  useEffect(() => {
    if (!lineup) return;
    setHomeBatIndex(0);
    setAwayBatIndex(0);
  }, [lineup]);

  // 追加: 現在の half と打順に応じて currentBatter を更新
  useEffect(() => {
    if (!lineup) return;
    // top = home が攻撃
    if (currentHalf === 'top') {
      const entry = lineup.home[homeBatIndex % lineup.home.length];
      const batter = homePlayers.find(p => p.playerId === entry?.playerId) || null;
      setCurrentBatter(batter);
    } else {
      const entry = lineup.away[awayBatIndex % lineup.away.length];
      const batter = awayPlayers.find(p => p.playerId === entry?.playerId) || null;
      setCurrentBatter(batter);
    }
  }, [currentHalf, lineup, homeBatIndex, awayBatIndex, homePlayers, awayPlayers]);

  // 打順を1つ進める（半イニングの攻撃側に応じて）
  const advanceBattingOrder = () => {
    if (!lineup) return;
    if (currentHalf === 'top') {
      setHomeBatIndex(idx => (idx + 1) % lineup.home.length);
    } else {
      setAwayBatIndex(idx => (idx + 1) % lineup.away.length);
    }
  };

  // 追加: 打撃結果確定時の後処理を遅延実行するためのペンディング状態
  // kind: 'inplay' | 'strikeout' | 'walk'
  const [pendingOutcome, setPendingOutcome] = useState<{ kind: 'inplay' | 'strikeout' | 'walk'; battingResult?: string } | null>(null);

  // インプレイ登録時のコールバック（結果選択画面へ遷移するだけ）
  const handleInplayCommit = () => {
    setStrikeoutType(null);
    setPendingOutcome({ kind: 'inplay' });
    setShowPlayResult(true);
    // カウント/打順/アウトの更新は「確定時」に実施
  };

  // 三振登録時のコールバック（結果選択画面へ遷移するだけ）
  const handleStrikeoutCommit = (isSwinging: boolean) => {
    setStrikeoutType(isSwinging ? 'swinging' : 'looking');
    setPendingOutcome({ kind: 'strikeout' });
    setShowPlayResult(true);
    // アウト加算・BSリセット・打順前進は「確定時」に実施
  };

  // フォアボール・デッドボール登録時のコールバック（進塁入力へ）
  const handleWalkCommit = () => {
    setStrikeoutType(null);
    setPendingOutcome({ kind: 'walk' });
    setShowPlayResult(false);
    setBattingResultForMovement('single'); // フォアボール・デッドボールは一塁扱い
    setPositionForMovement('');
    setShowRunnerMovement(true);
    // BSリセット・打順前進は「最終確定時」に実施
  };

  // ランナー動き入力画面へ遷移（結果確定後に呼ばれる）
  const handleRunnerMovement = (battingResult: string, position: string) => {
    // ランナーがいない状態でアウトの場合はランナー入力をスキップ
    const hasRunners = runners['1'] || runners['2'] || runners['3'];
    const isOut = ['groundout', 'flyout'].includes(battingResult);
    
    if (!hasRunners && isOut) {
      // 打者アウト+ランナーなし → ここでアウト加算とBSリセット、打順前進も行い確定扱い
      if (matchId) {
        const gs = getGameState(matchId);
        const currentO = gs?.counts.o ?? 0;
        const newO = Math.min(3, currentO + 1);
        updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
        if (newO >= 3) {
          closeHalfInningRealtime(matchId);
        }
      }
      // 打順前進（結果確定タイミング）
      advanceBattingOrder();
      // 状態クリア
      setPendingOutcome(null);

      // 進塁入力はスキップして閉じる
      setShowPlayResult(false);
      setShowRunnerMovement(false);
      setBattingResultForMovement('');
      setPositionForMovement('');
      return;
    }

    // ランナーあり → 進塁入力へ
    setBattingResultForMovement(battingResult);
    setPositionForMovement(position);
    setShowPlayResult(false);
    setShowRunnerMovement(true);
  };

  // プレー結果入力完了時のコールバック（打者更新・BSリセット・必要なアウト加算をここで実行）
  const handlePlayResultComplete = () => {
    // 打撃結果確定後の共通処理
    if (matchId) {
      const gs = getGameState(matchId);
      const currentO = gs?.counts.o ?? 0;

      // BSを0に（アウトは維持または加算後の値）
      // strikeout の場合のみアウト+1してから BS リセット
      if (pendingOutcome?.kind === 'strikeout') {
        const newO = Math.min(3, currentO + 1);
        updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
        if (newO >= 3) {
          closeHalfInningRealtime(matchId);
        }
      } else {
        updateCountsRealtime(matchId, { b: 0, s: 0, o: currentO });
      }
    }

    // 打順前進（確定タイミング）
    advanceBattingOrder();

    // 画面状態クリア
    setShowPlayResult(false);
    setShowRunnerMovement(false);
    setStrikeoutType(null);
    setBattingResultForMovement('');
    setPositionForMovement('');
    setPendingOutcome(null);
    // 必要に応じて他のリセット
  };

  // 追加: 攻撃側選手（親で計算）
  const currentInningInfo = useMemo(() => {
    if (!matchId) return { inning: 1, half: 'top' as 'top' | 'bottom' };
    const plays = getPlays(matchId);
    if (!plays.length) return { inning: 1, half: 'top' as 'top' | 'bottom' };
    const last = plays[plays.length - 1];
    return { inning: last.inning, half: last.topOrBottom };
  }, [matchId]);

  const offenseTeamId = useMemo(() => {
    if (!match) return null;
    return currentInningInfo.half === 'top' ? match.homeTeamId : match.awayTeamId;
  }, [match, currentInningInfo]);

  const offensePlayers = useMemo(() => {
    if (offenseTeamId == null) return [];
    return getPlayers(offenseTeamId);
  }, [offenseTeamId]);

  // 追加: RunnerStatus制御用状態
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [pendingAdvancements, setPendingAdvancements] = useState<RunnerAdvancement[]>([]);
  const [showOutDialog, setShowOutDialog] = useState(false);
  const [pendingOuts, setPendingOuts] = useState<RunnerOut[]>([]);
  const [showAddOutDialog, setShowAddOutDialog] = useState(false);
  const [selectedOutRunner, setSelectedOutRunner] = useState<{ runnerId: string; fromBase: '1' | '2' | '3' } | null>(null);
  const [previousRunners, setPreviousRunners] = useState<{ '1': string | null; '2': string | null; '3': string | null }>({ '1': null, '2': null, '3': null });

  // ラベル/名前解決（親提供）
  const baseLabel = (b: '1' | '2' | '3' | 'home') => (b === 'home' ? 'ホーム' : b === '1' ? '一塁' : b === '2' ? '二塁' : '三塁');
  const getRunnerName = (playerId: string | null) => {
    if (!playerId) return '';
    const p = offensePlayers.find(sp => sp.playerId === playerId);
    return p ? `${p.familyName} ${p.givenName}`.trim() : '';
  };

  // 直前の塁にいる最も近い走者（親で処理）
  const findNearestPriorRunner = (target: '2' | '3'): { fromBase: '1' | '2'; runnerId: string } | null => {
    if (target === '2') {
      if (runners['1']) return { fromBase: '1', runnerId: runners['1']! };
      return null;
    }
    if (runners['2']) return { fromBase: '2', runnerId: runners['2']! };
    if (runners['1']) return { fromBase: '1', runnerId: runners['1']! };
    return null;
  };

  // ベースクリック（親でロジック）
  const handleRunnerBaseClick = (base: '1' | '2' | '3' | 'home') => {
    if (!matchId) return;

    if (base === 'home') {
      const thirdRunner = runners['3'];
      if (!thirdRunner) return;
      const name = getRunnerName(thirdRunner) || '三塁走者';
      const ok = window.confirm(`${name}の得点を記録しますか？`);
      if (!ok) return;
      const next = { ...runners, '3': null };
      setPreviousRunners(next);
      setPendingAdvancements([{ runnerId: thirdRunner, runnerName: name, fromBase: '3', toBase: 'home' }]);
      setShowAdvanceDialog(true);
      return;
    }

    if (base === '1' || base === '2' || base === '3') {
      const currentRunnerId = runners[base];
      if (currentRunnerId) {
        const name = getRunnerName(currentRunnerId) || '走者';
        const ok = window.confirm(`${baseLabel(base)}のランナー「${name}」をアウトにしますか？`);
        if (!ok) return;
        const next = { ...runners, [base]: null } as typeof runners;
        setPreviousRunners(next);
        setPendingOuts([{ runnerId: currentRunnerId, runnerName: name, fromBase: base, outAtBase: base }]);
        setShowOutDialog(true);
        return;
      }
    }

    if (base === '2' || base === '3') {
      const prior = findNearestPriorRunner(base);
      if (!prior) return;
      const name = getRunnerName(prior.runnerId) || (prior.fromBase === '1' ? '一塁走者' : '二塁走者');
      const ok = window.confirm(`${name}を${baseLabel(base)}へ進塁として記録しますか？`);
      if (!ok) return;
      const next = { ...runners } as typeof runners;
      next[prior.fromBase] = null;
      next[base] = prior.runnerId;
      setPendingAdvancements([{ runnerId: prior.runnerId, runnerName: name, fromBase: prior.fromBase, toBase: base }]);
      setPreviousRunners(next);
      setShowAdvanceDialog(true);
    }
  };

  const handleRunnerDialogCancel = () => {
    setShowAdvanceDialog(false);
    setShowOutDialog(false);
    setPendingAdvancements([]);
    setPendingOuts([]);
  };

  const handleRunnerAdvanceConfirm = (results: any[]) => {
    const advs = [...pendingAdvancements];
    const next = { ...previousRunners };
    advs.forEach(adv => {
      if (adv.fromBase === '1' || adv.fromBase === '2' || adv.fromBase === '3') next[adv.fromBase] = null;
      if (adv.toBase === '1' || adv.toBase === '2' || adv.toBase === '3') next[adv.toBase] = adv.runnerId;
    });

    // ランナー更新
    updateRunnersRealtime(matchId!, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

    // 得点加算
    const scoredCount = advs.filter(a => a.toBase === 'home').length;
    if (scoredCount > 0) {
      const half = getGameState(matchId!)?.top_bottom || 'top';
      addRunsRealtime(matchId!, half, scoredCount);
    }

    // 同期・状態更新
    setRunners(next);
    setShowAdvanceDialog(false);
    setPendingAdvancements([]);
    try { window.dispatchEvent(new Event('game_states_updated')); } catch {}
  };

  const handleRunnerOutConfirm = (results: any[]) => {
    const outs = [...pendingOuts];
    const next = { ...previousRunners };
    outs.forEach(out => {
      if (out.fromBase === '1' || out.fromBase === '2' || out.fromBase === '3') next[out.fromBase] = null;
    });

    // ランナー更新
    updateRunnersRealtime(matchId!, { '1b': next['1'], '2b': next['2'], '3b': next['3'] });

    // アウト更新とイニング進行
    const gs = getGameState(matchId!);
    const currentO = gs?.counts.o ?? 0;
    const addO = outs.length;
    const newO = Math.min(3, currentO + addO);
    updateCountsRealtime(matchId!, { o: newO });
    if (newO >= 3) closeHalfInningRealtime(matchId!);

    setRunners(next);
    setShowOutDialog(false);
    setPendingOuts([]);
    try { window.dispatchEvent(new Event('game_states_updated')); } catch {}
  };

  const handleAddOutClick = () => setShowAddOutDialog(true);
  const handleSelectOutRunner = (runnerId: string, fromBase: '1' | '2' | '3') => setSelectedOutRunner({ runnerId, fromBase });
  const handleAddOutCancel = () => { setShowAddOutDialog(false); setSelectedOutRunner(null); };
  const handleAddOutConfirm = () => {
    if (!selectedOutRunner || !matchId) return;
    const { runnerId, fromBase } = selectedOutRunner;
    const name = getRunnerName(runnerId) || '走者';
    const next = { ...runners, [fromBase]: null } as typeof runners;
    setPreviousRunners(next);
    setPendingOuts([{ runnerId, runnerName: name, fromBase, outAtBase: fromBase }]);
    setShowAddOutDialog(false);
    setSelectedOutRunner(null);
    setShowOutDialog(true);
  };

  // ▼ 追加: 現在の打者・投手表示に合わせて game_states.matchup を常に更新
  useEffect(() => {
    if (!matchId) return;
    // 現在表示されている打者/投手を game_states.matchup に反映
    const batterId = currentBatter?.playerId ?? null;
    const pitcherId = currentPitcher?.playerId ?? null;
    // どちらかが存在する場合のみ更新
    if (batterId !== null || pitcherId !== null) {
      updateMatchupRealtime(matchId, {
        batter_id: batterId,
        pitcher_id: pitcherId,
      });
    }
  }, [matchId, currentBatter, currentPitcher]);

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
          offensePlayers={offensePlayers}
          baseLabel={baseLabel}
          getRunnerName={getRunnerName}
          onRunnerBaseClick={handleRunnerBaseClick}
          onAddOutClick={handleAddOutClick}
          showAdvanceDialog={showAdvanceDialog}
          pendingAdvancements={pendingAdvancements}
          onAdvanceConfirm={handleRunnerAdvanceConfirm}
          showOutDialog={showOutDialog}
          pendingOuts={pendingOuts}
          onOutConfirm={handleRunnerOutConfirm}
          onDialogCancel={handleRunnerDialogCancel}
          showAddOutDialog={showAddOutDialog}
          selectedOutRunner={selectedOutRunner}
          onSelectOutRunner={handleSelectOutRunner}
          onAddOutConfirm={handleAddOutConfirm}
          onAddOutCancel={handleAddOutCancel}
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
