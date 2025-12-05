import { useCallback, useEffect, useState } from 'react';
import { getGame } from '../services/gameService';
import { getLineup } from '../services/lineupService';
import { getParticipations } from '../services/participationService';
import { getPlayers } from '../services/playerService';
import { getAtBats } from '../services/atBatService';
import { POSITIONS } from '../data/softball/positions';
import { formatAtBatSummary } from '../utils/scoreKeeping';
import { LineupEntry } from '../types/Lineup';
import { ParticipationEntry } from '../types/Participation';
import { Player } from '../types/Player';
import { AtBat } from '../types/AtBat';

export const MAX_BOX_SCORE_INNINGS = 7;

type Side = 'home' | 'away';

type PlayerResultMap = Record<string, Record<number, string[]>>;

export interface BoxScoreRowData {
  key: string;
  battingOrder: number;
  playerId: string | null;
  name: string;
  positionLabel: string;
  roleLabel: string;
  isSubstitute: boolean;
  resultsByInning: Record<number, string>;
}

export interface BoxScoreTeamData {
  teamName: string;
  side: Side;
  rows: BoxScoreRowData[];
}

export interface BoxScoreData {
  home: BoxScoreTeamData;
  away: BoxScoreTeamData;
}

const INNING_COLUMNS = Array.from({ length: MAX_BOX_SCORE_INNINGS }, (_, i) => i + 1);

const getPositionLabel = (position?: string | null) => {
  if (!position) return '';
  return POSITIONS[position]?.shortName || position || '';
};

const formatPlayerName = (player: Player | undefined) => {
  if (!player) return '';
  const family = player.familyName ?? '';
  const given = player.givenName ?? '';
  return `${family} ${given}`.trim();
};

const buildResultMap = (atBats: AtBat[]): Record<Side, PlayerResultMap> => {
  const result: Record<Side, PlayerResultMap> = { home: {}, away: {} };

  atBats.forEach((atBat) => {
    if (atBat.type !== 'bat' || !atBat.batterId) return;
    const label = formatAtBatSummary(atBat);
    if (!label) return;

    const inning = atBat.inning ?? 0;
    if (inning < 1 || inning > MAX_BOX_SCORE_INNINGS) return;

    const side: Side = atBat.topOrBottom === 'top' ? 'home' : 'away';
    const sideMap = result[side];
    const playerMap = sideMap[atBat.batterId] || (sideMap[atBat.batterId] = {});
    const inningList = playerMap[inning] || (playerMap[inning] = []);
    inningList.push(label);
  });

  return result;
};

const ensureParticipantEntries = (
  order: number,
  side: Side,
  participants: ParticipationEntry[],
  lineupEntry?: LineupEntry
): ParticipationEntry[] => {
  if (participants.length > 0) return participants;

  if (lineupEntry?.playerId) {
    return [
      {
        playerId: lineupEntry.playerId,
        battingOrder: order,
        side,
        status: 'starter',
        startInning: 1,
        endInning: null,
        positionAtStart: lineupEntry.position || null,
      },
    ];
  }

  return [];
};

const roleLabelMap: Record<string, string> = {
  starter: '',
  pinch_hitter: '代打',
  pinch_runner: '代走',
  substituted: '',
  finished: '',
};

const buildRowsForSide = ({
  side,
  lineupEntries,
  participationEntries,
  players,
  resultMap,
}: {
  side: Side;
  lineupEntries: LineupEntry[];
  participationEntries: ParticipationEntry[];
  players: Player[];
  resultMap: PlayerResultMap;
}): BoxScoreRowData[] => {
  const rows: BoxScoreRowData[] = [];
  const playersById = players.reduce<Record<string, Player>>((acc, player) => {
    acc[player.playerId] = player;
    return acc;
  }, {});

  const lineupByOrder = lineupEntries.reduce<Record<number, LineupEntry>>((acc, entry) => {
    if (entry.battingOrder) {
      acc[entry.battingOrder] = entry;
    }
    return acc;
  }, {});

  const participationByOrder = participationEntries.reduce<Record<number, ParticipationEntry[]>>((acc, entry) => {
    if (!entry.battingOrder) return acc;
    const list = acc[entry.battingOrder] || (acc[entry.battingOrder] = []);
    list.push(entry);
    return acc;
  }, {});

  for (let order = 1; order <= 9; order++) {
    const lineupEntry = lineupByOrder[order];
    const participants = ensureParticipantEntries(
      order,
      side,
      participationByOrder[order]?.slice() || [],
      lineupEntry
    );

    if (!participants.length) {
      rows.push({
        key: `${side}-${order}-empty`,
        battingOrder: order,
        playerId: null,
        name: '',
        positionLabel: lineupEntry ? getPositionLabel(lineupEntry.position) : '',
        roleLabel: '',
        isSubstitute: false,
        resultsByInning: {},
      });
      continue;
    }

    participants.sort((a, b) => {
      const aStart = a.startInning ?? (a.status === 'starter' ? 1 : 999);
      const bStart = b.startInning ?? (b.status === 'starter' ? 1 : 999);
      if (aStart !== bStart) return aStart - bStart;
      if (a.status === b.status) return 0;
      if (a.status === 'starter') return -1;
      if (b.status === 'starter') return 1;
      return 0;
    });

    participants.forEach((participant, idx) => {
      const player = playersById[participant.playerId];
      const displayName = formatPlayerName(player) || '未登録';
      const roleLabel = roleLabelMap[participant.status] || '';
      const position =
        participant.positionAtStart ||
        participant.positionAtEnd ||
        lineupEntry?.position ||
        '';
      const positionLabel = getPositionLabel(position);
      const perInning = resultMap[participant.playerId] || {};
      const resultsByInning: Record<number, string> = {};
      INNING_COLUMNS.forEach((inning) => {
        const list = perInning[inning];
        if (list?.length) {
          resultsByInning[inning] = list.join(' / ');
        }
      });

      rows.push({
        key: `${side}-${order}-${participant.playerId || idx}`,
        battingOrder: order,
        playerId: participant.playerId,
        name: roleLabel ? `${displayName} (${roleLabel})` : displayName,
        positionLabel,
        roleLabel,
        isSubstitute: participant.status !== 'starter',
        resultsByInning,
      });
    });
  }

  return rows;
};

const buildBoxScoreData = (matchId: string): BoxScoreData | null => {
  const game = getGame(matchId);
  if (!game) return null;

  const lineup = getLineup(matchId);
  const participations = getParticipations(matchId);
  const atBats = getAtBats(matchId);
  const homePlayers = getPlayers(game.topTeam.id);
  const awayPlayers = getPlayers(game.bottomTeam.id);
  const resultMap = buildResultMap(atBats);

  const homeTeam: BoxScoreTeamData = {
    teamName: game.topTeam.name,
    side: 'home',
    rows: buildRowsForSide({
      side: 'home',
      lineupEntries: lineup?.home ?? [],
      participationEntries: participations?.home ?? [],
      players: homePlayers,
      resultMap: resultMap.home,
    }),
  };

  const awayTeam: BoxScoreTeamData = {
    teamName: game.bottomTeam.name,
    side: 'away',
    rows: buildRowsForSide({
      side: 'away',
      lineupEntries: lineup?.away ?? [],
      participationEntries: participations?.away ?? [],
      players: awayPlayers,
      resultMap: resultMap.away,
    }),
  };

  return { home: homeTeam, away: awayTeam };
};

export const useBoxScoreData = (matchId?: string) => {
  const [data, setData] = useState<BoxScoreData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(
    (options?: { silent?: boolean }) => {
      if (!matchId) {
        setData(null);
        setLoading(false);
        return;
      }
      if (!options?.silent) {
        setLoading(true);
      }
      try {
        const next = buildBoxScoreData(matchId);
        setData(next);
      } catch (error) {
        console.warn('box score load error', error);
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [matchId]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!matchId) return;
    const interval = setInterval(() => loadData({ silent: true }), 1500);
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (['softball_app_at_bats', 'lineups', 'participations'].includes(event.key)) {
        loadData({ silent: true });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [matchId, loadData]);

  const refresh = useCallback(() => loadData(), [loadData]);

  return { data, loading, refresh };
};


