import { Lineup, LineupEntry } from '../types/Lineup';

let lineups: Record<string, Lineup> = {}; // key: matchId

const load = () => {
  try {
    const raw = localStorage.getItem('lineups');
    if (raw) {
      lineups = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('lineups load error', e);
  }
  lineups = {};
  persist();
};

const persist = () => {
  try {
    localStorage.setItem('lineups', JSON.stringify(lineups));
  } catch (e) {
    console.warn('lineups save error', e);
  }
};

load();

const createEmptyLineup = (): LineupEntry[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    battingOrder: i < 9 ? i + 1 : 10, // 1-9, then 10 for P
    position: '',
    playerId: '',
  }));
};

export const getLineup = (matchId: string): Lineup => {
  if (!lineups[matchId]) {
    lineups[matchId] = { home: createEmptyLineup(), away: createEmptyLineup() };
    persist();
  }
  return lineups[matchId];
};

export const saveLineup = (matchId: string, lineup: Lineup): void => {
  lineups[matchId] = lineup;
  persist();
};

// ▼ 修正: participationService は動的インポート（.ts拡張子に統一し、未存在でもビルドを通す）
type ParticipationModule = {
  recordStarters: (matchId: string, lineup: Lineup) => void | Promise<void>;
  recordSubstitution: (params: {
    matchId: string;
    side: 'home' | 'away';
    outPlayerId: string;
    inPlayerId: string;
    inning: number;
    kind: 'pinch_hitter' | 'pinch_runner';
    position?: string;
    note?: string;
  }) => void | Promise<void>;
};

let participationMod: ParticipationModule | null = null;

const ensureParticipationModule = async (): Promise<ParticipationModule | null> => {
  if (participationMod) return participationMod;
  try {
    const mod = await import('./participationService'); // .ts を想定。存在しない場合はcatchへ
    participationMod = {
      recordStarters: mod.recordStarters,
      recordSubstitution: mod.recordSubstitution,
    };
    return participationMod;
  } catch (e) {
    console.warn('participationService not found. Proceeding without participation recording.');
    participationMod = null;
    return null;
  }
};

// スタメン確定時の記録（存在すれば委譲）
export const recordStartersFromLineup = async (matchId: string): Promise<void> => {
  const lineup = getLineup(matchId);
  const mod = await ensureParticipationModule();
  if (mod) {
    await mod.recordStarters(matchId, lineup);
  }
};

// ラインナップ内の特定打順を別選手へ差し替え（代打/代走想定）＋ 出場記録（存在すれば）
export const applySubstitutionToLineup = async (params: {
  matchId: string;
  side: 'home' | 'away';
  battingOrder: number;         // 1-10
  inPlayerId: string;
  inning: number;
  kind: 'pinch_hitter' | 'pinch_runner';
  position?: string;            // 守備が変わる場合
  note?: string;
}): Promise<void> => {
  const lineup = getLineup(params.matchId);
  const list = params.side === 'home' ? lineup.home : lineup.away;
  const idx = list.findIndex(e => e.battingOrder === params.battingOrder);
  if (idx === -1) return;

  const outPlayerId = list[idx].playerId || '';

  // 出場記録（participationService が存在する場合のみ）
  const mod = await ensureParticipationModule();
  if (mod) {
    await mod.recordSubstitution({
      matchId: params.matchId,
      side: params.side,
      outPlayerId,
      inPlayerId: params.inPlayerId,
      inning: params.inning,
      kind: params.kind,
      position: params.position ?? list[idx].position,
      note: params.note,
    });
  }

  // ラインナップ更新
  list[idx].playerId = params.inPlayerId;
  if (params.position) list[idx].position = params.position;
  saveLineup(params.matchId, lineup);
};
