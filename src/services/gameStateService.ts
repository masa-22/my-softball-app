/**
 * ゲーム状態管理サービス
 * - リアルタイム試合状況を含む詳細なゲーム状態を管理
 */

export type GameRealtimeStatus = 'in_progress' | 'finished' | 'scheduled';

export interface GameState {
  game_id: string;
  status: GameRealtimeStatus;
  current_inning: number;
  top_bottom: 'top' | 'bottom';
  counts: { b: number; s: number; o: number };
  runners: { '1b': string | null; '2b': string | null; '3b': string | null };
  matchup: { pitcher_id: string | null; batter_id: string | null };
  scores: {
    top_total: number;
    bottom_total: number;
    innings: Record<string, { top: number | null; bottom: number | null }>;
  };
  last_updated: string;
}

// ========== GameState (リアルタイム最小情報) ==========

let gameStates: Record<string, GameState> = {};

const loadGameStates = () => {
  try {
    const raw = localStorage.getItem('game_states');
    if (raw) {
      gameStates = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('game_states load error', e);
  }
  gameStates = {};
  persistGameStates();
};

const persistGameStates = () => {
  try {
    localStorage.setItem('game_states', JSON.stringify(gameStates));
  } catch (e) {
    console.warn('game_states save error', e);
  }
};

loadGameStates();

const touch = (state: GameState) => {
  state.last_updated = new Date().toISOString();
};

export const initGameState = (gameId: string): GameState => {
  const existing = gameStates[gameId];
  if (existing) return existing;
  const now = new Date().toISOString();
  const state: GameState = {
    game_id: gameId,
    status: 'scheduled',
    current_inning: 1,
    top_bottom: 'top',
    counts: { b: 0, s: 0, o: 0 },
    runners: { '1b': null, '2b': null, '3b': null },
    matchup: { pitcher_id: null, batter_id: null },
    scores: { top_total: 0, bottom_total: 0, innings: { '1': { top: 0, bottom: null } } },
    last_updated: now,
  };
  gameStates[gameId] = state;
  persistGameStates();
  return state;
};

export const getGameState = (gameId: string): GameState | null => gameStates[gameId] || null;

export const updateGameStateStatus = (gameId: string, status: GameRealtimeStatus): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  state.status = status;
  touch(state);
  persistGameStates();
  return state;
};

export const setInningAndHalf = (gameId: string, inning: number, half: 'top' | 'bottom'): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  state.current_inning = inning;
  state.top_bottom = half;
  const key = String(inning);
  if (!state.scores.innings[key]) state.scores.innings[key] = { top: 0, bottom: null };
  if (half === 'top' && state.scores.innings[key].top == null) state.scores.innings[key].top = 0;
  if (half === 'bottom' && state.scores.innings[key].bottom == null) state.scores.innings[key].bottom = 0;
  touch(state);
  persistGameStates();
  return state;
};

export const updateCountsRealtime = (gameId: string, counts: Partial<{ b: number; s: number; o: number }>): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  state.counts = {
    b: counts.b ?? state.counts.b,
    s: counts.s ?? state.counts.s,
    o: counts.o ?? state.counts.o,
  };
  touch(state);
  persistGameStates();
  return state;
};

export const resetCountsRealtime = (gameId: string): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  state.counts = { b: 0, s: 0, o: state.counts.o };
  touch(state);
  persistGameStates();
  return state;
};

export const updateRunnersRealtime = (
  gameId: string,
  runners: { '1b': string | null; '2b': string | null; '3b': string | null }
): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  state.runners = runners;
  touch(state);
  persistGameStates();
  return state;
};

export const updateMatchupRealtime = (
  gameId: string,
  matchup: Partial<{ pitcher_id: string | null; batter_id: string | null }>
): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  state.matchup = {
    pitcher_id: matchup.pitcher_id ?? state.matchup.pitcher_id,
    batter_id: matchup.batter_id ?? state.matchup.batter_id,
  };
  touch(state);
  persistGameStates();
  return state;
};

export const addRunsRealtime = (gameId: string, half: 'top' | 'bottom', runs: number): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  const key = String(state.current_inning);
  if (!state.scores.innings[key]) state.scores.innings[key] = { top: 0, bottom: null };
  const cell = state.scores.innings[key];
  if (half === 'top') {
    cell.top = (cell.top ?? 0) + runs;
    state.scores.top_total += runs;
  } else {
    cell.bottom = (cell.bottom ?? 0) + runs;
    state.scores.bottom_total += runs;
  }
  touch(state);
  persistGameStates();
  return state;
};

export const closeHalfInningRealtime = (gameId: string): GameState | null => {
  const state = gameStates[gameId] || initGameState(gameId);
  if (state.top_bottom === 'top') {
    state.top_bottom = 'bottom';
  } else {
    state.top_bottom = 'top';
    state.current_inning += 1;
    const key = String(state.current_inning);
    if (!state.scores.innings[key]) state.scores.innings[key] = { top: 0, bottom: null };
  }
  state.counts = { b: 0, s: 0, o: 0 };
  state.runners = { '1b': null, '2b': null, '3b': null };
  touch(state);
  persistGameStates();
  return state;
};