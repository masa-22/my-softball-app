import { db, functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, writeBatch, getDoc, setDoc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { BatterResultType, normalizeScoredRunners } from '../types/AtBat';
import { PlayerGameStats, PlayerBattingStats, PlayerFieldingStats, PlayerPitchingStats } from '../types/PlayerGameStats';
import { getAtBats } from './atBatService';
import { getGame } from './gameService';
import { getWinningPitcher } from './winningPitcherService';

const PLAYER_GAME_STATS_COLLECTION = 'playerGameStats';

const initBattingStats = (): PlayerBattingStats => ({
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
});

const initFieldingStats = (): PlayerFieldingStats => ({
  putouts: 0,
  assists: 0,
  errors: 0,
});

const initPitchingStats = (): PlayerPitchingStats => ({
  outsPitched: 0,
  batterFaced: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  strikeouts: 0,
  walks: 0,
  deadballs: 0,
  homersHit: 0,
  win: false,
  loss: false,
});

const isAtBat = (type: BatterResultType): boolean => {
  return ![
    'walk',
    'deadball',
    'sac_bunt',
    'sacrifice_bunt',
    'sac_fly',
    'sacrifice_fly',
    'interference'
  ].includes(type);
};

export const savePlayerGameStats = async (gameId: string): Promise<void> => {
  try {
    // 1. データ取得
    const [game, atBats] = await Promise.all([
      getGame(gameId),
      getAtBats(gameId)
    ]);

    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    // 勝利投手情報の取得
    const winningPitcherHome = await getWinningPitcher(gameId, 'home');
    const winningPitcherAway = await getWinningPitcher(gameId, 'away');
    const winningPitcherIds = [winningPitcherHome, winningPitcherAway].filter((id): id is string => !!id);

    // 2. 集計用マップ作成
    const statsMap: Record<string, PlayerGameStats> = {};

    const getOrInitStats = (playerId: string, teamId: string): PlayerGameStats => {
      if (!statsMap[playerId]) {
        statsMap[playerId] = {
          id: `${gameId}_${playerId}`,
          gameId,
          playerId,
          teamId,
          gameDate: game.date,
          gameName: game.tournament?.name, // 大会名/試合名
          opponentTeam: String(teamId) === String(game.topTeam.id) ? game.bottomTeam.name : game.topTeam.name,
          batting: initBattingStats(),
          fielding: initFieldingStats(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return statsMap[playerId];
    };

    // 3. 打席ごとの集計
    for (const atBat of atBats) {
      const isTop = atBat.topOrBottom === 'top';
      const offenseTeamId = isTop ? game.topTeam.id : game.bottomTeam.id;
      const defenseTeamId = isTop ? game.bottomTeam.id : game.topTeam.id;

      // --- 打撃成績 ---
      if (atBat.batterId) {
        const stats = getOrInitStats(atBat.batterId, offenseTeamId);
        stats.batting.plateAppearances++;

        if (atBat.result) {
          const type = atBat.result.type;
          
          if (isAtBat(type)) {
            stats.batting.atBats++;
          }

          if (['single', 'double', 'triple', 'homerun', 'runninghomerun'].includes(type)) {
            stats.batting.hits++;
          }

          if (type === 'double') stats.batting.doubles++;
          if (type === 'triple') stats.batting.triples++;
          if (['homerun', 'runninghomerun'].includes(type)) stats.batting.homeruns++;
          
          if (type === 'walk') stats.batting.walks++;
          if (type === 'deadball') stats.batting.deadballs++;
          if (['strikeout_swinging', 'strikeout_looking', 'droppedthird'].includes(type)) stats.batting.strikeouts++; // 振り逃げも三振記録に含まれるのが一般的
          if (['sac_bunt', 'sacrifice_bunt'].includes(type)) stats.batting.sacrificeBunts++;
          if (['sac_fly', 'sacrifice_fly'].includes(type)) stats.batting.sacrificeFlies++;

          if (atBat.result.rbi) {
            stats.batting.runsBattedIn += atBat.result.rbi;
          }
        }
      }

      // --- 得点 ---
      const scoredList = normalizeScoredRunners(atBat.scoredRunners);
      if (scoredList.length > 0) {
        scoredList.forEach((entry) => {
          const stats = getOrInitStats(entry.runnerId, offenseTeamId);
          stats.batting.runsScored++;
        });
      }

      // --- 盗塁・盗塁死 ---
      if (atBat.runnerEvents && atBat.runnerEvents.length > 0) {
        atBat.runnerEvents.forEach(event => {
          if (event.type === 'steal' && !event.isOut) {
             const stats = getOrInitStats(event.runnerId, offenseTeamId);
             stats.batting.stolenBases++;
          } else if (event.type === 'caughtstealing') {
             const stats = getOrInitStats(event.runnerId, offenseTeamId);
             stats.batting.caughtStealing++;
          }
        });
      }

      // --- 守備成績 ---
      if (atBat.playDetails?.fielding) {
        atBat.playDetails.fielding.forEach(fielding => {
          if (fielding.playerId) {
            // 守備側
            const stats = getOrInitStats(fielding.playerId, defenseTeamId);
            if (fielding.action === 'putout') stats.fielding.putouts++;
            if (fielding.action === 'assist') stats.fielding.assists++;
            if (fielding.action === 'error' || fielding.action === 'throw' || fielding.action === 'catch') stats.fielding.errors++;
          }
        });
      }

      // --- 投手成績 ---
      if (atBat.pitcherId) {
        // 投手は守備側
        const stats = getOrInitStats(atBat.pitcherId, defenseTeamId);
        if (!stats.pitching) {
          stats.pitching = initPitchingStats();
        }

        const pStats = stats.pitching;
        pStats.batterFaced++;

        if (atBat.result) {
          const type = atBat.result.type;
          if (['single', 'double', 'triple', 'homerun', 'runninghomerun'].includes(type)) {
            pStats.hitsAllowed++;
          }
          if (['homerun', 'runninghomerun'].includes(type)) {
            pStats.homersHit++;
          }
          if (type === 'walk') pStats.walks++;
          if (type === 'deadball') pStats.deadballs++;
          if (['strikeout_swinging', 'strikeout_looking', 'droppedthird'].includes(type)) {
            pStats.strikeouts++;
          }
        }
        
        // 投球回（アウト数）
        const outs = Math.max(0, (atBat.situationAfter?.outs || 0) - (atBat.situationBefore?.outs || 0));
        // イニングチェンジ時の考慮: situationAfter.outsが3未満でチェンジした場合（サヨナラ等）もあるが、
        // 基本的にはdiffで良い。ただし3アウトチェンジでsituationBefore=2, After=0(次イニング)とならないように注意が必要。
        // AtBatデータではsituationAfterは「その打席結果直後の状態」なので、3アウトになれば3が入っているはず。
        // 次の打席は新しいイニングで0から始まる。
        // したがって、単純な引き算でOK。ただしマイナスにならないように念のためMax(0, ...)
        
        // 【修正】3アウトチェンジの瞬間、AtBatのsituationAfter.outsは3になる。
        // 次のイニングの先頭打者はsituationBefore.outs=0。
        // なので、常に after - before で正しいアウト数が取れる。
        pStats.outsPitched += outs;

        // 失点（簡易計算: この打席で記録された得点を、現在の投手の失点とする）
        if (scoredList.length > 0) {
          pStats.runsAllowed += scoredList.length;
          pStats.earnedRuns += scoredList.length; // 簡易的に自責点＝失点とする
        }
      }
    }

    // 勝利投手の反映
    winningPitcherIds.forEach(wpId => {
      if (statsMap[wpId] && statsMap[wpId].pitching) {
        statsMap[wpId].pitching!.win = true;
      }
    });

    // 4. 保存（バッチ書き込み）
    const statsList = Object.values(statsMap);
    if (statsList.length === 0) return;

    const batch = writeBatch(db);
    statsList.forEach(stats => {
      const ref = doc(db, PLAYER_GAME_STATS_COLLECTION, stats.id);
      batch.set(ref, stats, { merge: true });
    });

    await batch.commit();
    console.log(`[playerGameStatsService] Saved stats for ${statsList.length} players.`);

  } catch (error) {
    console.error('[playerGameStatsService] Error saving player game stats:', error);
    throw error;
  }
};

/**
 * 選手の試合メモを更新する
 * @param gameId 試合ID
 * @param playerId 選手ID
 * @param memo メモ内容
 */
export const updatePlayerGameStatsMemo = async (gameId: string, playerId: string, memo: string): Promise<void> => {
  try {
    const id = `${gameId}_${playerId}`;
    const ref = doc(db, PLAYER_GAME_STATS_COLLECTION, id);
    
    // ドキュメントが存在しない場合でも、ID情報と共に作成する
    // 注意: 他のフィールド（batting, fieldingなど）は存在しない状態になるが、
    // savePlayerGameStats が実行された際にマージされる。
    // クライアント側で表示する際は undefined チェックが必要。
    
    const updateData: any = {
      id,
      gameId,
      playerId,
      memo,
      updatedAt: new Date().toISOString(),
    };

    // ドキュメントがまだない場合、createdAt も設定したいが、
    // setDoc(..., { merge: true }) では「なければ作成」になる。
    // 既存データがある場合は上書きしたくないフィールド（battingなど）には触れない。
    
    // ここでは簡易的に、常に updatedAt を更新し、memo を更新する。
    // まだドキュメントがない場合に備えて必須フィールドの一部を入れることも考えられるが、
    // 最小限にする。
    
    await setDoc(ref, updateData, { merge: true });
    console.log(`[playerGameStatsService] Updated memo for player ${playerId} in game ${gameId}`);
  } catch (error) {
    console.error('[playerGameStatsService] Error updating player memo:', error);
    throw error;
  }
};

/**
 * 選手の試合ごとの成績データ（メモ含む）を取得
 */
export const getPlayerGameStats = async (gameId: string, playerId: string): Promise<PlayerGameStats | null> => {
  try {
    const id = `${gameId}_${playerId}`;
    const ref = doc(db, PLAYER_GAME_STATS_COLLECTION, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as PlayerGameStats;
    }
    return null;
  } catch (error) {
    console.error('Error getting player game stats:', error);
    return null;
  }
};

/** 打撃成績の表示用1行（バックエンド計算結果） */
export interface BattingStatsRow {
  g: number;
  ab: number;
  r: number;
  h: number;
  '2b': number;
  '3b': number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  sb: number;
  cs: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
}

/** 試合履歴1件 */
export interface GameHistoryRow extends BattingStatsRow {
  gameId: string;
  gameDate: string;
  gameName?: string;
  opponentTeam: string;
}

/** 打撃成績詳細 API レスポンス */
export interface PlayerBattingStatsDetailResponse {
  career: BattingStatsRow;
  gameHistory: GameHistoryRow[];
}

/**
 * バックエンド経由で選手の打撃成績詳細を取得（期間指定可）
 * @param playerId 選手ID
 * @param startDate 期間開始日 YYYY-MM-DD（省略時は制限なし）
 * @param endDate 期間終了日 YYYY-MM-DD（省略時は制限なし）
 */
export const getPlayerBattingStatsDetail = async (
  playerId: string,
  startDate?: string,
  endDate?: string
): Promise<PlayerBattingStatsDetailResponse> => {
  const callable = httpsCallable<
    { playerId: string; startDate?: string; endDate?: string },
    PlayerBattingStatsDetailResponse
  >(functions, 'getPlayerBattingStatsDetail');
  const result = await callable({ playerId, startDate, endDate });
  return result.data;
};

/**
 * 特定の選手の全成績データを日付の降順（新しい順）で取得
 * @param playerId 選手ID
 */
export const getPlayerStatsByPlayerId = async (playerId: string): Promise<PlayerGameStats[]> => {
  try {
    const q = query(
      collection(db, PLAYER_GAME_STATS_COLLECTION),
      where('playerId', '==', playerId),
      orderBy('gameDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const statsList: PlayerGameStats[] = [];
    snapshot.forEach((doc) => {
      statsList.push(doc.data() as PlayerGameStats);
    });
    return statsList;
  } catch (error) {
    console.error('Error getting player stats by player id:', error);
    // インデックスがない場合のエラーを想定して、クライアントサイドソートにフォールバックすることも考えられるが、
    // 基本的には複合インデックス(playerId, gameDate)を作成することを推奨。
    // ここではエラーをスローまたは空配列を返す。
    return [];
  }
};
