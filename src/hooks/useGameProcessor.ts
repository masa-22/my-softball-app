import { getGameState, updateCountsRealtime, closeHalfInningRealtime, updateRunnersRealtime, addRunsRealtime, updateTiebreakRunnerIdRealtime } from '../services/gameStateService';
import { closeTemporaryRunner } from '../services/participationService';
import { allocateNextPlaySlot, saveAtBat } from '../services/atBatService';
import { calculateCourse, toPercentage, ZONE_WIDTH, ZONE_HEIGHT } from '../utils/scoreKeeping';
import { calculateCountBeforePitchOrder } from '../utils/pitchCount';
import { AtBat, RunnerEvent, FieldingAction, ScoredRunnerEntry, BaseType, RunnerEventType } from '../types/AtBat';
import { PitchData } from '../types/PitchData';
import { RunnerMovementResult } from '../components/play/RunnerMovementInput';
import { LineupEntry } from '../types/Lineup';
import { positionAbbrToCode } from '../data/softball/positions';
import {
  isTiebreakRunnerOnBase,
  localRunnersFromGameState,
  markTiebreakScoredRunners,
} from '../utils/tiebreak';

const createRunnerEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `runner-event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type RunnerMove = { runnerId: string; fromBase: BaseType; toBase: BaseType };

/** フライ・ライナー系: 走者のアウトは併殺ではなく走塁死として記録する */
const FLY_LINER_TYPES = new Set(['flyout', 'linerout', 'foul_fly', 'sacrifice_fly', 'sac_fly']);

/** フライ・ライナー系の打席で打者以外にアウトになった走者を走塁死イベント化 */
function buildFlyLinerRunoutEvents(
  battingResult: string,
  outDetails: RunnerMovementResult['outDetails'] | undefined,
  runners: { '1': string | null; '2': string | null; '3': string | null },
  batterId: string
): RunnerEvent[] {
  if (!FLY_LINER_TYPES.has(battingResult)) return [];
  const events: RunnerEvent[] = [];
  (outDetails ?? [])
    .filter((d) => d.runnerId && d.runnerId !== batterId)
    .forEach((d) => {
      const fromBase = (['1', '2', '3'] as const).find((b) => runners[b] === d.runnerId);
      if (!fromBase) return;
      const outBase = (['1', '2', '3', 'home'].includes(d.base) ? d.base : fromBase) as BaseType;
      events.push({
        id: createRunnerEventId(),
        pitchSeq: null,
        eventSource: 'pitch',
        type: 'runout',
        runnerId: d.runnerId,
        fromBase,
        toBase: outBase,
        isOut: true,
        outDetail: {
          base: outBase,
          ...(d.threwPosition ? { threwPosition: d.threwPosition } : {}),
          ...(d.caughtPosition ? { caughtPosition: d.caughtPosition } : {}),
        },
      });
    });
  return events;
}

type AdvanceReason = 'hit' | 'error' | 'steal' | 'wildpitch' | 'passball';

function getAdvanceDistance(result: string): number {
  switch (result) {
    case 'single':
    case 'droppedthird':
    case 'error':
    case 'walk':
    case 'intentional_walk':
    case 'deadball':
      return 1;
    case 'double':
      return 2;
    case 'triple':
      return 3;
    case 'homerun':
    case 'runninghomerun':
      return 4;
    default:
      return 0;
  }
}

function toBaseToNum(base: BaseType): number {
  return base === 'home' ? 4 : Number(base);
}

function numToBase(n: number): BaseType {
  if (n >= 4) return 'home';
  return String(n) as '1' | '2' | '3';
}

function mapAdvanceReasonToEventType(reason: AdvanceReason | undefined): RunnerEventType {
  if (reason === 'wildpitch') return 'wildpitch';
  if (reason === 'passball') return 'passedball';
  if (reason === 'steal') return 'steal';
  if (reason === 'error') return 'error';
  return 'hit';
}

/** 打撃結果に対応する自然進塁分の RunnerEventType */
function naturalAdvanceEventType(battingResult: string): RunnerEventType {
  if (battingResult === 'error') return 'error';
  if (battingResult === 'walk' || battingResult === 'intentional_walk' || battingResult === 'deadball' || battingResult === 'droppedthird') {
    return 'advance';
  }
  return 'hit';
}

function computeRunnerMoves(
  runners: { '1': string | null; '2': string | null; '3': string | null },
  batterId: string,
  afterRunners: { '1': string | null; '2': string | null; '3': string | null },
  scoredRunners: ScoredRunnerEntry[]
): RunnerMove[] {
  const scoredIds = new Set(scoredRunners.map((r) => r.runnerId));
  const moves: RunnerMove[] = [];

  const bases = ['1', '2', '3'] as const;
  for (const base of bases) {
    const runnerId = runners[base];
    if (!runnerId) continue;
    if (scoredIds.has(runnerId)) {
      moves.push({ runnerId, fromBase: base, toBase: 'home' });
    } else {
      const toBase = (bases.find((b) => afterRunners[b] === runnerId) ?? null) as BaseType | null;
      if (toBase) moves.push({ runnerId, fromBase: base, toBase });
    }
  }
  if (batterId) {
    if (scoredIds.has(batterId)) {
      moves.push({ runnerId: batterId, fromBase: 'home', toBase: 'home' });
    } else {
      const toBase = (bases.find((b) => afterRunners[b] === batterId) ?? null) as BaseType | null;
      if (toBase) moves.push({ runnerId: batterId, fromBase: 'home', toBase });
    }
  }
  return moves;
}

/** 打撃プレー由来の進塁のみ RunnerEvent 化（mid-play は別ドキュメント済みのためマージしない） */
function buildBatRunnerEvents(
  moves: RunnerMove[],
  scoredRunnerReasons: Record<string, AdvanceReason> | undefined,
  battingResult: string,
  batterId: string
): RunnerEvent[] {
  const result: RunnerEvent[] = [];
  const naturalDist = getAdvanceDistance(battingResult);

  const pushEvent = (runnerId: string, fromBase: BaseType, toBase: BaseType, type: RunnerEventType) => {
    result.push({
      id: createRunnerEventId(),
      pitchSeq: null,
      eventSource: 'pitch',
      type,
      runnerId,
      fromBase,
      toBase,
      isOut: false,
    });
  };

  for (const m of moves) {
    const reason = scoredRunnerReasons?.[m.runnerId];
    const isBatter = m.runnerId === batterId && m.fromBase === 'home';
    const finalNum = toBaseToNum(m.toBase);

    // 打者が自然進塁を超えてエラー進塁した場合は自然進塁分とエラー分に分割
    if (
      isBatter &&
      reason === 'error' &&
      naturalDist > 0 &&
      naturalDist < 4 &&
      finalNum > naturalDist
    ) {
      const naturalBase = numToBase(naturalDist);
      pushEvent(m.runnerId, 'home', naturalBase, naturalAdvanceEventType(battingResult));
      pushEvent(m.runnerId, naturalBase, m.toBase, 'error');
      continue;
    }

    pushEvent(m.runnerId, m.fromBase, m.toBase, mapAdvanceReasonToEventType(reason));
  }
  return result;
}

type PlayProcessingParams = {
  movementResult?: RunnerMovementResult;
  pendingOutcome: { kind: 'inplay' | 'strikeout' | 'walk'; battingResult?: string } | null;
  strikeoutType: 'swinging' | 'looking' | null;
  battingResultForMovement: string;
  playDetailsForMovement: { 
    position: string; 
    batType: string; 
    outfieldDirection: string;
    fieldingOptions?: {
      putoutPosition?: string;
      assistPosition?: string;
    };
    note?: string;
    countsAsAtBat?: boolean;
  };
};

interface UseGameProcessorProps {
  matchId: string | undefined;
  currentInningInfo: { inning: number; half: 'top' | 'bottom' };
  currentBSO: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  setRunners: (runners: { '1': string | null; '2': string | null; '3': string | null }) => void;
  pitches: PitchData[];
  clearRunnerEvents: () => void;
  ensurePlateAppearanceId: (matchId: string, playIndex: number) => string;
  currentBatter: any;
  currentPitcher: any;
  homeBatIndex: number;
  awayBatIndex: number;
  currentHalf: 'top' | 'bottom';
  advanceBattingOrder: () => void;
  homeLineup: LineupEntry[];
  awayLineup: LineupEntry[];
}

export const useGameProcessor = ({
  matchId,
  currentInningInfo,
  currentBSO,
  runners,
  setRunners,
  pitches,
  clearRunnerEvents,
  ensurePlateAppearanceId,
  currentBatter,
  currentPitcher,
  homeBatIndex,
  awayBatIndex,
  currentHalf,
  advanceBattingOrder,
  homeLineup = [],
  awayLineup = [],
}: UseGameProcessorProps) => {
  const getDefensiveLineup = () => (currentHalf === 'top' ? awayLineup : homeLineup);

  const getDefensivePlayerId = (position?: string) => {
    if (!position) return undefined;
    const entry = getDefensiveLineup().find((e) => e.position === position);
    const playerId = entry?.playerId?.trim();
    return playerId || undefined;
  };

  const buildFieldingAction = (
    position: string,
    action: FieldingAction['action'],
    quality: FieldingAction['quality'] = 'clean'
  ): FieldingAction => ({
    playerId: getDefensivePlayerId(position),
    position,
    action,
    quality,
  });

  const processPlayResult = async (
    params: PlayProcessingParams,
    onComplete: () => void,
    onCancel: () => void
  ) => {
    const { movementResult, pendingOutcome, strikeoutType, battingResultForMovement, playDetailsForMovement } = params;

    console.log('[atBat] processPlayResult called:', {
      hasMovementResult: !!movementResult,
      pendingOutcome: pendingOutcome?.kind,
      battingResultForMovement,
      matchId
    });

    if (!matchId) {
      console.warn('[atBat] No matchId, skipping atBat save');
      return;
    }
    const gs = await getGameState(matchId);
    const currentO = gs?.counts.o ?? 0;

    // 1. 三振 (RunnerMovementなし)
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
          countBefore: calculateCountBeforePitchOrder(pitches, 0, 0, p.order),
        }));

        const { index: newIndex, playId: newPlayId } = await allocateNextPlaySlot(matchId);
        const plateAppearanceId = ensurePlateAppearanceId(matchId, newIndex);

        const batterId = currentBatter?.playerId || '';
        if (!batterId) {
          console.warn('Warning: currentBatter is not set when saving atBat (strikeout)');
        }
        const atBat: AtBat = {
          playId: newPlayId,
          matchId,
          index: newIndex,
          inning: currentInningInfo.inning,
          topOrBottom: currentInningInfo.half,
          type: 'bat',
          batterId,
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
              buildFieldingAction('2', 'putout'),
            ],
          },
          timestamp: new Date().toISOString(),
          plateAppearanceId,
        };
        try {
          console.log('[atBat] Saving strikeout atBat:', { playId: atBat.playId, batterId: atBat.batterId, index: atBat.index });
          await saveAtBat(atBat);
          console.log('[atBat] Successfully saved strikeout atBat:', atBat.playId);
        } catch (error) {
          console.error('[atBat] Error saving atBat (strikeout):', error, atBat);
        }
        clearRunnerEvents();
        // -----------------------

        // ランナー配置更新（三振の場合はランナーは動かないが、残塁計算のために明示的に更新）
        await updateRunnersRealtime(matchId, {
          '1b': runners['1'],
          '2b': runners['2'],
          '3b': runners['3'],
        });

        updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
        if (newO >= 3) {
          const side = currentHalf === 'top' ? 'home' : 'away';
          await closeTemporaryRunner(matchId, side, currentInningInfo.inning);
          const closed = await closeHalfInningRealtime(matchId);
          setRunners(localRunnersFromGameState(closed?.runners));
        }
    } 
    // 1-2. 四死球 (RunnerMovementなしの場合のフォールバック)
    else if (!movementResult && pendingOutcome?.kind === 'walk' && battingResultForMovement) {
        // --- at_bats 保存処理 (四死球) ---
        const pitchRecords = pitches.map(p => ({
          seq: p.order,
          type: p.type,
          course: calculateCourse(p.x, p.y),
          x: toPercentage(p.x, ZONE_WIDTH),
          y: toPercentage(p.y, ZONE_HEIGHT),
          result: p.result,
          countBefore: calculateCountBeforePitchOrder(pitches, 0, 0, p.order),
        }));

        const { index: newIndex, playId: newPlayId } = await allocateNextPlaySlot(matchId);
        const plateAppearanceId = ensurePlateAppearanceId(matchId, newIndex);

        const batterId = currentBatter?.playerId || '';
        if (!batterId) {
          console.warn('Warning: currentBatter is not set when saving atBat (walk)');
        }

        // 四死球の場合のランナー配置を計算（押し出し処理）
        const afterRunners = { ...runners };
        if (batterId) {
          // 押し出し処理
          if (runners['1']) {
            afterRunners['2'] = runners['1'];
            if (runners['2']) {
              afterRunners['3'] = runners['2'];
            }
          }
          afterRunners['1'] = batterId;
        }

        // 満塁時の押し出し得点（打点付き）。PB/WP 得点は mid-play 側で済み
        const wasBasesLoaded = !!(runners['1'] && runners['2'] && runners['3']);
        const gsForTiebreakWalk = await getGameState(matchId);
        const tiebreakIdWalk = gsForTiebreakWalk?.tiebreak_runner_id ?? null;
        let scoredRunnersWalk: ScoredRunnerEntry[] = wasBasesLoaded && runners['3']
          ? [{ runnerId: runners['3'], isRBI: true }]
          : [];
        scoredRunnersWalk = markTiebreakScoredRunners(scoredRunnersWalk, tiebreakIdWalk);
        const resultRbi = scoredRunnersWalk.length > 0 ? scoredRunnersWalk.length : undefined;
        const atBatResult = resultRbi != null ? { type: battingResultForMovement as any, rbi: resultRbi } : { type: battingResultForMovement as any };

        const atBat: AtBat = {
          playId: newPlayId,
          matchId,
          index: newIndex,
          inning: currentInningInfo.inning,
          topOrBottom: currentInningInfo.half,
          type: 'bat',
          batterId,
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
            outs: currentO,
            runners: { '1': afterRunners['1'], '2': afterRunners['2'], '3': afterRunners['3'] },
            balls: 0,
            strikes: 0,
          },
          scoredRunners: scoredRunnersWalk,
          pitches: pitchRecords,
          runnerEvents: [],
          playDetails: {
            batType: playDetailsForMovement.batType as any,
          },
          timestamp: new Date().toISOString(),
          plateAppearanceId,
        };
        try {
          console.log('[atBat] Saving walk atBat:', { playId: atBat.playId, batterId: atBat.batterId, index: atBat.index, result: atBat.result?.type });
          await saveAtBat(atBat);
          console.log('[atBat] Successfully saved walk atBat:', atBat.playId);
        } catch (error) {
          console.error('[atBat] Error saving atBat (walk):', error, atBat);
        }
        clearRunnerEvents();
        // -----------------------

        // ランナー配置更新
        updateRunnersRealtime(matchId, {
          '1b': afterRunners['1'],
          '2b': afterRunners['2'],
          '3b': afterRunners['3'],
        });

        // 得点をスコアに加算（押し出しのみ）
        if (scoredRunnersWalk.length > 0) {
          await addRunsRealtime(matchId, currentInningInfo.half, scoredRunnersWalk.length);
        }

        if (tiebreakIdWalk && !isTiebreakRunnerOnBase(tiebreakIdWalk, afterRunners)) {
          await updateTiebreakRunnerIdRealtime(matchId, null);
        }

        // カウントリセット
        updateCountsRealtime(matchId, { o: currentO, b: 0, s: 0 });
    }
    // 2. RunnerMovementあり (インプレイ、四死球など)
    else if (movementResult) {
        const { afterRunners, outsAfter, scoredRunners, outDetails, scoredRunnerReasons, advanceErrorDetails } = movementResult;

        const outRunnerIdSet = new Set((outDetails ?? []).map((d) => d.runnerId));

        // mid-play の PB/WP 得点は別ドキュメント済み。打撃プレー由来のみ残す
        const gsForTiebreak = await getGameState(matchId);
        const tiebreakId = gsForTiebreak?.tiebreak_runner_id ?? null;
        let mergedScoredRunners: ScoredRunnerEntry[] = scoredRunners.filter((r) => !outRunnerIdSet.has(r.runnerId));
        mergedScoredRunners = markTiebreakScoredRunners(mergedScoredRunners, tiebreakId);

        // 打点: 'hit' のとき、または四死球の満塁押し出し
        const batterIdForRbi = currentBatter?.playerId ?? '';
        const isWalk = battingResultForMovement === 'walk' || battingResultForMovement === 'intentional_walk';
        const isDeadball = battingResultForMovement === 'deadball';
        const wasBasesLoaded = !!(runners['1'] && runners['2'] && runners['3']);
        mergedScoredRunners.forEach((entry) => {
          const reason = scoredRunnerReasons?.[entry.runnerId];
          // 四死球かつ満塁の押し出し得点は打点
          if ((isWalk || isDeadball) && wasBasesLoaded) {
            entry.isRBI = true;
            return;
          }
          if (reason !== 'hit') {
            entry.isRBI = false;
            return;
          }
          if (isWalk && !wasBasesLoaded && entry.runnerId !== batterIdForRbi) {
            entry.isRBI = false;
          }
        });

        // 打撃プレー由来の進塁のみ（mid-play runnerEvents はマージしない）
        const batterIdForMoves = currentBatter?.playerId ?? '';
        const moves = computeRunnerMoves(runners, batterIdForMoves, afterRunners, mergedScoredRunners);
        const builtRunnerEvents = buildBatRunnerEvents(
          moves,
          scoredRunnerReasons,
          battingResultForMovement,
          batterIdForMoves
        );
        builtRunnerEvents.push(
          ...buildFlyLinerRunoutEvents(battingResultForMovement, outDetails, runners, batterIdForMoves)
        );

        // --- at_bats 保存処理 ---
        const pitchRecords = pitches.map(p => ({
          seq: p.order,
          type: p.type,
          course: calculateCourse(p.x, p.y),
          x: toPercentage(p.x, ZONE_WIDTH),
          y: toPercentage(p.y, ZONE_HEIGHT),
          result: p.result,
          countBefore: calculateCountBeforePitchOrder(pitches, 0, 0, p.order),
        }));

        const atBatResult: any = {
          type: battingResultForMovement, // 保存しておいた打撃結果を使用
        };
        
        if (playDetailsForMovement.position) {
          atBatResult.fieldedBy = playDetailsForMovement.position;
        }

        if (battingResultForMovement === 'other' && typeof playDetailsForMovement.countsAsAtBat === 'boolean') {
          atBatResult.countsAsAtBat = playDetailsForMovement.countsAsAtBat;
        }
        
        // 打点: scoredRunners の isRBI で判定
        const rbiCount = mergedScoredRunners.filter((r) => r.isRBI).length;
        if (rbiCount > 0) {
          atBatResult.rbi = rbiCount;
        }

        const { index: newIndex, playId: newPlayId } = await allocateNextPlaySlot(matchId);
        const plateAppearanceId = ensurePlateAppearanceId(matchId, newIndex);

        const batterId = currentBatter?.playerId || '';
        if (!batterId) {
          console.warn('Warning: currentBatter is not set when saving atBat (movement)');
        }
        const atBat: AtBat = {
          playId: newPlayId,
          matchId,
          index: newIndex,
          inning: currentInningInfo.inning,
          topOrBottom: currentInningInfo.half,
          type: 'bat',
          batterId,
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
          scoredRunners: mergedScoredRunners,
          pitches: pitchRecords,
          runnerEvents: builtRunnerEvents,
          playDetails: {
             batType: playDetailsForMovement.batType as any,
             direction: playDetailsForMovement.outfieldDirection || playDetailsForMovement.position,
             fielding: (() => {
               const list: FieldingAction[] = [];
               const position = playDetailsForMovement.position;

               // 打者出塁の失策: battingResultForMovement === 'error' の場合
               if (battingResultForMovement === 'error' && position) {
                 list.push(buildFieldingAction(position, 'error', 'error'));
               }

               // 進塁理由でエラーを選択した場合: advanceErrorDetails の全件を失策として記録
               if (advanceErrorDetails && advanceErrorDetails.length > 0) {
                 advanceErrorDetails.forEach((detail) => {
                   if (detail.position && detail.errorType) {
                     const errorPosition = positionAbbrToCode(detail.position);
                     list.push(buildFieldingAction(errorPosition, detail.errorType, 'error'));
                   }
                 });
               }

               if (playDetailsForMovement.fieldingOptions) {
                 // 明示的な守備オプションがある場合（ファーストゴロの分岐など）
                 if (position && battingResultForMovement !== 'error') {
                    list.push(buildFieldingAction(position, 'fielded'));
                 }
                 
                 if (playDetailsForMovement.fieldingOptions.assistPosition) {
                   list.push(buildFieldingAction(playDetailsForMovement.fieldingOptions.assistPosition, 'assist'));
                 }
                 if (playDetailsForMovement.fieldingOptions.putoutPosition) {
                   list.push(buildFieldingAction(playDetailsForMovement.fieldingOptions.putoutPosition, 'putout'));
                 }
               } else if (position) {
                 const hasOutDetails = outDetails && outDetails.length > 0;
                 if (!hasOutDetails && (battingResultForMovement === 'flyout' || battingResultForMovement === 'linerout' || battingResultForMovement === 'foul_fly')) {
                    list.push(buildFieldingAction(position, 'putout'));
                 } else if (battingResultForMovement !== 'error') {
                    list.push(buildFieldingAction(position, 'fielded'));
                 }
               }

               if (outDetails) {
                 outDetails.forEach(d => {
                   if (d.threwPosition) {
                     list.push(buildFieldingAction(d.threwPosition, 'assist'));
                   }
                   if (d.caughtPosition) {
                     list.push(buildFieldingAction(d.caughtPosition, 'putout'));
                   }
                 });
               }
               return list;
             })(),
          },
          ...(battingResultForMovement === 'other' && playDetailsForMovement.note
            ? { note: playDetailsForMovement.note }
            : {}),
          timestamp: new Date().toISOString(),
          plateAppearanceId,
        };
        try {
          console.log('[atBat] Saving movement atBat:', { playId: atBat.playId, batterId: atBat.batterId, index: atBat.index, result: atBat.result?.type });
          await saveAtBat(atBat);
          console.log('[atBat] Successfully saved movement atBat:', atBat.playId);
        } catch (error) {
          console.error('[atBat] Error saving atBat (movement):', error, atBat);
        }
        clearRunnerEvents();
        
        // ランナー配置更新
        updateRunnersRealtime(matchId, {
          '1b': afterRunners['1'],
          '2b': afterRunners['2'],
          '3b': afterRunners['3'],
        });

        // 得点更新（打撃プレー由来のみ）
        if (mergedScoredRunners.length > 0) {
          const gsForHalf = await getGameState(matchId);
          const half = gsForHalf?.top_bottom || 'top';
          // closeHalf 前に得点を反映し、同点判定がずれないようにする
          await addRunsRealtime(matchId, half, mergedScoredRunners.length);
        }

        if (tiebreakId && !isTiebreakRunnerOnBase(tiebreakId, afterRunners)) {
          await updateTiebreakRunnerIdRealtime(matchId, null);
        }

        // アウト更新
        const finalOutsAfter = typeof outsAfter === 'number' ? outsAfter : currentO;
        console.log('[atBat] Updating outs:', { currentO, outsAfter, finalOutsAfter, battingResult: battingResultForMovement });
        updateCountsRealtime(matchId, { o: finalOutsAfter, b: 0, s: 0 }); // カウントもリセット

        // チェンジ判定
        if (finalOutsAfter >= 3) {
          console.log('[atBat] Closing half inning due to 3 outs');
          const side = currentHalf === 'top' ? 'home' : 'away';
          await closeTemporaryRunner(matchId, side, currentInningInfo.inning);
          const closed = await closeHalfInningRealtime(matchId);
          setRunners(localRunnersFromGameState(closed?.runners));
        }
    } else {
         // キャンセルなどで何もしない場合
         console.warn('[atBat] No atBat saved - no matching condition:', {
           hasMovementResult: !!movementResult,
           pendingOutcome: pendingOutcome?.kind,
           battingResultForMovement
         });
    }

    // 打順前進（確定タイミング）
    // movementResultがある、または三振確定の場合、または四死球確定の場合、または打席結果がある場合は進める
    if (movementResult || (!movementResult && pendingOutcome?.kind === 'strikeout') || (!movementResult && pendingOutcome?.kind === 'walk') || battingResultForMovement) {
        advanceBattingOrder();
        onComplete();
    } else {
        onCancel();
    }
  };

  // 3アウトチェンジ簡易処理 (ランナーなしアウト等)
  const processQuickOut = async (
    battingResult: string,
    details: { 
      position: string; 
      batType: string; 
      outfieldDirection: string;
      fieldingOptions?: {
        putoutPosition?: string;
        assistPosition?: string;
      };
      note?: string;
      countsAsAtBat?: boolean;
    }
  ) => {
      if (!matchId) return;
      const gs = await getGameState(matchId);
      const currentO = gs?.counts.o ?? 0;
      
      const pitchRecords = pitches.map(p => ({
        seq: p.order,
        type: p.type,
        course: calculateCourse(p.x, p.y),
        x: toPercentage(p.x, ZONE_WIDTH),
        y: toPercentage(p.y, ZONE_HEIGHT),
        result: p.result,
        countBefore: calculateCountBeforePitchOrder(pitches, 0, 0, p.order),
      }));

      const { index: newIndex, playId: newPlayId } = await allocateNextPlaySlot(matchId);
      const plateAppearanceId = ensurePlateAppearanceId(matchId, newIndex);

      const batterId = currentBatter?.playerId || '';
      if (!batterId) {
        console.warn('Warning: currentBatter is not set when saving atBat (quickOut)');
      }
      const atBat: AtBat = {
        playId: newPlayId,
        matchId,
        index: newIndex,
        inning: currentInningInfo.inning,
        topOrBottom: currentInningInfo.half,
        type: 'bat',
        batterId,
        pitcherId: currentPitcher?.playerId || '',
        battingOrder: currentHalf === 'top' ? homeBatIndex + 1 : awayBatIndex + 1, 
        result: {
          type: battingResult as any,
          fieldedBy: details.position || undefined,
          ...(battingResult === 'other' && typeof details.countsAsAtBat === 'boolean'
            ? { countsAsAtBat: details.countsAsAtBat }
            : {}),
        },
        situationBefore: {
          outs: currentO,
          runners: { '1': runners['1'], '2': runners['2'], '3': runners['3'] },
          balls: currentBSO.b,
          strikes: currentBSO.s,
        },
        situationAfter: {
          outs: Math.min(3, currentO + 1),
          runners: { '1': null, '2': null, '3': null },
          balls: 0,
          strikes: 0,
        },
        scoredRunners: [],
        pitches: pitchRecords,
        runnerEvents: [],
        playDetails: {
          batType: details.batType as any,
          direction: details.outfieldDirection || details.position,
          fielding: (() => {
            if (!details.position) return [];
            const fielding: FieldingAction[] = [];
            
            if (details.fieldingOptions) {
               fielding.push(buildFieldingAction(details.position, 'fielded'));
               if (details.fieldingOptions.assistPosition) {
                 fielding.push(buildFieldingAction(details.fieldingOptions.assistPosition, 'assist'));
               }
               if (details.fieldingOptions.putoutPosition) {
                 fielding.push(buildFieldingAction(details.fieldingOptions.putoutPosition, 'putout'));
               }
               return fielding;
            }

            if (battingResult === 'flyout' || battingResult === 'linerout' || battingResult === 'foul_fly') {
              fielding.push(buildFieldingAction(details.position, 'putout'));
            } else if (battingResult === 'groundout') {
              if (details.position === '3') {
                fielding.push(buildFieldingAction(details.position, 'putout'));
              } else {
                fielding.push(buildFieldingAction(details.position, 'assist'));
                fielding.push(buildFieldingAction('3', 'putout'));
              }
            } else if (battingResult === 'error') {
              fielding.push(buildFieldingAction(details.position, 'error', 'error'));
            } else {
              fielding.push(buildFieldingAction(details.position, 'fielded'));
            }
            return fielding;
          })(),
        },
        ...(battingResult === 'other' && details.note ? { note: details.note } : {}),
        timestamp: new Date().toISOString(),
        plateAppearanceId,
      };
      try {
        console.log('[atBat] Saving quickOut atBat:', { playId: atBat.playId, batterId: atBat.batterId, index: atBat.index, result: atBat.result?.type });
        await saveAtBat(atBat);
        console.log('[atBat] Successfully saved quickOut atBat:', atBat.playId);
      } catch (error) {
        console.error('[atBat] Error saving atBat (quickOut):', error, atBat);
      }
      clearRunnerEvents();

      const newO = Math.min(3, currentO + 1);
      updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
      if (newO >= 3) {
        const side = currentHalf === 'top' ? 'home' : 'away';
        await closeTemporaryRunner(matchId, side, currentInningInfo.inning);
        const closed = await closeHalfInningRealtime(matchId);
        setRunners(localRunnersFromGameState(closed?.runners));
      }
      
      advanceBattingOrder();
  };

  return {
    processPlayResult,
    processQuickOut,
  };
};
