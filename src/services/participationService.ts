import {
  ParticipationStatus,
  ParticipationEntry,
  ParticipationTable
} from '../types/Participation';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PARTICIPATIONS_COLLECTION = 'participations';

// スタメン確定時に出場記録を初期化・記録
export const recordStarters = async (
  matchId: string, 
  lineup: { home: { playerId: string; position: string }[]; away: { playerId: string; position: string }[] }
): Promise<void> => {
  try {
    // 配列のインデックスを使って打順(1番~)を記録する
    const nowHome = lineup.home.filter(e => e.playerId);
    const nowAway = lineup.away.filter(e => e.playerId);

    const table: ParticipationTable = {
      home: nowHome.map((e, index) => ({
        playerId: e.playerId,
        side: 'home',
        battingOrder: index + 1, // ★打順付与
        status: 'starter',
        startInning: 1,
        endInning: null,
        positionAtStart: e.position || null,
      })),
      away: nowAway.map((e, index) => ({
        playerId: e.playerId,
        side: 'away',
        battingOrder: index + 1, // ★打順付与
        status: 'starter',
        startInning: 1,
        endInning: null,
        positionAtStart: e.position || null,
      }))
    };

    const participationRef = doc(db, PARTICIPATIONS_COLLECTION, matchId);
    await setDoc(participationRef, table);
  } catch (error) {
    console.error('Error recording starters:', error);
    throw error;
  }
};

// 交代記録（代打・代走）
export const recordSubstitution = async (params: {
  matchId: string;
  side: 'home' | 'away';
  outPlayerId: string;
  inPlayerId: string;
  inning: number;
  kind: 'pinch_hitter' | 'pinch_runner';
  position?: string;
  note?: string;
  battingOrder?: number;
}): Promise<void> => {
  try {
    const table = await getParticipations(params.matchId);
    const list = table[params.side];
    
    // 交代対象の選手を探す（まだ試合に出ている選手＝endInningがnull）
    const outEntry = list.find(p => p.playerId === params.outPlayerId && p.endInning == null);
    
    // ★打順の引き継ぎ
    const inheritedOrder = outEntry?.battingOrder ?? params.battingOrder ?? 0;

    if (outEntry) {
      outEntry.endInning = params.inning;
      outEntry.status = 'substituted';
    } else if (params.outPlayerId) {
      // データ整合性エラー時の保険
      list.push({
        playerId: params.outPlayerId,
        side: params.side,
        battingOrder: inheritedOrder,
        status: 'substituted',
        startInning: null,
        endInning: params.inning,
        note: params.note,
      });
    }

    // 新しい選手の追加 (inPlayerIdがある場合のみ)
    if (params.inPlayerId) {
      list.push({
        playerId: params.inPlayerId,
        side: params.side,
        battingOrder: inheritedOrder, // ★打順を引き継ぐ
        status: params.kind,
        startInning: params.inning,
        endInning: null,
        positionAtStart: params.position ?? null,
        note: params.note,
      });
    }

    const participationRef = doc(db, PARTICIPATIONS_COLLECTION, params.matchId);
    await updateDoc(participationRef, { [params.side]: list });
  } catch (error) {
    console.error('Error recording substitution:', error);
    throw error;
  }
};

// 試合終了時に、endInningが未設定の選手へ最終回を付与
export const closeParticipationOnGameEnd = async (matchId: string, finalInning: number): Promise<void> => {
  try {
    const table = await getParticipations(matchId);
    let updated = false;
    (['home', 'away'] as const).forEach(side => {
      table[side].forEach(p => {
        if (p.endInning == null) {
          p.endInning = finalInning;
          if (p.status === 'starter' || p.status === 'pinch_hitter' || p.status === 'pinch_runner') {
            p.status = 'finished';
          }
          updated = true;
        }
      });
    });
    if (updated) {
      const participationRef = doc(db, PARTICIPATIONS_COLLECTION, matchId);
      await updateDoc(participationRef, table);
    }
  } catch (error) {
    console.error('Error closing participation on game end:', error);
    throw error;
  }
};

export const getParticipations = async (matchId: string): Promise<ParticipationTable> => {
  try {
    const participationRef = doc(db, PARTICIPATIONS_COLLECTION, matchId);
    const participationSnap = await getDoc(participationRef);
    if (participationSnap.exists()) {
      return participationSnap.data() as ParticipationTable;
    }
    // 存在しない場合は空のテーブルを作成して保存
    const emptyTable: ParticipationTable = { home: [], away: [] };
    await setDoc(participationRef, emptyTable);
    return emptyTable;
  } catch (error) {
    console.error('Error getting participations:', error);
    throw error;
  }
};

/**
 * ★便利関数: 現在出場中のラインナップを取得する（UI表示用）
 * - 打順順にソートして返す
 */
export const getCurrentLineup = async (matchId: string, side: 'home' | 'away'): Promise<ParticipationEntry[]> => {
  const table = await getParticipations(matchId);
  return table[side]
    .filter(p => p.endInning === null) // まだ終わっていない選手
    .sort((a, b) => a.battingOrder - b.battingOrder); // 打順順
};

// ポジション変更を記録
export const recordPositionChange = async (params: {
  matchId: string;
  side: 'home' | 'away';
  playerId: string;
  battingOrder: number;
  oldPosition: string | null;
  newPosition: string | null;
  inning: number;
}): Promise<void> => {
  try {
    const table = await getParticipations(params.matchId);
    const list = table[params.side];
    
    // 現在出場中の選手を探す（まだ試合に出ている選手＝endInningがnull）
    const currentEntry = list.find(
      p => p.playerId === params.playerId 
        && p.battingOrder === params.battingOrder 
        && p.endInning == null
    );
    
    if (currentEntry) {
      // 既存entryのendInningを設定し、statusを更新
      currentEntry.endInning = params.inning;
      currentEntry.status = currentEntry.status === 'starter' ? 'substituted' : currentEntry.status;
      // 新しいentryを作成（新しいポジションで）
      list.push({
        playerId: params.playerId,
        side: params.side,
        battingOrder: params.battingOrder,
        status: 'position_change',
        startInning: params.inning,
        endInning: null,
        positionAtStart: params.newPosition ?? null,
      });
    } else {
      // データ整合性エラー時の保険：新しいentryを作成
      list.push({
        playerId: params.playerId,
        side: params.side,
        battingOrder: params.battingOrder,
        status: 'position_change',
        startInning: params.inning,
        endInning: null,
        positionAtStart: params.newPosition ?? null,
      });
    }

    const participationRef = doc(db, PARTICIPATIONS_COLLECTION, params.matchId);
    await updateDoc(participationRef, { [params.side]: list });
  } catch (error) {
    console.error('Error recording position change:', error);
    throw error;
  }
};

// 選手変更を記録（再出場対応）
export const recordPlayerChange = async (params: {
  matchId: string;
  side: 'home' | 'away';
  outPlayerId: string | null;
  inPlayerId: string;
  battingOrder: number;
  position: string | null;
  inning: number;
}): Promise<void> => {
  try {
    const table = await getParticipations(params.matchId);
    const list = table[params.side];
    
    // 交代対象の選手を探す（まだ試合に出ている選手＝endInningがnull）
    if (params.outPlayerId) {
      const outEntry = list.find(
        p => p.playerId === params.outPlayerId 
          && p.battingOrder === params.battingOrder 
          && p.endInning == null
      );
      
      if (outEntry) {
        outEntry.endInning = params.inning;
        outEntry.status = 'substituted';
      } else if (params.outPlayerId) {
        // データ整合性エラー時の保険
        list.push({
          playerId: params.outPlayerId,
          side: params.side,
          battingOrder: params.battingOrder,
          status: 'substituted',
          startInning: null,
          endInning: params.inning,
        });
      }
    }
    
    // 新しい選手のentryを作成（再出場の場合も常に新しいentryを作成）
    // 再出場かどうかを確認（以前に出場したことがあるか）
    const previousEntries = list.filter(
      p => p.playerId === params.inPlayerId && p.endInning != null
    );
    const isReentry = previousEntries.length > 0;
    
    list.push({
      playerId: params.inPlayerId,
      side: params.side,
      battingOrder: params.battingOrder,
      status: isReentry ? 'pinch_hitter' : 'pinch_hitter', // 再出場も途中出場として記録
      startInning: params.inning,
      endInning: null,
      positionAtStart: params.position ?? null,
    });

    const participationRef = doc(db, PARTICIPATIONS_COLLECTION, params.matchId);
    await updateDoc(participationRef, { [params.side]: list });
  } catch (error) {
    console.error('Error recording player change:', error);
    throw error;
  }
};

// ラインナップ変更を自動検出・記録
export const recordLineupChange = async (params: {
  matchId: string;
  side: 'home' | 'away';
  oldLineup: { playerId: string; position: string; battingOrder: number }[];
  newLineup: { playerId: string; position: string; battingOrder: number }[];
  currentInning: number;
}): Promise<void> => {
  try {
    // 試合開始前（回数が1回表の開始前）は記録しない
    if (params.currentInning <= 1) {
      return;
    }

    // 打順ごとに変更を検出
    const maxOrder = Math.max(
      params.oldLineup.length > 0 ? Math.max(...params.oldLineup.map(e => e.battingOrder)) : 0,
      params.newLineup.length > 0 ? Math.max(...params.newLineup.map(e => e.battingOrder)) : 0
    );

    for (let order = 1; order <= maxOrder; order++) {
      const oldEntry = params.oldLineup.find(e => e.battingOrder === order);
      const newEntry = params.newLineup.find(e => e.battingOrder === order);

      // 選手変更: 同じ打順でplayerIdが変更された場合
      if (oldEntry && newEntry && oldEntry.playerId !== newEntry.playerId) {
        await recordPlayerChange({
          matchId: params.matchId,
          side: params.side,
          outPlayerId: oldEntry.playerId || null,
          inPlayerId: newEntry.playerId || '',
          battingOrder: order,
          position: newEntry.position || null,
          inning: params.currentInning,
        });
      }
      // ポジション変更: 同じ打順・同じ選手でpositionが変更された場合
      else if (
        oldEntry &&
        newEntry &&
        oldEntry.playerId === newEntry.playerId &&
        oldEntry.playerId &&
        oldEntry.position !== newEntry.position
      ) {
        await recordPositionChange({
          matchId: params.matchId,
          side: params.side,
          playerId: oldEntry.playerId,
          battingOrder: order,
          oldPosition: oldEntry.position || null,
          newPosition: newEntry.position || null,
          inning: params.currentInning,
        });
      }
      // 新規出場: oldEntryがなくnewEntryがある場合
      else if (!oldEntry && newEntry && newEntry.playerId) {
        await recordPlayerChange({
          matchId: params.matchId,
          side: params.side,
          outPlayerId: null,
          inPlayerId: newEntry.playerId,
          battingOrder: order,
          position: newEntry.position || null,
          inning: params.currentInning,
        });
      }
    }
  } catch (error) {
    console.error('Error recording lineup change:', error);
    // エラーが発生してもlineup保存は続行できるようにするため、ここではthrowしない
  }
};

// 出場試合数をカウント
export const countGamesPlayed = (
  allParticipations: Array<{ matchId: string; table: ParticipationTable }>,
  targetPlayerId: string
): number => {
  const seenGames = new Set<string>(); // matchIdを記録
  
  allParticipations.forEach(({ matchId, table }) => {
    // ホーム・アウェイの両方から検索
    const found = table.home
      .concat(table.away)
      .some(entry => entry.playerId === targetPlayerId);
    
    if (found && matchId) {
      seenGames.add(matchId);
    }
  });
  
  return seenGames.size; // ユニークな試合数
};