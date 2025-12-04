/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - 親としてgame_states購読・書き込み、ランナー進塁/アウト/得点のロジックを管理
 */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ScoreBoard from './ScoreBoard';
// import { getMatches } from '../../services/matchService';
import { getLineup, saveLineup } from '../../services/lineupService';
import { getPlayers } from '../../services/playerService';
import { getTeams } from '../../services/teamService';
import { getGameState, updateCountsRealtime, resetCountsRealtime, updateRunnersRealtime, addRunsRealtime, closeHalfInningRealtime, updateMatchupRealtime } from '../../services/gameStateService';
import { getGame } from '../../services/gameService';
import LeftSidebar from './layout/LeftSidebar';
import CenterPanel from './layout/CenterPanel';
import RightSidebar from './layout/RightSidebar';
import { RunnerAdvancement } from './runner/AdvanceReasonDialog';
import { RunnerOut } from './runner/OutReasonDialog';
// ▼ 追加: lineupServiceの参加記録連携API
import { recordStartersFromLineup, applySubstitutionToLineup } from '../../services/lineupService';
// ▼ 追加: 参加記録の存在確認
import { getParticipations } from '../../services/participationService';
import { getAtBats, saveAtBat } from '../../services/atBatService';
import { AtBat } from '../../types/AtBat';
import { PitchType } from '../../types/PitchType';
import { PitchData } from '../../types/PitchData';
import { RunnerMovementResult } from './RunnerMovementInput';
import { POSITIONS } from '../../data/softball/positions';
import { 
  ZONE_WIDTH, ZONE_HEIGHT, 
  formatAtBatSummary, calculateCourse, toPercentage,
  getFielderLabel, getDirectionLabel 
} from '../../utils/scoreKeeping';
import { useGameInput } from '../../hooks/useGameInput';

// 座標計算用定数（StrikeZoneGridのサイズに合わせる）
const PLAY_LAYOUT_WIDTH = 1200;
const SCALE_BASE_WIDTH = 1400;
const MOBILE_BREAKPOINT = 768;

type MovementDetails = { position: string; batType: string; outfieldDirection: string };
type RecentResultDisplay = { playId: string; label: string; rbi: number };

const PlayRegister: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

  // カスタムフックを使用
  const {
    runners,
    setRunners,
    handleRunnersChange,
    currentBSO,
    setCurrentBSO,
    currentInningVal,
    currentHalf,
    setCurrentHalf, // 追加
    pitches,
    setPitches,
    handleCountsChange,
    handleCountsReset
  } = useGameInput(matchId);

  const [match, setMatch] = useState<any>(null);
  const [lineup, setLineup] = useState<any>(null);
  const [homePlayers, setHomePlayers] = useState<any[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<any[]>([]);
  const [currentBatter, setCurrentBatter] = useState<any>(null);
  const [currentPitcher, setCurrentPitcher] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pitch' | 'runner'>('pitch');
  const [homeBatIndex, setHomeBatIndex] = useState<number>(0);
  const [awayBatIndex, setAwayBatIndex] = useState<number>(0);
  // const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>('top'); // フックへ移動

  // 追加: プレー結果入力モード
  const [showPlayResult, setShowPlayResult] = useState(false);
  const [showRunnerMovement, setShowRunnerMovement] = useState(false);
  const [strikeoutType, setStrikeoutType] = useState<'swinging' | 'looking' | null>(null);
  const [battingResultForMovement, setBattingResultForMovement] = useState<string>(''); // 追加
  // positionだけでなく詳細を保持するように変更
  const [playDetailsForMovement, setPlayDetailsForMovement] = useState<MovementDetails>({ position: '', batType: 'ground', outfieldDirection: '' });

  // 追加: サイドバー編集用 state（先攻/後攻）
  const [homeLineup, setHomeLineup] = useState<any[]>([]);
  const [awayLineup, setAwayLineup] = useState<any[]>([]);
  const [homeLineupDraft, setHomeLineupDraft] = useState<any[]>([]);
  const [awayLineupDraft, setAwayLineupDraft] = useState<any[]>([]);
  const [homeTeamName, setHomeTeamName] = useState<string>('先攻');
  const [awayTeamName, setAwayTeamName] = useState<string>('後攻');

  // 追加: 初期化追跡用Ref
  const lineupInitialized = useRef(false);

  // 追加: PitchCourseInputからのカウント更新要求を親で処理
  // handleCountsChangeはフックから取得

  // handleCountsResetはフックから取得

  useEffect(() => {
    if (!matchId) return;
    // ▼ gamesから試合取得
    const g = getGame(matchId);
    setMatch(g ? {
      id: g.gameId,
      homeTeamId: g.topTeam.id,
      awayTeamId: g.bottomTeam.id,
      date: g.date,
      startTime: '', // Gameに時刻がないため空
    } : null);

    const l = getLineup(matchId);
    setLineup(l);

    if (g && l) {
      const homePs = getPlayers(g.topTeam.id);
      const awayPs = getPlayers(g.bottomTeam.id);
      setHomePlayers(homePs);
      setAwayPlayers(awayPs);

      // 打者・投手（仮）
      const batterEntry = l.home[0];
      const pitcherEntry = l.away.find((e: any) => e.position === '1');
      const batter = homePs.find(p => p.playerId === batterEntry?.playerId) || null;
      const pitcher = awayPs.find(p => p.playerId === pitcherEntry?.playerId) || null;
      setCurrentBatter(batter);
      setCurrentPitcher(pitcher);
      setPitches([]); // 打者変更時にリセットすべきだが、一旦初期化時にリセット

      // サイドバー表示用ラインナップ
      setHomeLineup(l.home);
      setAwayLineup(l.away);
      setHomeLineupDraft(l.home.map((entry: any) => ({ ...entry })));
      setAwayLineupDraft(l.away.map((entry: any) => ({ ...entry })));
      setPrevHomeSnapshot(l.home.map((entry: any) => ({ ...entry })));
      setPrevAwaySnapshot(l.away.map((entry: any) => ({ ...entry })));

      // チーム名
      const teams = getTeams();
      const homeTeam = teams.find(t => String(t.id) === String(g.topTeam.id));
      const awayTeam = teams.find(t => String(t.id) === String(g.bottomTeam.id));
      setHomeTeamName(homeTeam ? homeTeam.teamName : '先攻');
      setAwayTeamName(awayTeam ? awayTeam.teamName : '後攻');
    }
  }, [matchId]);

  // 現在打者の打順（数字のみ）
  const currentBattingOrder = useMemo(() => {
    if (!currentBatter) return '';
    const battingSide = currentHalf === 'top' ? homeLineup : awayLineup;
    if (!battingSide || battingSide.length === 0) return '';
    const entry = battingSide.find((e: any) => e.playerId === currentBatter.playerId);
    if (!entry) return '';
    return entry.battingOrder === 10 ? '' : String(entry.battingOrder);
  }, [homeLineup, awayLineup, currentBatter, currentHalf]);

  // 現在打者の過去打席結果（直近から最大3件）
  const recentBatterResults = useMemo<RecentResultDisplay[]>(() => {
    if (!matchId || !currentBatter) return [];
    const allAtBats = getAtBats(matchId);
    return allAtBats
      .filter(a => a.batterId === currentBatter.playerId && a.type === 'bat')
      .map(atBat => {
        const label = formatAtBatSummary(atBat);
        if (!label) return null;
        return {
          playId: atBat.playId,
          label,
          rbi: atBat.result?.rbi ?? 0,
        };
      })
      .filter((item): item is RecentResultDisplay => !!item)
      .reverse()
      .slice(0, 3);
  }, [matchId, currentBatter]);

  // 投手の現在回・球数・ストライク/ボール数
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
    const gs = getGameState(matchId);
    const currentInning = gs?.current_inning ?? 1;
    const currentHalf = gs?.top_bottom ?? 'top';
    
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

    return { inningStr, total, strikes, balls, inning: currentInning, half: currentHalf };
  }, [matchId, currentPitcher, pitches]);

  // 追加: ラインナップ編集ハンドラ
  const handlePositionChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineupDraft] : [...awayLineupDraft];
    list[index] = { ...list[index], position: value };
    side === 'home' ? setHomeLineupDraft(list) : setAwayLineupDraft(list);
  };

  const handlePlayerChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineupDraft] : [...awayLineupDraft];
    list[index] = { ...list[index], playerId: value };
    side === 'home' ? setHomeLineupDraft(list) : setAwayLineupDraft(list);
  };

  // ▼ 追加: 差分検出のため前回保存時のスナップショットを保持
  const [prevHomeSnapshot, setPrevHomeSnapshot] = useState<any[]>([]);
  const [prevAwaySnapshot, setPrevAwaySnapshot] = useState<any[]>([]);

  const handleSidebarSave = async (side: 'home' | 'away') => {
    if (!matchId) return;
    const nextHome = homeLineupDraft.map(entry => ({ ...entry }));
    const nextAway = awayLineupDraft.map(entry => ({ ...entry }));
    const updatedLineup = { matchId, home: nextHome, away: nextAway };
    saveLineup(matchId, updatedLineup);
    setHomeLineup(nextHome);
    setAwayLineup(nextAway);
    setLineup(updatedLineup);

    // 変更用ランナー状態（代走反映用）
    const newRunners = { ...runners };

    // ▼ participation 同期
    try {
      // 参加記録未作成ならスタメンとして記録
      const table = getParticipations(matchId);
      const noStartersYet = (table.home.length === 0 && table.away.length === 0);
      if (noStartersYet) {
        await recordStartersFromLineup(matchId);
      } else {
        // 差分検出して交代を記録
        const gs = getGameState(matchId);
        const inning = gs?.current_inning ?? 1;
        const kind: 'pinch_hitter' | 'pinch_runner' = 'pinch_hitter';

        // 対象サイドの打順ごとに前回との差分をチェック
        const currentList = side === 'home' ? homeLineupDraft : awayLineupDraft;
        const prevList = side === 'home' ? prevHomeSnapshot : prevAwaySnapshot;

        for (let i = 0; i < currentList.length; i++) {
          const cur = currentList[i];
          const prev = prevList[i];
          if (!prev) continue;

          // playerIdが変わった場合のみ交代として記録（空→選手、選手→別選手）
          const changed = (cur.playerId || '') !== (prev.playerId || '');
          const changedPos = (cur.position || '') !== (prev.position || '');
          if (changed || changedPos) {
            await applySubstitutionToLineup({
              matchId,
              side,
              battingOrder: cur.battingOrder,
              inPlayerId: cur.playerId,
              inning,
              kind,
              position: cur.position,
            });

            // 代走反映: 交代した選手がランナーに出ている場合、新しい選手に置き換える
            if (changed && prev.playerId) {
              (['1', '2', '3'] as const).forEach(base => {
                if (newRunners[base] === prev.playerId) {
                   newRunners[base] = cur.playerId || null;
                }
              });
            }
          }
        }
      }

      // スナップショット更新
      setPrevHomeSnapshot(nextHome.map(entry => ({ ...entry })));
      setPrevAwaySnapshot(nextAway.map(entry => ({ ...entry })));
    } catch (e) {
      console.warn('participation sync error', e);
    }

    // 追加: 現在の打者・投手・ランナーの整合性チェック
    try {
      const gs = getGameState(matchId);
      const half = gs?.top_bottom ?? currentHalf;

      // 投手の整合性（守備側の「1」）
      if (half === 'top') {
        const pitcherEntry = awayLineup.find((e: any) => e.position === '1');
        const nextPitcher = awayPlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
        if ((currentPitcher?.playerId || null) !== (nextPitcher?.playerId || null)) {
          setCurrentPitcher(nextPitcher);
        }
      } else {
        const pitcherEntry = homeLineup.find((e: any) => e.position === '1');
        const nextPitcher = homePlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
        if ((currentPitcher?.playerId || null) !== (nextPitcher?.playerId || null)) {
          setCurrentPitcher(nextPitcher);
        }
      }

      // 打者の整合性（攻撃側インデックスに連動）
      if (half === 'top') {
        const entry = homeLineup[homeBatIndex % Math.max(1, homeLineup.length)];
        const nextBatter = homePlayers.find(p => p.playerId === entry?.playerId) || null;
          if ((currentBatter?.playerId || null) !== (nextBatter?.playerId || null)) {
          setCurrentBatter(nextBatter);
          setPitches([]); // 打者変更時にリセット
        }
      } else {
        const entry = awayLineup[awayBatIndex % Math.max(1, awayLineup.length)];
        const nextBatter = awayPlayers.find(p => p.playerId === entry?.playerId) || null;
        if ((currentBatter?.playerId || null) !== (nextBatter?.playerId || null)) {
          setCurrentBatter(nextBatter);
          setPitches([]); // 打者変更時にリセット
        }
      }

      // ランナーの整合性（存在しないIDならクリア）
      const validIds = new Set<string>([
        ...homePlayers.map(p => p.playerId),
        ...awayPlayers.map(p => p.playerId),
      ]);
      const nextRunners = { ...newRunners }; // 更新されたランナー情報を使用
      let runnersChanged = false;
      
      // newRunnersと現在のrunnersを比較して変更があればフラグを立てる
      if (JSON.stringify(newRunners) !== JSON.stringify(runners)) {
        runnersChanged = true;
      }

      (['1','2','3'] as const).forEach(b => {
        const pid = nextRunners[b];
        if (pid && !validIds.has(pid)) {
          nextRunners[b] = null;
          runnersChanged = true;
        }
      });
      if (runnersChanged) {
        setRunners(nextRunners);
        updateRunnersRealtime(matchId, { '1b': nextRunners['1'], '2b': nextRunners['2'], '3b': nextRunners['3'] });
      }

      // matchup の再同期
      updateMatchupRealtime(matchId, {
        batter_id: currentBatter?.playerId ?? null,
        pitcher_id: currentPitcher?.playerId ?? null,
      });
    } catch (e) {
      console.warn('lineup integrity check error', e);
    }
  };

  // 初期打者/投手設定時にインデックス初期化
  useEffect(() => {
    if (!lineup || lineupInitialized.current) return;
    setHomeBatIndex(0);
    setAwayBatIndex(0);
    lineupInitialized.current = true;
  }, [lineup]);

  // 追加: 現在の half と打順に応じて currentBatter を更新
  useEffect(() => {
    const battingList = currentHalf === 'top' ? homeLineup : awayLineup;
    const battingIndex = currentHalf === 'top' ? homeBatIndex : awayBatIndex;
    const battingPlayers = currentHalf === 'top' ? homePlayers : awayPlayers;

    if (!battingList.length) return;
    const entry = battingList[battingIndex % battingList.length];
    const batter = battingPlayers.find(p => p.playerId === entry?.playerId) || null;
    setCurrentBatter(batter);
    setPitches([]); // 打者変更時にリセット
  }, [currentHalf, homeLineup, awayLineup, homeBatIndex, awayBatIndex, homePlayers, awayPlayers]);

  // 追加: half 切替時に現在投手を更新（攻守交替対応）
  useEffect(() => {
    const defenseLineup = currentHalf === 'top' ? awayLineup : homeLineup;
    const defensePlayers = currentHalf === 'top' ? awayPlayers : homePlayers;
    if (!defenseLineup.length) return;
    const pitcherEntry = defenseLineup.find((e: any) => e.position === '1');
    const pitcher = defensePlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
    setCurrentPitcher(pitcher);
  }, [currentHalf, homeLineup, awayLineup, homePlayers, awayPlayers]);

  // 打順を1つ進める（半イニングの攻撃側に応じて）
  const advanceBattingOrder = () => {
    if (currentHalf === 'top') {
      const length = homeLineup.length || 1;
      setHomeBatIndex(idx => (idx + 1) % length);
    } else {
      const length = awayLineup.length || 1;
      setAwayBatIndex(idx => (idx + 1) % length);
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
    
    // フォアボール・デッドボールは明示的に 'walk' / 'deadball' として渡す
    // ※ 'single' ではなく正しい結果を渡すことで、RunnerMovementInput側で押し出し判定を行えるようにする
    const isDeadball = pitches.length > 0 && pitches[pitches.length - 1].result === 'deadball';
    setBattingResultForMovement(isDeadball ? 'deadball' : 'walk');
    
    setPlayDetailsForMovement({ position: '', batType: 'walk', outfieldDirection: '' });
    setShowRunnerMovement(true);
    // BSリセット・打順前進は「最終確定時」に実施
  };

  // ランナー動き入力画面へ遷移（結果確定後に呼ばれる）
  const handleRunnerMovement = (battingResult: string, details: MovementDetails) => {
    // ランナーがいない状態でアウトの場合はランナー入力をスキップ
    const hasRunners = runners['1'] || runners['2'] || runners['3'];
    const isOut = ['groundout', 'flyout'].includes(battingResult);
    
    // 3アウト目になる場合はランナー選択をスキップ
    const nextO = currentBSO.o + (isOut ? 1 : 0);

    if ((!hasRunners && isOut) || (isOut && nextO >= 3)) {
      // 打者アウト+ランナーなし、または3アウト目 → ここでアウト加算とBSリセット、打順前進も行い確定扱い
      if (matchId) {
        // --- at_bats 保存処理 ---
        const gs = getGameState(matchId);
        const currentO = gs?.counts.o ?? 0;
        
        // 投球記録の変換
        const pitchRecords = pitches.map(p => ({
          seq: p.order,
          type: p.type,
          course: calculateCourse(p.x, p.y),
          x: toPercentage(p.x, ZONE_WIDTH),
          y: toPercentage(p.y, ZONE_HEIGHT),
          result: p.result,
        }));

        const newIndex = getAtBats(matchId).length + 1;
        const newPlayId = `${matchId}_${String(newIndex).padStart(3, '0')}`;

        const atBat: AtBat = {
          playId: newPlayId,
          matchId,
          index: newIndex,
          inning: currentInningInfo.inning,
          topOrBottom: currentInningInfo.half,
          type: 'bat',
          batterId: currentBatter?.playerId || '',
          pitcherId: currentPitcher?.playerId || '',
          battingOrder: currentHalf === 'top' ? homeBatIndex + 1 : awayBatIndex + 1, // 暫定
          result: {
            type: battingResult as any,
            fieldedBy: details.position || undefined,
          },
          situationBefore: {
            outs: currentO,
            runners: { '1': runners['1'], '2': runners['2'], '3': runners['3'] },
            balls: currentBSO.b,
            strikes: currentBSO.s,
          },
          situationAfter: {
            outs: Math.min(3, currentO + 1),
            runners: { '1': null, '2': null, '3': null }, // ランナーなしなので変化なし
            balls: 0,
            strikes: 0,
          },
          scoredRunners: [],
          pitches: pitchRecords,
          runnerEvents: [], // ランナーなしアウトなのでイベントなし
          playDetails: {
            batType: details.batType as any,
            direction: details.outfieldDirection || details.position,
            fielding: (() => {
              if (!details.position) return [];
              const fielding = [];
              if (battingResult === 'flyout') {
                // フライアウト: そのまま刺殺
                fielding.push({ position: details.position, action: 'putout', quality: 'clean' });
              } else if (battingResult === 'groundout') {
                // ゴロアウト:
                if (details.position === '3') {
                  // ファーストゴロ: 自らベースを踏んだとみなし刺殺
                  fielding.push({ position: details.position, action: 'putout', quality: 'clean' });
                } else {
                  // それ以外: 処理した選手が補殺、ファーストが刺殺
                  fielding.push({ position: details.position, action: 'assist', quality: 'clean' });
                  fielding.push({ position: '3', action: 'putout', quality: 'clean' });
                }
              } else {
                // その他: 一旦fielded
                fielding.push({ position: details.position, action: 'fielded', quality: 'clean' });
              }
              return fielding as any;
            })(),
          },
          timestamp: new Date().toISOString(),
        };
        saveAtBat(atBat);
        // -----------------------

        const newO = Math.min(3, currentO + 1);
        updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
        if (newO >= 3) {
          closeHalfInningRealtime(matchId);
          // 追加: UI側ランナーも即時クリア（攻守交替可視化）
          setRunners({ '1': null, '2': null, '3': null });
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
      setPlayDetailsForMovement({ position: '', batType: '', outfieldDirection: '' });
      return;
    }

    // ランナーあり → 進塁入力へ
    setBattingResultForMovement(battingResult);
    setPlayDetailsForMovement(details);
    setShowPlayResult(false);
    setShowRunnerMovement(true);
  };

  // プレー結果入力完了時のコールバック（打者更新・BSリセット・必要なアウト加算をここで実行）
  // 引数にRunnerMovementInputからの結果を受け取るように修正
  const handlePlayResultComplete = (movementResult?: RunnerMovementResult) => {
    // 打撃結果確定後の共通処理
    if (matchId) {
      const gs = getGameState(matchId);
      const currentO = gs?.counts.o ?? 0;

      if (!movementResult && pendingOutcome?.kind === 'strikeout') {
        const newO = Math.min(3, currentO + 1);

        // --- at_bats 保存処理 (三振) ---
        const pitchRecords = pitches.map(p => ({
          seq: p.order,
          type: p.type,
          course: calculateCourse(p.x, p.y),
          x: toPercentage(p.x, ZONE_WIDTH),
          y: toPercentage(p.y, ZONE_HEIGHT),
          result: p.result,
        }));

        const newIndex = getAtBats(matchId).length + 1;
        const newPlayId = `${matchId}_${String(newIndex).padStart(3, '0')}`;

        const atBat: AtBat = {
          playId: newPlayId,
          matchId,
          index: newIndex,
          inning: currentInningInfo.inning,
          topOrBottom: currentInningInfo.half,
          type: 'bat',
          batterId: currentBatter?.playerId || '',
          pitcherId: currentPitcher?.playerId || '',
          battingOrder: currentHalf === 'top' ? homeBatIndex + 1 : awayBatIndex + 1,
          result: {
            type: strikeoutType === 'swinging' ? 'strikeout_swinging' : 'strikeout_looking',
          },
          situationBefore: {
            outs: currentO,
            runners: { '1': runners['1'], '2': runners['2'], '3': runners['3'] },
            balls: currentBSO.b,
            strikes: currentBSO.s,
          },
          situationAfter: {
            outs: newO,
            runners: { '1': runners['1'], '2': runners['2'], '3': runners['3'] },
            balls: 0,
            strikes: 0,
          },
          scoredRunners: [],
          pitches: pitchRecords,
          runnerEvents: [], 
          playDetails: {
            fielding: [
              {
                position: '2', // 捕手
                action: 'putout',
                quality: 'clean',
              }
            ],
          },
          timestamp: new Date().toISOString(),
        };
        saveAtBat(atBat);
        // -----------------------

        updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
        if (newO >= 3) {
          closeHalfInningRealtime(matchId);
          // 追加: UI側ランナーも即時クリア
          setRunners({ '1': null, '2': null, '3': null });
        }
      } else if (movementResult) {
        // RunnerMovementInput から結果が返ってきた場合 (インプレイ、四死球など)
        const { afterRunners, outsAfter, scoredRunners, outDetails } = movementResult;

        // --- at_bats 保存処理 ---
        const pitchRecords = pitches.map(p => ({
          seq: p.order,
          type: p.type,
          course: calculateCourse(p.x, p.y),
          x: toPercentage(p.x, ZONE_WIDTH),
          y: toPercentage(p.y, ZONE_HEIGHT),
          result: p.result,
        }));

        const atBatResult: any = {
          type: battingResultForMovement, // 保存しておいた打撃結果を使用
        };
        
        if (playDetailsForMovement.position) {
          atBatResult.fieldedBy = playDetailsForMovement.position;
        }
        
        if (scoredRunners.length > 0) {
          atBatResult.rbi = scoredRunners.length;
        }

        const newIndex = getAtBats(matchId).length + 1;
        const newPlayId = `${matchId}_${String(newIndex).padStart(3, '0')}`;

        const atBat: AtBat = {
          playId: newPlayId,
          matchId,
          index: newIndex,
          inning: currentInningInfo.inning,
          topOrBottom: currentInningInfo.half,
          type: 'bat',
          batterId: currentBatter?.playerId || '',
          pitcherId: currentPitcher?.playerId || '',
          battingOrder: currentHalf === 'top' ? homeBatIndex + 1 : awayBatIndex + 1,
          result: atBatResult,
          situationBefore: {
            outs: currentO,
            runners: { '1': runners['1'], '2': runners['2'], '3': runners['3'] },
            balls: currentBSO.b,
            strikes: currentBSO.s,
          },
          situationAfter: {
            outs: outsAfter,
            runners: { '1': afterRunners['1'], '2': afterRunners['2'], '3': afterRunners['3'] },
            balls: 0,
            strikes: 0,
          },
          scoredRunners: scoredRunners,
          pitches: pitchRecords,
          runnerEvents: [], // TODO: movementResultからイベント詳細があれば変換
          playDetails: {
             batType: playDetailsForMovement.batType as any,
             direction: playDetailsForMovement.outfieldDirection || playDetailsForMovement.position,
             fielding: (() => {
               const list: any[] = [];
               // 1. 打球処理 (fielded)
               if (playDetailsForMovement.position) {
                 // outDetailsがない場合で、かつフライアウトなら刺殺とみなす（ランナーなしフライアウトなど）
                 // outDetailsがある場合はそちらでputoutが記録されるはずなので、ここはfieldedとする
                 const hasOutDetails = outDetails && outDetails.length > 0;
                 if (!hasOutDetails && battingResultForMovement === 'flyout') {
                    list.push({ position: playDetailsForMovement.position, action: 'putout', quality: 'clean' });
                 } else {
                    list.push({ position: playDetailsForMovement.position, action: 'fielded', quality: 'clean' });
                 }
               }

               // 2. 詳細なアウト記録 (assist / putout) - ランナー移動入力で入力されたもの
               if (outDetails) {
                 outDetails.forEach(d => {
                   if (d.threwPosition) {
                     list.push({ position: d.threwPosition, action: 'assist', quality: 'clean' });
                   }
                   if (d.caughtPosition) {
                     list.push({ position: d.caughtPosition, action: 'putout', quality: 'clean' });
                   }
                 });
               }
               return list;
             })(),
          },
          timestamp: new Date().toISOString(),
        };
        saveAtBat(atBat);
        
        // ランナー配置更新
        updateRunnersRealtime(matchId, {
          '1b': afterRunners['1'],
          '2b': afterRunners['2'],
          '3b': afterRunners['3'],
        });

        // 得点更新
        if (scoredRunners.length > 0) {
          const half = getGameState(matchId)?.top_bottom || 'top';
          addRunsRealtime(matchId, half, scoredRunners.length);
        }

        // アウト更新
        updateCountsRealtime(matchId, { o: outsAfter, b: 0, s: 0 }); // カウントもリセット

        // チェンジ判定
        if (outsAfter >= 3) {
          closeHalfInningRealtime(matchId);
          setRunners({ '1': null, '2': null, '3': null });
        }
        
        // 同一タブ内通知
        try { window.dispatchEvent(new Event('game_states_updated')); } catch {}

      } else {
         // キャンセルなどで何もしない場合
         // ただし三振以外のキャンセルはここでハンドルする必要があるかも？
         // 現状、三振以外で movementResult がない場合はキャンセル扱いとする
      }
    }

    // 打順前進（確定タイミング）
    // キャンセルの場合は打順を進めないようにする制御が必要
    // movementResultがある、または三振確定の場合のみ進める
    if (movementResult || (!movementResult && pendingOutcome?.kind === 'strikeout')) {
        advanceBattingOrder();
        
        // 画面状態クリア
        setShowPlayResult(false);
        setShowRunnerMovement(false);
        setStrikeoutType(null);
        setBattingResultForMovement('');
        setPlayDetailsForMovement({ position: '', batType: '', outfieldDirection: '' });
        setPendingOutcome(null);
    } else {
        // キャンセルの場合、入力画面を閉じるかどうか
        // RunnerMovementInputのキャンセルボタンは onCancel で呼ばれ、そこからここに来る
        // 単に閉じるだけでよい
        setShowRunnerMovement(false);
        // 入力内容はクリアしない方が親切かもしれないが、一旦クリアして前の画面（PlayResultPanel?）に戻すか、
        // あるいは RunnerMovementInput を閉じて PlayResultPanel を出すか。
        // ここでは単純に閉じて、PitchCourseInput (初期状態) に戻る挙動にする
        setBattingResultForMovement('');
        setPlayDetailsForMovement({ position: '', batType: '', outfieldDirection: '' });
    }
  };

  // 追加: 攻撃側選手（親で計算）
  const currentInningInfo = useMemo(() => {
    return { inning: currentInningVal, half: currentHalf };
  }, [currentInningVal, currentHalf]);

  // 修正: offenseTeamId は gameState の currentHalf を使用して決定
  const offenseTeamId = useMemo(() => {
    if (!match) return null;
    return currentHalf === 'top' ? match.homeTeamId : match.awayTeamId;
  }, [match, currentHalf]);

  // 修正: offensePlayers は offenseTeamId（= currentHalfに連動）で取得
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
  const [desktopScale, setDesktopScale] = useState(1);

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
    if (newO >= 3) {
      closeHalfInningRealtime(matchId!);
      // 追加: UI側ランナーも即時クリア
      setRunners({ '1': null, '2': null, '3': null });
    }

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

  // ランナー選択画面用のアウトカウント（フライアウト等の場合、+1した状態を表示）
  const movementInitialOuts = useMemo(() => {
    const isOut = ['groundout', 'flyout'].includes(battingResultForMovement);
    return Math.min(3, currentBSO.o + (isOut ? 1 : 0));
  }, [battingResultForMovement, currentBSO.o]);

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
          /* PC: 左(可変) 中(広め) 右(可変) */
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

        /* スマホ・縦画面 (幅が狭い場合) */
        @media (max-width: 768px) {
          .area-scoreboard {
            display: none; /* スコアボード非表示 */
          }

          .play-grid {
            /* 中央を上に、下段に左右を並べる */
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
              initialOuts={movementInitialOuts} // 追加
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
              offenseTeamId={offenseTeamId} // 追加
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
              // 追加: 左サイドにも現在打者IDを渡す（攻撃側がawayのときハイライト）
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
              // 追加: 右サイドにも現在投手IDを渡す（守備側がhomeのときハイライト）
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
