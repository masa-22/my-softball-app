const STORAGE_KEY = 'softball_app_winning_pitchers';

type WinningPitchersByMatch = Record<string, { home?: string; away?: string }>;

let winningPitchersByMatch: WinningPitchersByMatch = {};

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      winningPitchersByMatch = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('winning_pitchers load error', e);
  }
  winningPitchersByMatch = {};
};

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(winningPitchersByMatch));
  } catch (e) {
    console.warn('winning_pitchers save error', e);
  }
};

load();

export const getWinningPitcher = (matchId: string, side: 'home' | 'away'): string | null => {
  return winningPitchersByMatch[matchId]?.[side] || null;
};

export const setWinningPitcher = (matchId: string, side: 'home' | 'away', pitcherId: string): void => {
  if (!winningPitchersByMatch[matchId]) {
    winningPitchersByMatch[matchId] = {};
  }
  winningPitchersByMatch[matchId][side] = pitcherId;
  persist();
};

