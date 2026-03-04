import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { PlayerGameStats, PlayerBattingStats } from "../types/PlayerGameStats";
import { PlayerStats } from "../types/PlayerStats";
import { PlayerSeasonStats } from "../types/PlayerSeasonStats";

const PLAYER_GAME_STATS_COLLECTION = "playerGameStats";
const DEV_PLAYER_GAME_STATS_COLLECTION = "dev_playerGameStats";
const DEV_PLAYER_SEASON_STATS_COLLECTION = "dev_playerSeasonStats";
const GAMES_COLLECTION = "games";

/** 打撃成績の表示用1行（写真順: G, AB, R, H, 2B, 3B, HR, RBI, BB, SO, SB, CS, AVG, OBP, SLG, OPS） */
export interface BattingStatsRow {
  g: number;      // 試合数
  ab: number;     // 打数
  r: number;      // 得点
  h: number;      // 安打
  "2b": number;   // 二塁打
  "3b": number;   // 三塁打
  hr: number;     // 本塁打
  rbi: number;   // 打点
  bb: number;    // 四球
  so: number;    // 三振
  sb: number;    // 盗塁
  cs: number;    // 盗塁死
  avg: string;   // 打率
  obp: string;   // 出塁率
  slg: string;   // 長打率
  ops: string;   // OPS
}

/** 試合履歴1件（BattingStatsRow + 試合メタ情報） */
export interface GameHistoryRow extends BattingStatsRow {
  gameId: string;
  gameDate: string;
  gameName?: string;
  opponentTeam: string;
}

/** レスポンス型 */
export interface GetPlayerBattingStatsDetailResponse {
  career: BattingStatsRow;
  gameHistory: GameHistoryRow[];
}

function calcRateStats(batting: PlayerBattingStats): { avg: string; obp: string; slg: string; ops: string } {
  const ab = batting.atBats ?? 0;
  const h = batting.hits ?? 0;
  const bb = batting.walks ?? 0;
  const hbp = batting.deadballs ?? 0;
  const sf = batting.sacrificeFlies ?? 0;
  const doubles = batting.doubles ?? 0;
  const triples = batting.triples ?? 0;
  const hr = batting.homeruns ?? 0;
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
function seasonStatsToRow(batting: PlayerSeasonStats): BattingStatsRow {
  return {
    g: batting.gameCount ?? 0,
    ab: batting.atBats ?? 0,
    r: batting.runs ?? 0,
    h: batting.hits ?? 0,
    "2b": batting.doubles ?? 0,
    "3b": batting.triples ?? 0,
    hr: batting.homeRuns ?? 0,
    rbi: batting.rbi ?? 0,
    bb: batting.walks ?? 0,
    so: batting.strikeouts ?? 0,
    sb: batting.stolenBases ?? 0,
    cs: 0,
    avg: batting.average ?? ".---",
    obp: batting.onBasePercentage ?? ".---",
    slg: batting.sluggingPercentage ?? ".---",
    ops: batting.ops ?? ".---",
  };
}

/** dev_playerGameStats の PlayerStats を PlayerBattingStats 形式に変換 */
function playerStatsToBatting(stats: PlayerStats): PlayerBattingStats {
  return {
    plateAppearances: stats.plateAppearances ?? 0,
    atBats: stats.atBats ?? 0,
    hits: stats.hits ?? 0,
    doubles: stats.doubles ?? 0,
    triples: stats.triples ?? 0,
    homeruns: stats.homeRuns ?? 0,
    runsBattedIn: stats.rbi ?? 0,
    runsScored: stats.runs ?? 0,
    walks: stats.walks ?? 0,
    deadballs: stats.hitByPitch ?? 0,
    strikeouts: stats.strikeouts ?? 0,
    stolenBases: stats.stolenBases ?? 0,
    caughtStealing: 0,
    sacrificeBunts: 0,
    sacrificeFlies: stats.sacrifice ?? 0,
  };
}

function battingToRow(batting: PlayerBattingStats, g: number): BattingStatsRow {
  const ab = batting.atBats ?? 0;
  const { avg, obp, slg, ops } = calcRateStats(batting);

  return {
    g,
    ab,
    r: batting.runsScored ?? 0,
    h: batting.hits ?? 0,
    "2b": batting.doubles ?? 0,
    "3b": batting.triples ?? 0,
    hr: batting.homeruns ?? 0,
    rbi: batting.runsBattedIn ?? 0,
    bb: batting.walks ?? 0,
    so: batting.strikeouts ?? 0,
    sb: batting.stolenBases ?? 0,
    cs: batting.caughtStealing ?? 0,
    avg,
    obp,
    slg,
    ops,
  };
}

export const getPlayerBattingStatsDetail = functions.https.onCall(
  async (data, context): Promise<GetPlayerBattingStatsDetailResponse> => {
    const playerId = data?.playerId as string | undefined;
    if (!playerId || typeof playerId !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "playerId is required");
    }

    const startDate = data?.startDate as string | undefined;
    const endDate = data?.endDate as string | undefined;

    const db = admin.firestore();
    let statsList: Array<{ gameId: string; gameDate: string; gameName?: string; opponentTeam: string; batting: PlayerBattingStats }> = [];

    // 1. 試合履歴用データ: playerGameStats または dev_playerGameStats から取得
    const prodSnapshot = await db.collection(PLAYER_GAME_STATS_COLLECTION)
      .where("playerId", "==", playerId)
      .orderBy("gameDate", "desc")
      .get();

    if (prodSnapshot.size > 0) {
      statsList = prodSnapshot.docs.map((d) => {
        const s = d.data() as PlayerGameStats;
        return {
          gameId: s.gameId,
          gameDate: s.gameDate,
          gameName: s.gameName,
          opponentTeam: s.opponentTeam ?? "",
          batting: s.batting,
        };
      });
    } else {
      const devSnapshot = await db.collection(DEV_PLAYER_GAME_STATS_COLLECTION)
        .where("playerId", "==", playerId)
        .get();

      const devDocs = devSnapshot.docs.map((d) => {
        const ddata = d.data();
        return {
          matchId: ddata.matchId as string,
          side: ddata.side as "home" | "away",
          stats: ddata.stats as PlayerStats,
        };
      });

      const gameIds = [...new Set(devDocs.map((x) => x.matchId))];
      const gameMap = new Map<string, { date: string; tournamentName?: string; topTeam: { id: string; name: string }; bottomTeam: { id: string; name: string } }>();

      for (const gid of gameIds) {
        const gameSnap = await db.collection(GAMES_COLLECTION).doc(gid).get();
        if (gameSnap.exists) {
          const g = gameSnap.data() as { date?: string; tournament?: { name?: string }; topTeam?: { id: string; name: string }; bottomTeam?: { id: string; name: string } };
          gameMap.set(gid, {
            date: g.date ?? "",
            tournamentName: g.tournament?.name,
            topTeam: g.topTeam ?? { id: "", name: "" },
            bottomTeam: g.bottomTeam ?? { id: "", name: "" },
          });
        }
      }

      statsList = devDocs
        .map((doc) => {
          const game = gameMap.get(doc.matchId);
          if (!game) return null;
          const opponentTeam = doc.side === "home" ? game.bottomTeam.name : game.topTeam.name;
          return {
            gameId: doc.matchId,
            gameDate: game.date,
            gameName: game.tournamentName,
            opponentTeam,
            batting: playerStatsToBatting(doc.stats),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
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

    const gameHistory: GameHistoryRow[] = filteredList.map((s) => {
      const row = battingToRow(s.batting, 1);
      return {
        ...row,
        gameId: s.gameId,
        gameDate: s.gameDate,
        gameName: s.gameName,
        opponentTeam: s.opponentTeam ?? "",
      };
    });

    // 通算: 期間フィルタなし かつ dev_playerSeasonStats がある場合は計算済み値をそのまま利用
    const seasonDoc = await db.collection(DEV_PLAYER_SEASON_STATS_COLLECTION).doc(playerId).get();
    let career: BattingStatsRow;

    if (!hasPeriodFilter && seasonDoc.exists) {
      const batting = seasonDoc.data()?.batting as PlayerSeasonStats | undefined;
      career = batting ? seasonStatsToRow(batting) : { g: 0, ab: 0, r: 0, h: 0, "2b": 0, "3b": 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, avg: ".---", obp: ".---", slg: ".---", ops: ".---" };
    } else if (filteredList.length > 0) {
      // 期間フィルタあり、または dev_playerSeasonStats なし → 集計して計算
      const aggregated: PlayerBattingStats = {
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
        const b = s.batting;
        aggregated.plateAppearances += b.plateAppearances ?? 0;
        aggregated.atBats += b.atBats ?? 0;
        aggregated.hits += b.hits ?? 0;
        aggregated.doubles += b.doubles ?? 0;
        aggregated.triples += b.triples ?? 0;
        aggregated.homeruns += b.homeruns ?? 0;
        aggregated.runsBattedIn += b.runsBattedIn ?? 0;
        aggregated.runsScored += b.runsScored ?? 0;
        aggregated.walks += b.walks ?? 0;
        aggregated.deadballs += b.deadballs ?? 0;
        aggregated.strikeouts += b.strikeouts ?? 0;
        aggregated.stolenBases += b.stolenBases ?? 0;
        (aggregated as { caughtStealing: number }).caughtStealing += b.caughtStealing ?? 0;
        aggregated.sacrificeBunts += b.sacrificeBunts ?? 0;
        aggregated.sacrificeFlies += b.sacrificeFlies ?? 0;
      });

      career = battingToRow(aggregated, filteredList.length);
    } else {
      career = { g: 0, ab: 0, r: 0, h: 0, "2b": 0, "3b": 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0, cs: 0, avg: ".---", obp: ".---", slg: ".---", ops: ".---" };
    }

    return {
      career,
      gameHistory,
    };
  }
);
