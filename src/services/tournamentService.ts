import { Tournament, TournamentSearchParams, TournamentRegisterData } from '../types/Tournament';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';

const TOURNAMENTS_COLLECTION = 'tournaments';

export const getTournaments = async (): Promise<Tournament[]> => {
  try {
    const tournamentsRef = collection(db, TOURNAMENTS_COLLECTION);
    const snapshot = await getDocs(tournamentsRef);
    const tournamentsList: Tournament[] = [];
    snapshot.forEach((doc) => {
      tournamentsList.push(doc.data() as Tournament);
    });
    return tournamentsList;
  } catch (error) {
    console.error('Error getting tournaments:', error);
    throw error;
  }
};

export const searchTournaments = async (params: TournamentSearchParams) : Promise<Tournament[]> => {
  try {
    const tournaments = await getTournaments();
    const year = (params.year || '').trim();
    const name = (params.name || '').trim().toLowerCase();
    return tournaments.filter(t => {
      const matchYear = year ? t.year === year : true;
      const matchName = name ? t.name.toLowerCase().includes(name) : true;
      return matchYear && matchName;
    }).sort((a,b) => (a.year + a.name).localeCompare(b.year + b.name));
  } catch (error) {
    console.error('Error searching tournaments:', error);
    throw error;
  }
};

export const registerTournament = async (data: TournamentRegisterData) : Promise<Tournament> => {
  try {
    const year = (data.year || '').trim();
    const name = (data.name || '').trim();
    const type = (data.type || '').trim() as Tournament['type'];

    if (!year || !name || !type) {
      const err = new Error('すべてのフィールドを入力してください。');
      (err as any).code = 'INVALID_INPUT';
      throw err;
    }

    // 重複チェック（年＋大会名）
    const tournaments = await getTournaments();
    const exists = tournaments.find(t => t.year === year && t.name === name);
    if (exists) {
      const err = new Error('同じ年と大会名の組合せは既に登録されています。');
      (err as any).code = 'DUPLICATE';
      throw err;
    }

    // id 決定: t01, t02, ...
    const maxNum = tournaments.reduce((max, t) => {
      const m = t.id.match(/^t0*([0-9]+)$/);
      const n = m ? Number(m[1]) : 0;
      return Math.max(max, n);
    }, 0);
    const next = maxNum + 1;
    const id = `t${String(next).padStart(2, '0')}`;

    const newT: Tournament = { id, year, name, type, createdAt: new Date().toISOString() };
    const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, newT.id);
    await setDoc(tournamentRef, newT);
    return newT;
  } catch (error) {
    console.error('Error registering tournament:', error);
    throw error;
  }
};
