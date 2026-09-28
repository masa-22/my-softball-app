/** 延長タイブレーク開始イニング（この回以降・試合終了まで適用） */
export const TIEBREAK_START_INNING = 8;

export interface TiebreakLineupEntry {
  battingOrder: number;
  playerId: string;
}

export type LocalRunners = {
  '1': string | null;
  '2': string | null;
  '3': string | null;
};

/** 8回以降ならタイブレーク half（試合終了まで毎 half 適用） */
export const isTiebreakHalf = (inning: number): boolean => {
  return inning >= TIEBREAK_START_INNING;
};

/**
 * 現打者（batIndex）の1つ前の選手IDを返す。
 * FP（battingOrder === 10）はスキップする。
 */
export const resolvePreviousBatterId = (
  lineup: TiebreakLineupEntry[],
  batIndex: number
): string | null => {
  const length = lineup.length;
  if (length === 0) return null;

  const startIdx = ((batIndex % length) + length) % length;
  let idx = (startIdx - 1 + length) % length;
  let attempts = 0;

  while (attempts < length) {
    const entry = lineup[idx];
    if (entry && entry.battingOrder !== 10 && entry.playerId) {
      return entry.playerId;
    }
    idx = (idx - 1 + length) % length;
    attempts++;
  }
  return null;
};

/** GameState.runners（1b/2b/3b）をローカル形式（1/2/3）へ変換 */
export const localRunnersFromGameState = (runners?: {
  '1b': string | null;
  '2b': string | null;
  '3b': string | null;
} | null): LocalRunners => ({
  '1': runners?.['1b'] ?? null,
  '2': runners?.['2b'] ?? null,
  '3': runners?.['3b'] ?? null,
});

/** 得点エントリにタイブレーク配置フラグを付与 */
export const markTiebreakScoredRunners = <T extends { runnerId: string; isTiebreakPlaced?: boolean }>(
  scored: T[],
  tiebreakRunnerId: string | null | undefined
): T[] => {
  if (!tiebreakRunnerId) return scored;
  return scored.map((entry) =>
    entry.runnerId === tiebreakRunnerId ? { ...entry, isTiebreakPlaced: true } : entry
  );
};

/** タイブレーク走者がまだ塁上にいるか */
export const isTiebreakRunnerOnBase = (
  tiebreakRunnerId: string | null | undefined,
  runners: LocalRunners
): boolean => {
  if (!tiebreakRunnerId) return false;
  return (
    runners['1'] === tiebreakRunnerId ||
    runners['2'] === tiebreakRunnerId ||
    runners['3'] === tiebreakRunnerId
  );
};
