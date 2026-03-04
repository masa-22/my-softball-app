import { getGameState, updateCountsRealtime, closeHalfInningRealtime, updateRunnersRealtime, addRunsRealtime } from '../services/gameStateService';
import { closeTemporaryRunner } from '../services/participationService';
import { getAtBats, saveAtBat } from '../services/atBatService';
import { calculateCourse, toPercentage, ZONE_WIDTH, ZONE_HEIGHT } from '../utils/scoreKeeping';
import { AtBat, RunnerEvent, FieldingAction, ScoredRunnerEntry, BaseType, RunnerEventType } from '../types/AtBat';
import { PitchData } from '../types/PitchData';
import { RunnerMovementResult } from '../components/play/RunnerMovementInput';
import { LineupEntry } from '../types/Lineup';
import { BATTING_RESULTS } from '../data/softball/battingResults';
import { POSITIONS } from '../data/softball/positions';

/** AdvanceReasonDialog の略称 (P, C, 1B 等) を lineup 用コード (1, 2, 3 等) に変換 */
function positionAbbrToCode(abbr: string): string {
  const entry = Object.entries(POSITIONS).find(([, p]) => p.abbr === abbr);
  return entry ? entry[0] : abbr;
}

const createRunnerEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `runner-event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type RunnerMove = { runnerId: string; fromBase: BaseType; toBase: BaseType };

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

function buildMergedRunnerEvents(
  moves: RunnerMove[],
  existingEvents: RunnerEvent[],
  scoredRunnerReasons: Record<string, 'hit' | 'error' | 'steal' | 'wildpitch' | 'passball'> | undefined
): RunnerEvent[] {
  const moveKey = (m: RunnerMove) => `${m.runnerId}:${m.fromBase}:${m.toBase}`;
  const existingKeys = new Set(existingEvents.map((e) => `${e.runnerId}:${e.fromBase}:${e.toBase}`));

  // 打席内の全走塁を保持: 既存イベント（WP/PB/盗塁等）をすべて含める
  const result: RunnerEvent[] = [...existingEvents];

  // movesのうち既存にない進塁のみ新規作成して追加
  for (const m of moves) {
    const k = moveKey(m);
    if (existingKeys.has(k)) continue;

    let type: RunnerEventType = 'hit';
    if (m.toBase === 'home' && scoredRunnerReasons) {
      const reason = scoredRunnerReasons[m.runnerId];
      if (reason === 'wildpitch') type = 'wildpitch';
      else if (reason === 'passball') type = 'passedball';
      else if (reason === 'steal') type = 'steal';
      else if (reason === 'error') type = 'error';
      else type = 'hit';
    }
    result.push({
      id: createRunnerEventId(),
      pitchSeq: null,
      eventSource: 'pitch',
      type,
      runnerId: m.runnerId,
      fromBase: m.fromBase,
      toBase: m.toBase,
      isOut: false,
    });
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
  };
};

interface UseGameProcessorProps {
  matchId: string | undefined;
  currentInningInfo: { inning: number; half: 'top' | 'bottom' };
  currentBSO: { b: number; s: number; o: number };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  setRunners: (runners: { '1': string | null; '2': string | null; '3': string | null }) => void;
  pitches: PitchData[];
  runnerEvents: RunnerEvent[];
  clearRunnerEvents: () => void;
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
  runnerEvents,
  clearRunnerEvents,
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

  // 各投球の直前のストライクカウントを計算する関数（1球目は問答無用で 0-0、2球目以降は1球前の結果を反映）
  const calculateCountBefore = (
    pitches: PitchData[],
    initialBalls: number,
    initialStrikes: number,
    targetSeq: number
  ): { B: number; S: number } => {
    // 1球目は計算せず常に 0-0
    if (targetSeq <= 1) return { B: 0, S: 0 };

    let balls = initialBalls;
    let strikes = initialStrikes;
    const sorted = [...pitches].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const pitch of sorted) {
      if (pitch.order >= targetSeq) break;

      switch (pitch.result) {
        case 'ball':
          balls = Math.min(3, balls + 1);
          break;
        case 'swing':
        case 'looking':
          strikes = Math.min(2, strikes + 1);
          break;
        case 'foul':
          if (strikes < 2) {
            strikes = Math.min(2, strikes + 1);
          }
          break;
        case 'inplay':
        case 'deadball':
          break;
      }
    }

    return { B: balls, S: strikes };
  };

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
          countBefore: calculateCountBefore(pitches, 0, 0, p.order),
        }));

        const existingAtBats = await getAtBats(matchId);
        const newIndex = existingAtBats.length + 1;
        const newPlayId = `${matchId}_${String(newIndex).padStart(3, '0')}`;

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
          runnerEvents: runnerEvents.slice(),
          playDetails: {
            fielding: [
              buildFieldingAction('2', 'putout'),
            ],
          },
          timestamp: new Date().toISOString(),
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
          await closeHalfInningRealtime(matchId);
          setRunners({ '1': null, '2': null, '3': null });
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
          countBefore: calculateCountBefore(pitches, 0, 0, p.order),
        }));

        const existingAtBats = await getAtBats(matchId);
        const newIndex = existingAtBats.length + 1;
        const newPlayId = `${matchId}_${String(newIndex).padStart(3, '0')}`;

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

        // 満塁時の押し出し得点（打点付き）
        const wasBasesLoaded = !!(runners['1'] && runners['2'] && runners['3']);
        const scoredRunnersFromForce: ScoredRunnerEntry[] = wasBasesLoaded && runners['3']
          ? [{ runnerId: runners['3'], isRBI: true }]
          : [];
        const resultRbi = scoredRunnersFromForce.length > 0 ? scoredRunnersFromForce.length : undefined;
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
          scoredRunners: scoredRunnersFromForce,
          pitches: pitchRecords,
          runnerEvents: runnerEvents.slice(),
          playDetails: {
            batType: playDetailsForMovement.batType as any,
          },
          timestamp: new Date().toISOString(),
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

        // 押し出し得点をスコアに加算
        if (scoredRunnersFromForce.length > 0) {
          addRunsRealtime(matchId, currentInningInfo.half, scoredRunnersFromForce.length);
        }

        // カウントリセット
        updateCountsRealtime(matchId, { o: currentO, b: 0, s: 0 });
    }
    // 2. RunnerMovementあり (インプレイ、四死球など)
    else if (movementResult) {
        const { afterRunners, outsAfter, scoredRunners, outDetails, scoredRunnerReasons, advanceErrorDetail } = movementResult;

        // 打席内で PB/WP によりホームインしたランナーを runnerEvents から scoredRunners にマージ（isRBI: false で追加）
        const pbWpHome = runnerEvents
          .filter((e) => (e.type === 'passedball' || e.type === 'wildpitch') && e.toBase === 'home')
          .map((e) => ({ runnerId: e.runnerId, isRBI: false } as ScoredRunnerEntry));
        const mergedScoredRunners: ScoredRunnerEntry[] = [...scoredRunners];
        pbWpHome.forEach((entry) => {
          if (!mergedScoredRunners.some((r) => r.runnerId === entry.runnerId)) {
            mergedScoredRunners.push(entry);
          }
        });

        // 打点: 'hit' のとき、または四死球の満塁押し出し
        const batterIdForRbi = currentBatter?.playerId ?? '';
        const isWalk = battingResultForMovement === 'walk';
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

        // 全進塁を RunnerEvent として構築（自動進塁含む）。既存の runnerEvents とマージ
        const batterIdForMoves = currentBatter?.playerId ?? '';
        const moves = computeRunnerMoves(runners, batterIdForMoves, afterRunners, mergedScoredRunners);
        const builtRunnerEvents = buildMergedRunnerEvents(moves, runnerEvents, scoredRunnerReasons);

        // --- at_bats 保存処理 ---
        const pitchRecords = pitches.map(p => ({
          seq: p.order,
          type: p.type,
          course: calculateCourse(p.x, p.y),
          x: toPercentage(p.x, ZONE_WIDTH),
          y: toPercentage(p.y, ZONE_HEIGHT),
          result: p.result,
          countBefore: calculateCountBefore(pitches, 0, 0, p.order),
        }));

        const atBatResult: any = {
          type: battingResultForMovement, // 保存しておいた打撃結果を使用
        };
        
        if (playDetailsForMovement.position) {
          atBatResult.fieldedBy = playDetailsForMovement.position;
        }
        
        // 打点: scoredRunners の isRBI で判定
        const rbiCount = mergedScoredRunners.filter((r) => r.isRBI).length;
        if (rbiCount > 0) {
          atBatResult.rbi = rbiCount;
        }

        const existingAtBats = await getAtBats(matchId);
        const newIndex = existingAtBats.length + 1;
        const newPlayId = `${matchId}_${String(newIndex).padStart(3, '0')}`;

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

               // 進塁理由でエラーを選択した場合: advanceErrorDetail が存在するとき必ず該当ポジションのエラーを記録
               if (advanceErrorDetail?.position && advanceErrorDetail?.errorType) {
                 const errorPosition = positionAbbrToCode(advanceErrorDetail.position);
                 list.push(buildFieldingAction(errorPosition, advanceErrorDetail.errorType, 'error'));
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
                 if (!hasOutDetails && battingResultForMovement === 'flyout') {
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
          timestamp: new Date().toISOString(),
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

        // 得点更新
        if (mergedScoredRunners.length > 0) {
          const gsForHalf = await getGameState(matchId);
          const half = gsForHalf?.top_bottom || 'top';
          addRunsRealtime(matchId, half, mergedScoredRunners.length);
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
          closeHalfInningRealtime(matchId);
          setRunners({ '1': null, '2': null, '3': null });
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
        countBefore: calculateCountBefore(pitches, 0, 0, p.order),
      }));

      const existingAtBats = await getAtBats(matchId);
      const newIndex = existingAtBats.length + 1;
      const newPlayId = `${matchId}_${String(newIndex).padStart(3, '0')}`;

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
        runnerEvents: runnerEvents.slice(),
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

            if (battingResult === 'flyout') {
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
        timestamp: new Date().toISOString(),
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
        closeHalfInningRealtime(matchId);
        setRunners({ '1': null, '2': null, '3': null });
      }
      
      advanceBattingOrder();
  };

  return {
    processPlayResult,
    processQuickOut,
  };
};

