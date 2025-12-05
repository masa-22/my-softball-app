import { getGameState, updateCountsRealtime, closeHalfInningRealtime, updateRunnersRealtime, addRunsRealtime } from '../services/gameStateService';
import { getAtBats, saveAtBat } from '../services/atBatService';
import { calculateCourse, toPercentage, ZONE_WIDTH, ZONE_HEIGHT } from '../utils/scoreKeeping';
import { AtBat, RunnerEvent, FieldingAction } from '../types/AtBat';
import { PitchData } from '../types/PitchData';
import { RunnerMovementResult } from '../components/play/RunnerMovementInput';
import { LineupEntry } from '../types/Lineup';

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

  const processPlayResult = (
    params: PlayProcessingParams,
    onComplete: () => void,
    onCancel: () => void
  ) => {
    const { movementResult, pendingOutcome, strikeoutType, battingResultForMovement, playDetailsForMovement } = params;

    if (!matchId) return;
    const gs = getGameState(matchId);
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
          runnerEvents: runnerEvents.slice(),
          playDetails: {
            fielding: [
              buildFieldingAction('2', 'putout'),
            ],
          },
          timestamp: new Date().toISOString(),
        };
        saveAtBat(atBat);
        clearRunnerEvents();
        // -----------------------

        updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
        if (newO >= 3) {
          closeHalfInningRealtime(matchId);
          setRunners({ '1': null, '2': null, '3': null });
        }
    } 
    // 2. RunnerMovementあり (インプレイ、四死球など)
    else if (movementResult) {
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
          runnerEvents: runnerEvents.slice(),
          playDetails: {
             batType: playDetailsForMovement.batType as any,
             direction: playDetailsForMovement.outfieldDirection || playDetailsForMovement.position,
             fielding: (() => {
               const list: FieldingAction[] = [];
               const position = playDetailsForMovement.position;
               
               if (playDetailsForMovement.fieldingOptions) {
                 // 明示的な守備オプションがある場合（ファーストゴロの分岐など）
                 if (position) {
                    // 補殺がある場合は、捕球記録(fielded)も残すのが一般的だが、
                    // システム上 putout/assist があれば fielded は表示されないかもしれない。
                    // 一旦、捕球者としてfieldedを追加しておく。
                    // ただし、putoutPositionと同じ場合は重複するかもしれないので調整。
                    // 既存ロジックでは flyout の場合 putout のみで fielded なし。
                    // groundout の場合 assist + putout(3)。
                    // ここではシンプルに構成する。
                    
                    // 1. 捕球
                    // putoutPosition が自分自身なら putout が捕球を兼ねるため fielded 不要とする流儀もあるが、
                    // ここでは念のためアシストの場合のみ fielded をつけるか？
                    // いや、fielded は常に記録しておいたほうが無難。
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
                 } else {
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
        saveAtBat(atBat);
        clearRunnerEvents();
        
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
        
        try { window.dispatchEvent(new Event('game_states_updated')); } catch {}
    } else {
         // キャンセルなどで何もしない場合
    }

    // 打順前進（確定タイミング）
    // movementResultがある、または三振確定の場合のみ進める
    if (movementResult || (!movementResult && pendingOutcome?.kind === 'strikeout')) {
        advanceBattingOrder();
        onComplete();
    } else {
        onCancel();
    }
  };

  // 3アウトチェンジ簡易処理 (ランナーなしアウト等)
  const processQuickOut = (
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
      const gs = getGameState(matchId);
      const currentO = gs?.counts.o ?? 0;
      
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
            } else {
              fielding.push(buildFieldingAction(details.position, 'fielded'));
            }
            return fielding;
          })(),
        },
        timestamp: new Date().toISOString(),
      };
      saveAtBat(atBat);
      clearRunnerEvents();

      const newO = Math.min(3, currentO + 1);
      updateCountsRealtime(matchId, { o: newO, b: 0, s: 0 });
      if (newO >= 3) {
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

