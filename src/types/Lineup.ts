export interface LineupEntry {
  battingOrder: number;
  position: string; // 1-9, DP, PH, PR
  playerId: string;
}

export interface Lineup {
  matchId: string;
  home: LineupEntry[]; // 先攻
  away: LineupEntry[]; // 後攻
}



