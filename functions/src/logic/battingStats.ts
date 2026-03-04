import { AtBat, normalizeScoredRunners } from "../types/AtBat";
import { PlayerStats } from "../types/PlayerStats";
import { BATTING_RESULTS } from "../data/softball/battingResults";

type Side = 'home' | 'away';

export const calculatePlayerStats = (
  playerId: string,
  atBats: AtBat[],
  side: Side
): PlayerStats => {
  const stats: PlayerStats = {
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    runs: 0,
    rbi: 0,
    sacrifice: 0,
    walks: 0,
    hitByPitch: 0,
    fourBall: 0,
    strikeouts: 0,
    stolenBases: 0,
    homeRuns: 0,
    triples: 0,
    doubles: 0,
    singles: 0,
    assists: 0,
    putouts: 0,
    errors: 0,
  };

  atBats.forEach((atBat) => {
    // Determine if this atBat belongs to the player's side (Offense)
    const isPlayerSide = (atBat.topOrBottom === 'top' && side === 'home') ||
                         (atBat.topOrBottom === 'bottom' && side === 'away');

    // Batting stats
    if (atBat.type === 'bat' && atBat.batterId === playerId && isPlayerSide) {
      stats.plateAppearances++;

      if (atBat.result) {
        const resultDef = BATTING_RESULTS[atBat.result.type];
        if (resultDef) {
          if (resultDef.stats.isAB) stats.atBats++;
          if (resultDef.stats.isHit) {
            stats.hits++;
            if (atBat.result.type === 'single') stats.singles++;
            else if (atBat.result.type === 'double') stats.doubles++;
            else if (atBat.result.type === 'triple') stats.triples++;
            else if (['homerun', 'runninghomerun'].includes(atBat.result.type)) stats.homeRuns++;
          }
          if (resultDef.stats.isSacrifice) stats.sacrifice++;
          if (atBat.result.type === 'walk') stats.walks++;
          if (atBat.result.type === 'deadball') stats.hitByPitch++;
          if (['strikeout_swinging', 'strikeout_looking', 'droppedthird'].includes(atBat.result.type)) stats.strikeouts++;
        }
      }
      if (atBat.result?.rbi && atBat.result.rbi > 0) {
        stats.rbi += atBat.result.rbi;
      }
    }

    // Runs
    const scoredList = normalizeScoredRunners(atBat.scoredRunners);
    if (scoredList.some((e) => e.runnerId === playerId) && isPlayerSide) {
      stats.runs++;
    }

    // Stolen Bases
    if (atBat.runnerEvents) {
      atBat.runnerEvents.forEach((event) => {
        if (event.runnerId === playerId && event.type === 'steal' && !event.isOut && isPlayerSide) {
          stats.stolenBases++;
        }
      });
    }

    // Fielding (Defense)
    if (atBat.playDetails?.fielding) {
      atBat.playDetails.fielding.forEach((fieldingAction) => {
        if (fieldingAction.playerId === playerId) {
          if (fieldingAction.action === 'assist') stats.assists++;
          else if (fieldingAction.action === 'putout') stats.putouts++;
          else if (fieldingAction.action === 'error' || fieldingAction.action === 'throw' || fieldingAction.action === 'catch') stats.errors++;
        }
      });
    }
  });

  stats.fourBall = stats.walks + stats.hitByPitch;
  return stats;
};
