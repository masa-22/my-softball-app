import { PlayerStats } from "../../types/PlayerStats";

export interface FieldingSeasonStats {
  gameCount: number;
  assists: number;
  putouts: number;
  errors: number;
  fieldingPercentage: string; // 守備率
}

export const calculateFieldingSeasonStats = (gameStatsList: PlayerStats[]): FieldingSeasonStats => {
  const totalStats: FieldingSeasonStats = {
    gameCount: gameStatsList.length,
    assists: 0,
    putouts: 0,
    errors: 0,
    fieldingPercentage: '.---'
  };

  gameStatsList.forEach(stats => {
    totalStats.assists += stats.assists;
    totalStats.putouts += stats.putouts;
    totalStats.errors += stats.errors;
  });

  // Fielding Percentage = (Putouts + Assists) / (Putouts + Assists + Errors)
  const chances = totalStats.putouts + totalStats.assists + totalStats.errors;
  if (chances > 0) {
    totalStats.fieldingPercentage = ((totalStats.putouts + totalStats.assists) / chances).toFixed(3).replace(/^0/, '');
  }

  return totalStats;
};
