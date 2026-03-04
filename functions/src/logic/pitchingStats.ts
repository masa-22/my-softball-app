import { AtBat, normalizeScoredRunners } from "../types/AtBat";
import { GameState } from "../types/GameState";
import { BATTING_RESULTS } from "../data/softball/battingResults";

type Side = 'home' | 'away';

export interface PitcherStats {
  winLoss: string;
  inningsPitched: string;
  battersFaced: number;
  pitches: number;
  hits: number;
  homeRuns: number;
  sacrificeBunts: number;
  sacrificeFlies: number;
  strikeouts: number;
  walks: number;
  hitByPitch: number;
  runs: number;
  earnedRuns: number;
  wildPitches: number;
}

const hasErrorOrPassedBallInScoring = (
  runnerId: string,
  scoringAtBat: AtBat,
  allAtBats: AtBat[]
): boolean => {
  const scoredList = normalizeScoredRunners(scoringAtBat.scoredRunners);
  if (!scoredList.some((e) => e.runnerId === runnerId)) return false;

  if (scoringAtBat.runnerEvents) {
    for (const event of scoringAtBat.runnerEvents) {
      if (event.runnerId === runnerId && ['passedball', 'wildpitch'].includes(event.type)) return true;
    }
  }

  if (scoringAtBat.playDetails?.fielding) {
    for (const fielding of scoringAtBat.playDetails.fielding) {
      if (fielding.action === 'error' || fielding.action === 'throw' || fielding.action === 'catch') return true;
    }
  }

  const sortedAtBats = [...allAtBats].sort((a, b) => a.index - b.index);
  const onBaseAtBat = sortedAtBats.find(a => 
    a.index < scoringAtBat.index &&
    a.result && 
    a.batterId === runnerId && (
      ['error', 'walk', 'deadball'].includes(a.result.type) ||
      BATTING_RESULTS[a.result.type]?.stats.isHit ||
      BATTING_RESULTS[a.result.type]?.stats.isOnBase
    )
  );

  if (onBaseAtBat) {
    if (onBaseAtBat.result?.type === 'error') return true;
    if (onBaseAtBat.playDetails?.fielding?.some(f => f.action === 'error' || f.action === 'throw' || f.action === 'catch')) return true;
    if (onBaseAtBat.runnerEvents?.some(e => e.runnerId === runnerId && ['passedball', 'wildpitch'].includes(e.type))) return true;

    const betweenAtBats = sortedAtBats.filter(
      a => a.index > onBaseAtBat.index && a.index < scoringAtBat.index
    );
    for (const betweenAtBat of betweenAtBats) {
      if (betweenAtBat.runnerEvents?.some(e => e.runnerId === runnerId && ['passedball', 'wildpitch'].includes(e.type))) return true;
      if (betweenAtBat.playDetails?.fielding?.some(f => f.action === 'error' || f.action === 'throw' || f.action === 'catch')) return true;
    }
  }

  return false;
};

export const calculatePitcherStats = (
  playerId: string,
  atBats: AtBat[],
  side: Side,
  gameState: GameState | null
): PitcherStats => {
  const stats: PitcherStats = {
    winLoss: '-',
    inningsPitched: '0.0',
    battersFaced: 0,
    pitches: 0,
    hits: 0,
    homeRuns: 0,
    sacrificeBunts: 0,
    sacrificeFlies: 0,
    strikeouts: 0,
    walks: 0,
    hitByPitch: 0,
    runs: 0,
    earnedRuns: 0,
    wildPitches: 0,
  };

  const pitcherAtBats = atBats.filter(
    (atBat) => atBat.type === 'bat' && atBat.pitcherId === playerId
  );

  let totalOuts = 0;
  pitcherAtBats.forEach((atBat) => {
    const outsAdded = Math.max(0, atBat.situationAfter.outs - atBat.situationBefore.outs);
    totalOuts += outsAdded;
  });
  const inningWhole = Math.floor(totalOuts / 3);
  const inningRemainder = totalOuts % 3;
  stats.inningsPitched = `${inningWhole}.${inningRemainder}`;

  stats.battersFaced = pitcherAtBats.length;

  pitcherAtBats.forEach((atBat) => {
    stats.pitches += atBat.pitches.length;

    if (atBat.result) {
      const resultDef = BATTING_RESULTS[atBat.result.type];
      if (resultDef) {
        if (resultDef.stats.isHit) {
          stats.hits++;
          if (['homerun', 'runninghomerun'].includes(atBat.result.type)) stats.homeRuns++;
        }
        if (['sac_bunt', 'sacrifice_bunt'].includes(atBat.result.type)) stats.sacrificeBunts++;
        if (['sac_fly', 'sacrifice_fly'].includes(atBat.result.type)) stats.sacrificeFlies++;
        if (['strikeout_swinging', 'strikeout_looking', 'droppedthird'].includes(atBat.result.type)) stats.strikeouts++;
        if (atBat.result.type === 'walk') stats.walks++;
        if (atBat.result.type === 'deadball') stats.hitByPitch++;
      }
    }

    // 暴投（同じ球目の重複は1カウント）
    if (atBat.runnerEvents) {
      const wpPitchSeqs = new Set<number | null>();
      atBat.runnerEvents.forEach((event) => {
        if (event.type === 'wildpitch') {
          wpPitchSeqs.add(event.pitchSeq ?? null);
        }
      });
      stats.wildPitches += wpPitchSeqs.size;
    }
  });

  pitcherAtBats.forEach((atBat) => {
    const scoredList = normalizeScoredRunners(atBat.scoredRunners);
    if (scoredList.length > 0) {
      stats.runs += scoredList.length;
      scoredList.forEach((entry) => {
        if (!hasErrorOrPassedBallInScoring(entry.runnerId, atBat, atBats)) {
          stats.earnedRuns++;
        }
      });
    }
  });

  return stats;
};
