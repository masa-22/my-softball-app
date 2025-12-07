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
      outEntry.positionAtEnd = outEntry.positionAtEnd ?? params.position ?? null;
    } else if (params.outPlayerId) {
      // データ整合性エラー時の保険
      list.push({
        playerId: params.outPlayerId,
        side: params.side,
        battingOrder: inheritedOrder,
        status: 'substituted',
        startInning: null,
        endInning: params.inning,
        positionAtEnd: params.position ?? null,
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
