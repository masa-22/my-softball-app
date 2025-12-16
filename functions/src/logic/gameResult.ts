import { AtBat } from "../types/AtBat";
import { GameState } from "../types/GameState";
import { Lineup } from "../types/Lineup";

type Side = 'home' | 'away';

const getStartingPitcher = (
  side: Side,
  atBats: AtBat[],
  lineup: Lineup | null
): string | null => {
  if (lineup) {
    const lineupSide = side === 'home' ? lineup.away : lineup.home;
    const pitcherEntry = lineupSide.find((e) => e.position === '1');
    if (pitcherEntry?.playerId) return pitcherEntry.playerId;
  }

  const firstAtBat = atBats
    .filter((a) => a.type === 'bat' && a.pitcherId)
    .find((a) => {
      const isPitcherSide =
        (side === 'home' && a.topOrBottom === 'bottom') ||
        (side === 'away' && a.topOrBottom === 'top');
      return isPitcherSide;
    });

  return firstAtBat?.pitcherId || null;
};

const getPitcherChanges = (
  side: Side,
  atBats: AtBat[]
): Array<{ pitcherId: string; startIndex: number; endIndex: number }> => {
  const changes: Array<{ pitcherId: string; startIndex: number; endIndex: number }> = [];
  let currentPitcher: string | null = null;
  let startIndex = 0;

  const sortedAtBats = [...atBats]
    .filter((a) => a.type === 'bat' && a.pitcherId)
    .filter((a) => {
      const isPitcherSide =
        (side === 'home' && a.topOrBottom === 'bottom') ||
        (side === 'away' && a.topOrBottom === 'top');
      return isPitcherSide;
    })
    .sort((a, b) => a.index - b.index);

  sortedAtBats.forEach((atBat) => {
    if (currentPitcher !== atBat.pitcherId) {
      if (currentPitcher) {
        changes.push({
          pitcherId: currentPitcher,
          startIndex,
          endIndex: atBat.index - 1,
        });
      }
      currentPitcher = atBat.pitcherId;
      startIndex = atBat.index;
    }
  });

  if (currentPitcher && sortedAtBats.length > 0) {
    changes.push({
      pitcherId: currentPitcher,
      startIndex,
      endIndex: sortedAtBats[sortedAtBats.length - 1].index,
    });
  }

  return changes;
};

const getScoreAtAtBat = (
  atBatIndex: number,
  atBats: AtBat[],
): { home: number; away: number } => {
  let homeScore = 0;
  let awayScore = 0;

  const sortedAtBats = [...atBats].sort((a, b) => a.index - b.index);
  sortedAtBats.forEach((atBat) => {
    if (atBat.index > atBatIndex) return;
    if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
      if (atBat.topOrBottom === 'top') {
        homeScore += atBat.scoredRunners.length;
      } else {
        awayScore += atBat.scoredRunners.length;
      }
    }
  });

  return { home: homeScore, away: awayScore };
};

export const determineWinningPitcher = (
  side: Side,
  atBats: AtBat[],
  gameState: GameState | null,
  lineup: Lineup | null,
  allPitchers: string[]
): string | null => {
  if (!gameState || gameState.status !== 'finished') return null;

  const isHomeTeam = side === 'home';
  const finalHomeScore = gameState.scores.top_total;
  const finalAwayScore = gameState.scores.bottom_total;
  const winningTeam = finalHomeScore > finalAwayScore ? 'home' : finalAwayScore > finalHomeScore ? 'away' : null;

  if (!winningTeam || (winningTeam === 'home' && side !== 'home') || (winningTeam === 'away' && side !== 'away')) {
    return null;
  }

  const startingPitcher = getStartingPitcher(side, atBats, lineup);
  const pitcherChanges = getPitcherChanges(side, atBats);
  const finalInning = Math.max(...atBats.map((a) => a.inning || 0), 0);
  const requiredInnings = Math.ceil(finalInning / 2);

  const startingPitcherAtBats = atBats.filter(
    (a) => a.type === 'bat' && a.pitcherId === startingPitcher
  );
  let startingPitcherOuts = 0;
  startingPitcherAtBats.forEach((atBat) => {
    const outsAdded = Math.max(0, atBat.situationAfter.outs - atBat.situationBefore.outs);
    startingPitcherOuts += outsAdded;
  });
  const startingPitcherInnings = Math.floor(startingPitcherOuts / 3);

  const startingPitcherChange = pitcherChanges.find((c) => c.pitcherId === startingPitcher);
  const startingPitcherEndIndex = startingPitcherChange?.endIndex || 0;

  if (startingPitcher && startingPitcherInnings >= requiredInnings) {
    const scoreAtChange = getScoreAtAtBat(startingPitcherEndIndex, atBats);
    const wasLeading =
      (isHomeTeam && scoreAtChange.home > scoreAtChange.away) ||
      (!isHomeTeam && scoreAtChange.away > scoreAtChange.home);

    if (wasLeading) {
      const scoreAfterChange = getScoreAtAtBat(atBats.length, atBats);
      const stillLeading =
        (isHomeTeam && scoreAfterChange.home > scoreAfterChange.away) ||
        (!isHomeTeam && scoreAfterChange.away > scoreAfterChange.home);

      if (stillLeading) return startingPitcher;
    }
  }

  const reliefPitchers = allPitchers.filter((p) => p !== startingPitcher);
  if (reliefPitchers.length >= 2) return null; // Logic for multiple relief pitchers needs human input or more complex rules
  if (reliefPitchers.length === 1) return reliefPitchers[0];

  return null;
};

export const determineLosingPitcher = (
  side: Side,
  atBats: AtBat[],
  gameState: GameState | null
): string | null => {
  if (!gameState || gameState.status !== 'finished') return null;

  const isHomeTeam = side === 'home';
  const finalHomeScore = gameState.scores.top_total;
  const finalAwayScore = gameState.scores.bottom_total;
  const losingTeam = finalHomeScore < finalAwayScore ? 'home' : finalAwayScore < finalHomeScore ? 'away' : null;

  if (!losingTeam || (losingTeam === 'home' && side !== 'home') || (losingTeam === 'away' && side !== 'away')) {
    return null;
  }

  const sortedAtBats = [...atBats]
    .filter((a) => a.type === 'bat' && a.pitcherId)
    .filter((a) => {
      const isPitcherSide =
        (side === 'home' && a.topOrBottom === 'bottom') ||
        (side === 'away' && a.topOrBottom === 'top');
      return isPitcherSide;
    })
    .sort((a, b) => b.index - a.index);

  let currentHomeScore = finalHomeScore;
  let currentAwayScore = finalAwayScore;

  const initiallyLosing = (isHomeTeam && currentHomeScore < currentAwayScore) ||
                          (!isHomeTeam && currentAwayScore < currentHomeScore);
  
  if (initiallyLosing) {
    for (const atBat of sortedAtBats) {
      if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
        if (atBat.topOrBottom === 'top') {
          currentHomeScore -= atBat.scoredRunners.length;
        } else {
          currentAwayScore -= atBat.scoredRunners.length;
        }
        
        const wasLeadingOrTied =
          (isHomeTeam && currentHomeScore >= currentAwayScore) ||
          (!isHomeTeam && currentAwayScore >= currentHomeScore);
        
        if (wasLeadingOrTied) return atBat.pitcherId!;
      }
    }
    const firstScoringAtBat = sortedAtBats.find((a) => a.scoredRunners && a.scoredRunners.length > 0);
    return firstScoringAtBat?.pitcherId || null;
  }

  for (const atBat of sortedAtBats) {
    const beforeHomeScore = currentHomeScore;
    const beforeAwayScore = currentAwayScore;
    
    if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
      if (atBat.topOrBottom === 'top') {
        currentHomeScore -= atBat.scoredRunners.length;
      } else {
        currentAwayScore -= atBat.scoredRunners.length;
      }

      const wasLeading =
        (isHomeTeam && beforeHomeScore > beforeAwayScore) ||
        (!isHomeTeam && beforeAwayScore > beforeHomeScore);
      
      const nowTiedOrBehind =
        (isHomeTeam && currentHomeScore <= currentAwayScore) ||
        (!isHomeTeam && currentAwayScore <= currentHomeScore);

      if (wasLeading && nowTiedOrBehind) return atBat.pitcherId!;
    }
  }

  return null;
};
