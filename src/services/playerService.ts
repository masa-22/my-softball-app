import { getTeams } from './teamService';
import { Player, PlayerData } from '../types/Player';
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';

interface SearchParams {
  teamId: string | number;
  name?: string;
  entryYear?: string;
}

const PLAYERS_COLLECTION = 'players';

export const getPlayers = async (teamId?: string | number): Promise<Player[]> => {
  try {
    const playersRef = collection(db, PLAYERS_COLLECTION);
    let snapshot;
    if (teamId != null) {
      const q = query(playersRef, where('teamId', '==', String(teamId)));
      snapshot = await getDocs(q);
    } else {
      snapshot = await getDocs(playersRef);
    }
    const playersList: Player[] = [];
    snapshot.forEach((doc) => {
      playersList.push(doc.data() as Player);
    });
    return playersList;
  } catch (error) {
    console.error('Error getting players:', error);
    throw error;
  }
};

export const searchPlayers = async ({ teamId, name = '', entryYear = '' }: SearchParams): Promise<Player[]> => {
  try {
    const list = await getPlayers(teamId);
    const qName = (name || '').trim().toLowerCase();
    return list.filter(p => {
      const family = (p.familyName || '').toLowerCase();
      const given = (p.givenName || '').toLowerCase();
      const full = `${family} ${given}`.trim();
      const matchName = qName
        ? (family.includes(qName) || given.includes(qName) || full.includes(qName))
        : true;
      const matchYear = entryYear ? String(p.entryYear || '') === String(entryYear) : true;
      return matchName && matchYear;
    }).sort((a,b) => {
      const nameA = `${a.familyName || ''} ${a.givenName || ''}`.trim();
      const nameB = `${b.familyName || ''} ${b.givenName || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error('Error searching players:', error);
    throw error;
  }
};

export const registerPlayer = async (playerData: PlayerData): Promise<Player> => {
  try {
    const teamId = playerData.teamId;
    const familyName = (playerData.familyName || '').trim();
    const givenName = (playerData.givenName || '').trim();
    if (!teamId || !familyName || !givenName || !playerData.throwing || !playerData.batting) {
      const err = new Error('必要なフィールドが不足しています。');
      (err as any).code = 'INVALID_INPUT';
      throw err;
    }

    const teams = await getTeams();
    const team = teams.find(t => String(t.id) === String(teamId));
    if (!team) {
      const err = new Error('指定されたチームが存在しません。');
      (err as any).code = 'NO_TEAM';
      throw err;
    }

    // 重複チェック
    const sameTeam = await getPlayers(teamId);
    const duplicate = sameTeam.find(p => (p.familyName || '') === familyName && (p.givenName || '') === givenName);
    if (duplicate) {
      const err = new Error('同じ名前の選手が既に登録されています。');
      (err as any).code = 'PLAYER_DUPLICATE';
      throw err;
    }

    const suffixNumbers = sameTeam.map(p => {
      const parts = String(p.playerId).split('_');
      const suf = parts.length > 1 ? Number(parts[1]) : 0;
      return Number.isFinite(suf) ? suf : 0;
    });
    const maxSuffix = suffixNumbers.length ? Math.max(...suffixNumbers) : 0;
    const nextSuffix = maxSuffix + 1;
    const playerId = `${teamId}_${nextSuffix}`;

    const newPlayer: Player = {
      playerId,
      teamId,
      familyName,
      givenName,
      throwing: playerData.throwing,
      batting: playerData.batting,
      entryYear: playerData.entryYear || null,
      createdAt: new Date().toISOString()
    };

    const playerRef = doc(db, PLAYERS_COLLECTION, newPlayer.playerId);
    await setDoc(playerRef, newPlayer);
    return newPlayer;
  } catch (error) {
    console.error('Error registering player:', error);
    throw error;
  }
};
