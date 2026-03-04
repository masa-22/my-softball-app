"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePitcherStats = void 0;
const AtBat_1 = require("../types/AtBat");
const battingResults_1 = require("../data/softball/battingResults");
const hasErrorOrPassedBallInScoring = (runnerId, scoringAtBat, allAtBats) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const scoredList = (0, AtBat_1.normalizeScoredRunners)(scoringAtBat.scoredRunners);
    if (!scoredList.some((e) => e.runnerId === runnerId))
        return false;
    if (scoringAtBat.runnerEvents) {
        for (const event of scoringAtBat.runnerEvents) {
            if (event.runnerId === runnerId && ['passedball', 'wildpitch'].includes(event.type))
                return true;
        }
    }
    if ((_a = scoringAtBat.playDetails) === null || _a === void 0 ? void 0 : _a.fielding) {
        for (const fielding of scoringAtBat.playDetails.fielding) {
            if (fielding.action === 'error' || fielding.action === 'throw' || fielding.action === 'catch')
                return true;
        }
    }
    const sortedAtBats = [...allAtBats].sort((a, b) => a.index - b.index);
    const onBaseAtBat = sortedAtBats.find(a => {
        var _a, _b;
        return a.index < scoringAtBat.index &&
            a.result &&
            a.batterId === runnerId && (['error', 'walk', 'deadball'].includes(a.result.type) ||
            ((_a = battingResults_1.BATTING_RESULTS[a.result.type]) === null || _a === void 0 ? void 0 : _a.stats.isHit) ||
            ((_b = battingResults_1.BATTING_RESULTS[a.result.type]) === null || _b === void 0 ? void 0 : _b.stats.isOnBase));
    });
    if (onBaseAtBat) {
        if (((_b = onBaseAtBat.result) === null || _b === void 0 ? void 0 : _b.type) === 'error')
            return true;
        if ((_d = (_c = onBaseAtBat.playDetails) === null || _c === void 0 ? void 0 : _c.fielding) === null || _d === void 0 ? void 0 : _d.some(f => f.action === 'error' || f.action === 'throw' || f.action === 'catch'))
            return true;
        if ((_e = onBaseAtBat.runnerEvents) === null || _e === void 0 ? void 0 : _e.some(e => e.runnerId === runnerId && ['passedball', 'wildpitch'].includes(e.type)))
            return true;
        const betweenAtBats = sortedAtBats.filter(a => a.index > onBaseAtBat.index && a.index < scoringAtBat.index);
        for (const betweenAtBat of betweenAtBats) {
            if ((_f = betweenAtBat.runnerEvents) === null || _f === void 0 ? void 0 : _f.some(e => e.runnerId === runnerId && ['passedball', 'wildpitch'].includes(e.type)))
                return true;
            if ((_h = (_g = betweenAtBat.playDetails) === null || _g === void 0 ? void 0 : _g.fielding) === null || _h === void 0 ? void 0 : _h.some(f => f.action === 'error' || f.action === 'throw' || f.action === 'catch'))
                return true;
        }
    }
    return false;
};
const calculatePitcherStats = (playerId, atBats, side, gameState) => {
    const stats = {
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
    const pitcherAtBats = atBats.filter((atBat) => atBat.type === 'bat' && atBat.pitcherId === playerId);
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
            const resultDef = battingResults_1.BATTING_RESULTS[atBat.result.type];
            if (resultDef) {
                if (resultDef.stats.isHit) {
                    stats.hits++;
                    if (['homerun', 'runninghomerun'].includes(atBat.result.type))
                        stats.homeRuns++;
                }
                if (['sac_bunt', 'sacrifice_bunt'].includes(atBat.result.type))
                    stats.sacrificeBunts++;
                if (['sac_fly', 'sacrifice_fly'].includes(atBat.result.type))
                    stats.sacrificeFlies++;
                if (['strikeout_swinging', 'strikeout_looking', 'droppedthird'].includes(atBat.result.type))
                    stats.strikeouts++;
                if (atBat.result.type === 'walk')
                    stats.walks++;
                if (atBat.result.type === 'deadball')
                    stats.hitByPitch++;
            }
        }
        // 暴投（同じ球目の重複は1カウント）
        if (atBat.runnerEvents) {
            const wpPitchSeqs = new Set();
            atBat.runnerEvents.forEach((event) => {
                var _a;
                if (event.type === 'wildpitch') {
                    wpPitchSeqs.add((_a = event.pitchSeq) !== null && _a !== void 0 ? _a : null);
                }
            });
            stats.wildPitches += wpPitchSeqs.size;
        }
    });
    pitcherAtBats.forEach((atBat) => {
        const scoredList = (0, AtBat_1.normalizeScoredRunners)(atBat.scoredRunners);
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
exports.calculatePitcherStats = calculatePitcherStats;
//# sourceMappingURL=pitchingStats.js.map