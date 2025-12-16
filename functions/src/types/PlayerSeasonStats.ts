import { PlayerStats } from "./PlayerStats";
import { PitcherStats } from "../logic/pitchingStats";

export interface PlayerSeasonStats extends PlayerStats {
  gameCount: number; // 試合数
  average: string;   // 打率
  onBasePercentage: string; // 出塁率
  sluggingPercentage: string; // 長打率
  ops: string; // OPS
}

export interface PitcherSeasonStats extends PitcherStats {
  gameCount: number; // 登板試合数
  era: string; // 防御率
  whip: string; // WHIP
  winPercentage: string; // 勝率
  wins: number; // 勝利数
  losses: number; // 敗戦数
  inningsPitchedDecimal: number; // 計算用: 投球回数（10進数）
}
