type LineupEntry = {
  battingOrder: number; // 1-9 or FP(10)
  position: string; // '1'-'9', 'DP', or ''
  playerId: string; // player ID or ''
};

type Lineup = {
  home: LineupEntry[]; // 先攻 (10 entries: batting order 1-9 + P)
  away: LineupEntry[]; // 後攻 (10 entries)
};

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
