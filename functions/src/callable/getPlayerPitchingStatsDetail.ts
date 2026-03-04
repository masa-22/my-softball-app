import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { PitcherStats } from "../logic/pitchingStats";
import { PitcherSeasonStats } from "../types/PlayerSeasonStats";

const DEV_PITCHER_GAME_STATS_COLLECTION = "dev_pitcherGameStats";
const DEV_PITCHER_SEASON_STATS_COLLECTION = "dev_pitcherSeasonStats";
const GAMES_COLLECTION = "games";

/** 投手成績の表示用1行 */
export interface PitchingStatsRow {
  g: number;           // 登板試合数
  era: string;         // 防御率
  wins: number;        // 勝利
  losses: number;      // 敗戦
  inningsPitched: string;  // 投球回
  battersFaced: number;   // 打者
  hits: number;        // 被安打
  homeRuns: number;    // 被本塁打
  strikeouts: number;  // 奪三振
  walks: number;      // 与四球
  hitByPitch: number;  // 与死球
  runs: number;       // 失点
  earnedRuns: number;  // 自責点
  whip: string;       // WHIP
  winPercentage: string;  // 勝率
}

/** 試合履歴1件（PitchingStatsRow + 試合メタ情報） */
export interface GameHistoryPitcherRow extends PitchingStatsRow {
  gameId: string;
  gameDate: string;
  gameName?: string;
  opponentTeam: string;
}

/** レスポンス型 */
export interface GetPlayerPitchingStatsDetailResponse {
  career: PitchingStatsRow;
  gameHistory: GameHistoryPitcherRow[];
}

/** PitcherStats から PitchingStatsRow を構築 */
function pitcherStatsToRow(stats: PitcherStats, g: number): PitchingStatsRow {
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

export const getPlayerPitchingStatsDetail = functions.https.onCall(
  async (data, context): Promise<GetPlayerPitchingStatsDetailResponse> => {
    const playerId = data?.playerId as string | undefined;
    if (!playerId || typeof playerId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "playerId is required");
    }

    const startDate = data?.startDate as string | undefined;
    const endDate = data?.endDate as string | undefined;

    const db = admin.firestore();

    // dev_pitcherGameStats から試合ごとのデータ取得
    const devSnapshot = await db.collection(DEV_PITCHER_GAME_STATS_COLLECTION)
      .where("playerId", "==", playerId)
      .get();

    if (devSnapshot.empty) {
      const emptyCareer: PitchingStatsRow = {
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
        matchId: ddata.matchId as string,
        side: ddata.side as "home" | "away",
        stats: ddata.stats as PitcherStats,
      };
    });

    const matchIds = [...new Set(devDocs.map((x) => x.matchId))];
    const gameMap = new Map<string, {
      date: string;
      tournamentName?: string;
      topTeam: { id: string; name: string };
      bottomTeam: { id: string; name: string };
    }>();

    for (const mid of matchIds) {
      const gameSnap = await db.collection(GAMES_COLLECTION).doc(mid).get();
      if (gameSnap.exists) {
        const g = gameSnap.data() as {
          date?: string;
          tournament?: { name?: string };
          topTeam?: { id: string; name: string };
          bottomTeam?: { id: string; name: string };
        };
        gameMap.set(mid, {
          date: g.date ?? "",
          tournamentName: g.tournament?.name,
          topTeam: g.topTeam ?? { id: "", name: "" },
          bottomTeam: g.bottomTeam ?? { id: "", name: "" },
        });
      }
    }

    let statsList = devDocs
      .map((doc) => {
        const game = gameMap.get(doc.matchId);
        if (!game) return null;
        const opponentTeam = doc.side === "home" ? game.bottomTeam.name : game.topTeam.name;
        return {
          gameId: doc.matchId,
          gameDate: game.date,
          gameName: game.tournamentName,
          opponentTeam,
          stats: doc.stats,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (b.gameDate || "").localeCompare(a.gameDate || ""));

    // 期間フィルタ
    const hasPeriodFilter = !!(startDate && typeof startDate === "string") || !!(endDate && typeof endDate === "string");
    if (startDate && typeof startDate === "string") {
      statsList = statsList.filter((s) => s.gameDate >= startDate);
    }
    if (endDate && typeof endDate === "string") {
      statsList = statsList.filter((s) => s.gameDate <= endDate);
    }

    const gameHistory: GameHistoryPitcherRow[] = statsList.map((s) => {
      const row = pitcherStatsToRow(s.stats, 1);
      return {
        ...row,
        gameId: s.gameId,
        gameDate: s.gameDate,
        gameName: s.gameName,
        opponentTeam: s.opponentTeam ?? "",
      };
    });

    // 通算: 期間フィルタなし かつ dev_pitcherSeasonStats がある場合は計算済み値をそのまま利用
    const seasonDoc = await db.collection(DEV_PITCHER_SEASON_STATS_COLLECTION).doc(playerId).get();
    let career: PitchingStatsRow;

    if (!hasPeriodFilter && seasonDoc.exists) {
      const pitching = seasonDoc.data()?.pitching as PitcherSeasonStats | undefined;
      if (pitching) {
        career = {
          g: pitching.gameCount ?? 0,
          era: pitching.era ?? "---",
          wins: pitching.wins ?? 0,
          losses: pitching.losses ?? 0,
          inningsPitched: pitching.inningsPitched ?? "0.0",
          battersFaced: pitching.battersFaced ?? 0,
          hits: pitching.hits ?? 0,
          homeRuns: pitching.homeRuns ?? 0,
          strikeouts: pitching.strikeouts ?? 0,
          walks: pitching.walks ?? 0,
          hitByPitch: pitching.hitByPitch ?? 0,
          runs: pitching.runs ?? 0,
          earnedRuns: pitching.earnedRuns ?? 0,
          whip: pitching.whip ?? "---",
          winPercentage: pitching.winPercentage ?? ".---",
        };
      } else {
        career = pitcherStatsToRow(
          {
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
          },
          0
        );
      }
    } else if (statsList.length > 0) {
      // 期間フィルタあり、または dev_pitcherSeasonStats なし → 集計して計算
      const aggregated: PitcherStats = {
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

        if (st.winLoss === "win") wins++;
        if (st.winLoss === "loss") losses++;

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
    } else {
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
  }
);
