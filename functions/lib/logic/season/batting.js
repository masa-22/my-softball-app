"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBattingSeasonStats = void 0;
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
        // Fielding stats are also in PlayerStats currently, so aggregating them here for now
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
        const obpVal = parseFloat(totalStats.onBasePercentage) || 0;
        const slgVal = parseFloat(totalStats.sluggingPercentage) || 0;
        totalStats.ops = (obpVal + slgVal).toFixed(3).replace(/^0/, '');
    }
    return totalStats;
};
exports.calculateBattingSeasonStats = calculateBattingSeasonStats;
//# sourceMappingURL=batting.js.map