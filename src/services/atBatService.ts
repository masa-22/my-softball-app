import { AtBat } from '../types/AtBat';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, getDocs, query, where, deleteDoc, writeBatch, onSnapshot, Unsubscribe } from 'firebase/firestore';

const ATBATS_COLLECTION = 'atBats';

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
export const saveAtBat = async (atBat: AtBat): Promise<void> => {
  try {
    console.log('[atBatService] Attempting to save atBat to Firestore:', {
      playId: atBat.playId,
      matchId: atBat.matchId,
      index: atBat.index,
      batterId: atBat.batterId,
      resultType: atBat.result?.type
    });
    const atBatRef = doc(db, ATBATS_COLLECTION, atBat.playId);
    await setDoc(atBatRef, atBat);
    console.log('[atBatService] Successfully saved atBat to Firestore:', atBat.playId);
  } catch (error) {
    console.error('[atBatService] Error saving atBat to Firestore:', error, {
      playId: atBat.playId,
      matchId: atBat.matchId
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


