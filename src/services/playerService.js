import { getTeams } from './teamService';

let players = [];

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem('players');
    if (raw) {
      const parsed = JSON.parse(raw);

      // マイグレーション: もし旧フォーマットで name フィールドのみの場合は分割して familyName/givenName に変換
      players = parsed.map((p) => {
        if (p.familyName || p.givenName) {
          return p;
        }
        const name = (p.name || '').trim();
        if (!name) {
          return { ...p, familyName: '', givenName: '' };
        }
        const parts = name.split(/\s+/);
        const familyName = parts.length > 1 ? parts[0] : parts[0];
        const givenName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        const { name: _n, ...rest } = p;
        return { ...rest, familyName, givenName };
      });

      // 変更を永続化して新フォーマットに揃えておく
      persist();
      return;
    }
  } catch (e) {
    console.warn('players load error', e);
  }
  players = []; // 初期は空
  persist();
};

const persist = () => {
  try {
    localStorage.setItem('players', JSON.stringify(players));
  } catch (e) {
    console.warn('players save error', e);
  }
};

loadFromStorage();

/**
 * チーム別選手一覧取得（teamId optional）
 */
export const getPlayers = (teamId) => {
  if (teamId == null) return players.slice();
  return players.filter(p => String(p.teamId) === String(teamId));
};

/**
 * 選手検索（teamId 必須。name 部分一致、entryYear 完全一致をサポート）
 * name は姓・名どちらにも部分一致でマッチさせる
 * @param {Object} { teamId, name, entryYear }
 */
export const searchPlayers = async ({ teamId, name = '', entryYear = '' }) => {
  const list = getPlayers(teamId);
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
};

/**
 * 選手登録
 * ID は teamId_n 形式。既存同チームの最大 suffix+1 を割り当てる
 * playerData: { teamId, familyName, givenName, throwing, batting, entryYear? }
 */
export const registerPlayer = async (playerData) => {
  const teamId = playerData.teamId;
  const familyName = (playerData.familyName || '').trim();
  const givenName = (playerData.givenName || '').trim();
  if (!teamId || !familyName || !givenName || !playerData.throwing || !playerData.batting) {
    const err = new Error('必要なフィールドが不足しています。');
    err.code = 'INVALID_INPUT';
    throw err;
  }

  // チーム存在確認
  const teams = getTeams();
  const team = teams.find(t => String(t.id) === String(teamId));
  if (!team) {
    const err = new Error('指定されたチームが存在しません。');
    err.code = 'NO_TEAM';
    throw err;
  }

  // 重複チェック：同じチーム内で苗字＋名前が完全一致していたら登録不可
  const sameTeam = players.filter(p => String(p.teamId) === String(teamId));
  const duplicate = sameTeam.find(p => (p.familyName || '') === familyName && (p.givenName || '') === givenName);
  if (duplicate) {
    const err = new Error('同じ名前の選手が既に登録されています。'); // ユーザー向けメッセージ
    err.code = 'PLAYER_DUPLICATE';
    throw err;
  }

  // id 生成: teamId_n
  const suffixNumbers = sameTeam.map(p => {
    const parts = String(p.playerId).split('_');
    const suf = parts.length > 1 ? Number(parts[1]) : 0;
    return Number.isFinite(suf) ? suf : 0;
  });
  const maxSuffix = suffixNumbers.length ? Math.max(...suffixNumbers) : 0;
  const nextSuffix = maxSuffix + 1;
  const playerId = `${teamId}_${nextSuffix}`;

  const newPlayer = {
    playerId,
    teamId,
    familyName,
    givenName,
    throwing: playerData.throwing,
    batting: playerData.batting,
    entryYear: playerData.entryYear || null,
    createdAt: new Date().toISOString()
  };

  players.push(newPlayer);
  persist();
  return newPlayer;
};
