import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

const TEAMS_COLLECTION = 'teams';

/**
 * 新規チームを登録
 * @param {Object} teamData - { teamName, teamAbbr, affiliation }
 * @returns {Object} - 登録されたチーム情報 (id を含む)
 */
export const registerTeam = async (teamData) => {
  try {
    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
      ...teamData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      ...teamData,
    };
  } catch (error) {
    console.error('Error registering team:', error);
    throw error;
  }
};

/**
 * チーム名で検索（部分一致）
 * @param {string} searchQuery - 検索クエリ
 * @returns {Array} - マッチしたチーム情報の配列
 */
export const searchTeams = async (searchQuery) => {
  try {
    const q = query(
      collection(db, TEAMS_COLLECTION),
      where('teamName', '>=', searchQuery),
      where('teamName', '<=', searchQuery + '\uf8ff')
    );

    const querySnapshot = await getDocs(q);
    const results = [];
    querySnapshot.forEach((doc) => {
      results.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return results;
  } catch (error) {
    console.error('Error searching teams:', error);
    throw error;
  }
};
