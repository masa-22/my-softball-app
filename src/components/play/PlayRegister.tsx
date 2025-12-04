/**
 * 1球・1プレー登録画面のメインコンポーネント
 * - 親としてgame_states購読・書き込み、ランナー進塁/アウト/得点のロジックを管理
 */
import React, { useEffect, useState, useMemo } from 'react';
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
import { PitchType } from './common/PitchTypeSelector';
import { RunnerMovementResult } from './RunnerMovementInput';

const POSITIONS = ['1','2','3','4','5','6','7','8','9','DP','PH','PR','TR'];

// PitchData の型定義（PitchCourseInput と合わせる）
interface PitchData {
  id: number;
  x: number;
  y: number;
  type: PitchType;
  order: number;
  result: 'swing' | 'looking' | 'ball' | 'inplay' | 'deadball' | 'foul';
}

// 座標計算用定数（StrikeZoneGridのサイズに合わせる）
const ZONE_WIDTH = 248;
const ZONE_HEIGHT = 310;

const calculateCourse = (x: number, y: number): number => {
  const col = Math.min(4, Math.max(0, Math.floor((x / ZONE_WIDTH) * 5)));
  const row = Math.min(4, Math.max(0, Math.floor((y / ZONE_HEIGHT) * 5)));
  return row * 5 + col + 1;
};

const toPercentage = (val: number, max: number): number => {
  return parseFloat(((val / max) * 100).toFixed(1));
};

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
  // positionだけでなく詳細を保持するように変更
  const [playDetailsForMovement, setPlayDetailsForMovement] = useState<{ position: string; batType: string }>({ position: '', batType: 'ground' });

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
  const [currentInningVal, setCurrentInningVal] = useState(1);
  const [pitches, setPitches] = useState<PitchData[]>([]);

  // 追加: gameState のBSOを購読（リアルタイム）
  React.useEffect(() => {
    if (!matchId) return;
    const update = () => {
      const gs = getGameState(matchId);
      if (gs) {
        setCurrentBSO({ b: gs.counts.b, s: gs.counts.s, o: gs.counts.o });
        setCurrentInningVal(gs.current_inning);
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
    if (!lineup || !currentBatter) return '';
    const entry = lineup.home.find((e: any) => e.playerId === currentBatter.playerId);
    if (!entry) return '';
    return entry.battingOrder === 10 ? '' : String(entry.battingOrder);
  }, [lineup, currentBatter]);

  // 現在打者の過去打席結果（直近から最大3件）
  const recentBatterResults = useMemo(() => {
    if (!matchId || !currentBatter) return [];
    const allAtBats = getAtBats(matchId);
    const myAtBats = allAtBats.filter(a => a.batterId === currentBatter.playerId && a.type === 'bat');

    // 表示用に変換
    const results = myAtBats.map(a => {
        let label = '';
        switch(a.result?.type) {
            case 'single': label = '安'; break;
            case 'double': label = '二'; break;
            case 'triple': label = '三'; break;
            case 'homerun': label = '本'; break;
            case 'walk': label = '四'; break;
            case 'deadball': label = '死'; break;
            case 'strikeout_swinging':
            case 'strikeout_looking':
            case 'droppedthird':
                label = '三振'; break;
            case 'groundout': label = 'ゴ'; break;
            case 'flyout': label = '飛'; break;
            case 'sac_bunt': label = '犠打'; break;
            case 'sac_fly': label = '犠飛'; break;
            case 'error': label = '失'; break;
            default: label = '他'; break;
        }
        return {
            inning: a.inning,
            half: a.topOrBottom,
            result: label
        };
    })
    .reverse()
    .slice(0, 3);
    return results;
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

    // 現在の回と球数
    const gs = getGameState(matchId);
    const currentInning = gs?.current_inning ?? 1;
    const currentHalf = gs?.top_bottom ?? 'top';

    const thisInningAtBats = pitcherAtBats.filter(
      a => a.inning === currentInning && a.topOrBottom === currentHalf
    );
    
    let total = 0;
    let strikes = 0;
    let balls = 0;
    
    thisInningAtBats.forEach(a => {
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
    const list = side === 'home' ? [...homeLineup] : [...awayLineup];
    list[index].position = value;
    side === 'home' ? setHomeLineup(list) : setAwayLineup(list);
  };

  const handlePlayerChange = (side: 'home' | 'away', index: number, value: string) => {
    const list = side === 'home' ? [...homeLineup] : [...awayLineup];
    list[index].playerId = value;
    side === 'home' ? setHomeLineup(list) : setAwayLineup(list);
  };

  // ▼ 追加: 差分検出のため前回保存時のスナップショットを保持
  const [prevHomeSnapshot, setPrevHomeSnapshot] = useState<any[]>([]);
  const [prevAwaySnapshot, setPrevAwaySnapshot] = useState<any[]>([]);

  const handleSidebarSave = async (side: 'home' | 'away') => {
    if (!matchId) return;
    const updatedLineup = { matchId, home: homeLineup, away: awayLineup };
    saveLineup(matchId, updatedLineup);

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
        const currentList = side === 'home' ? homeLineup : awayLineup;
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
          }
        }
      }

      // スナップショット更新
      setPrevHomeSnapshot(JSON.parse(JSON.stringify(homeLineup)));
      setPrevAwaySnapshot(JSON.parse(JSON.stringify(awayLineup)));
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
      const nextRunners = { ...runners };
      let runnersChanged = false;
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
      setPitches([]); // 打者変更時にリセット
    } else {
      const entry = lineup.away[awayBatIndex % lineup.away.length];
      const batter = awayPlayers.find(p => p.playerId === entry?.playerId) || null;
      setCurrentBatter(batter);
      setPitches([]); // 打者変更時にリセット
    }
  }, [currentHalf, lineup, homeBatIndex, awayBatIndex, homePlayers, awayPlayers]);

  // 追加: half 切替時に現在投手を更新（攻守交替対応）
  useEffect(() => {
    if (!lineup) return;
    if (currentHalf === 'top') {
      // 表：home攻撃 → awayが守備（投手はawayの「1」）
      const pitcherEntry = lineup.away.find((e: any) => e.position === '1');
      const pitcher = awayPlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
      setCurrentPitcher(pitcher);
    } else {
      // 裏：away攻撃 → homeが守備（投手はhomeの「1」）
      const pitcherEntry = lineup.home.find((e: any) => e.position === '1');
      const pitcher = homePlayers.find(p => p.playerId === pitcherEntry?.playerId) || null;
      setCurrentPitcher(pitcher);
    }
  }, [currentHalf, lineup, homePlayers, awayPlayers]);

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
    
    // フォアボール・デッドボールは明示的に 'walk' / 'deadball' として渡す
    // ※ 'single' ではなく正しい結果を渡すことで、RunnerMovementInput側で押し出し判定を行えるようにする
    const isDeadball = pitches.length > 0 && pitches[pitches.length - 1].result === 'deadball';
    setBattingResultForMovement(isDeadball ? 'deadball' : 'walk');
    
    setPlayDetailsForMovement({ position: '', batType: '' });
    setShowRunnerMovement(true);
    // BSリセット・打順前進は「最終確定時」に実施
  };

  // ランナー動き入力画面へ遷移（結果確定後に呼ばれる）
  const handleRunnerMovement = (battingResult: string, details: { position: string; batType: string }) => {
    // ランナーがいない状態でアウトの場合はランナー入力をスキップ
    const hasRunners = runners['1'] || runners['2'] || runners['3'];
    const isOut = ['groundout', 'flyout'].includes(battingResult);
    
    if (!hasRunners && isOut) {
      // 打者アウト+ランナーなし → ここでアウト加算とBSリセット、打順前進も行い確定扱い
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
            direction: details.position, // 誰が取ったか
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
      setPlayDetailsForMovement({ position: '', batType: '' });
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
             direction: playDetailsForMovement.position, // 誰が取ったか
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
        setPlayDetailsForMovement({ position: '', batType: '' });
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
        setPlayDetailsForMovement({ position: '', batType: '' });
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
          // 追加: 左サイドにも現在打者IDを渡す（攻撃側がawayのときハイライト）
          currentBatterId={currentBatter?.playerId}
        />
        <CenterPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showRunnerMovement={showRunnerMovement}
          showPlayResult={showPlayResult}
          currentBSO={currentBSO}
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
          // 追加: 右サイドにも現在投手IDを渡す（守備側がhomeのときハイライト）
          currentPitcherId={currentPitcher?.playerId}
        />
      </div>
    </div>
  );
};

export default PlayRegister;
