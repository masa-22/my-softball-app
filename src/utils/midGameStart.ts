import type { GameState } from '../types/GameState';
import { TIEBREAK_START_INNING } from './tiebreak';

export interface MidGameSlot {
  index: number;
  battingOrder: number;
  playerId: string;
}

/** 映像開始時点の状況。これより前の打席は作らない。 */
export interface MidGameSituation {
  inning: number;
  half: 'top' | 'bottom';
  topScore: number;
  bottomScore: number;
  /** いま攻撃中のチームが、この回ですでに取っている得点 */
  runsAlreadyThisHalf: number;
  /** 裏から始めるとき、同じ回の表で先攻が取った得点 */
  topRunsThisInning: number;
  balls: number;
  strikes: number;
  outs: number;
  runnerIds: { '1': string | null; '2': string | null; '3': string | null };
  offenseBattingOrder: number;
  defenseBattingOrder: number;
  /** 8回以降で、2塁の走者をタイブレーク走者として扱う */
  tiebreakOnSecond: boolean;
}

export interface MidGameStartPatch {
  current_inning: number;
  top_bottom: 'top' | 'bottom';
  counts: { b: number; s: number; o: number };
  runners: GameState['runners'];
  scores: GameState['scores'];
  home_bat_index: number;
  away_bat_index: number;
  tiebreak_runner_id: string | null;
}

const isWhole = (value: number) => Number.isInteger(value) && value >= 0;

const slotByOrder = (slots: MidGameSlot[], order: number) =>
  slots.find((slot) => slot.battingOrder === order && slot.playerId);

export const buildMidGameStartPatch = (
  situation: MidGameSituation,
  homeSlots: MidGameSlot[],
  awaySlots: MidGameSlot[]
): { ok: true; patch: MidGameStartPatch } | { ok: false; message: string } => {
  const {
    inning,
    half,
    topScore,
    bottomScore,
    runsAlreadyThisHalf,
    topRunsThisInning,
    balls,
    strikes,
    outs,
  } = situation;

  if (!Number.isInteger(inning) || inning < 1) {
    return { ok: false, message: '回数は1以上の整数にしてください。' };
  }
  if (![topScore, bottomScore, runsAlreadyThisHalf, topRunsThisInning].every(isWhole)) {
    return { ok: false, message: '得点は0以上の整数にしてください。' };
  }
  if (half === 'top' && inning === 1 && (bottomScore !== 0 || topScore !== runsAlreadyThisHalf)) {
    return { ok: false, message: '1回表では、後攻の得点は0、先攻の得点はこの回の得点と同じにしてください。' };
  }
  if (half === 'bottom' && inning === 1 && (topScore !== topRunsThisInning || bottomScore !== runsAlreadyThisHalf)) {
    return { ok: false, message: '1回裏では、先攻の得点はこの回の表の得点、後攻の得点はこの回の裏の得点と同じにしてください。' };
  }
  if (half === 'top' && runsAlreadyThisHalf > topScore) {
    return { ok: false, message: 'この回の先攻の得点が、先攻の合計を超えています。' };
  }
  if (half === 'bottom' && (topRunsThisInning > topScore || runsAlreadyThisHalf > bottomScore)) {
    return { ok: false, message: 'この回の得点が、そのチームの合計を超えています。' };
  }
  if (balls < 0 || balls > 3 || strikes < 0 || strikes > 2 || outs < 0 || outs > 2 || ![balls, strikes, outs].every(Number.isInteger)) {
    return { ok: false, message: 'ボールは0〜3、ストライクは0〜2、アウトは0〜2にしてください。' };
  }

  const offenseSlots = half === 'top' ? homeSlots : awaySlots;
  const defenseSlots = half === 'top' ? awaySlots : homeSlots;
  if (offenseSlots.length === 0 || defenseSlots.length === 0) {
    return { ok: false, message: '先に両チームのスタメンを登録してください。' };
  }

  const offense = slotByOrder(offenseSlots, situation.offenseBattingOrder);
  const defense = slotByOrder(defenseSlots, situation.defenseBattingOrder);
  if (!offense) return { ok: false, message: '攻撃側の打順がスタメンにありません。' };
  if (!defense) return { ok: false, message: '守備側の次回の打順がスタメンにありません。' };

  const offenseIds = new Set(offenseSlots.map((slot) => slot.playerId));
  const runnerList = [situation.runnerIds['1'], situation.runnerIds['2'], situation.runnerIds['3']];
  const filled = runnerList.filter((id): id is string => !!id);
  if (new Set(filled).size !== filled.length) {
    return { ok: false, message: '同じ選手を複数の塁に置けません。' };
  }
  if (filled.some((id) => id === offense.playerId)) {
    return { ok: false, message: '打者を走者にはできません。' };
  }
  if (filled.some((id) => !offenseIds.has(id))) {
    return { ok: false, message: '走者は攻撃側のスタメンから選んでください。' };
  }

  const tiebreakRunnerId =
    inning >= TIEBREAK_START_INNING && situation.tiebreakOnSecond ? situation.runnerIds['2'] : null;
  if (inning >= TIEBREAK_START_INNING && situation.tiebreakOnSecond && !tiebreakRunnerId) {
    return { ok: false, message: 'タイブレーク走者にするには、2塁に走者が必要です。' };
  }

  const homeBatIndex = half === 'top' ? offense.index : defense.index;
  const awayBatIndex = half === 'top' ? defense.index : offense.index;
  const inningKey = String(inning);
  const innings: GameState['scores']['innings'] =
    half === 'top'
      ? { [inningKey]: { top: runsAlreadyThisHalf, bottom: null } }
      : { [inningKey]: { top: topRunsThisInning, bottom: runsAlreadyThisHalf } };

  return {
    ok: true,
    patch: {
      current_inning: inning,
      top_bottom: half,
      counts: { b: balls, s: strikes, o: outs },
      runners: {
        '1b': situation.runnerIds['1'],
        '2b': situation.runnerIds['2'],
        '3b': situation.runnerIds['3'],
      },
      scores: {
        top_total: topScore,
        bottom_total: bottomScore,
        innings,
      },
      home_bat_index: homeBatIndex,
      away_bat_index: awayBatIndex,
      tiebreak_runner_id: tiebreakRunnerId,
    },
  };
};
