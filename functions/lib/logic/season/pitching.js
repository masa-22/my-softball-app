"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePitchingSeasonStats = void 0;
const calculatePitchingSeasonStats = (gameStatsList) => {
    const totalStats = {
        gameCount: gameStatsList.length,
        winLoss: '-',
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
        if (stats.winLoss === 'win')
            totalStats.wins++;
        if (stats.winLoss === 'loss')
            totalStats.losses++;
    });
    // Reconstruct Total Innings
    const finalWhole = Math.floor(totalOuts / 3);
    const finalPartial = totalOuts % 3;
    totalStats.inningsPitched = `${finalWhole}.${finalPartial}`;
    totalStats.inningsPitchedDecimal = totalOuts / 3;
    // ERA (Earned Run Average) = (Earned Runs * 7) / Innings Pitched
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
//# sourceMappingURL=pitching.js.map