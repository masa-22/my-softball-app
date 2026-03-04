import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getPlayerBattingStatsDetail } from "./callable/getPlayerBattingStatsDetail";
import { getPlayerPitchingStatsDetail } from "./callable/getPlayerPitchingStatsDetail";
import { AtBat } from "./types/AtBat";
import { calculatePlayerStats } from "./logic/battingStats";
import { calculatePitcherStats } from "./logic/pitchingStats";
import { determineWinningPitcher, determineLosingPitcher } from "./logic/gameResult";
import { GameState } from "./types/GameState";
import { Lineup } from "./types/Lineup";
import { PlayerStats } from "./types/PlayerStats";
import { PitcherStats } from "./logic/pitchingStats";
import { calculateBattingSeasonStats } from "./logic/season/batting";
import { calculatePitchingSeasonStats } from "./logic/season/pitching";
import { calculateFieldingSeasonStats } from "./logic/season/fielding";

admin.initializeApp();
const db = admin.firestore();

// --- Callable Functions ---
export { getPlayerBattingStatsDetail, getPlayerPitchingStatsDetail };

// --- Dry Run Triggers for Verification ---

type Side = 'home' | 'away';

export const onAtBatWriteDryRun = functions.firestore
  .document("atBats/{playId}")
  .onWrite(async (change, context) => {
    const atBat = change.after.exists ? (change.after.data() as AtBat) : null;
    if (!atBat) return;

    const matchId = atBat.matchId;
    if (!matchId) return;

    const atBatsSnapshot = await db
      .collection("atBats")
      .where("matchId", "==", matchId)
      .get();
    const atBats = atBatsSnapshot.docs.map((doc) => doc.data() as AtBat);

    const gameStateDoc = await db.collection("gameStates").doc(matchId).get();
    const gameState = gameStateDoc.exists ? (gameStateDoc.data() as GameState) : null;

    // 1. Calculate Batting Stats for the Batter
    if (atBat.batterId) {
      const batterSide: Side = atBat.topOrBottom === 'top' ? 'home' : 'away';
      const stats = calculatePlayerStats(atBat.batterId, atBats, batterSide);

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
      const pitcherSide: Side = atBat.topOrBottom === 'top' ? 'away' : 'home';
      const pStats = calculatePitcherStats(atBat.pitcherId, atBats, pitcherSide, gameState);

      await db.collection("dev_pitcherGameStats").doc(`${matchId}_${atBat.pitcherId}`).set({
        matchId,
        playerId: atBat.pitcherId,
        side: pitcherSide,
        stats: pStats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

export const onGameStatusChangeDryRun = functions.firestore
  .document("gameStates/{gameId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as GameState;
    const after = change.after.data() as GameState;

    if (before.status !== 'finished' && after.status === 'finished') {
      const matchId = context.params.gameId;

      const atBatsSnapshot = await db.collection("atBats").where("matchId", "==", matchId).get();
      const atBats = atBatsSnapshot.docs.map((doc) => doc.data() as AtBat);
      
      const lineupDoc = await db.collection("lineups").doc(matchId).get();
      const lineup = lineupDoc.exists ? (lineupDoc.data() as Lineup) : null;

      const allPitchers = Array.from(new Set(atBats.map(a => a.pitcherId).filter(id => id !== null))) as string[];

      let winningPitcherHome = determineWinningPitcher('home', atBats, after, lineup, allPitchers);
      const losingPitcherHome = determineLosingPitcher('home', atBats, after);

      let winningPitcherAway = determineWinningPitcher('away', atBats, after, lineup, allPitchers);
      const losingPitcherAway = determineLosingPitcher('away', atBats, after);

      // ユーザー選択の勝利投手があれば優先
      const winningPitchersDoc = await db.collection("winningPitchers").doc(matchId).get();
      if (winningPitchersDoc.exists) {
        const wpData = winningPitchersDoc.data() as { home?: string; away?: string };
        if (wpData.home) winningPitcherHome = wpData.home;
        if (wpData.away) winningPitcherAway = wpData.away;
      }

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

      // dev_pitcherGameStats の winLoss を勝利/敗戦投手に基づき更新
      const updates: Array<{ playerId: string; winLoss: 'win' | 'loss' }> = [];
      if (winningPitcherHome) updates.push({ playerId: winningPitcherHome, winLoss: 'win' });
      if (losingPitcherHome) updates.push({ playerId: losingPitcherHome, winLoss: 'loss' });
      if (winningPitcherAway) updates.push({ playerId: winningPitcherAway, winLoss: 'win' });
      if (losingPitcherAway) updates.push({ playerId: losingPitcherAway, winLoss: 'loss' });

      for (const { playerId: pid, winLoss } of updates) {
        const docId = `${matchId}_${pid}`;
        const docRef = db.collection("dev_pitcherGameStats").doc(docId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const data = docSnap.data();
          const currentStats = (data?.stats || {}) as PitcherStats;
          await docRef.update({
            stats: { ...currentStats, winLoss },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }
  });

// --- Season Stats Aggregation Triggers (Dry Run) ---

export const onPlayerGameStatsWriteDryRun = functions.firestore
  .document("dev_playerGameStats/{docId}")
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data) return; // Deleted

    const playerId = data.playerId;
    if (!playerId) return;

    // Fetch ALL game stats for this player from dev collection
    const querySnapshot = await db.collection("dev_playerGameStats")
      .where("playerId", "==", playerId)
      .get();

    const gameStatsList = querySnapshot.docs.map(doc => doc.data().stats as PlayerStats);
    
    // Calculate Season Stats
    const battingSeasonStats = calculateBattingSeasonStats(gameStatsList);
    const fieldingSeasonStats = calculateFieldingSeasonStats(gameStatsList);

    // Save to dev_playerSeasonStats
    await db.collection("dev_playerSeasonStats").doc(playerId).set({
      playerId,
      batting: battingSeasonStats,
      fielding: fieldingSeasonStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

export const onPitcherGameStatsWriteDryRun = functions.firestore
  .document("dev_pitcherGameStats/{docId}")
  .onWrite(async (change, context) => {
    const data = change.after.exists ? change.after.data() : null;
    if (!data) return;

    const playerId = data.playerId;
    if (!playerId) return;

    const querySnapshot = await db.collection("dev_pitcherGameStats")
      .where("playerId", "==", playerId)
      .get();

    const gameStatsList = querySnapshot.docs.map(doc => doc.data().stats as PitcherStats);

    const seasonStats = calculatePitchingSeasonStats(gameStatsList);

    await db.collection("dev_pitcherSeasonStats").doc(playerId).set({
      playerId,
      pitching: seasonStats,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
