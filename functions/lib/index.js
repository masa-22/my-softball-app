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
exports.onPitcherGameStatsWriteDryRun = exports.onPlayerGameStatsWriteDryRun = exports.onGameStatusChangeDryRun = exports.onAtBatWriteDryRun = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const battingStats_1 = require("./logic/battingStats");
const pitchingStats_1 = require("./logic/pitchingStats");
const gameResult_1 = require("./logic/gameResult");
const batting_1 = require("./logic/season/batting");
const pitching_1 = require("./logic/season/pitching");
const fielding_1 = require("./logic/season/fielding");
admin.initializeApp();
const db = admin.firestore();
exports.onAtBatWriteDryRun = functions.firestore
    .document("atBats/{playId}")
    .onWrite(async (change, context) => {
    const atBat = change.after.exists ? change.after.data() : null;
    if (!atBat)
        return;
    const matchId = atBat.matchId;
    if (!matchId)
        return;
    const atBatsSnapshot = await db
        .collection("atBats")
        .where("matchId", "==", matchId)
        .get();
    const atBats = atBatsSnapshot.docs.map((doc) => doc.data());
    const gameStateDoc = await db.collection("gameStates").doc(matchId).get();
    const gameState = gameStateDoc.exists ? gameStateDoc.data() : null;
    // 1. Calculate Batting Stats for the Batter
    if (atBat.batterId) {
        const batterSide = atBat.topOrBottom === 'top' ? 'home' : 'away';
        const stats = (0, battingStats_1.calculatePlayerStats)(atBat.batterId, atBats, batterSide);
        await db.collection("dev_playerGameStats").doc(`${matchId}_${atBat.batterId}`).set({
            matchId,
            playerId: atBat.batterId,
            side: batterSide,
            stats,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // 2. Calculate Pitching Stats for the Pitcher
    if (atBat.pitcherId) {
        const pitcherSide = atBat.topOrBottom === 'top' ? 'away' : 'home';
        const pStats = (0, pitchingStats_1.calculatePitcherStats)(atBat.pitcherId, atBats, pitcherSide, gameState);
        await db.collection("dev_pitcherGameStats").doc(`${matchId}_${atBat.pitcherId}`).set({
            matchId,
            playerId: atBat.pitcherId,
            side: pitcherSide,
            stats: pStats,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
exports.onGameStatusChangeDryRun = functions.firestore
    .document("gameStates/{gameId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'finished' && after.status === 'finished') {
        const matchId = context.params.gameId;
        const atBatsSnapshot = await db.collection("atBats").where("matchId", "==", matchId).get();
        const atBats = atBatsSnapshot.docs.map((doc) => doc.data());
        const lineupDoc = await db.collection("lineups").doc(matchId).get();
        const lineup = lineupDoc.exists ? lineupDoc.data() : null;
        const allPitchers = Array.from(new Set(atBats.map(a => a.pitcherId).filter(id => id !== null)));
        const winningPitcherHome = (0, gameResult_1.determineWinningPitcher)('home', atBats, after, lineup, allPitchers);
        const losingPitcherHome = (0, gameResult_1.determineLosingPitcher)('home', atBats, after);
        const winningPitcherAway = (0, gameResult_1.determineWinningPitcher)('away', atBats, after, lineup, allPitchers);
        const losingPitcherAway = (0, gameResult_1.determineLosingPitcher)('away', atBats, after);
        await db.collection("dev_gameResults").doc(matchId).set({
            matchId,
            home: {
                winningPitcher: winningPitcherHome,
                losingPitcher: losingPitcherHome
            },
            away: {
                winningPitcher: winningPitcherAway,
                losingPitcher: losingPitcherAway
            },
            calculatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
// --- Season Stats Aggregation Triggers (Dry Run) ---
exports.onPlayerGameStatsWriteDryRun = functions.firestore
    .document("dev_playerGameStats/{docId}")
    .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data)
        return; // Deleted
    const playerId = data.playerId;
    if (!playerId)
        return;
    // Fetch ALL game stats for this player from dev collection
    const querySnapshot = await db.collection("dev_playerGameStats")
        .where("playerId", "==", playerId)
        .get();
    const gameStatsList = querySnapshot.docs.map(doc => doc.data().stats);
    // Calculate Season Stats
    const battingSeasonStats = (0, batting_1.calculateBattingSeasonStats)(gameStatsList);
    const fieldingSeasonStats = (0, fielding_1.calculateFieldingSeasonStats)(gameStatsList);
    // Save to dev_playerSeasonStats
    await db.collection("dev_playerSeasonStats").doc(playerId).set({
        playerId,
        batting: battingSeasonStats,
        fielding: fieldingSeasonStats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
});
exports.onPitcherGameStatsWriteDryRun = functions.firestore
    .document("dev_pitcherGameStats/{docId}")
    .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data)
        return;
    const playerId = data.playerId;
    if (!playerId)
        return;
    const querySnapshot = await db.collection("dev_pitcherGameStats")
        .where("playerId", "==", playerId)
        .get();
    const gameStatsList = querySnapshot.docs.map(doc => doc.data().stats);
    const seasonStats = (0, pitching_1.calculatePitchingSeasonStats)(gameStatsList);
    await db.collection("dev_pitcherSeasonStats").doc(playerId).set({
        playerId,
        pitching: seasonStats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
});
//# sourceMappingURL=index.js.map