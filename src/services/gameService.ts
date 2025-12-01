/**
 * ゲーム情報管理サービス
 * - リアルタイム試合状況を含む詳細なゲームデータを管理
 */

export type GameStatus = 'SCHEDULED' | 'PLAYING' | 'FINISHED';
export type PlayerStatus = 'PLAYING' | 'BENCH' | 'SUBSTITUTED';
export type TopOrBottom = 'top' | 'bottom';

export interface RosterPlayer {
  playerId: string;
  familyName: string;
  givenName: string;
  order: number | null; // 打順（1-9）、ベンチの場合null
  startPosition: string | null; // 開始時のポジション（'1'-'9', 'DP'等）
  currentPosition: string | null; // 現在のポジション
  status: PlayerStatus;
}

export interface Game {
  gameId: string;
  date: string; // yyyy-mm-dd
  status: GameStatus;
  
  // 大会・チーム情報
  tournament: { id: string; name: string };
  topTeam: { id: string; name: string; shortName: string };
  bottomTeam: { id: string; name: string; shortName: string };
  
  // リアルタイム状況
  currentInning: number;
  topOrBottom: TopOrBottom;
  outs: number;
  balls: number;
  strikes: number;
  currentBatterId: string | null;
  currentPitcherId: string | null;
  score: { top: number; bottom: number };
  inningScores: { top: number[]; bottom: number[] };
  runners: { '1': string | null; '2': string | null; '3': string | null };
  
  // 出場選手
  rosters: {
    top: RosterPlayer[];
    bottom: RosterPlayer[];
  };
}

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

load();

/**
 * ゲーム情報を取得
 */
export const getGame = (gameId: string): Game | null => {
  return games[gameId] || null;
};

/**
 * 全ゲーム情報を取得
 */
export const getGames = (): Game[] => {
  return Object.values(games);
};

/**
 * ゲーム情報を作成
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
    currentInning: 1,
    topOrBottom: 'top',
    outs: 0,
    balls: 0,
    strikes: 0,
    currentBatterId: null,
    currentPitcherId: null,
    score: { top: 0, bottom: 0 },
    inningScores: { top: [], bottom: [] },
    runners: { '1': null, '2': null, '3': null },
    rosters: { top: [], bottom: [] },
  };
  
  games[game.gameId] = game;
  persist();
  return game;
};

/**
 * ゲーム情報を更新
 */
export const updateGame = (gameId: string, updates: Partial<Game>): Game | null => {
  const game = games[gameId];
  if (!game) return null;
  
  games[gameId] = { ...game, ...updates };
  persist();
  return games[gameId];
};

/**
 * ロースター（出場選手）を設定
 */
export const setRoster = (gameId: string, side: 'top' | 'bottom', roster: RosterPlayer[]): Game | null => {
  const game = games[gameId];
  if (!game) return null;
  
  game.rosters[side] = roster;
  persist();
  return game;
};

/**
 * ランナー状況を更新
 */
export const updateRunners = (
  gameId: string, 
  runners: { '1': string | null; '2': string | null; '3': string | null }
): Game | null => {
  const game = games[gameId];
  if (!game) return null;
  
  game.runners = runners;
  persist();
  return game;
};

/**
 * カウントを更新
 */
export const updateCount = (
  gameId: string,
  updates: { balls?: number; strikes?: number; outs?: number }
): Game | null => {
  const game = games[gameId];
  if (!game) return null;
  
  if (updates.balls !== undefined) game.balls = updates.balls;
  if (updates.strikes !== undefined) game.strikes = updates.strikes;
  if (updates.outs !== undefined) game.outs = updates.outs;
  
  persist();
  return game;
};

/**
 * 得点を追加
 */
export const addScore = (gameId: string, side: 'top' | 'bottom', runs: number): Game | null => {
  const game = games[gameId];
  if (!game) return null;
  
  game.score[side] += runs;
  
  // イニングスコアを更新
  const inning = game.currentInning - 1;
  if (!game.inningScores[side][inning]) {
    game.inningScores[side][inning] = 0;
  }
  game.inningScores[side][inning] += runs;
  
  persist();
  return game;
};

/**
 * イニングを進める
 */
export const advanceInning = (gameId: string): Game | null => {
  const game = games[gameId];
  if (!game) return null;
  
  if (game.topOrBottom === 'top') {
    game.topOrBottom = 'bottom';
  } else {
    game.topOrBottom = 'top';
    game.currentInning += 1;
  }
  
  // カウントとランナーをリセット
  game.balls = 0;
  game.strikes = 0;
  game.outs = 0;
  game.runners = { '1': null, '2': null, '3': null };
  
  persist();
  return game;
};

/**
 * 選手交代
 */
export const substitutePlayer = (
  gameId: string,
  side: 'top' | 'bottom',
  outPlayerId: string,
  inPlayer: RosterPlayer
): Game | null => {
  const game = games[gameId];
  if (!game) return null;
  
  const roster = game.rosters[side];
  const outIndex = roster.findIndex(p => p.playerId === outPlayerId);
  
  if (outIndex !== -1) {
    roster[outIndex].status = 'SUBSTITUTED';
  }
  
  roster.push({ ...inPlayer, status: 'PLAYING' });
  
  persist();
  return game;
};

/**
 * matchServiceからgameServiceへ移行するヘルパー
 */
export const migrateFromMatch = (matchId: string): string => {
  // matchIdをgameIdとして使用（互換性のため）
  return matchId;
};
