/**
 * ゲーム状態管理サービス
 * - リアルタイム試合状況を含む詳細なゲーム状態を管理
 * - Realtime Databaseを使用してリアルタイム同期を実現
 */

import {
  GameRealtimeStatus,
  GameState
} from '../types/GameState';
import { rtdb } from '../firebaseConfig';
import { ref, get, set, update, onValue, off, Unsubscribe } from 'firebase/database';

export type { GameRealtimeStatus, GameState };

// ========== GameState (リアルタイム最小情報) ==========

const GAME_STATES_PATH = 'gameStates';

const touch = (state: GameState) => {
  state.last_updated = new Date().toISOString();
};

const getGameStateRef = (gameId: string) => {
  return ref(rtdb, `${GAME_STATES_PATH}/${gameId}`);
};

export const initGameState = async (gameId: string): Promise<GameState> => {
  try {
    const existing = await getGameState(gameId);
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
    const stateRef = getGameStateRef(gameId);
    await set(stateRef, state);
    return state;
  } catch (error) {
    console.error('Error initializing game state:', error);
    throw error;
  }
};

export const getGameState = async (gameId: string): Promise<GameState | null> => {
  try {
    const stateRef = getGameStateRef(gameId);
    const snapshot = await get(stateRef);
    if (snapshot.exists()) {
      return snapshot.val() as GameState;
    }
    return null;
  } catch (error) {
    console.error('Error getting game state:', error);
    throw error;
  }
};

/**
 * リアルタイムリスナーを設定
 * @param gameId ゲームID
 * @param callback 状態変更時のコールバック
 * @returns リスナーの解除関数
 */
export const subscribeGameState = (
  gameId: string,
  callback: (state: GameState | null) => void
): Unsubscribe => {
  const stateRef = getGameStateRef(gameId);
  return onValue(stateRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as GameState);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in game state subscription:', error);
    callback(null);
  });
};

export const updateGameStateStatus = async (gameId: string, status: GameRealtimeStatus): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    state.status = status;
    touch(state);
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, { status: state.status, last_updated: state.last_updated });
    return state;
  } catch (error) {
    console.error('Error updating game state status:', error);
    throw error;
  }
};

export const setInningAndHalf = async (gameId: string, inning: number, half: 'top' | 'bottom'): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    state.current_inning = inning;
    state.top_bottom = half;
    const key = String(inning);
    if (!state.scores.innings[key]) state.scores.innings[key] = { top: 0, bottom: null };
    if (half === 'top' && state.scores.innings[key].top == null) state.scores.innings[key].top = 0;
    if (half === 'bottom' && state.scores.innings[key].bottom == null) state.scores.innings[key].bottom = 0;
    touch(state);
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, {
      current_inning: state.current_inning,
      top_bottom: state.top_bottom,
      scores: state.scores,
      last_updated: state.last_updated
    });
    return state;
  } catch (error) {
    console.error('Error setting inning and half:', error);
    throw error;
  }
};

export const updateCountsRealtime = async (gameId: string, counts: Partial<{ b: number; s: number; o: number }>): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    state.counts = {
      b: counts.b ?? state.counts.b,
      s: counts.s ?? state.counts.s,
      o: counts.o ?? state.counts.o,
    };
    touch(state);
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, { counts: state.counts, last_updated: state.last_updated });
    return state;
  } catch (error) {
    console.error('Error updating counts:', error);
    throw error;
  }
};

export const resetCountsRealtime = async (gameId: string): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    state.counts = { b: 0, s: 0, o: state.counts.o };
    touch(state);
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, { counts: state.counts, last_updated: state.last_updated });
    return state;
  } catch (error) {
    console.error('Error resetting counts:', error);
    throw error;
  }
};

export const updateRunnersRealtime = async (
  gameId: string,
  runners: { '1b': string | null; '2b': string | null; '3b': string | null }
): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    state.runners = runners;
    touch(state);
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, { runners: state.runners, last_updated: state.last_updated });
    return state;
  } catch (error) {
    console.error('Error updating runners:', error);
    throw error;
  }
};

export const updateMatchupRealtime = async (
  gameId: string,
  matchup: Partial<{ pitcher_id: string | null; batter_id: string | null }>
): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    state.matchup = {
      pitcher_id: matchup.pitcher_id ?? state.matchup.pitcher_id,
      batter_id: matchup.batter_id ?? state.matchup.batter_id,
    };
    touch(state);
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, { matchup: state.matchup, last_updated: state.last_updated });
    return state;
  } catch (error) {
    console.error('Error updating matchup:', error);
    throw error;
  }
};

export const addRunsRealtime = async (gameId: string, half: 'top' | 'bottom', runs: number): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    const key = String(state.current_inning);
    if (!state.scores.innings[key]) state.scores.innings[key] = { top: 0, bottom: null };
    const cell = state.scores.innings[key];

    // 修正: 引数の half に依存せず、常に現在の攻撃側(state.top_bottom)に加算する
    const effectiveHalf = state.top_bottom;

    if (effectiveHalf === 'top') {
      cell.top = (cell.top ?? 0) + runs;
      state.scores.top_total += runs;
    } else {
      cell.bottom = (cell.bottom ?? 0) + runs;
      state.scores.bottom_total += runs;
    }
    touch(state);
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, { scores: state.scores, last_updated: state.last_updated });
    return state;
  } catch (error) {
    console.error('Error adding runs:', error);
    throw error;
  }
};

export const closeHalfInningRealtime = async (gameId: string): Promise<GameState | null> => {
  try {
    const state = await getGameState(gameId) || await initGameState(gameId);
    
    // runnersが存在しない場合は初期化
    if (!state.runners) {
      state.runners = { '1b': null, '2b': null, '3b': null };
    }
    
    // イニング終了時に残塁数を記録（3アウト時点で塁上に残ったランナー数）
    const leftOnBaseCount = [state.runners['1b'], state.runners['2b'], state.runners['3b']].filter(r => r !== null).length;
    const currentInningKey = String(state.current_inning);
    
    // 現在のイニングのスコア情報を取得または初期化
    if (!state.scores.innings[currentInningKey]) {
      state.scores.innings[currentInningKey] = { top: null, bottom: null };
    }
    
    // 残塁情報を初期化（存在しない場合）
    if (!state.scores.innings[currentInningKey].leftOnBase) {
      state.scores.innings[currentInningKey].leftOnBase = { top: 0, bottom: 0 };
    }
    
    // 現在の攻撃側（top_bottom）の残塁数を記録
    if (state.top_bottom === 'top') {
      state.scores.innings[currentInningKey].leftOnBase!.top = leftOnBaseCount;
    } else {
      state.scores.innings[currentInningKey].leftOnBase!.bottom = leftOnBaseCount;
    }
    
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
    const stateRef = getGameStateRef(gameId);
    await update(stateRef, {
      current_inning: state.current_inning,
      top_bottom: state.top_bottom,
      counts: state.counts,
      runners: state.runners,
      scores: state.scores,
      last_updated: state.last_updated
    });
    return state;
  } catch (error) {
    console.error('Error closing half inning:', error);
    throw error;
  }
};
