import { getTeams } from './teamService';

interface Player {
  playerId: string;
  teamId: string | number;
  familyName: string;
  givenName: string;
  throwing: string;
  batting: string;
  entryYear: string | null;
  createdAt: string;
}

interface PlayerData {
  teamId: string | number;
  familyName: string;
  givenName: string;
  throwing: string;
  batting: string;
  entryYear?: string | null;
}

interface SearchParams {
  teamId: string | number;
  name?: string;
  entryYear?: string;
}

let players: Player[] = [];

const loadFromStorage = (): void => {
  try {
    const raw = localStorage.getItem('players');
    if (raw) {
      const parsed = JSON.parse(raw);

      players = parsed.map((p: any) => {
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

      persist();
      return;
    }
  } catch (e) {
    console.warn('players load error', e);
  }
  players = [];
  persist();
};

const persist = (): void => {
  try {
    localStorage.setItem('players', JSON.stringify(players));
  } catch (e) {
    console.warn('players save error', e);
  }
};

loadFromStorage();

export const getPlayers = (teamId?: string | number): Player[] => {
  if (teamId == null) return players.slice();
  return players.filter(p => String(p.teamId) === String(teamId));
};

export const searchPlayers = async ({ teamId, name = '', entryYear = '' }: SearchParams): Promise<Player[]> => {
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

export const registerPlayer = async (playerData: PlayerData): Promise<Player> => {
  const teamId = playerData.teamId;
  const familyName = (playerData.familyName || '').trim();
  const givenName = (playerData.givenName || '').trim();
  if (!teamId || !familyName || !givenName || !playerData.throwing || !playerData.batting) {
    const err = new Error('必要なフィールドが不足しています。');
    (err as any).code = 'INVALID_INPUT';
    throw err;
  }

  const teams = getTeams();
  const team = teams.find(t => String(t.id) === String(teamId));
  if (!team) {
    const err = new Error('指定されたチームが存在しません。');
    (err as any).code = 'NO_TEAM';
    throw err;
  }

  const sameTeam = players.filter(p => String(p.teamId) === String(teamId));
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

  players.push(newPlayer);
  persist();
  return newPlayer;
};
