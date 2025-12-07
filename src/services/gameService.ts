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
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query } from 'firebase/firestore';

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

const GAMES_COLLECTION = 'games';

/**
 * 静的データ取得
 */
export const getGame = async (gameId: string): Promise<Game | null> => {
  try {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);
    if (gameSnap.exists()) {
      return gameSnap.data() as Game;
    }
    return null;
  } catch (error) {
    console.error('Error getting game:', error);
    throw error;
  }
};

/**
 * 全ゲーム取得（静的）
 */
export const getGames = async (): Promise<Game[]> => {
  try {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const gamesSnapshot = await getDocs(gamesRef);
    const gamesList: Game[] = [];
    gamesSnapshot.forEach((doc) => {
      gamesList.push(doc.data() as Game);
    });
    return gamesList;
  } catch (error) {
    console.error('Error getting games:', error);
    throw error;
  }
};

/**
 * ゲーム作成（静的のみ）
 */
export const createGame = async (data: {
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
}): Promise<Game> => {
  try {
    const game: Game = {
      gameId: data.gameId,
      date: data.date,
      status: 'SCHEDULED',
      tournament: { id: data.tournamentId, name: data.tournamentName },
      topTeam: { id: data.topTeamId, name: data.topTeamName, shortName: data.topTeamShortName },
      bottomTeam: { id: data.bottomTeamId, name: data.bottomTeamName, shortName: data.bottomTeamShortName },
    };
    const gameRef = doc(db, GAMES_COLLECTION, game.gameId);
    await setDoc(gameRef, game);
    // 動的初期化
    await initGameState(game.gameId);
    return game;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

/**
 * 静的データ更新
 */
export const updateGame = async (gameId: string, updates: Partial<Game>): Promise<Game | null> => {
  try {
    const gameRef = doc(db, GAMES_COLLECTION, gameId);
    const gameSnap = await getDoc(gameRef);
    if (!gameSnap.exists()) {
      return null;
    }
    await updateDoc(gameRef, updates);
    const updatedSnap = await getDoc(gameRef);
    return updatedSnap.data() as Game;
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
};

/**
 * 静的＋動的の統合ビュー（UI向け）
 */
export const getGameView = async (gameId: string): Promise<GameView | null> => {
  try {
    const base = await getGame(gameId);
    if (!base) return null;
    const st = await getGameState(gameId) || await initGameState(gameId);

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
  } catch (error) {
    console.error('Error getting game view:', error);
    throw error;
  }
};

/**
 * 動的データの窓口（完全委譲）
 */
export const setGameStatus = async (gameId: string, status: GameRealtimeStatus): Promise<GameState | null> => {
  try {
    const g = await getGame(gameId);
    if (g) {
      const newStatus = status === 'scheduled' ? 'SCHEDULED' : status === 'in_progress' ? 'PLAYING' : 'FINISHED';
      await updateGame(gameId, { status: newStatus });
    }
    return await updateGameStateStatus(gameId, status);
  } catch (error) {
    console.error('Error setting game status:', error);
    throw error;
  }
};

export const setInningHalf = async (gameId: string, inning: number, half: 'top' | 'bottom'): Promise<GameState | null> => {
  return await setInningAndHalf(gameId, inning, half);
};

export const updateCount = async (
  gameId: string,
  updates: { balls?: number; strikes?: number; outs?: number }
): Promise<GameState | null> => {
  const st = await getGameState(gameId) || await initGameState(gameId);
  const next = { b: updates.balls ?? st.counts.b, s: updates.strikes ?? st.counts.s, o: updates.outs ?? st.counts.o };
  return await updateCountsRealtime(gameId, next);
};

export const resetCount = async (gameId: string): Promise<GameState | null> => await resetCountsRealtime(gameId);

export const updateRunners = async (
  gameId: string,
  runners: { '1': string | null; '2': string | null; '3': string | null }
): Promise<GameState | null> => {
  return await updateRunnersRealtime(gameId, { '1b': runners['1'], '2b': runners['2'], '3b': runners['3'] });
};

export const addScore = async (gameId: string, half: 'top' | 'bottom', runs: number): Promise<GameState | null> => {
  return await addRunsRealtime(gameId, half, runs);
};

export const advanceInning = async (gameId: string): Promise<GameState | null> => await closeHalfInningRealtime(gameId);

export const updateMatchup = async (
  gameId: string,
  matchup: { pitcherId?: string | null; batterId?: string | null }
): Promise<GameState | null> => {
  return await updateMatchupRealtime(gameId, { pitcher_id: matchup.pitcherId ?? null, batter_id: matchup.batterId ?? null });
};

/**
 * 試合登録ユーティリティ（静的作成のみ）
 */
export const ensureGameCreated = async (data: GameCreateInput): Promise<Game> => {
  const existing = await getGame(data.gameId);
  if (existing) return existing;
  return await createGame({
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
