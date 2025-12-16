"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFieldingSeasonStats = void 0;
const calculateFieldingSeasonStats = (gameStatsList) => {
    const totalStats = {
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
exports.calculateFieldingSeasonStats = calculateFieldingSeasonStats;
//# sourceMappingURL=fielding.js.map