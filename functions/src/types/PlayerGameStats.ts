export interface PlayerBattingStats {
  plateAppearances: number; // 打席数
  atBats: number;           // 打数
  hits: number;             // 安打
  doubles: number;          // 二塁打
  triples: number;          // 三塁打
  homeruns: number;         // 本塁打
  runsBattedIn: number;     // 打点
  runsScored: number;       // 得点
  walks: number;            // 四球
  deadballs: number;        // 死球
  strikeouts: number;       // 三振
  stolenBases: number;      // 盗塁
  caughtStealing?: number;  // 盗塁死（既存データは0扱い）
  sacrificeBunts: number;   // 犠打
  sacrificeFlies: number;   // 犠飛
}

export interface PlayerFieldingStats {
  putouts: number;          // 刺殺
  assists: number;          // 補殺
  errors: number;           // 失策
}

export interface PlayerPitchingStats {
  outsPitched: number;      // 獲得アウト数（投球回計算用: 1/3回 = 1）
  batterFaced: number;      // 対戦打者数
  hitsAllowed: number;      // 被安打
  runsAllowed: number;      // 失点
  earnedRuns: number;       // 自責点
  strikeouts: number;       // 奪三振
  walks: number;            // 与四球
  deadballs: number;        // 与死球
  homersHit: number;        // 被本塁打
  win?: boolean;            // 勝利投手
  loss?: boolean;           // 敗戦投手
}

export interface PlayerGameStats {
  id: string;          // {gameId}_{playerId}
  gameId: string;      // 試合ID
  playerId: string;    // 選手ID
  teamId: string;      // 所属チームID
  gameDate: string;    // 試合日
  opponentTeam: string;// 対戦相手名
  gameName?: string;   // 大会名/試合名

  batting: PlayerBattingStats;
  fielding: PlayerFieldingStats;
  pitching?: PlayerPitchingStats; // 登板した場合のみ

  memo?: string;

  createdAt: string;
  updatedAt: string;
}
