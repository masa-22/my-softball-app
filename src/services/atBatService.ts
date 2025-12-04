import { AtBat } from '../types/AtBat';

const STORAGE_KEY = 'softball_app_at_bats';

type AtBatsByMatch = Record<string, AtBat[]>;

let atBatsByMatch: AtBatsByMatch = {};

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      atBatsByMatch = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('at_bats load error', e);
  }
  atBatsByMatch = {};
};

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(atBatsByMatch));
  } catch (e) {
    console.warn('at_bats save error', e);
  }
};

// Initialize
load();

/**
 * 試合ごとの打席記録一覧を取得
 */
export const getAtBats = (matchId: string): AtBat[] => {
  return (atBatsByMatch[matchId] || []).slice().sort((a, b) => a.index - b.index);
};

/**
 * IDで打席記録を取得
 */
export const getAtBat = (playId: string): AtBat | undefined => {
  for (const matchId in atBatsByMatch) {
    const found = atBatsByMatch[matchId].find((a) => a.playId === playId);
    if (found) return found;
  }
  return undefined;
};

/**
 * 打席記録を保存（新規または更新）
 */
export const saveAtBat = (atBat: AtBat): void => {
  const list = atBatsByMatch[atBat.matchId] || [];
  const index = list.findIndex((a) => a.playId === atBat.playId);
  
  if (index >= 0) {
    list[index] = atBat;
  } else {
    list.push(atBat);
  }
  
  // index順にソートしておく
  list.sort((a, b) => a.index - b.index);
  
  atBatsByMatch[atBat.matchId] = list;
  persist();
};

/**
 * 指定した試合の打席記録を全て削除
 */
export const clearAtBats = (matchId: string): void => {
  delete atBatsByMatch[matchId];
  persist();
};


