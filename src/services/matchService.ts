import { getTournaments } from './tournamentService';
import { getTeams } from './teamService';

type Match = {
  id: string;
  tournamentId: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:MM
  homeTeamId: string | number;
  awayTeamId: string | number;
  createdAt?: string;
};

let matches: Match[] = [];

const load = () => {
  try {
    const raw = localStorage.getItem('matches');
    if (raw) {
      matches = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('matches load error', e);
  }
  matches = [];
  persist();
};

const persist = () => {
  try {
    localStorage.setItem('matches', JSON.stringify(matches));
  } catch (e) {
    console.warn('matches save error', e);
  }
};

load();

export const getMatches = (): Match[] => matches.slice();

export const searchMatches = async (params: { tournamentId?: string; date?: string; teamName?: string }): Promise<Match[]> => {
  const tournamentId = (params.tournamentId || '').trim();
  const date = (params.date || '').trim();
  const teamNameQ = (params.teamName || '').trim().toLowerCase();

  const teams = getTeams();

  return matches.filter(m => {
    const matchTournament = tournamentId ? String(m.tournamentId) === String(tournamentId) : true;
    const matchDate = date ? m.date === date : true;

    let matchTeam = true;
    if (teamNameQ) {
      const home = teams.find(t => String(t.id) === String(m.homeTeamId));
      const away = teams.find(t => String(t.id) === String(m.awayTeamId));
      const homeStr = (home?.teamName || '').toLowerCase();
      const awayStr = (away?.teamName || '').toLowerCase();
      matchTeam = homeStr.includes(teamNameQ) || awayStr.includes(teamNameQ);
    }

    return matchTournament && matchDate && matchTeam;
  }).sort((a,b) => {
    // sort by date then startTime
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return a.id.localeCompare(b.id);
  });
};

/**
 * registerMatch:
 * - data: { tournamentId, date (yyyy-mm-dd), startTime (HH:MM), homeTeamId, awayTeamId }
 * - ID を日付ベースで再付番（YYYYMMDD_n）。同日分は startTime の昇順で並べ替える。
 */
export const registerMatch = async (data: { tournamentId: string; date: string; startTime: string; homeTeamId: string | number; awayTeamId: string | number }): Promise<Match> => {
  const tournamentId = (data.tournamentId || '').trim();
  const date = (data.date || '').trim();
  const startTime = (data.startTime || '').trim();
  const homeTeamId = data.homeTeamId;
  const awayTeamId = data.awayTeamId;

  if (!tournamentId || !date || !startTime || !homeTeamId || !awayTeamId) {
    const err = new Error('すべてのフィールドを入力してください。');
    (err as any).code = 'INVALID_INPUT';
    throw err;
  }

  if (String(homeTeamId) === String(awayTeamId)) {
    const err = new Error('先攻チームと後攻チームは同じチームにできません。');
    (err as any).code = 'SAME_TEAM';
    throw err;
  }

  // 存在確認
  const tournaments = getTournaments();
  const tournament = tournaments.find(t => String(t.id) === String(tournamentId));
  if (!tournament) {
    const err = new Error('指定された大会が存在しません。');
    (err as any).code = 'NO_TOURNAMENT';
    throw err;
  }
  const teams = getTeams();
  const home = teams.find(t => String(t.id) === String(homeTeamId));
  const away = teams.find(t => String(t.id) === String(awayTeamId));
  if (!home || !away) {
    const err = new Error('指定されたチームが存在しません。');
    (err as any).code = 'NO_TEAM';
    throw err;
  }

  // 対象日の日付文字列（ID 用）: YYYYMMDD
  const dateId = date.replace(/-/g, '');

  // その日の既存試合を取得（除外せず全て）
  const sameDateMatches = matches.filter(m => m.date === date);

  // 新しい試合オブジェクト（暫定 id）
  const newMatchTemp: Match = {
    id: '', // 後で付与
    tournamentId,
    date,
    startTime,
    homeTeamId,
    awayTeamId,
    createdAt: new Date().toISOString(),
  };

  // 合わせて並び替え：既存 + 新規を startTime 昇順でソート
  const merged = [...sameDateMatches, newMatchTemp].sort((a,b) => {
    // compare startTime 'HH:MM'
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    // 同じ開始時間は createdAt を参考（古いものを先に）
    const aCreated = a.createdAt || '';
    const bCreated = b.createdAt || '';
    return aCreated.localeCompare(bCreated);
  });

  // 再付番して、matches 配列の該当日分を置き換える
  const updatedDateMatches: Match[] = merged.map((m, idx) => {
    const seq = idx + 1;
    const newId = `${dateId}_${seq}`;
    // if this is newMatchTemp (id === ''), we will return created object with newId
    if (m === newMatchTemp) {
      return { ...m, id: newId };
    }
    // existing match: update id if changed
    return { ...m, id: newId };
  });

  // Build new matches list: keep others unchanged, replace same-date ones
  const others = matches.filter(m => m.date !== date);
  matches = [...others, ...updatedDateMatches];

  // persist and return the newly created match (find by createdAt and id)
  persist();

  const created = updatedDateMatches.find(m => m.createdAt === newMatchTemp.createdAt && m.tournamentId === tournamentId && m.startTime === startTime && String(m.homeTeamId) === String(homeTeamId) && String(m.awayTeamId) === String(awayTeamId));
  if (!created) {
    // safety fallback
    throw new Error('試合の作成に失敗しました。');
  }
  return created;
};
