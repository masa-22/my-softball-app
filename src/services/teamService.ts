import { Teams as initialTeams } from '../data/Teams';

import { Team, TeamData, TeamSearchParams } from '../types/Team';

let teams: Team[] = [];

const loadFromStorage = (): void => {
  try {
    const raw = localStorage.getItem('teams');
    if (raw) {
      teams = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('localStorage load error', e);
  }

  teams = initialTeams.map((t: any) => ({
    id: Number(t.id),
    teamName: t['チーム名'] || t.teamName,
    teamAbbr: t['略称'] || t.teamAbbr,
    prefecture: t['都道府県'] || t.prefecture || '',
    affiliation: t['所属'] || t.affiliation || '',
  }));
  persist();
};

const persist = (): void => {
  try {
    localStorage.setItem('teams', JSON.stringify(teams));
  } catch (e) {
    console.warn('localStorage save error', e);
  }
};

loadFromStorage();

export const getPrefectures = (): string[] => {
  const set = new Set<string>();
  teams.forEach((t) => {
    if (t.prefecture) set.add(t.prefecture);
  });
  return Array.from(set).sort();
};

export const getAffiliations = (): string[] => {
  const set = new Set<string>();
  teams.forEach((t) => {
    if (t.affiliation) set.add(t.affiliation);
  });
  return Array.from(set).sort();
};

export const searchTeams = async (param: string | TeamSearchParams): Promise<Team[]> => {
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

  const results = teams.filter((t) => {
    const matchName = name ? t.teamName.toLowerCase().includes(name) : true;
    const matchPref = prefecture ? (t.prefecture || '') === prefecture : true;
    const matchAff = affiliation ? (t.affiliation || '') === affiliation : true;
    return matchName && matchPref && matchAff;
  });

  return results.sort((a, b) => a.teamName.localeCompare(b.teamName));
};

export const registerTeam = async (teamData: TeamData): Promise<Team> => {
  const name = (teamData.teamName || '').trim();
  const pref = (teamData.prefecture || '').trim();

  if (!name || !teamData.teamAbbr || !pref || !teamData.affiliation) {
    const err = new Error('すべてのフィールドを入力してください。');
    (err as any).code = 'INVALID_INPUT';
    throw err;
  }

  const exists = teams.find(
    (t) => t.teamName === name && t.prefecture === pref
  );
  if (exists) {
    const err = new Error('同じチーム名と都道府県の組合せは既に登録されています。');
    (err as any).code = 'DUPLICATE';
    throw err;
  }

  const maxId = teams.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0);
  const nextId = Math.max(13, maxId + 1);

  const newTeam: Team = {
    id: nextId,
    teamName: name,
    teamAbbr: (teamData.teamAbbr || '').trim(),
    prefecture: pref,
    affiliation: (teamData.affiliation || '').trim(),
    createdAt: new Date().toISOString(),
  };

  teams.push(newTeam);
  persist();

  return newTeam;
};

export const getTeams = (): Team[] => {
  return teams.slice().map(t => ({ ...t }));
};
