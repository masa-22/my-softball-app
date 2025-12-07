import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const WINNING_PITCHERS_COLLECTION = 'winningPitchers';

type WinningPitchersData = { home?: string; away?: string };

export const getWinningPitcher = async (matchId: string, side: 'home' | 'away'): Promise<string | null> => {
  try {
    const pitcherRef = doc(db, WINNING_PITCHERS_COLLECTION, matchId);
    const pitcherSnap = await getDoc(pitcherRef);
    if (pitcherSnap.exists()) {
      const data = pitcherSnap.data() as WinningPitchersData;
      return data[side] || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting winning pitcher:', error);
    throw error;
  }
};

export const setWinningPitcher = async (matchId: string, side: 'home' | 'away', pitcherId: string): Promise<void> => {
  try {
    const pitcherRef = doc(db, WINNING_PITCHERS_COLLECTION, matchId);
    const pitcherSnap = await getDoc(pitcherRef);
    if (pitcherSnap.exists()) {
      await updateDoc(pitcherRef, { [side]: pitcherId });
    } else {
      const data: WinningPitchersData = { [side]: pitcherId };
      await setDoc(pitcherRef, data);
    }
  } catch (error) {
    console.error('Error setting winning pitcher:', error);
    throw error;
  }
};

