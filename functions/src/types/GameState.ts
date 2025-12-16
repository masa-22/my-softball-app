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
    innings: Record<string, { 
      top: number | null; 
      bottom: number | null;
      leftOnBase?: { top: number; bottom: number };
    }>;
  };
  home_bat_index?: number; // 先攻チームの現在の打順インデックス
  away_bat_index?: number; // 後攻チームの現在の打順インデックス
  last_updated: string;
}





