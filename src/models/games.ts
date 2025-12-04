export type GameStatus = 'SCHEDULED' | 'PLAYING' | 'FINISHED';
export type HalfInning = 'top' | 'bottom';
export type PlayerStatus = 'PLAYING' | 'BENCH' | 'SUBSTITUTED';

export interface Tournament {
  id: string;
  name: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;
}

export interface RosterEntry {
  playerId: string;
  familyName: string;
  givenName: string;
  order: number | null; // 打順（nullは控え）
  startPosition: string | null; // 守備番号（nullは控え）
  currentPosition: string | null; // 現在の守備
  status: PlayerStatus;
}

export interface Runners {
  '1': string | null;
  '2': string | null;
  '3': string | null;
}

export interface InningScores {
  top: number[];    // 各回の表の得点
  bottom: number[]; // 各回の裏の得点
}

export interface Game {
  gameId: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: GameStatus;

  // 大会・チーム情報
  tournament: Tournament;
  topTeam: TeamInfo;
  bottomTeam: TeamInfo;

  // リアルタイム状況
  currentInning: number;      // 進行中の回（1始まり）
  topOrBottom: HalfInning;    // 'top' | 'bottom'
  outs: number;               // 0-2
  balls: number;              // 0-3
  strikes: number;            // 0-2
  currentBatterId: string | null;
  currentPitcherId: string | null;
  score: { top: number; bottom: number };
  inningScores: InningScores;
  runners: Runners;

  // 出場選手（ベンチ含む）
  rosters: {
    top: RosterEntry[];
    bottom: RosterEntry[];
  };
}
