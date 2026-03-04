"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerBattingStatsDetail = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const PLAYER_GAME_STATS_COLLECTION = "playerGameStats";
const DEV_PLAYER_GAME_STATS_COLLECTION = "dev_playerGameStats";
const DEV_PLAYER_SEASON_STATS_COLLECTION = "dev_playerSeasonStats";
const GAMES_COLLECTION = "games";
const LINEUPS_COLLECTION = "lineups";
/** 守備位置コード → 短縮ラベル */
const POSITION_LABELS = {
    "1": "投", "2": "捕", "3": "一", "4": "二", "5": "三", "6": "遊",
    "7": "左", "8": "中", "9": "右", "DP": "DP", "PH": "PH", "PR": "PR", "TR": "TR",
};
function getPositionLabel(position) {
    var _a;
    if (!position)
        return "";
    return (_a = POSITION_LABELS[position]) !== null && _a !== void 0 ? _a : position;
}
function calcRateStats(batting) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const ab = (_a = batting.atBats) !== null && _a !== void 0 ? _a : 0;
    const h = (_b = batting.hits) !== null && _b !== void 0 ? _b : 0;
    const bb = (_c = batting.walks) !== null && _c !== void 0 ? _c : 0;
    const hbp = (_d = batting.deadballs) !== null && _d !== void 0 ? _d : 0;
    const sf = (_e = batting.sacrificeFlies) !== null && _e !== void 0 ? _e : 0;
    const doubles = (_f = batting.doubles) !== null && _f !== void 0 ? _f : 0;
    const triples = (_g = batting.triples) !== null && _g !== void 0 ? _g : 0;
    const hr = (_h = batting.homeruns) !== null && _h !== void 0 ? _h : 0;
    const singles = Math.max(0, h - doubles - triples - hr);
    let avg = ".---";
    let obp = ".---";
    let slg = ".---";
    let ops = ".---";
    if (ab > 0) {
        avg = (h / ab).toFixed(3).replace(/^0/, "");
    }
    const obpDenom = ab + bb + hbp + sf;
    if (obpDenom > 0) {
        obp = ((h + bb + hbp) / obpDenom).toFixed(3).replace(/^0/, "");
    }
    if (ab > 0) {
        const totalBases = singles + doubles * 2 + triples * 3 + hr * 4;
        slg = (totalBases / ab).toFixed(3).replace(/^0/, "");
    }
    if (avg !== ".---" && slg !== ".---") {
        const obpVal = obp !== ".---" ? parseFloat(obp) || 0 : 0;
        const slgVal = parseFloat(slg) || 0;
        ops = (obpVal + slgVal).toFixed(3).replace(/^0/, "");
    }
    return { avg, obp, slg, ops };
}
/** dev_playerSeasonStats の batting（計算済み）を BattingStatsRow に変換。再計算不要 */
function seasonStatsToRow(batting) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    return {
        g: (_a = batting.gameCount) !== null && _a !== void 0 ? _a : 0,
        ab: (_b = batting.atBats) !== null && _b !== void 0 ? _b : 0,
        r: (_c = batting.runs) !== null && _c !== void 0 ? _c : 0,
        h: (_d = batting.hits) !== null && _d !== void 0 ? _d : 0,
        "2b": (_e = batting.doubles) !== null && _e !== void 0 ? _e : 0,
        "3b": (_f = batting.triples) !== null && _f !== void 0 ? _f : 0,
        hr: (_g = batting.homeRuns) !== null && _g !== void 0 ? _g : 0,
        rbi: (_h = batting.rbi) !== null && _h !== void 0 ? _h : 0,
        bb: (_j = batting.walks) !== null && _j !== void 0 ? _j : 0,
        so: (_k = batting.strikeouts) !== null && _k !== void 0 ? _k : 0,
        sb: (_l = batting.stolenBases) !== null && _l !== void 0 ? _l : 0,
        cs: 0,
        avg: (_m = batting.average) !== null && _m !== void 0 ? _m : ".---",
        obp: (_o = batting.onBasePercentage) !== null && _o !== void 0 ? _o : ".---",
        slg: (_p = batting.sluggingPercentage) !== null && _p !== void 0 ? _p : ".---",
        ops: (_q = batting.ops) !== null && _q !== void 0 ? _q : ".---",
    };
}
/** dev_playerGameStats の PlayerStats を PlayerBattingStats 形式に変換 */
function playerStatsToBatting(stats) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    return {
        plateAppearances: (_a = stats.plateAppearances) !== null && _a !== void 0 ? _a : 0,
        atBats: (_b = stats.atBats) !== null && _b !== void 0 ? _b : 0,
        hits: (_c = stats.hits) !== null && _c !== void 0 ? _c : 0,
        doubles: (_d = stats.doubles) !== null && _d !== void 0 ? _d : 0,
        triples: (_e = stats.triples) !== null && _e !== void 0 ? _e : 0,
        homeruns: (_f = stats.homeRuns) !== null && _f !== void 0 ? _f : 0,
        runsBattedIn: (_g = stats.rbi) !== null && _g !== void 0 ? _g : 0,
        runsScored: (_h = stats.runs) !== null && _h !== void 0 ? _h : 0,
        walks: (_j = stats.walks) !== null && _j !== void 0 ? _j : 0,
        deadballs: (_k = stats.hitByPitch) !== null && _k !== void 0 ? _k : 0,
        strikeouts: (_l = stats.strikeouts) !== null && _l !== void 0 ? _l : 0,
        stolenBases: (_m = stats.stolenBases) !== null && _m !== void 0 ? _m : 0,
        caughtStealing: 0,
        sacrificeBunts: 0,
        sacrificeFlies: (_o = stats.sacrifice) !== null && _o !== void 0 ? _o : 0,
    };
}
function battingToRow(batting, g) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const ab = (_a = batting.atBats) !== null && _a !== void 0 ? _a : 0;
    const { avg, obp, slg, ops } = calcRateStats(batting);
    return {
        g,
        ab,
        r: (_b = batting.runsScored) !== null && _b !== void 0 ? _b : 0,
        h: (_c = batting.hits) !== null && _c !== void 0 ? _c : 0,
        "2b": (_d = batting.doubles) !== null && _d !== void 0 ? _d : 0,
        "3b": (_e = batting.triples) !== null && _e !== void 0 ? _e : 0,
        hr: (_f = batting.homeruns) !== null && _f !== void 0 ? _f : 0,
        rbi: (_g = batting.runsBattedIn) !== null && _g !== void 0 ? _g : 0,
        bb: (_h = batting.walks) !== null && _h !== void 0 ? _h : 0,
        so: (_j = batting.strikeouts) !== null && _j !== void 0 ? _j : 0,
        sb: (_k = batting.stolenBases) !== null && _k !== void 0 ? _k : 0,
        cs: (_l = batting.caughtStealing) !== null && _l !== void 0 ? _l : 0,
        avg,
        obp,
        slg,
        ops,
    };
}
exports.getPlayerBattingStatsDetail = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const playerId = data === null || data === void 0 ? void 0 : data.playerId;
    if (!playerId || typeof playerId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "playerId is required");
    }
    const startDate = data === null || data === void 0 ? void 0 : data.startDate;
    const endDate = data === null || data === void 0 ? void 0 : data.endDate;
    const db = admin.firestore();
    let statsList = [];
    // 1. 試合履歴用データ: playerGameStats または dev_playerGameStats から取得
    const prodSnapshot = await db.collection(PLAYER_GAME_STATS_COLLECTION)
        .where("playerId", "==", playerId)
        .orderBy("gameDate", "desc")
        .get();
    if (prodSnapshot.size > 0) {
        statsList = prodSnapshot.docs.map((d) => {
            var _a, _b, _c, _d;
            const s = d.data();
            const fielding = s.fielding;
            return {
                gameId: s.gameId,
                gameDate: s.gameDate,
                gameName: s.gameName,
                opponentTeam: (_a = s.opponentTeam) !== null && _a !== void 0 ? _a : "",
                batting: s.batting,
                fielding: fielding
                    ? { putouts: (_b = fielding.putouts) !== null && _b !== void 0 ? _b : 0, assists: (_c = fielding.assists) !== null && _c !== void 0 ? _c : 0, errors: (_d = fielding.errors) !== null && _d !== void 0 ? _d : 0 }
                    : undefined,
                teamId: s.teamId,
            };
        });
    }
    else {
        const devSnapshot = await db.collection(DEV_PLAYER_GAME_STATS_COLLECTION)
            .where("playerId", "==", playerId)
            .get();
        const devDocs = devSnapshot.docs.map((d) => {
            const ddata = d.data();
            return {
                matchId: ddata.matchId,
                side: ddata.side,
                stats: ddata.stats,
            };
        });
        const gameIds = [...new Set(devDocs.map((x) => x.matchId))];
        const gameMap = new Map();
        for (const gid of gameIds) {
            const gameSnap = await db.collection(GAMES_COLLECTION).doc(gid).get();
            if (gameSnap.exists) {
                const g = gameSnap.data();
                gameMap.set(gid, {
                    date: (_a = g.date) !== null && _a !== void 0 ? _a : "",
                    tournamentName: (_b = g.tournament) === null || _b === void 0 ? void 0 : _b.name,
                    topTeam: (_c = g.topTeam) !== null && _c !== void 0 ? _c : { id: "", name: "" },
                    bottomTeam: (_d = g.bottomTeam) !== null && _d !== void 0 ? _d : { id: "", name: "" },
                });
            }
        }
        statsList = devDocs
            .map((doc) => {
            var _a, _b, _c;
            const game = gameMap.get(doc.matchId);
            if (!game)
                return null;
            const opponentTeam = doc.side === "home" ? game.bottomTeam.name : game.topTeam.name;
            const st = doc.stats;
            return {
                gameId: doc.matchId,
                gameDate: game.date,
                gameName: game.tournamentName,
                opponentTeam,
                batting: playerStatsToBatting(st),
                fielding: {
                    putouts: (_a = st.putouts) !== null && _a !== void 0 ? _a : 0,
                    assists: (_b = st.assists) !== null && _b !== void 0 ? _b : 0,
                    errors: (_c = st.errors) !== null && _c !== void 0 ? _c : 0,
                },
                side: doc.side,
            };
        })
            .filter((x) => x !== null)
            .sort((a, b) => (b.gameDate || "").localeCompare(a.gameDate || ""));
    }
    // 期間フィルタ
    const hasPeriodFilter = !!(startDate && typeof startDate === "string") || !!(endDate && typeof endDate === "string");
    let filteredList = statsList;
    if (startDate && typeof startDate === "string") {
        filteredList = filteredList.filter((s) => s.gameDate >= startDate);
    }
    if (endDate && typeof endDate === "string") {
        filteredList = filteredList.filter((s) => s.gameDate <= endDate);
    }
    // lineups から打順・守備位置を取得（prod は game の topTeam/bottomTeam で side 判定）
    const gameIds = [...new Set(filteredList.map((s) => s.gameId))];
    const lineupMap = new Map();
    const gameMapForLineup = new Map();
    for (const gid of gameIds) {
        const [lineupSnap, gameSnap] = await Promise.all([
            db.collection(LINEUPS_COLLECTION).doc(gid).get(),
            db.collection(GAMES_COLLECTION).doc(gid).get(),
        ]);
        if (lineupSnap.exists) {
            lineupMap.set(gid, lineupSnap.data());
        }
        if (gameSnap.exists) {
            const g = gameSnap.data();
            gameMapForLineup.set(gid, {
                topTeamId: (_f = (_e = g.topTeam) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : "",
                bottomTeamId: (_h = (_g = g.bottomTeam) === null || _g === void 0 ? void 0 : _g.id) !== null && _h !== void 0 ? _h : "",
            });
        }
    }
    const gameHistory = filteredList.map((s) => {
        var _a, _b, _c, _d, _e, _f;
        const row = battingToRow(s.batting, 1);
        let battingOrder;
        let positionLabel;
        const lineup = lineupMap.get(s.gameId);
        const gameTeams = gameMapForLineup.get(s.gameId);
        if (lineup) {
            let entries = [];
            if (s.side) {
                entries = (_a = lineup[s.side]) !== null && _a !== void 0 ? _a : [];
            }
            else if (s.teamId && gameTeams) {
                const side = s.teamId === gameTeams.topTeamId ? "home" : "away";
                entries = (_b = lineup[side]) !== null && _b !== void 0 ? _b : [];
            }
            const entry = entries.find((e) => e.playerId === playerId);
            if (entry) {
                battingOrder = entry.battingOrder;
                positionLabel = getPositionLabel(entry.position) || undefined;
            }
        }
        return Object.assign(Object.assign({}, row), { gameId: s.gameId, gameDate: s.gameDate, gameName: s.gameName, opponentTeam: (_c = s.opponentTeam) !== null && _c !== void 0 ? _c : "", battingOrder, positionLabel: positionLabel !== null && positionLabel !== void 0 ? positionLabel : undefined, putouts: (_d = s.fielding) === null || _d === void 0 ? void 0 : _d.putouts, assists: (_e = s.fielding) === null || _e === void 0 ? void 0 : _e.assists, errors: (_f = s.fielding) === null || _f === void 0 ? void 0 : _f.errors });
    });
    // 通算: 期間フィルタなし かつ dev_playerSeasonStats がある場合は計算済み値をそのまま利用
    const seasonDoc = await db.collection(DEV_PLAYER_SEASON_STATS_COLLECTION).doc(playerId).get();
    let career;
    if (!hasPeriodFilter && seasonDoc.exists) {
        const batting = (_j = seasonDoc.data()) === null || _j === void 0 ? void 0 : _j.batting;
        career = batting ? seasonStatsToRow(batting) : { g: 0, ab: 0, r: 0, h: 0, "2b": 0, "3b": 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, avg: ".---", obp: ".---", slg: ".---", ops: ".---" };
    }
    else if (filteredList.length > 0) {
        // 期間フィルタあり、または dev_playerSeasonStats なし → 集計して計算
        const aggregated = {
            plateAppearances: 0,
            atBats: 0,
            hits: 0,
            doubles: 0,
            triples: 0,
            homeruns: 0,
            runsBattedIn: 0,
            runsScored: 0,
            walks: 0,
            deadballs: 0,
            strikeouts: 0,
            stolenBases: 0,
            caughtStealing: 0,
            sacrificeBunts: 0,
            sacrificeFlies: 0,
        };
        filteredList.forEach((s) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            const b = s.batting;
            aggregated.plateAppearances += (_a = b.plateAppearances) !== null && _a !== void 0 ? _a : 0;
            aggregated.atBats += (_b = b.atBats) !== null && _b !== void 0 ? _b : 0;
            aggregated.hits += (_c = b.hits) !== null && _c !== void 0 ? _c : 0;
            aggregated.doubles += (_d = b.doubles) !== null && _d !== void 0 ? _d : 0;
            aggregated.triples += (_e = b.triples) !== null && _e !== void 0 ? _e : 0;
            aggregated.homeruns += (_f = b.homeruns) !== null && _f !== void 0 ? _f : 0;
            aggregated.runsBattedIn += (_g = b.runsBattedIn) !== null && _g !== void 0 ? _g : 0;
            aggregated.runsScored += (_h = b.runsScored) !== null && _h !== void 0 ? _h : 0;
            aggregated.walks += (_j = b.walks) !== null && _j !== void 0 ? _j : 0;
            aggregated.deadballs += (_k = b.deadballs) !== null && _k !== void 0 ? _k : 0;
            aggregated.strikeouts += (_l = b.strikeouts) !== null && _l !== void 0 ? _l : 0;
            aggregated.stolenBases += (_m = b.stolenBases) !== null && _m !== void 0 ? _m : 0;
            aggregated.caughtStealing += (_o = b.caughtStealing) !== null && _o !== void 0 ? _o : 0;
            aggregated.sacrificeBunts += (_p = b.sacrificeBunts) !== null && _p !== void 0 ? _p : 0;
            aggregated.sacrificeFlies += (_q = b.sacrificeFlies) !== null && _q !== void 0 ? _q : 0;
        });
        career = battingToRow(aggregated, filteredList.length);
    }
    else {
        career = { g: 0, ab: 0, r: 0, h: 0, "2b": 0, "3b": 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, avg: ".---", obp: ".---", slg: ".---", ops: ".---" };
    }
    return {
        career,
        gameHistory,
    };
});
//# sourceMappingURL=getPlayerBattingStatsDetail.js.map