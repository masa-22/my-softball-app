"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePlayerStats = void 0;
const battingResults_1 = require("../data/softball/battingResults");
const calculatePlayerStats = (playerId, atBats, side) => {
    const stats = {
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
        var _a, _b, _c;
        // Determine if this atBat belongs to the player's side (Offense)
        const isPlayerSide = (atBat.topOrBottom === 'top' && side === 'home') ||
            (atBat.topOrBottom === 'bottom' && side === 'away');
        // Batting stats
        if (atBat.type === 'bat' && atBat.batterId === playerId && isPlayerSide) {
            stats.plateAppearances++;
            if (atBat.result) {
                const resultDef = battingResults_1.BATTING_RESULTS[atBat.result.type];
                if (resultDef) {
                    if (resultDef.stats.isAB)
                        stats.atBats++;
                    if (resultDef.stats.isHit) {
                        stats.hits++;
                        if (atBat.result.type === 'single')
                            stats.singles++;
                        else if (atBat.result.type === 'double')
                            stats.doubles++;
                        else if (atBat.result.type === 'triple')
                            stats.triples++;
                        else if (['homerun', 'runninghomerun'].includes(atBat.result.type))
                            stats.homeRuns++;
                    }
                    if (resultDef.stats.isSacrifice)
                        stats.sacrifice++;
                    if (atBat.result.type === 'walk')
                        stats.walks++;
                    if (atBat.result.type === 'deadball')
                        stats.hitByPitch++;
                    if (['strikeout_swinging', 'strikeout_looking', 'droppedthird'].includes(atBat.result.type))
                        stats.strikeouts++;
                }
            }
            if (((_a = atBat.result) === null || _a === void 0 ? void 0 : _a.rbi) && atBat.result.rbi > 0) {
                stats.rbi += atBat.result.rbi;
            }
        }
        // Runs
        if (((_b = atBat.scoredRunners) === null || _b === void 0 ? void 0 : _b.includes(playerId)) && isPlayerSide) {
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
        if ((_c = atBat.playDetails) === null || _c === void 0 ? void 0 : _c.fielding) {
            atBat.playDetails.fielding.forEach((fieldingAction) => {
                if (fieldingAction.playerId === playerId) {
                    if (fieldingAction.action === 'assist')
                        stats.assists++;
                    else if (fieldingAction.action === 'putout')
                        stats.putouts++;
                    else if (fieldingAction.action === 'error')
                        stats.errors++;
                }
            });
        }
    });
    stats.fourBall = stats.walks + stats.hitByPitch;
    return stats;
};
exports.calculatePlayerStats = calculatePlayerStats;
//# sourceMappingURL=battingStats.js.map