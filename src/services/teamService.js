import { Teams as initialTeams } from '../data/Teams';

// ローカル運用用に Teams.js → 正規化された配列に変換して保持
let teams = [];

// 初期化: localStorage に保存があればそちらを優先、なければ Teams.js のデータを利用
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem('teams');
    if (raw) {
      teams = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('localStorage load error', e);
  }

  // initialTeams のフィールド名が日本語なので正規化して扱う
  teams = initialTeams.map((t) => ({
    id: Number(t.id),
    teamName: t['チーム名'] || t.teamName,
    teamAbbr: t['略称'] || t.teamAbbr,
    prefecture: t['都道府県'] || t.prefecture || '',
    affiliation: t['所属'] || t.affiliation || '',
  }));
  // ensure next IDs start from >=13 if initial contains 1..12
  persist();
};

const persist = () => {
  try {
    localStorage.setItem('teams', JSON.stringify(teams));
  } catch (e) {
    console.warn('localStorage save error', e);
  }
};

loadFromStorage();

/**
 * フィルター用選択肢取得（重複を除いた配列）
 */
export const getPrefectures = () => {
  const set = new Set();
  teams.forEach((t) => {
    if (t.prefecture) set.add(t.prefecture);
  });
  return Array.from(set).sort();
};

export const getAffiliations = () => {
  const set = new Set();
  teams.forEach((t) => {
    if (t.affiliation) set.add(t.affiliation);
  });
  return Array.from(set).sort();
};

/**
 * チーム検索（複数条件対応）
 * - 互換性のため文字列を渡すとチーム名で検索（部分一致）
 * - オブジェクトで { name, prefecture, affiliation } を渡すと複合フィルタ
 *
 * @param {string|Object} param
 * @returns {Array}
 */
export const searchTeams = async (param) => {
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

  // フィルタリング（部分一致は teamName、都道府県/所属は完全一致）
  const results = teams.filter((t) => {
    const matchName = name ? t.teamName.toLowerCase().includes(name) : true;
    const matchPref = prefecture ? (t.prefecture || '') === prefecture : true;
    const matchAff = affiliation ? (t.affiliation || '') === affiliation : true;
    return matchName && matchPref && matchAff;
  });

  return results.sort((a, b) => a.teamName.localeCompare(b.teamName));
};

/**
 * 新規チームを登録（ローカル実装）
 * チームID は既存最大 + 1（最小 13）を割り当てる
 * 重複判定: teamName と prefecture が一致する場合は登録不可
 *
 * @param {Object} teamData - { teamName, teamAbbr, prefecture, affiliation }
 * @returns {Object} - 登録されたチーム情報 (id を含む)
 */
export const registerTeam = async (teamData) => {
  const name = (teamData.teamName || '').trim();
  const pref = (teamData.prefecture || '').trim();

  if (!name || !teamData.teamAbbr || !pref || !teamData.affiliation) {
    const err = new Error('すべてのフィールドを入力してください。');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  // 重複チェック（チーム名 + 都道府県 一致）
  const exists = teams.find(
    (t) => t.teamName === name && t.prefecture === pref
  );
  if (exists) {
    const err = new Error(
      '同じチーム名と都道府県の組合せは既に登録されています。'
    );
    err.code = 'DUPLICATE';
    throw err;
  }

  // id 決定（max + 1、最低13）
  const maxId = teams.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0);
  const nextId = Math.max(13, maxId + 1);

  const newTeam = {
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

// 既存の Firestore 実装が必要なら残すが、ここではローカル版を優先して利用する設計です.

// 追加: 現在保持しているチーム一覧を返す（コピーを返す）
export const getTeams = () => {
  return teams.slice().map(t => ({ ...t }));
};
