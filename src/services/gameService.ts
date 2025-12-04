/**
 * ゲーム情報管理サービス（Facade）
 * - 静的データ(Game)の作成/取得
 * - 動的データ(GameState)は gameStateService へ委譲
 * - 出場記録（participation）は participationService に直接委譲（本サービスではロースターを保持しない）
 */

import {
  Game,
  GameStatus,
  TopOrBottom,
  GameView,
  GameCreateInput
} from '../types/Game';

// 動的データは完全委譲
import {
  GameRealtimeStatus,
  GameState,
  initGameState,
  getGameState,
  updateGameStateStatus,
  setInningAndHalf,
  updateCountsRealtime,
  resetCountsRealtime,
  updateRunnersRealtime,
  updateMatchupRealtime,
  addRunsRealtime,
  closeHalfInningRealtime,
} from './gameStateService';

// 出場記録はこのサービスでは保持・投影しない（UIは直接 participationService を利用）

let games: Record<string, Game> = {};

const load = () => {
  try {
    const raw = localStorage.getItem('games');
    if (raw) {
      games = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('games load error', e);
  }
  games = {};
  persist();
};

const persist = () => {
  try {
    localStorage.setItem('games', JSON.stringify(games));
  } catch (e) {
    console.warn('games save error', e);
  }
};

// 初期ロード
load();

/**
 * 静的データ取得
 */
export const getGame = (gameId: string): Game | null => games[gameId] || null;

/**
 * 全ゲーム取得（静的）
 */
export const getGames = (): Game[] => Object.values(games);

/**
 * ゲーム作成（静的のみ）
 */
export const createGame = (data: {
  gameId: string;
  date: string;
  tournamentId: string;
  tournamentName: string;
  topTeamId: string;
  topTeamName: string;
  topTeamShortName: string;
  bottomTeamId: string;
  bottomTeamName: string;
  bottomTeamShortName: string;
}): Game => {
  const game: Game = {
    gameId: data.gameId,
    date: data.date,
    status: 'SCHEDULED',
    tournament: { id: data.tournamentId, name: data.tournamentName },
    topTeam: { id: data.topTeamId, name: data.topTeamName, shortName: data.topTeamShortName },
    bottomTeam: { id: data.bottomTeamId, name: data.bottomTeamName, shortName: data.bottomTeamShortName },
  };
  games[game.gameId] = game;
  persist();
  // 動的初期化
  initGameState(game.gameId);
  return game;
};

/**
 * 静的データ更新
 */
export const updateGame = (gameId: string, updates: Partial<Game>): Game | null => {
  const current = games[gameId];
  if (!current) return null;
  games[gameId] = { ...current, ...updates };
  persist();
  return games[gameId];
};

/**
 * 静的＋動的の統合ビュー（UI向け）
 */
export const getGameView = (gameId: string): GameView | null => {
  const base = games[gameId];
  if (!base) return null;
  const st = getGameState(gameId) || initGameState(gameId);

  const inningKeys = Object.keys(st.scores.innings).map(Number).sort((a, b) => a - b);
  const topScores: number[] = [];
  const bottomScores: number[] = [];
  inningKeys.forEach(k => {
    const cell = st.scores.innings[String(k)];
    topScores[k - 1] = cell?.top ?? 0;
    bottomScores[k - 1] = cell?.bottom ?? 0;
  });

  return {
    ...base,
    realtime: {
      status: st.status,
      currentInning: st.current_inning,
      topOrBottom: st.top_bottom,
      balls: st.counts.b,
      strikes: st.counts.s,
      outs: st.counts.o,
      runners: { '1': st.runners['1b'], '2': st.runners['2b'], '3': st.runners['3b'] },
      score: { top: st.scores.top_total, bottom: st.scores.bottom_total },
      inningScores: { top: topScores, bottom: bottomScores },
      matchup: { pitcherId: st.matchup.pitcher_id, batterId: st.matchup.batter_id },
      lastUpdated: st.last_updated,
    },
  };
};

/**
 * 動的データの窓口（完全委譲）
 */
export const setGameStatus = (gameId: string, status: GameRealtimeStatus): GameState | null => {
  const g = games[gameId];
  if (g) {
    g.status = status === 'scheduled' ? 'SCHEDULED' : status === 'in_progress' ? 'PLAYING' : 'FINISHED';
    persist();
  }
  return updateGameStateStatus(gameId, status);
};

export const setInningHalf = (gameId: string, inning: number, half: 'top' | 'bottom'): GameState | null => {
  return setInningAndHalf(gameId, inning, half);
};

export const updateCount = (
  gameId: string,
  updates: { balls?: number; strikes?: number; outs?: number }
): GameState | null => {
  const st = getGameState(gameId) || initGameState(gameId);
  const next = { b: updates.balls ?? st.counts.b, s: updates.strikes ?? st.counts.s, o: updates.outs ?? st.counts.o };
  return updateCountsRealtime(gameId, next);
};

export const resetCount = (gameId: string): GameState | null => resetCountsRealtime(gameId);

export const updateRunners = (
  gameId: string,
  runners: { '1': string | null; '2': string | null; '3': string | null }
): GameState | null => {
  return updateRunnersRealtime(gameId, { '1b': runners['1'], '2b': runners['2'], '3b': runners['3'] });
};

export const addScore = (gameId: string, half: 'top' | 'bottom', runs: number): GameState | null => {
  return addRunsRealtime(gameId, half, runs);
};

export const advanceInning = (gameId: string): GameState | null => closeHalfInningRealtime(gameId);

export const updateMatchup = (
  gameId: string,
  matchup: { pitcherId?: string | null; batterId?: string | null }
): GameState | null => {
  return updateMatchupRealtime(gameId, { pitcher_id: matchup.pitcherId ?? null, batter_id: matchup.batterId ?? null });
};

/**
 * 試合登録ユーティリティ（静的作成のみ）
 */
export const ensureGameCreated = (data: GameCreateInput): Game => {
  const existing = getGame(data.gameId);
  if (existing) return existing;
  return createGame({
    gameId: data.gameId,
    date: data.date,
    tournamentId: data.tournamentId,
    tournamentName: data.tournamentName,
    topTeamId: data.topTeamId,
    topTeamName: data.topTeamName,
    topTeamShortName: data.topTeamShortName,
    bottomTeamId: data.bottomTeamId,
    bottomTeamName: data.bottomTeamName,
    bottomTeamShortName: data.bottomTeamShortName,
  });
};

/**
 * matchServiceからgameServiceへ移行ヘルパー
 */
export const migrateFromMatch = (matchId: string): string => {
  return matchId;
};
