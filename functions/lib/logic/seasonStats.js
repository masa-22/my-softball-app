"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePitchingSeasonStats = exports.calculateBattingSeasonStats = void 0;
const calculateBattingSeasonStats = (gameStatsList) => {
    const totalStats = {
        gameCount: gameStatsList.length,
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
        average: '.---',
        onBasePercentage: '.---',
        sluggingPercentage: '.---',
        ops: '.---',
    };
    gameStatsList.forEach(stats => {
        totalStats.plateAppearances += stats.plateAppearances;
        totalStats.atBats += stats.atBats;
        totalStats.hits += stats.hits;
        totalStats.runs += stats.runs;
        totalStats.rbi += stats.rbi;
        totalStats.sacrifice += stats.sacrifice;
        totalStats.walks += stats.walks;
        totalStats.hitByPitch += stats.hitByPitch;
        totalStats.fourBall += stats.fourBall;
        totalStats.strikeouts += stats.strikeouts;
        totalStats.stolenBases += stats.stolenBases;
        totalStats.homeRuns += stats.homeRuns;
        totalStats.triples += stats.triples;
        totalStats.doubles += stats.doubles;
        totalStats.singles += stats.singles;
        totalStats.assists += stats.assists;
        totalStats.putouts += stats.putouts;
        totalStats.errors += stats.errors;
    });
    // Calculate Rate Stats
    if (totalStats.atBats > 0) {
        totalStats.average = (totalStats.hits / totalStats.atBats).toFixed(3).replace(/^0/, '');
    }
    if (totalStats.atBats + totalStats.walks + totalStats.hitByPitch + totalStats.sacrifice > 0) {
        const obp = (totalStats.hits + totalStats.walks + totalStats.hitByPitch) /
            (totalStats.atBats + totalStats.walks + totalStats.hitByPitch + totalStats.sacrifice);
        totalStats.onBasePercentage = obp.toFixed(3).replace(/^0/, '');
    }
    if (totalStats.atBats > 0) {
        const totalBases = totalStats.singles + (totalStats.doubles * 2) + (totalStats.triples * 3) + (totalStats.homeRuns * 4);
        const slg = totalBases / totalStats.atBats;
        totalStats.sluggingPercentage = slg.toFixed(3).replace(/^0/, '');
    }
    if (totalStats.onBasePercentage !== '.---' && totalStats.sluggingPercentage !== '.---') {
        const obpVal = parseFloat(totalStats.onBasePercentage) || 0; // Handle .--- as 0 effectively for parsing but logic above handles .---
        const slgVal = parseFloat(totalStats.sluggingPercentage) || 0;
        // Re-parse correctly to handle the leading dot string if needed, but parseFloat handles '.333' as 0.333
        totalStats.ops = (obpVal + slgVal).toFixed(3).replace(/^0/, '');
    }
    return totalStats;
};
exports.calculateBattingSeasonStats = calculateBattingSeasonStats;
const calculatePitchingSeasonStats = (gameStatsList) => {
    const totalStats = {
        gameCount: gameStatsList.length,
        winLoss: '-', // Not really aggregate-able simply, but wins/losses count
        wins: 0,
        losses: 0,
        inningsPitched: '0.0',
        inningsPitchedDecimal: 0,
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
        era: '---',
        whip: '---',
        winPercentage: '.---'
    };
    let totalOuts = 0;
    gameStatsList.forEach(stats => {
        // Parse Innings Pitched (e.g., "5.1" -> 5 innings + 1 out = 16 outs)
        const [whole, partial] = stats.inningsPitched.split('.').map(Number);
        const outs = (whole * 3) + (partial || 0);
        totalOuts += outs;
        totalStats.battersFaced += stats.battersFaced;
        totalStats.pitches += stats.pitches;
        totalStats.hits += stats.hits;
        totalStats.homeRuns += stats.homeRuns;
        totalStats.sacrificeBunts += stats.sacrificeBunts;
        totalStats.sacrificeFlies += stats.sacrificeFlies;
        totalStats.strikeouts += stats.strikeouts;
        totalStats.walks += stats.walks;
        totalStats.hitByPitch += stats.hitByPitch;
        totalStats.runs += stats.runs;
        totalStats.earnedRuns += stats.earnedRuns;
        totalStats.wildPitches += stats.wildPitches;
        if (stats.winLoss === '勝')
            totalStats.wins++;
        if (stats.winLoss === '敗')
            totalStats.losses++;
    });
    // Reconstruct Total Innings
    const finalWhole = Math.floor(totalOuts / 3);
    const finalPartial = totalOuts % 3;
    totalStats.inningsPitched = `${finalWhole}.${finalPartial}`;
    totalStats.inningsPitchedDecimal = totalOuts / 3;
    // ERA (Earned Run Average) = (Earned Runs * 7) / Innings Pitched
    // Assuming 7 innings game for Softball
    if (totalStats.inningsPitchedDecimal > 0) {
        totalStats.era = ((totalStats.earnedRuns * 7) / totalStats.inningsPitchedDecimal).toFixed(2);
    }
    // WHIP = (Walks + Hits) / Innings Pitched
    if (totalStats.inningsPitchedDecimal > 0) {
        totalStats.whip = ((totalStats.walks + totalStats.hits) / totalStats.inningsPitchedDecimal).toFixed(2);
    }
    // Win Percentage
    const decisions = totalStats.wins + totalStats.losses;
    if (decisions > 0) {
        totalStats.winPercentage = (totalStats.wins / decisions).toFixed(3).replace(/^0/, '');
    }
    return totalStats;
};
exports.calculatePitchingSeasonStats = calculatePitchingSeasonStats;
//# sourceMappingURL=seasonStats.js.map