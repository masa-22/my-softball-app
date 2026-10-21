import { Player } from '../types/Player';
import { LineupEntry } from '../types/Lineup';

const ANON_PREFIX = 'anon_';

export const isAnonymousPlayerId = (playerId?: string | null): boolean =>
  typeof playerId === 'string' && playerId.startsWith(ANON_PREFIX);

export const anonymousPlayerId = (teamId: string | number, battingOrder: number): string =>
  `${ANON_PREFIX}${teamId}_${battingOrder}`;

export const anonymousSlotLabel = (battingOrder: number): string =>
  battingOrder === 10 ? 'FP' : `${battingOrder}番`;

export const battingOrderFromAnonymousPlayerId = (playerId: string): number | null => {
  if (!isAnonymousPlayerId(playerId)) return null;
  const order = Number(playerId.slice(playerId.lastIndexOf('_') + 1));
  return Number.isFinite(order) ? order : null;
};

export const anonymousPlayerLabelFromId = (playerId: string): string => {
  const order = battingOrderFromAnonymousPlayerId(playerId);
  return order == null ? playerId : anonymousSlotLabel(order);
};

export const displayPlayerName = (
  player?: { familyName?: string; givenName?: string; playerId?: string } | null,
  playerId?: string | null
): string => {
  const id = playerId || player?.playerId || '';
  if (isAnonymousPlayerId(id)) return anonymousPlayerLabelFromId(id);
  if (!player) return '';
  return `${player.familyName || ''} ${player.givenName || ''}`.trim();
};

export const virtualPlayerFromAnonymousId = (
  playerId: string,
  teamId: string | number
): Player => {
  const order = battingOrderFromAnonymousPlayerId(playerId);
  return {
    playerId,
    teamId,
    familyName: order == null ? playerId : anonymousSlotLabel(order),
    givenName: '',
    throwing: '',
    batting: '',
    entryYear: null,
    createdAt: '',
  };
};

export const mergeAnonymousPlayers = (
  players: Player[],
  entries: Array<Pick<LineupEntry, 'playerId'>>,
  teamId: string | number
): Player[] => {
  const seen = new Set(players.map((player) => player.playerId));
  const extras: Player[] = [];
  entries.forEach((entry) => {
    if (!isAnonymousPlayerId(entry.playerId) || seen.has(entry.playerId)) return;
    extras.push(virtualPlayerFromAnonymousId(entry.playerId, teamId));
    seen.add(entry.playerId);
  });
  return extras.length ? [...players, ...extras] : players;
};

export const lineupUsesAnonymousPlayers = (
  entries: Array<Pick<LineupEntry, 'playerId'>>
): boolean => entries.some((entry) => isAnonymousPlayerId(entry.playerId));

/** 打順1〜9だけ仮IDを付ける。FPと守備位置は使わない。 */
export const assignAnonymousPlayerIds = (
  entries: LineupEntry[],
  teamId: string | number
): LineupEntry[] =>
  entries.map((entry) => ({
    ...entry,
    position: '',
    playerId: entry.battingOrder === 10 ? '' : anonymousPlayerId(teamId, entry.battingOrder),
  }));

export const anonymousBattingSlotsReady = (
  entries: Array<Pick<LineupEntry, 'battingOrder' | 'playerId'>>
): boolean =>
  entries.filter((entry) => entry.battingOrder !== 10).every((entry) => !!entry.playerId);
