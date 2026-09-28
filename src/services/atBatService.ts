import {
  AtBat,
  AtBatType,
  GameSnapshot,
  HalfInning,
  PlayDetails,
  RunnerEvent,
  ScoredRunnerEntry,
} from '../types/AtBat';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, getDocs, query, where, deleteDoc, writeBatch, onSnapshot, Unsubscribe } from 'firebase/firestore';

const ATBATS_COLLECTION = 'atBats';

/** Firestore は undefined を拒否するため、保存前に除去する */
function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

/**
 * 試合内の次の play index / playId を採番する
 */
export const allocateNextPlaySlot = async (
  matchId: string
): Promise<{ index: number; playId: string }> => {
  const existing = await getAtBats(matchId);
  const maxIndex = existing.reduce((max, a) => Math.max(max, a.index || 0), 0);
  const index = maxIndex + 1;
  const playId = `${matchId}_${String(index).padStart(3, '0')}`;
  return { index, playId };
};

export type MidPlayAtBatParams = {
  matchId: string;
  type: Extract<AtBatType, 'steal' | 'other'>;
  /** 採番後の index から plateAppearanceId を決める（同一打席の初回 play で確定） */
  resolvePlateAppearanceId?: (playIndex: number) => string;
  inning: number;
  topOrBottom: HalfInning;
  batterId: string;
  pitcherId: string;
  battingOrder: number;
  situationBefore: GameSnapshot;
  situationAfter: GameSnapshot;
  scoredRunners: ScoredRunnerEntry[];
  runnerEvents: RunnerEvent[];
  playDetails?: PlayDetails;
};

/**
 * 打席中の走塁・アウトなど（type=steal|other）を独立した atBat として保存する
 */
export const saveMidPlayAtBat = async (params: MidPlayAtBatParams): Promise<AtBat> => {
  const { index, playId } = await allocateNextPlaySlot(params.matchId);
  const plateAppearanceId = params.resolvePlateAppearanceId?.(index);
  const atBat: AtBat = {
    playId,
    matchId: params.matchId,
    index,
    inning: params.inning,
    topOrBottom: params.topOrBottom,
    type: params.type,
    batterId: params.batterId,
    pitcherId: params.pitcherId,
    battingOrder: params.battingOrder,
    situationBefore: params.situationBefore,
    situationAfter: params.situationAfter,
    scoredRunners: params.scoredRunners,
    pitches: [],
    runnerEvents: params.runnerEvents,
    ...(params.playDetails ? { playDetails: params.playDetails } : {}),
    timestamp: new Date().toISOString(),
    ...(plateAppearanceId ? { plateAppearanceId } : {}),
  };
  await saveAtBat(atBat);
  return atBat;
};

/**
 * 試合ごとの打席記録一覧を取得
 */
export const getAtBats = async (matchId: string): Promise<AtBat[]> => {
  try {
    const atBatsRef = collection(db, ATBATS_COLLECTION);
    const q = query(atBatsRef, where('matchId', '==', matchId));
    const snapshot = await getDocs(q);
    const atBatsList: AtBat[] = [];
    snapshot.forEach((doc) => {
      atBatsList.push(doc.data() as AtBat);
    });
    const sorted = atBatsList.sort((a, b) => a.index - b.index);
    console.log('[atBatService] Retrieved atBats (getAtBats):', { 
      matchId, 
      count: sorted.length, 
      indices: sorted.map(a => a.index),
      stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    return sorted;
  } catch (error) {
    console.error('[atBatService] Error getting atBats:', error, { matchId });
    throw error;
  }
};

/**
 * IDで打席記録を取得
 */
export const getAtBat = async (playId: string): Promise<AtBat | undefined> => {
  try {
    const atBatRef = doc(db, ATBATS_COLLECTION, playId);
    const atBatSnap = await getDoc(atBatRef);
    if (atBatSnap.exists()) {
      return atBatSnap.data() as AtBat;
    }
    return undefined;
  } catch (error) {
    console.error('Error getting atBat:', error);
    throw error;
  }
};

/**
 * 打席記録を保存（新規または更新）
 */
export const deleteAtBatByPlayId = async (playId: string): Promise<void> => {
  try {
    const atBatRef = doc(db, ATBATS_COLLECTION, playId);
    await deleteDoc(atBatRef);
  } catch (error) {
    console.error('Error deleting atBat:', error, { playId });
    throw error;
  }
};

export const saveAtBat = async (atBat: AtBat): Promise<void> => {
  try {
    console.log('[atBatService] Attempting to save atBat to Firestore:', {
      playId: atBat.playId,
      matchId: atBat.matchId,
      index: atBat.index,
      type: atBat.type,
      batterId: atBat.batterId,
      resultType: atBat.result?.type,
      runnerEventTypes: atBat.runnerEvents?.map((e) => e.type),
    });
    const atBatRef = doc(db, ATBATS_COLLECTION, atBat.playId);
    await setDoc(atBatRef, stripUndefinedDeep(atBat) as AtBat);
    console.log('[atBatService] Successfully saved atBat to Firestore:', atBat.playId);
  } catch (error) {
    console.error('[atBatService] Error saving atBat to Firestore:', error, {
      playId: atBat.playId,
      matchId: atBat.matchId,
      type: atBat.type,
    });
    throw error;
  }
};

/**
 * 指定した試合の打席記録を全て削除
 */
export const clearAtBats = async (matchId: string): Promise<void> => {
  try {
    const atBatsRef = collection(db, ATBATS_COLLECTION);
    const q = query(atBatsRef, where('matchId', '==', matchId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error clearing atBats:', error);
    throw error;
  }
};

/**
 * 試合ごとの打席記録をリアルタイム購読
 * @param matchId 試合ID
 * @param callback データ変更時のコールバック
 * @returns リスナーの解除関数
 */
export const subscribeAtBats = (
  matchId: string,
  callback: (atBats: AtBat[]) => void
): Unsubscribe => {
  const atBatsRef = collection(db, ATBATS_COLLECTION);
  const q = query(atBatsRef, where('matchId', '==', matchId));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const atBatsList: AtBat[] = [];
      snapshot.forEach((doc) => {
        atBatsList.push(doc.data() as AtBat);
      });
      const sorted = atBatsList.sort((a, b) => a.index - b.index);
      console.log('[atBatService] Retrieved atBats (realtime):', { 
        matchId, 
        count: sorted.length, 
        indices: sorted.map(a => a.index) 
      });
      callback(sorted);
    },
    (error) => {
      console.error('[atBatService] Error in atBats subscription:', error);
      callback([]);
    }
  );
};


