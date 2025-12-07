import { Teams as initialTeams } from '../data/Teams';
import { Team, TeamData, TeamSearchParams } from '../types/Team';
import { db, auth } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';

const TEAMS_COLLECTION = 'teams';

// 初期データのシード（初回のみ、認証済みユーザーのみ）
const seedInitialTeams = async (): Promise<void> => {
  try {
    // 認証済みユーザーのみシードを実行
    if (!auth.currentUser) {
      return; // 未認証の場合はスキップ
    }

    const teamsRef = collection(db, TEAMS_COLLECTION);
    const snapshot = await getDocs(teamsRef);
    if (snapshot.empty) {
      // コレクションが空の場合のみ初期データを登録
      const teamsToAdd = initialTeams.map((t: any) => ({
        id: Number(t.id),
        teamName: t['チーム名'] || t.teamName,
        teamAbbr: t['略称'] || t.teamAbbr,
        prefecture: t['都道府県'] || t.prefecture || '',
        affiliation: t['所属'] || t.affiliation || '',
      }));
      for (const team of teamsToAdd) {
        const teamRef = doc(db, TEAMS_COLLECTION, String(team.id));
        await setDoc(teamRef, team);
      }
      console.log('Initial teams seeded successfully');
    }
  } catch (error: any) {
    // 権限エラーの場合は無視（未認証ユーザーがアクセスした場合など）
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      console.log('Skipping team seed: permission denied (user not authenticated)');
    } else {
      console.error('Error seeding initial teams:', error);
    }
  }
};

export const getPrefectures = async (): Promise<string[]> => {
  try {
    const teams = await getTeams();
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.prefecture) set.add(t.prefecture);
    });
    return Array.from(set).sort();
  } catch (error) {
    console.error('Error getting prefectures:', error);
    throw error;
  }
};

export const getAffiliations = async (): Promise<string[]> => {
  try {
    const teams = await getTeams();
    const set = new Set<string>();
    teams.forEach((t) => {
      if (t.affiliation) set.add(t.affiliation);
    });
    return Array.from(set).sort();
  } catch (error) {
    console.error('Error getting affiliations:', error);
    throw error;
  }
};

export const searchTeams = async (param: string | TeamSearchParams): Promise<Team[]> => {
  try {
    let name = '';
    let prefecture = '';
    let affiliation = '';

    if (typeof param === 'string') {
      name = param.trim().toLowerCase();
    } else if (param && typeof param === 'object') {
      name = (param.name || '').trim().toLowerCase();
      prefecture = (param.prefecture || '').trim();
      affiliation = (param.affiliation || '').trim();
    }

    const teams = await getTeams();
    const results = teams.filter((t) => {
      const matchName = name ? t.teamName.toLowerCase().includes(name) : true;
      const matchPref = prefecture ? (t.prefecture || '') === prefecture : true;
      const matchAff = affiliation ? (t.affiliation || '') === affiliation : true;
      return matchName && matchPref && matchAff;
    });

    return results.sort((a, b) => a.teamName.localeCompare(b.teamName));
  } catch (error) {
    console.error('Error searching teams:', error);
    throw error;
  }
};

export const registerTeam = async (teamData: TeamData): Promise<Team> => {
  try {
    const name = (teamData.teamName || '').trim();
    const pref = (teamData.prefecture || '').trim();

    if (!name || !teamData.teamAbbr || !pref || !teamData.affiliation) {
      const err = new Error('すべてのフィールドを入力してください。');
      (err as any).code = 'INVALID_INPUT';
      throw err;
    }

    // 重複チェック
    const teamsRef = collection(db, TEAMS_COLLECTION);
    const q = query(teamsRef, where('teamName', '==', name), where('prefecture', '==', pref));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const err = new Error('同じチーム名と都道府県の組合せは既に登録されています。');
      (err as any).code = 'DUPLICATE';
      throw err;
    }

    // 最大IDを取得
    const allTeams = await getTeams();
    const maxId = allTeams.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0);
    const nextId = Math.max(13, maxId + 1);

    const newTeam: Team = {
      id: nextId,
      teamName: name,
      teamAbbr: (teamData.teamAbbr || '').trim(),
      prefecture: pref,
      affiliation: (teamData.affiliation || '').trim(),
      createdAt: new Date().toISOString(),
    };

    const teamRef = doc(db, TEAMS_COLLECTION, String(newTeam.id));
    await setDoc(teamRef, newTeam);

    return newTeam;
  } catch (error) {
    console.error('Error registering team:', error);
    throw error;
  }
};

export const getTeams = async (): Promise<Team[]> => {
  try {
    // 初回のみ初期データをシード
    await seedInitialTeams();
    
    const teamsRef = collection(db, TEAMS_COLLECTION);
    const snapshot = await getDocs(teamsRef);
    const teamsList: Team[] = [];
    snapshot.forEach((doc) => {
      teamsList.push(doc.data() as Team);
    });
    return teamsList;
  } catch (error) {
    console.error('Error getting teams:', error);
    throw error;
  }
};
