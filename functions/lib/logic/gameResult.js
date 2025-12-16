"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineLosingPitcher = exports.determineWinningPitcher = void 0;
const getStartingPitcher = (side, atBats, lineup) => {
    if (lineup) {
        const lineupSide = side === 'home' ? lineup.away : lineup.home;
        const pitcherEntry = lineupSide.find((e) => e.position === '1');
        if (pitcherEntry === null || pitcherEntry === void 0 ? void 0 : pitcherEntry.playerId)
            return pitcherEntry.playerId;
    }
    const firstAtBat = atBats
        .filter((a) => a.type === 'bat' && a.pitcherId)
        .find((a) => {
        const isPitcherSide = (side === 'home' && a.topOrBottom === 'bottom') ||
            (side === 'away' && a.topOrBottom === 'top');
        return isPitcherSide;
    });
    return (firstAtBat === null || firstAtBat === void 0 ? void 0 : firstAtBat.pitcherId) || null;
};
const getPitcherChanges = (side, atBats) => {
    const changes = [];
    let currentPitcher = null;
    let startIndex = 0;
    const sortedAtBats = [...atBats]
        .filter((a) => a.type === 'bat' && a.pitcherId)
        .filter((a) => {
        const isPitcherSide = (side === 'home' && a.topOrBottom === 'bottom') ||
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
const getScoreAtAtBat = (atBatIndex, atBats) => {
    let homeScore = 0;
    let awayScore = 0;
    const sortedAtBats = [...atBats].sort((a, b) => a.index - b.index);
    sortedAtBats.forEach((atBat) => {
        if (atBat.index > atBatIndex)
            return;
        if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
            if (atBat.topOrBottom === 'top') {
                homeScore += atBat.scoredRunners.length;
            }
            else {
                awayScore += atBat.scoredRunners.length;
            }
        }
    });
    return { home: homeScore, away: awayScore };
};
const determineWinningPitcher = (side, atBats, gameState, lineup, allPitchers) => {
    if (!gameState || gameState.status !== 'finished')
        return null;
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
    const startingPitcherAtBats = atBats.filter((a) => a.type === 'bat' && a.pitcherId === startingPitcher);
    let startingPitcherOuts = 0;
    startingPitcherAtBats.forEach((atBat) => {
        const outsAdded = Math.max(0, atBat.situationAfter.outs - atBat.situationBefore.outs);
        startingPitcherOuts += outsAdded;
    });
    const startingPitcherInnings = Math.floor(startingPitcherOuts / 3);
    const startingPitcherChange = pitcherChanges.find((c) => c.pitcherId === startingPitcher);
    const startingPitcherEndIndex = (startingPitcherChange === null || startingPitcherChange === void 0 ? void 0 : startingPitcherChange.endIndex) || 0;
    if (startingPitcher && startingPitcherInnings >= requiredInnings) {
        const scoreAtChange = getScoreAtAtBat(startingPitcherEndIndex, atBats);
        const wasLeading = (isHomeTeam && scoreAtChange.home > scoreAtChange.away) ||
            (!isHomeTeam && scoreAtChange.away > scoreAtChange.home);
        if (wasLeading) {
            const scoreAfterChange = getScoreAtAtBat(atBats.length, atBats);
            const stillLeading = (isHomeTeam && scoreAfterChange.home > scoreAfterChange.away) ||
                (!isHomeTeam && scoreAfterChange.away > scoreAfterChange.home);
            if (stillLeading)
                return startingPitcher;
        }
    }
    const reliefPitchers = allPitchers.filter((p) => p !== startingPitcher);
    if (reliefPitchers.length >= 2)
        return null; // Logic for multiple relief pitchers needs human input or more complex rules
    if (reliefPitchers.length === 1)
        return reliefPitchers[0];
    return null;
};
exports.determineWinningPitcher = determineWinningPitcher;
const determineLosingPitcher = (side, atBats, gameState) => {
    if (!gameState || gameState.status !== 'finished')
        return null;
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
        const isPitcherSide = (side === 'home' && a.topOrBottom === 'bottom') ||
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
                }
                else {
                    currentAwayScore -= atBat.scoredRunners.length;
                }
                const wasLeadingOrTied = (isHomeTeam && currentHomeScore >= currentAwayScore) ||
                    (!isHomeTeam && currentAwayScore >= currentHomeScore);
                if (wasLeadingOrTied)
                    return atBat.pitcherId;
            }
        }
        const firstScoringAtBat = sortedAtBats.find((a) => a.scoredRunners && a.scoredRunners.length > 0);
        return (firstScoringAtBat === null || firstScoringAtBat === void 0 ? void 0 : firstScoringAtBat.pitcherId) || null;
    }
    for (const atBat of sortedAtBats) {
        const beforeHomeScore = currentHomeScore;
        const beforeAwayScore = currentAwayScore;
        if (atBat.scoredRunners && atBat.scoredRunners.length > 0) {
            if (atBat.topOrBottom === 'top') {
                currentHomeScore -= atBat.scoredRunners.length;
            }
            else {
                currentAwayScore -= atBat.scoredRunners.length;
            }
            const wasLeading = (isHomeTeam && beforeHomeScore > beforeAwayScore) ||
                (!isHomeTeam && beforeAwayScore > beforeHomeScore);
            const nowTiedOrBehind = (isHomeTeam && currentHomeScore <= currentAwayScore) ||
                (!isHomeTeam && currentAwayScore <= currentHomeScore);
            if (wasLeading && nowTiedOrBehind)
                return atBat.pitcherId;
        }
    }
    return null;
};
exports.determineLosingPitcher = determineLosingPitcher;
//# sourceMappingURL=gameResult.js.map