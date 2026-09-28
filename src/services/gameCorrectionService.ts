import { AtBat, GameSnapshot, Runners } from '../types/AtBat';
import { getAtBats, saveAtBat } from './atBatService';
import {
  getGameState,
  updateCountsRealtime,
  updateRunnersRealtime,
  setInningAndHalf,
  updateTiebreakRunnerIdRealtime,
} from './gameStateService';
import { getLineup } from './lineupService';
import { simulatePlay } from '../utils/gameSimulation';
import {
  isTiebreakHalf,
  markTiebreakScoredRunners,
  resolvePreviousBatterId,
} from '../utils/tiebreak';

/**
 * half 切替直後のタイブレーク走者配置。
 * 制限: 打順インデックスは GameState の現在値を使うため、過去 half の厳密な前打者復元は保証しない。
 * 次打席の元 situationBefore に2塁がいればそちらを優先する。
 */
const placeTiebreakRunnersForHalf = async (
  matchId: string,
  inning: number,
  half: 'top' | 'bottom',
  nextOriginalBefore: GameSnapshot | undefined
): Promise<{ runners: Runners; tiebreakRunnerId: string | null }> => {
  const empty: Runners = { '1': null, '2': null, '3': null };
  if (!isTiebreakHalf(inning)) {
    return { runners: empty, tiebreakRunnerId: null };
  }

  const fromNext = nextOriginalBefore?.runners?.['2'] ?? null;
  if (fromNext) {
    return { runners: { '1': null, '2': fromNext, '3': null }, tiebreakRunnerId: fromNext };
  }

  try {
    const [lineup, gs] = await Promise.all([getLineup(matchId), getGameState(matchId)]);
    const battingList = half === 'top' ? (lineup.home || []) : (lineup.away || []);
    const batIndex = half === 'top' ? (gs?.home_bat_index ?? 0) : (gs?.away_bat_index ?? 0);
    const previousId = resolvePreviousBatterId(battingList, batIndex);
    if (previousId) {
      return { runners: { '1': null, '2': previousId, '3': null }, tiebreakRunnerId: previousId };
    }
  } catch (e) {
    console.warn('Tiebreak placement in recalculateGame failed; leaving bases empty:', e);
  }

  return { runners: empty, tiebreakRunnerId: null };
};

/**
 * 試合の再計算を行うサービス
 * 指定された打席（修正済み）を起点に、それ以降の打席の状況（ランナー、アウト、得点など）を再シミュレーションする
 */
export const recalculateGame = async (matchId: string, modifiedAtBat: AtBat) => {
  // 1. 全打席を取得
  const allAtBats = await getAtBats(matchId);
  
  // 2. 修正対象の打席を特定・置換
  const index = allAtBats.findIndex(a => a.playId === modifiedAtBat.playId);
  if (index === -1) throw new Error('AtBat not found');
  
  allAtBats[index] = modifiedAtBat;
  
  // 修正された打席を保存
  await saveAtBat(modifiedAtBat);

  // 元の situationBefore を保持（タイブレーク2塁復元用）
  const originalBeforeByPlayId = new Map(
    allAtBats.map((a) => [a.playId, a.situationBefore ? { ...a.situationBefore, runners: { ...a.situationBefore.runners } } : undefined])
  );
  
  // 3. 以降の打席を再シミュレーション
  // 初期状態は修正された打席の「直後」の状態
  let currentState: GameSnapshot = { ...modifiedAtBat.situationAfter };
  let currentInning = modifiedAtBat.inning;
  let currentHalf = modifiedAtBat.topOrBottom;
  let activeTiebreakRunnerId: string | null = null;
  
  // 修正打席でチェンジになった場合
  if (currentState.outs >= 3) {
      if (currentHalf === 'top') {
          currentHalf = 'bottom';
      } else {
          currentHalf = 'top';
          currentInning++;
      }
      currentState.outs = 0;
      currentState.balls = 0;
      currentState.strikes = 0;
      const nextOriginal = allAtBats[index + 1]
        ? originalBeforeByPlayId.get(allAtBats[index + 1].playId)
        : undefined;
      const placed = await placeTiebreakRunnersForHalf(
        matchId,
        currentInning,
        currentHalf,
        nextOriginal
      );
      currentState.runners = placed.runners;
      activeTiebreakRunnerId = placed.tiebreakRunnerId;
  }
  
  for (let i = index + 1; i < allAtBats.length; i++) {
      const atBat = allAtBats[i];
      
      // 直前の状況を更新
      atBat.situationBefore = { ...currentState };
      atBat.inning = currentInning;
      atBat.topOrBottom = currentHalf;
      
      // 結果に基づいて直後の状況をシミュレーション
      const resultType = atBat.result?.type;
      if (resultType) {
          const simResult = simulatePlay(currentState, resultType, atBat.batterId);
          
          atBat.situationAfter = simResult.snapshot;
          atBat.scoredRunners = markTiebreakScoredRunners(
            simResult.scoredRunners.map((runnerId) => ({ runnerId, isRBI: true })),
            activeTiebreakRunnerId
          );
          if (atBat.result) {
             atBat.result.rbi = atBat.scoredRunners.filter((e) => e.isRBI).length;
          }
          if (
            activeTiebreakRunnerId &&
            !Object.values(atBat.situationAfter.runners).includes(activeTiebreakRunnerId)
          ) {
            activeTiebreakRunnerId = null;
          }
      } else {
          atBat.situationAfter = { ...currentState };
          atBat.scoredRunners = [];
      }
      
      // 次のループのためにcurrentStateを更新
      currentState = { ...atBat.situationAfter };
      
      // チェンジ判定
      if (currentState.outs >= 3) {
          if (currentHalf === 'top') {
              currentHalf = 'bottom';
          } else {
              currentHalf = 'top';
              currentInning++;
          }
          currentState.outs = 0;
          currentState.balls = 0;
          currentState.strikes = 0;
          const nextOriginal = allAtBats[i + 1]
            ? originalBeforeByPlayId.get(allAtBats[i + 1].playId)
            : undefined;
          const placed = await placeTiebreakRunnersForHalf(
            matchId,
            currentInning,
            currentHalf,
            nextOriginal
          );
          currentState.runners = placed.runners;
          activeTiebreakRunnerId = placed.tiebreakRunnerId;
      }
      
      // 更新された打席を保存
      await saveAtBat(atBat);
  }
  
  // 4. GameState（リアルタイム状況）を最終状態に合わせて更新
  await setInningAndHalf(matchId, currentInning, currentHalf);
  await updateCountsRealtime(matchId, { 
      b: currentState.balls, 
      s: currentState.strikes, 
      o: currentState.outs 
  });
  await updateRunnersRealtime(matchId, {
      '1b': currentState.runners['1'],
      '2b': currentState.runners['2'],
      '3b': currentState.runners['3']
  });
  await updateTiebreakRunnerIdRealtime(matchId, activeTiebreakRunnerId);
};
