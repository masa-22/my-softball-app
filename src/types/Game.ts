import { GameRealtimeStatus } from '../services/gameStateService';

export type GameStatus = 'SCHEDULED' | 'PLAYING' | 'FINISHED';
export type TopOrBottom = 'top' | 'bottom';

// 静的な試合情報（gameService.tsの定義ベース）
export interface Game {
  gameId: string;
  date: string;
  status: GameStatus;
  tournament: { id: string; name: string };
  topTeam: { id: string; name: string; shortName: string };
  bottomTeam: { id: string; name: string; shortName: string };
  // 動的情報やロースターは保持しない
}

// UI向けの統合ビュー（静的＋動的）
export type GameView = Game & {
  realtime: {
    status: GameRealtimeStatus;
    currentInning: number;
    topOrBottom: TopOrBottom;
    balls: number;
    strikes: number;
    outs: number;
    runners: { '1': string | null; '2': string | null; '3': string | null };
    score: { top: number; bottom: number };
    inningScores: { top: number[]; bottom: number[] };
    matchup: { pitcherId: string | null; batterId: string | null };
    lastUpdated: string;
  };
};

// 試合登録時の入力用型
export type GameCreateInput = {
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
};


