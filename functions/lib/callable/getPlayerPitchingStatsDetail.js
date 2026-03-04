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
exports.getPlayerPitchingStatsDetail = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const DEV_PITCHER_GAME_STATS_COLLECTION = "dev_pitcherGameStats";
const DEV_PITCHER_SEASON_STATS_COLLECTION = "dev_pitcherSeasonStats";
const GAMES_COLLECTION = "games";
/** PitcherStats から PitchingStatsRow を構築 */
function pitcherStatsToRow(stats, g) {
    const [whole, partial] = stats.inningsPitched.split(".").map(Number);
    const outs = whole * 3 + (partial || 0);
    const ipDecimal = outs / 3;
    let era = "---";
    let whip = "---";
    let winPercentage = ".---";
    if (ipDecimal > 0) {
        era = ((stats.earnedRuns * 7) / ipDecimal).toFixed(2);
        whip = ((stats.walks + stats.hits) / ipDecimal).toFixed(2);
    }
    const wins = stats.winLoss === "win" ? 1 : 0;
    const losses = stats.winLoss === "loss" ? 1 : 0;
    const decisions = wins + losses;
    if (decisions > 0) {
        winPercentage = (wins / decisions).toFixed(3).replace(/^0/, "");
    }
    return {
        g,
        era,
        wins,
        losses,
        inningsPitched: stats.inningsPitched,
        battersFaced: stats.battersFaced,
        hits: stats.hits,
        homeRuns: stats.homeRuns,
        strikeouts: stats.strikeouts,
        walks: stats.walks,
        hitByPitch: stats.hitByPitch,
        runs: stats.runs,
        earnedRuns: stats.earnedRuns,
        whip,
        winPercentage,
    };
}
exports.getPlayerPitchingStatsDetail = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    const playerId = data === null || data === void 0 ? void 0 : data.playerId;
    if (!playerId || typeof playerId !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "playerId is required");
    }
    const startDate = data === null || data === void 0 ? void 0 : data.startDate;
    const endDate = data === null || data === void 0 ? void 0 : data.endDate;
    const db = admin.firestore();
    // dev_pitcherGameStats から試合ごとのデータ取得
    const devSnapshot = await db.collection(DEV_PITCHER_GAME_STATS_COLLECTION)
        .where("playerId", "==", playerId)
        .get();
    if (devSnapshot.empty) {
        const emptyCareer = {
            g: 0,
            era: "---",
            wins: 0,
            losses: 0,
            inningsPitched: "0.0",
            battersFaced: 0,
            hits: 0,
            homeRuns: 0,
            strikeouts: 0,
            walks: 0,
            hitByPitch: 0,
            runs: 0,
            earnedRuns: 0,
            whip: "---",
            winPercentage: ".---",
        };
        return {
            career: emptyCareer,
            gameHistory: [],
        };
    }
    const devDocs = devSnapshot.docs.map((d) => {
        const ddata = d.data();
        return {
            matchId: ddata.matchId,
            side: ddata.side,
            stats: ddata.stats,
        };
    });
    const matchIds = [...new Set(devDocs.map((x) => x.matchId))];
    const gameMap = new Map();
    for (const mid of matchIds) {
        const gameSnap = await db.collection(GAMES_COLLECTION).doc(mid).get();
        if (gameSnap.exists) {
            const g = gameSnap.data();
            gameMap.set(mid, {
                date: (_a = g.date) !== null && _a !== void 0 ? _a : "",
                tournamentName: (_b = g.tournament) === null || _b === void 0 ? void 0 : _b.name,
                topTeam: (_c = g.topTeam) !== null && _c !== void 0 ? _c : { id: "", name: "" },
                bottomTeam: (_d = g.bottomTeam) !== null && _d !== void 0 ? _d : { id: "", name: "" },
            });
        }
    }
    let statsList = devDocs
        .map((doc) => {
        const game = gameMap.get(doc.matchId);
        if (!game)
            return null;
        const opponentTeam = doc.side === "home" ? game.bottomTeam.name : game.topTeam.name;
        return {
            gameId: doc.matchId,
            gameDate: game.date,
            gameName: game.tournamentName,
            opponentTeam,
            stats: doc.stats,
        };
    })
        .filter((x) => x !== null)
        .sort((a, b) => (b.gameDate || "").localeCompare(a.gameDate || ""));
    // 期間フィルタ
    const hasPeriodFilter = !!(startDate && typeof startDate === "string") || !!(endDate && typeof endDate === "string");
    if (startDate && typeof startDate === "string") {
        statsList = statsList.filter((s) => s.gameDate >= startDate);
    }
    if (endDate && typeof endDate === "string") {
        statsList = statsList.filter((s) => s.gameDate <= endDate);
    }
    const gameHistory = statsList.map((s) => {
        var _a;
        const row = pitcherStatsToRow(s.stats, 1);
        return Object.assign(Object.assign({}, row), { gameId: s.gameId, gameDate: s.gameDate, gameName: s.gameName, opponentTeam: (_a = s.opponentTeam) !== null && _a !== void 0 ? _a : "" });
    });
    // 通算: 期間フィルタなし かつ dev_pitcherSeasonStats がある場合は計算済み値をそのまま利用
    const seasonDoc = await db.collection(DEV_PITCHER_SEASON_STATS_COLLECTION).doc(playerId).get();
    let career;
    if (!hasPeriodFilter && seasonDoc.exists) {
        const pitching = (_e = seasonDoc.data()) === null || _e === void 0 ? void 0 : _e.pitching;
        if (pitching) {
            career = {
                g: (_f = pitching.gameCount) !== null && _f !== void 0 ? _f : 0,
                era: (_g = pitching.era) !== null && _g !== void 0 ? _g : "---",
                wins: (_h = pitching.wins) !== null && _h !== void 0 ? _h : 0,
                losses: (_j = pitching.losses) !== null && _j !== void 0 ? _j : 0,
                inningsPitched: (_k = pitching.inningsPitched) !== null && _k !== void 0 ? _k : "0.0",
                battersFaced: (_l = pitching.battersFaced) !== null && _l !== void 0 ? _l : 0,
                hits: (_m = pitching.hits) !== null && _m !== void 0 ? _m : 0,
                homeRuns: (_o = pitching.homeRuns) !== null && _o !== void 0 ? _o : 0,
                strikeouts: (_p = pitching.strikeouts) !== null && _p !== void 0 ? _p : 0,
                walks: (_q = pitching.walks) !== null && _q !== void 0 ? _q : 0,
                hitByPitch: (_r = pitching.hitByPitch) !== null && _r !== void 0 ? _r : 0,
                runs: (_s = pitching.runs) !== null && _s !== void 0 ? _s : 0,
                earnedRuns: (_t = pitching.earnedRuns) !== null && _t !== void 0 ? _t : 0,
                whip: (_u = pitching.whip) !== null && _u !== void 0 ? _u : "---",
                winPercentage: (_v = pitching.winPercentage) !== null && _v !== void 0 ? _v : ".---",
            };
        }
        else {
            career = pitcherStatsToRow({
                winLoss: "-",
                inningsPitched: "0.0",
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
            }, 0);
        }
    }
    else if (statsList.length > 0) {
        // 期間フィルタあり、または dev_pitcherSeasonStats なし → 集計して計算
        const aggregated = {
            winLoss: "-",
            inningsPitched: "0.0",
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
        let wins = 0;
        let losses = 0;
        let totalOuts = 0;
        statsList.forEach((s) => {
            const st = s.stats;
            aggregated.battersFaced += st.battersFaced;
            aggregated.pitches += st.pitches;
            aggregated.hits += st.hits;
            aggregated.homeRuns += st.homeRuns;
            aggregated.sacrificeBunts += st.sacrificeBunts;
            aggregated.sacrificeFlies += st.sacrificeFlies;
            aggregated.strikeouts += st.strikeouts;
            aggregated.walks += st.walks;
            aggregated.hitByPitch += st.hitByPitch;
            aggregated.runs += st.runs;
            aggregated.earnedRuns += st.earnedRuns;
            aggregated.wildPitches += st.wildPitches;
            if (st.winLoss === "win")
                wins++;
            if (st.winLoss === "loss")
                losses++;
            const [whole, partial] = st.inningsPitched.split(".").map(Number);
            totalOuts += whole * 3 + (partial || 0);
        });
        const ipWhole = Math.floor(totalOuts / 3);
        const ipPartial = totalOuts % 3;
        aggregated.inningsPitched = `${ipWhole}.${ipPartial}`;
        const ipDecimal = totalOuts / 3;
        let era = "---";
        let whip = "---";
        let winPercentage = ".---";
        if (ipDecimal > 0) {
            era = ((aggregated.earnedRuns * 7) / ipDecimal).toFixed(2);
            whip = ((aggregated.walks + aggregated.hits) / ipDecimal).toFixed(2);
        }
        const decisions = wins + losses;
        if (decisions > 0) {
            winPercentage = (wins / decisions).toFixed(3).replace(/^0/, "");
        }
        career = {
            g: statsList.length,
            era,
            wins,
            losses,
            inningsPitched: aggregated.inningsPitched,
            battersFaced: aggregated.battersFaced,
            hits: aggregated.hits,
            homeRuns: aggregated.homeRuns,
            strikeouts: aggregated.strikeouts,
            walks: aggregated.walks,
            hitByPitch: aggregated.hitByPitch,
            runs: aggregated.runs,
            earnedRuns: aggregated.earnedRuns,
            whip,
            winPercentage,
        };
    }
    else {
        career = {
            g: 0,
            era: "---",
            wins: 0,
            losses: 0,
            inningsPitched: "0.0",
            battersFaced: 0,
            hits: 0,
            homeRuns: 0,
            strikeouts: 0,
            walks: 0,
            hitByPitch: 0,
            runs: 0,
            earnedRuns: 0,
            whip: "---",
            winPercentage: ".---",
        };
    }
    return {
        career,
        gameHistory,
    };
});
//# sourceMappingURL=getPlayerPitchingStatsDetail.js.map